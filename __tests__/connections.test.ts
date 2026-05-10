import { describe, it, expect } from "vitest"
import { tickConnections } from "../src/simulation/connections"
import { ResourceType, NodeType } from "../src/simulation/types"
import type { NodeInstance, Connection } from "../src/simulation/types"

function makeNode(
    id: string,
    outputAmount: number,
    outputCapacity: number,
    inputAmount: number,
    inputCapacity: number,
): NodeInstance {
    return {
        id,
        type: NodeType.IronMine,
        position: { col: 0, row: 0 },
        progress: 0,
        status: "active",
        inputBuffers: [
            {
                resource: ResourceType.IronOre,
                amount: inputAmount,
                capacity: inputCapacity,
            },
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
    }
}

function makeConnection(
    fromId: string,
    toId: string,
    capacityLevel = 0,
): Connection {
    return {
        id: "c1",
        fromNodeId: fromId,
        fromDotIndex: 0,
        toNodeId: toId,
        toDotIndex: 0,
        capacity: 10,
        capacityUpgradeLevel: capacityLevel,
    }
}

describe("tickConnections", () => {
    it("transfers goods from output buffer to input buffer", () => {
        const source = makeNode("src", 5, 20, 0, 20)
        const target = makeNode("tgt", 0, 20, 0, 20)
        const conn = makeConnection("src", "tgt")

        tickConnections([source, target], [conn])

        expect(source.outputBuffers[0]!.amount).toBe(0) // 5 transferred
        expect(target.inputBuffers[0]!.amount).toBe(5)
    })

    it("stops transfer when target input buffer is full", () => {
        const source = makeNode("src", 10, 20, 0, 20)
        const target = makeNode("tgt", 0, 20, 20, 20) // already full
        const conn = makeConnection("src", "tgt")

        tickConnections([source, target], [conn])

        expect(source.outputBuffers[0]!.amount).toBe(10) // nothing transferred
        expect(target.inputBuffers[0]!.amount).toBe(20)
    })

    it("transfers nothing when source output buffer is empty", () => {
        const source = makeNode("src", 0, 20, 0, 20) // empty output
        const target = makeNode("tgt", 0, 20, 0, 20)
        const conn = makeConnection("src", "tgt")

        tickConnections([source, target], [conn])

        expect(source.outputBuffers[0]!.amount).toBe(0)
        expect(target.inputBuffers[0]!.amount).toBe(0)
    })

    it("respects connection capacity limit (base 10 units/tick)", () => {
        const source = makeNode("src", 50, 100, 0, 100) // plenty of stock
        const target = makeNode("tgt", 0, 100, 0, 100) // plenty of room
        const conn = makeConnection("src", "tgt", 0) // capacity level 0 → max 10/tick

        tickConnections([source, target], [conn])

        expect(target.inputBuffers[0]!.amount).toBe(10) // capped at 10
        expect(source.outputBuffers[0]!.amount).toBe(40)
    })

    it("respects upgraded connection capacity (+10 per level)", () => {
        const source = makeNode("src", 50, 100, 0, 100)
        const target = makeNode("tgt", 0, 100, 0, 100)
        const conn = makeConnection("src", "tgt", 2) // level 2 → 30/tick

        tickConnections([source, target], [conn])

        expect(target.inputBuffers[0]!.amount).toBe(30)
    })
})
