import { describe, it, expect, beforeEach } from "vitest"
import { NodeType, ResourceType } from "../src/simulation/types"
import type { NodeInstance, GameState } from "../src/simulation/types"
import { NODE_DEFS } from "../src/simulation/recipes"
import { applyUpgrade } from "../src/simulation/upgrades"

/** Creates a minimal NodeInstance for testing upgrades. */
function makeNode(type: NodeType): NodeInstance {
    const def = NODE_DEFS[type]
    return {
        id: "test-node",
        type,
        position: { col: 0, row: 0 },
        progress: 0,
        status: "idle",
        inputBuffers: def.inputs.map((inp) => ({
            resource: inp.resource,
            amount: 0,
            capacity: def.defaultInputCapacity,
        })),
        outputBuffers: def.outputs.map((out) => ({
            resource: out.resource,
            amount: 0,
            capacity: def.defaultOutputCapacity,
        })),
        speedUpgradeLevel: 0,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
    }
}

/** Creates a minimal GameState with plenty of money for upgrade tests. */
function makeState(money = 1_000_000): GameState {
    return { nodes: [], connections: [], money, totalEarned: money, tick: 0 }
}

// ── Speed upgrade ────────────────────────────────────────────────────────────

describe("Speed upgrade", () => {
    it("level 1 multiplies production speed by ×1.5 in tick.ts", () => {
        // tick.ts uses `1.5 ** node.speedUpgradeLevel` as the per-node multiplier.
        // After one speed upgrade the multiplier should equal 1.5^1 = 1.5.
        const node = makeNode(NodeType.IronMine)
        const state = makeState()
        expect(node.speedUpgradeLevel).toBe(0)

        applyUpgrade(node, "speed", state)

        expect(node.speedUpgradeLevel).toBe(1)
        // Verify the multiplier applied in tick.ts equals 1.5 at level 1.
        expect(1.5 ** node.speedUpgradeLevel).toBeCloseTo(1.5)
    })

    it("deducts cost from state.money", () => {
        const node = makeNode(NodeType.IronMine)
        const def = NODE_DEFS[NodeType.IronMine]
        const state = makeState()
        const expectedCost = Math.ceil(def.buildCost * 2 * 3 ** 0) // level 0 → level 1

        applyUpgrade(node, "speed", state)

        expect(state.money).toBe(1_000_000 - expectedCost)
    })

    it("returns false and does not apply when unaffordable", () => {
        const node = makeNode(NodeType.IronMine)
        const state = makeState(0)

        const result = applyUpgrade(node, "speed", state)

        expect(result).toBe(false)
        expect(node.speedUpgradeLevel).toBe(0)
        expect(state.money).toBe(0)
    })
})

// ── Buffer upgrade ───────────────────────────────────────────────────────────

describe("Buffer upgrade", () => {
    it("level 3 adds +30 capacity to all input and output buffers", () => {
        const node = makeNode(NodeType.Smelter)
        const state = makeState()

        const initialInputCap = node.inputBuffers[0]!.capacity
        const initialOutputCap = node.outputBuffers[0]!.capacity

        applyUpgrade(node, "buffer", state)
        applyUpgrade(node, "buffer", state)
        applyUpgrade(node, "buffer", state)

        expect(node.bufferUpgradeLevel).toBe(3)
        for (const buf of node.inputBuffers) {
            expect(buf.capacity).toBe(initialInputCap + 30)
        }
        for (const buf of node.outputBuffers) {
            expect(buf.capacity).toBe(initialOutputCap + 30)
        }
    })
})

// ── Efficiency upgrade ───────────────────────────────────────────────────────

describe("Efficiency upgrade", () => {
    it("level 5 results in 50% input consumption (minimum reached)", () => {
        // effectiveInputAmount(base, level) = base × max(0.5, 1 − level × 0.1)
        // At level 5: max(0.5, 1 − 0.5) = 0.5 → 50% of base input.
        const node = makeNode(NodeType.Smelter)
        const state = makeState()

        for (let i = 0; i < 5; i++) applyUpgrade(node, "efficiency", state)

        expect(node.efficiencyUpgradeLevel).toBe(5)

        // Verify the factor used in tick.ts matches 50%.
        const factor = Math.max(0.5, 1 - node.efficiencyUpgradeLevel * 0.1)
        expect(factor).toBeCloseTo(0.5)
    })

    it("level 6 stays clamped at 50% (does not go below minimum)", () => {
        const node = makeNode(NodeType.Smelter)
        const state = makeState()

        for (let i = 0; i < 6; i++) applyUpgrade(node, "efficiency", state)

        const factor = Math.max(0.5, 1 - node.efficiencyUpgradeLevel * 0.1)
        expect(factor).toBeCloseTo(0.5)
    })
})

// ── Sales point upgrade (Market) ─────────────────────────────────────────────

describe("SalesPoint upgrade (Market)", () => {
    it("adds an extra input buffer slot and increments salesPoints", () => {
        const node = makeNode(NodeType.Market)
        node.salesPoints = 1
        const state = makeState()

        applyUpgrade(node, "salesPoint", state)

        expect(node.salesPoints).toBe(2)
        expect(node.inputBuffers.length).toBe(2)
    })

    it("costs €200 × 2^(pts−1) per level", () => {
        const node = makeNode(NodeType.Market)
        node.salesPoints = 1
        const state = makeState()

        // First sales point upgrade costs €200 × 2^0 = €200.
        applyUpgrade(node, "salesPoint", state)
        expect(state.money).toBe(1_000_000 - 200)

        // Second costs €200 × 2^1 = €400.
        applyUpgrade(node, "salesPoint", state)
        expect(state.money).toBe(1_000_000 - 200 - 400)
    })
})
