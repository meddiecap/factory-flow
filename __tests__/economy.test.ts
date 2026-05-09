import { describe, it, expect } from "vitest"
import { tickMarket, canUnlock, buildCost } from "../src/simulation/economy"
import { NodeType, ResourceType } from "../src/simulation/types"
import type { GameState, NodeInstance } from "../src/simulation/types" // Used in income test — static import avoids top-level await restriction.
import { tick } from "../src/simulation/simulator"
function makeMarketNode(
    resource: ResourceType,
    amount: number,
    salesPoints = 1,
): NodeInstance {
    return {
        id: "m1",
        type: NodeType.Market,
        position: { col: 0, row: 0 },
        progress: 0,
        status: "active",
        inputBuffers: Array.from({ length: salesPoints }, () => ({
            resource,
            amount,
            capacity: 50,
        })),
        outputBuffers: [],
        speedUpgradeLevel: 0,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
        salesPoints,
    }
}

function makeState(nodes: NodeInstance[], totalEarned = 0): GameState {
    return {
        nodes,
        connections: [],
        money: 0,
        totalEarned,
        tick: 0,
    }
}

describe("tickMarket", () => {
    it("sells goods and increases money and totalEarned", () => {
        // IronOre = €2; sell 10 units → revenue = €20.
        const market = makeMarketNode(ResourceType.IronOre, 10)
        const state = makeState([market])

        tickMarket(state)

        expect(market.inputBuffers[0]!.amount).toBe(0)
        expect(state.money).toBe(20)
        expect(state.totalEarned).toBe(20)
    })

    it("caps sales at 20 units per sales point per tick", () => {
        // Buffer has 50 units; only 20 should be sold per tick.
        const market = makeMarketNode(ResourceType.IronOre, 50)
        const state = makeState([market])

        tickMarket(state)

        expect(market.inputBuffers[0]!.amount).toBe(30) // 50 - 20
        expect(state.money).toBe(40) // 20 × €2
    })

    it("processes each sales point independently", () => {
        // 2 sales points with 10 IronOre each → 2 × €20 = €40.
        const market = makeMarketNode(ResourceType.IronOre, 10, 2)
        const state = makeState([market])

        tickMarket(state)

        expect(state.money).toBe(40)
        expect(market.inputBuffers[0]!.amount).toBe(0)
        expect(market.inputBuffers[1]!.amount).toBe(0)
    })
})

describe("canUnlock", () => {
    it("IronMine is always available without earning anything", () => {
        const state = makeState([], 0)
        expect(canUnlock(NodeType.IronMine, state)).toBe(true)
    })

    it("EnergySupply (extra) is locked below €50 totalEarned", () => {
        const state = makeState([], 49)
        expect(canUnlock(NodeType.EnergySupply, state)).toBe(false)
    })

    it("EnergySupply (extra) unlocks at exactly €50 totalEarned", () => {
        const state = makeState([], 50)
        expect(canUnlock(NodeType.EnergySupply, state)).toBe(true)
    })

    it("Assembly is locked below €40,000", () => {
        const state = makeState([], 39999)
        expect(canUnlock(NodeType.Assembly, state)).toBe(false)
    })

    it("Assembly unlocks at €40,000", () => {
        const state = makeState([], 40000)
        expect(canUnlock(NodeType.Assembly, state)).toBe(true)
    })
})

describe("buildCost", () => {
    it("returns the base cost for the first node (n=0 existing)", () => {
        // IronMine base = €50; first placement has 0 existing → €50.
        expect(buildCost(NodeType.IronMine, 0)).toBe(50)
    })

    it("returns base × 1.5 for the second node (n=1 existing)", () => {
        // IronMine: 50 × 1.5 = 75
        expect(buildCost(NodeType.IronMine, 1)).toBe(75)
    })

    it("returns base × 1.5² for the third node — example from design doc: €113", () => {
        // IronMine: 50 × 1.5² = 112.5 → ceil = 113
        expect(buildCost(NodeType.IronMine, 2)).toBe(113)
    })

    it("Splitter always costs €100 regardless of existing count (flat price)", () => {
        expect(buildCost(NodeType.Splitter, 0)).toBe(100)
        expect(buildCost(NodeType.Splitter, 1)).toBe(100)
        expect(buildCost(NodeType.Splitter, 5)).toBe(100)
    })

    it("Warehouse scales: €300, €450, €675 for 1st, 2nd, 3rd", () => {
        expect(buildCost(NodeType.Warehouse, 0)).toBe(300)
        expect(buildCost(NodeType.Warehouse, 1)).toBe(450)
        expect(buildCost(NodeType.Warehouse, 2)).toBe(675)
    })

    it("Market scales: €500, €750, €1125 for 1st, 2nd, 3rd", () => {
        expect(buildCost(NodeType.Market, 0)).toBe(500)
        expect(buildCost(NodeType.Market, 1)).toBe(750)
        expect(buildCost(NodeType.Market, 2)).toBe(1125)
    })

    it("income test: IronMine + EnergySupply earns ≥€50 within 2000 ticks", () => {
        // Minimal chain: 10 EnergySupply (pool) + 1 IronMine → Market.
        // IronMine produces 1 IronOre / 40 ticks. Market sells at €2.
        // In 2000 ticks the mine produces 50 ore → €100 earned.
        const mine: NodeInstance = {
            id: "mine",
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
        }
        const market: NodeInstance = {
            id: "market",
            type: NodeType.Market,
            position: { col: 2, row: 0 },
            progress: 0,
            status: "active",
            inputBuffers: [
                { resource: ResourceType.IronOre, amount: 0, capacity: 40 },
            ],
            outputBuffers: [],
            speedUpgradeLevel: 0,
            bufferUpgradeLevel: 0,
            efficiencyUpgradeLevel: 0,
            energyEfficiencyUpgradeLevel: 0,
            salesPoints: 1,
        }
        const esNodes: NodeInstance[] = Array.from({ length: 10 }, (_, i) => ({
            id: `es${i}`,
            type: NodeType.EnergySupply,
            position: { col: 0, row: 0 },
            progress: 0,
            status: "idle" as const,
            inputBuffers: [],
            outputBuffers: [
                { resource: ResourceType.Fuel, amount: 0, capacity: 200 },
            ],
            speedUpgradeLevel: 0,
            bufferUpgradeLevel: 0,
            efficiencyUpgradeLevel: 0,
            energyEfficiencyUpgradeLevel: 0,
        }))

        const state: GameState = {
            nodes: [...esNodes, mine, market],
            connections: [
                {
                    id: "c1",
                    fromNodeId: "mine",
                    fromDotIndex: 0,
                    toNodeId: "market",
                    toDotIndex: 0,
                    capacity: 10,
                    capacityUpgradeLevel: 0,
                },
            ],
            money: 0,
            totalEarned: 0,
            tick: 0,
        }

        for (let i = 0; i < 2000; i++) {
            tick(state)
            tickMarket(state)
        }

        expect(state.totalEarned).toBeGreaterThanOrEqual(50)
    })
})
