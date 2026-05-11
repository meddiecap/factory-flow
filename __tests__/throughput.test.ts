import { describe, it, expect } from "vitest"
import {
    traceUnitsPerTick,
    calcMarketSlotRevenues,
} from "../src/simulation/throughput"
import { NodeType, ResourceType } from "../src/simulation/types"
import type { NodeInstance, Connection } from "../src/simulation/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0

/**
 * Builds a minimal IronMine-like producer node.
 * cycleDuration > 0 so traceUnitsPerTick treats it as a real producer.
 */
function makeProducer(
    id: string,
    resource: ResourceType,
    speedUpgradeLevel = 0,
): NodeInstance {
    return {
        id,
        type: NodeType.IronMine,
        position: { col: 0, row: 0 },
        progress: 0,
        status: "active",
        inputBuffers: [],
        outputBuffers: [{ resource, amount: 0, capacity: 20 }],
        speedUpgradeLevel,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
        energyOutputUpgradeLevel: 0,
    }
}

function makeSplitter(id: string, ratioA = 0.5): NodeInstance {
    return {
        id,
        type: NodeType.Splitter,
        position: { col: 0, row: 0 },
        progress: 0,
        status: "active",
        inputBuffers: [
            { resource: ResourceType.IronOre, amount: 0, capacity: 20 },
        ],
        outputBuffers: [
            { resource: ResourceType.IronOre, amount: 0, capacity: 20 },
            { resource: ResourceType.IronOre, amount: 0, capacity: 20 },
        ],
        speedUpgradeLevel: 0,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
        energyOutputUpgradeLevel: 0,
        splitterRatioA: ratioA,
        splitterAccumulators: [0, 0],
    }
}

function makeMerger(id: string): NodeInstance {
    return {
        id,
        type: NodeType.Merger,
        position: { col: 0, row: 0 },
        progress: 0,
        status: "active",
        inputBuffers: [
            { resource: ResourceType.IronOre, amount: 0, capacity: 20 },
            { resource: ResourceType.IronOre, amount: 0, capacity: 20 },
        ],
        outputBuffers: [
            { resource: ResourceType.IronOre, amount: 0, capacity: 20 },
        ],
        speedUpgradeLevel: 0,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
        energyOutputUpgradeLevel: 0,
        mergerLastInput: 0,
    }
}

function makeMarket(id: string, inputCount = 1): NodeInstance {
    return {
        id,
        type: NodeType.Market,
        position: { col: 0, row: 0 },
        progress: 0,
        status: "active",
        inputBuffers: Array.from({ length: inputCount }, () => ({
            resource: ResourceType.IronOre,
            amount: 0,
            capacity: 20,
        })),
        outputBuffers: [],
        speedUpgradeLevel: 0,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
        energyOutputUpgradeLevel: 0,
        salesPoints: inputCount,
    }
}

function makeConn(
    fromNodeId: string,
    fromDotIndex: number,
    toNodeId: string,
    toDotIndex: number,
): Connection {
    return {
        id: `c${++_idCounter}`,
        fromNodeId,
        fromDotIndex,
        toNodeId,
        toDotIndex,
        capacity: 10,
        capacityUpgradeLevel: 0,
    }
}

// ---------------------------------------------------------------------------
// traceUnitsPerTick
// ---------------------------------------------------------------------------

