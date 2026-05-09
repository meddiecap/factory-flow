import { describe, it, expect } from "vitest"
import { tickSplitter, initSplitter } from "../src/simulation/splitter"
import { NodeType, ResourceType } from "../src/simulation/types"
import type { NodeInstance } from "../src/simulation/types"

function makeSplitter(ratioA: number, inputAmount = 100): NodeInstance {
    const node: NodeInstance = {
        id: "splitter",
        type: NodeType.Splitter,
        position: { col: 0, row: 0 },
        progress: 0,
        status: "active",
        inputBuffers: [
            {
                resource: ResourceType.IronOre,
                amount: inputAmount,
                capacity: 200,
            },
        ],
        outputBuffers: [
            { resource: ResourceType.IronOre, amount: 0, capacity: 100 },
            { resource: ResourceType.IronOre, amount: 0, capacity: 100 },
        ],
        speedUpgradeLevel: 0,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
        splitterRatioA: ratioA,
        splitterAccumulators: [0, 0],
    }
    return node
}

describe("tickSplitter", () => {
    it("distributes 7 to output A and 3 to output B over 10 ticks with 70/30 ratio", () => {
        const node = makeSplitter(0.7)

        for (let i = 0; i < 10; i++) {
            tickSplitter(node)
        }

        expect(node.outputBuffers[0]!.amount).toBe(7)
        expect(node.outputBuffers[1]!.amount).toBe(3)
    })

    it("distributes equally with 50/50 ratio over 10 ticks", () => {
        const node = makeSplitter(0.5)

        for (let i = 0; i < 10; i++) {
            tickSplitter(node)
        }

        expect(node.outputBuffers[0]!.amount).toBe(5)
        expect(node.outputBuffers[1]!.amount).toBe(5)
    })

    it("continues accumulating to the other output when one output buffer is full", () => {
        const node = makeSplitter(0.5)
        // Fill output A to capacity — goods should all go to B.
        node.outputBuffers[0]!.amount = 100 // full

        for (let i = 0; i < 10; i++) {
            tickSplitter(node)
        }

        // Output A stays full, B receives all dispatched units.
        expect(node.outputBuffers[0]!.amount).toBe(100)
        expect(node.outputBuffers[1]!.amount).toBe(5)
    })

    it("initialises missing accumulators when called without initSplitter", () => {
        const node = makeSplitter(0.7)
        // Manually remove accumulators to simulate uninitialised state.
        node.splitterAccumulators = undefined
        node.splitterRatioA = undefined

        // Should not throw and should fall back to default 50/50 after init.
        expect(() => tickSplitter(node)).not.toThrow()
        expect(node.splitterAccumulators).toBeDefined()
    })
})
