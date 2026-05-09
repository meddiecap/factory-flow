import { describe, it, expect, beforeEach } from "vitest"
import { tickNode } from "../src/simulation/tick"
import { NodeType, ResourceType } from "../src/simulation/types"
import type { NodeInstance, NodeDef } from "../src/simulation/types"

/** Factory for a minimal node instance with one output buffer. */
function makeNode(overrides: Partial<NodeInstance> = {}): NodeInstance {
    return {
        id: "n1",
        type: NodeType.IronMine,
        position: { col: 0, row: 0 },
        progress: 0,
        status: "idle",
        inputBuffers: [],
        outputBuffers: [
            { resource: ResourceType.IronOre, amount: 0, capacity: 20 },
        ],
        speedUpgradeLevel: 0,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
        ...overrides,
    }
}

/** Static definition for a 40-tick cycle mine. */
const mineDef: NodeDef = {
    displayName: "Iron Mine",
    inputs: [],
    outputs: [{ resource: ResourceType.IronOre, amount: 1 }],
    cycleDuration: 40,
    buildCost: 50,
    fuelPerTick: 0.5,
    gridSize: { width: 2, height: 1 },
    defaultInputCapacity: 0,
    defaultOutputCapacity: 20,
}

/** Static definition for a node that requires input. */
const smelterDef: NodeDef = {
    displayName: "Smelter",
    inputs: [
        { resource: ResourceType.IronOre, amount: 3 },
        { resource: ResourceType.Coal, amount: 1 },
    ],
    outputs: [{ resource: ResourceType.Steel, amount: 1 }],
    cycleDuration: 80,
    buildCost: 500,
    fuelPerTick: 1,
    gridSize: { width: 2, height: 2 },
    defaultInputCapacity: 20,
    defaultOutputCapacity: 10,
}

describe("tickNode", () => {
    it("produces one unit after exactly cycleDuration ticks at speedFactor=1", () => {
        const node = makeNode()

        // Tick 39 times — not yet complete.
        for (let i = 0; i < 39; i++) {
            tickNode(node, mineDef, 1)
        }
        expect(node.outputBuffers[0]!.amount).toBe(0)

        // Tick 40th time — cycle completes.
        tickNode(node, mineDef, 1)
        expect(node.outputBuffers[0]!.amount).toBe(1)
    })

    it("sets status to output-blocked and stops when output buffer is full", () => {
        const node = makeNode({
            outputBuffers: [
                { resource: ResourceType.IronOre, amount: 20, capacity: 20 },
            ],
        })

        tickNode(node, mineDef, 1)
        expect(node.status).toBe("output-blocked")
        expect(node.progress).toBe(0)
    })

    it("sets status to waiting and stops progress when input buffer is insufficient", () => {
        const node = makeNode({
            type: NodeType.Smelter,
            inputBuffers: [
                { resource: ResourceType.IronOre, amount: 1, capacity: 20 }, // needs 3
                { resource: ResourceType.Coal, amount: 0, capacity: 20 },
            ],
            outputBuffers: [
                { resource: ResourceType.Steel, amount: 0, capacity: 10 },
            ],
        })
        const progressBefore = node.progress

        tickNode(node, smelterDef, 1)
        expect(node.status).toBe("waiting")
        expect(node.progress).toBe(progressBefore)
    })

    it("slows production proportionally when speedFactor < 1", () => {
        const node = makeNode()

        // At 0.5 speed, 40 ticks should only advance progress to 20.
        for (let i = 0; i < 40; i++) {
            tickNode(node, mineDef, 0.5)
        }
        // No cycle completed yet — output still 0.
        expect(node.outputBuffers[0]!.amount).toBe(0)

        // Another 40 ticks at 0.5 → total progress 40 → cycle completes.
        for (let i = 0; i < 40; i++) {
            tickNode(node, mineDef, 0.5)
        }
        expect(node.outputBuffers[0]!.amount).toBe(1)
    })
})
