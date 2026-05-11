import { describe, it, expect } from "vitest"
import { tickMerger } from "../src/simulation/merger"
import { NodeType, ResourceType } from "../src/simulation/types"
import type { NodeInstance } from "../src/simulation/types"

/**
 * Constructs a Merger NodeInstance for testing.
 *
 * @param amountA - Units pre-loaded into input buffer A.
 * @param amountB - Units pre-loaded into input buffer B.
 * @param outputAmount - Units already in the output buffer (default 0).
 * @param outputCapacity - Capacity of the output buffer (default 20).
 * @param lastInput - The mergerLastInput value to pre-set (default 0).
 */
function makeMerger(
    amountA: number,
    amountB: number,
    outputAmount = 0,
    outputCapacity = 20,
    lastInput: 0 | 1 = 0,
): NodeInstance {
    return {
        id: "merger-1",
        type: NodeType.Merger,
        position: { col: 0, row: 0 },
        progress: 0,
        status: "active",
        inputBuffers: [
            { resource: ResourceType.IronOre, amount: amountA, capacity: 20 },
            { resource: ResourceType.IronOre, amount: amountB, capacity: 20 },
        ],
        outputBuffers: [
            {
                resource: ResourceType.IronOre,
                amount: outputAmount,
                capacity: outputCapacity,
            },
        ],
        speedUpgradeLevel: 0,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
        energyOutputUpgradeLevel: 0,
        mergerLastInput: lastInput,
    }
}

describe("tickMerger", () => {
    it("takes from input A on the first tick when lastInput is 0 (preferred becomes 1 initially)", () => {
        // lastInput=0 → preferred = 1, so it should take from B first
        const node = makeMerger(5, 5, 0, 20, 0)
        tickMerger(node)
        // preferred=1 means B is drained
        expect(node.inputBuffers[1]!.amount).toBe(4)
        expect(node.inputBuffers[0]!.amount).toBe(5)
        expect(node.outputBuffers[0]!.amount).toBe(1)
        expect(node.mergerLastInput).toBe(1)
    })

    it("alternates between input B and input A over two ticks", () => {
        const node = makeMerger(5, 5, 0, 20, 0)
        tickMerger(node) // tick 1: prefers B (from lastInput=0)
        tickMerger(node) // tick 2: prefers A (from lastInput=1)
        expect(node.inputBuffers[0]!.amount).toBe(4) // A drained once
        expect(node.inputBuffers[1]!.amount).toBe(4) // B drained once
        expect(node.outputBuffers[0]!.amount).toBe(2)
    })

    it("gives both inputs equal throughput over 10 ticks", () => {
        const node = makeMerger(10, 10, 0, 20, 0)
        for (let i = 0; i < 10; i++) tickMerger(node)
        expect(node.inputBuffers[0]!.amount).toBe(5)
        expect(node.inputBuffers[1]!.amount).toBe(5)
        expect(node.outputBuffers[0]!.amount).toBe(10)
    })

    it("falls back to input A when preferred input B is empty", () => {
        // lastInput=0 → prefers B, but B is empty → falls back to A
        const node = makeMerger(5, 0, 0, 20, 0)
        tickMerger(node)
        expect(node.inputBuffers[0]!.amount).toBe(4)
        expect(node.inputBuffers[1]!.amount).toBe(0)
        expect(node.outputBuffers[0]!.amount).toBe(1)
        // lastInput updated to fallback index (A = 0)
        expect(node.mergerLastInput).toBe(0)
    })

    it("falls back to input B when preferred input A is empty", () => {
        // lastInput=1 → prefers A (index 0), but A is empty → falls back to B
        const node = makeMerger(0, 5, 0, 20, 1)
        tickMerger(node)
        expect(node.inputBuffers[0]!.amount).toBe(0)
        expect(node.inputBuffers[1]!.amount).toBe(4)
        expect(node.outputBuffers[0]!.amount).toBe(1)
        expect(node.mergerLastInput).toBe(1)
    })

    it("does nothing when both inputs are empty", () => {
        const node = makeMerger(0, 0, 0, 20, 0)
        tickMerger(node)
        expect(node.outputBuffers[0]!.amount).toBe(0)
    })

    it("does nothing when output buffer is full (backpressure)", () => {
        const node = makeMerger(5, 5, 20, 20, 0)
        tickMerger(node)
        expect(node.outputBuffers[0]!.amount).toBe(20)
        expect(node.inputBuffers[0]!.amount).toBe(5)
        expect(node.inputBuffers[1]!.amount).toBe(5)
    })

    it("stops accepting when output reaches capacity mid-sequence", () => {
        // Output capacity = 3; inputs each have 5 items.
        const node = makeMerger(5, 5, 2, 3, 0)
        tickMerger(node) // output: 3 (full)
        tickMerger(node) // should be blocked
        expect(node.outputBuffers[0]!.amount).toBe(3)
    })

    it("does nothing when inputBuffers or outputBuffer are missing", () => {
        const node = makeMerger(5, 5)
        // Remove buffers to simulate corrupt state
        node.inputBuffers = []
        expect(() => tickMerger(node)).not.toThrow()
        node.inputBuffers = [
            { resource: ResourceType.IronOre, amount: 5, capacity: 20 },
        ]
        node.outputBuffers = []
        expect(() => tickMerger(node)).not.toThrow()
    })

    it("transfers the correct resource type from the preferred input", () => {
        const node = makeMerger(5, 0)
        node.inputBuffers[0]!.resource = ResourceType.Steel
        node.outputBuffers[0]!.resource = ResourceType.Steel
        node.mergerLastInput = 1 // preferred is A (0)
        tickMerger(node)
        expect(node.outputBuffers[0]!.resource).toBe(ResourceType.Steel)
    })
})