describe("traceUnitsPerTick", () => {
    it("returns the base rate for a simple producer node", () => {
        // IronMine: 1 ore per 40 ticks → 0.025 units/tick
        const mine = makeProducer("mine", ResourceType.IronOre)
        // Patch type so NODE_DEFS lookup matches real IronMine
        mine.type = NodeType.IronMine

        const speedFactors = new Map<string, number>([["mine", 1]])
        const rate = traceUnitsPerTick("mine", 0, [mine], [], speedFactors)
        expect(rate).toBeCloseTo(1 / 40)
    })

    it("scales rate with speed factor", () => {
        const mine = makeProducer("mine", ResourceType.IronOre)
        mine.type = NodeType.IronMine
        const speedFactors = new Map<string, number>([["mine", 2]])
        const rate = traceUnitsPerTick("mine", 0, [mine], [], speedFactors)
        expect(rate).toBeCloseTo(2 / 40)
    })

    it("scales rate with speedUpgradeLevel", () => {
        const mine = makeProducer("mine", ResourceType.IronOre)
        mine.type = NodeType.IronMine
        mine.speedUpgradeLevel = 1 // ×1.5
        const speedFactors = new Map<string, number>([["mine", 1]])
        const rate = traceUnitsPerTick("mine", 0, [mine], [], speedFactors)
        expect(rate).toBeCloseTo((1 / 40) * 1.5)
    })

    it("returns null for an unknown node id", () => {
        const rate = traceUnitsPerTick("ghost", 0, [], [], new Map())
        expect(rate).toBeNull()
    })

    it("returns null for an out-of-range dot index on a producer", () => {
        const mine = makeProducer("mine", ResourceType.IronOre)
        mine.type = NodeType.IronMine
        const rate = traceUnitsPerTick(
            "mine",
            99,
            [mine],
            [],
            new Map([["mine", 1]]),
        )
        expect(rate).toBeNull()
    })

    it("traces through a Splitter (output A) and applies the ratio", () => {
        // mine → splitter
        const mine = makeProducer("mine", ResourceType.IronOre)
        mine.type = NodeType.IronMine
        const splitter = makeSplitter("sp", 0.6)

        const conn = makeConn("mine", 0, "sp", 0)
        const speedFactors = new Map<string, number>([["mine", 1]])

        // Trace from splitter output dot 0 (ratioA = 0.6)
        const rate = traceUnitsPerTick(
            "sp",
            0,
            [mine, splitter],
            [conn],
            speedFactors,
        )
        expect(rate).toBeCloseTo((1 / 40) * 0.6)
    })

    it("traces through a Splitter (output B) and applies the complementary ratio", () => {
        const mine = makeProducer("mine", ResourceType.IronOre)
        mine.type = NodeType.IronMine
        const splitter = makeSplitter("sp", 0.6)
        const conn = makeConn("mine", 0, "sp", 0)
        const speedFactors = new Map([["mine", 1]])

        const rate = traceUnitsPerTick(
            "sp",
            1,
            [mine, splitter],
            [conn],
            speedFactors,
        )
        expect(rate).toBeCloseTo((1 / 40) * 0.4)
    })

    it("returns null for a Splitter with no incoming connection", () => {
        const splitter = makeSplitter("sp")
        const rate = traceUnitsPerTick("sp", 0, [splitter], [], new Map())
        expect(rate).toBeNull()
    })

    it("traces through a Merger and sums both input rates", () => {
        const mineA = makeProducer("mA", ResourceType.IronOre)
        mineA.type = NodeType.IronMine
        const mineB = makeProducer("mB", ResourceType.IronOre)
        mineB.type = NodeType.IronMine
        const merger = makeMerger("mg")

        const connA = makeConn("mA", 0, "mg", 0)
        const connB = makeConn("mB", 0, "mg", 1)
        const speedFactors = new Map([
            ["mA", 1],
            ["mB", 1],
        ])

        const rate = traceUnitsPerTick(
            "mg",
            0,
            [mineA, mineB, merger],
            [connA, connB],
            speedFactors,
        )
        expect(rate).toBeCloseTo(2 / 40)
    })

    it("returns the partial rate when only one Merger input is connected", () => {
        const mine = makeProducer("mine", ResourceType.IronOre)
        mine.type = NodeType.IronMine
        const merger = makeMerger("mg")
        const conn = makeConn("mine", 0, "mg", 0)
        const speedFactors = new Map([["mine", 1]])

        const rate = traceUnitsPerTick(
            "mg",
            0,
            [mine, merger],
            [conn],
            speedFactors,
        )
        expect(rate).toBeCloseTo(1 / 40)
    })

    it("returns null for a Merger with no incoming connections", () => {
        const merger = makeMerger("mg")
        const rate = traceUnitsPerTick("mg", 0, [merger], [], new Map())
        expect(rate).toBeNull()
    })

    it("stops recursion at depth 20 and returns null", () => {
        // Build a linear chain of 25 splitters to exceed depth guard.
        const mine = makeProducer("mine", ResourceType.IronOre)
        mine.type = NodeType.IronMine
        const nodes: NodeInstance[] = [mine]
        const conns: Connection[] = []

        let prevId = "mine"
        let prevDot = 0
        for (let i = 0; i < 25; i++) {
            const sp = makeSplitter(`sp${i}`, 1.0)
            nodes.push(sp)
            conns.push(makeConn(prevId, prevDot, `sp${i}`, 0))
            prevId = `sp${i}`
            prevDot = 0
        }

        const speedFactors = new Map([["mine", 1]])
        const rate = traceUnitsPerTick(
            prevId,
            prevDot,
            nodes,
            conns,
            speedFactors,
        )
        expect(rate).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// calcMarketSlotRevenues
// ---------------------------------------------------------------------------

describe("calcMarketSlotRevenues", () => {
    it("returns [null] when Market has no incoming connections", () => {
        const market = makeMarket("mkt")
        const revenues = calcMarketSlotRevenues(market, [market], [], new Map())
        expect(revenues).toEqual([null])
    })

    it("returns correct €/s for a direct mine → market connection", () => {
        // IronMine: 1 ore/40 ticks at 20 ticks/s → 0.5 ore/s; price = 2 →  €1/s actually:
        // rate = 1/40 units/tick × 20 ticks/s × 2 €/unit = 1 €/s
        const mine = makeProducer("mine", ResourceType.IronOre)
        mine.type = NodeType.IronMine
        const market = makeMarket("mkt")
        // Set market input buffer resource to IronOre
        market.inputBuffers[0]!.resource = ResourceType.IronOre
        const conn = makeConn("mine", 0, "mkt", 0)

        const speedFactors = new Map([["mine", 1]])
        const revenues = calcMarketSlotRevenues(
            market,
            [mine, market],
            [conn],
            speedFactors,
        )
        expect(revenues[0]).toBeCloseTo((1 / 40) * 20 * 2)
    })

    it("returns null for a slot with no connection even when other slots are connected", () => {
        const mine = makeProducer("mine", ResourceType.IronOre)
        mine.type = NodeType.IronMine
        const market = makeMarket("mkt", 2)
        const conn = makeConn("mine", 0, "mkt", 0)

        const speedFactors = new Map([["mine", 1]])
        const revenues = calcMarketSlotRevenues(
            market,
            [mine, market],
            [conn],
            speedFactors,
        )
        expect(revenues[0]).not.toBeNull()
        expect(revenues[1]).toBeNull()
    })

    it("returns null when the upstream node does not exist", () => {
        const market = makeMarket("mkt")
        const conn = makeConn("ghost", 0, "mkt", 0)

        const revenues = calcMarketSlotRevenues(
            market,
            [market],
            [conn],
            new Map(),
        )
        expect(revenues[0]).toBeNull()
    })

    it("ignores energy connections when building the connection lookup", () => {
        const mine = makeProducer("mine", ResourceType.IronOre)
        mine.type = NodeType.IronMine
        const market = makeMarket("mkt")
        const energyConn: Connection = {
            ...makeConn("mine", 0, "mkt", 0),
            isEnergy: true,
        }
        const speedFactors = new Map([["mine", 1]])
        const revenues = calcMarketSlotRevenues(
            market,
            [mine, market],
            [energyConn],
            speedFactors,
        )
        // Energy connection should not be treated as a resource connection.
        expect(revenues[0]).toBeNull()
    })
})
