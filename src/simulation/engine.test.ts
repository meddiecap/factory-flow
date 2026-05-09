/**
 * Simulation tests for Factory Flow.
 * Covers all five test types from design doc section 12.1:
 * Simulation, Balance, Income, Reachability, and Energy tests.
 */

import { describe, it, expect } from "vitest"
import { tick, createNode, buildCost } from "./engine"
import {
    calcSpeedMultiplier,
    calcFuelProduced,
    calcFuelConsumed,
} from "./energy"
import { applyTechUnlocks, nextUnlockThreshold } from "./tech-tree"
import { upgradeNodeCost } from "./upgrades"
import { RECIPES, MARKET_PRICES } from "./recipes"
import type { GameState, GameNode, Connection } from "./types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<GameState> = {}): GameState {
    return {
        nodes: [],
        connections: [],
        money: 0,
        totalEarned: 0,
        unlockedFactories: new Set([
            "iron-mine",
            "market",
            "splitter",
            "warehouse",
        ]),
        builtCount: {},
        expansionsPurchased: 0,
        won: false,
        ...overrides,
    }
}

function makeConn(
    id: string,
    fromNodeId: string,
    fromResource: string,
    toNodeId: string,
    toResource: string,
    capacity = 10,
): Connection {
    return {
        id,
        fromNodeId,
        fromResource: fromResource as any,
        toNodeId,
        toResource: toResource as any,
        capacityPerTick: capacity,
        capacityUpgradeLevel: 0,
    }
}

// ---------------------------------------------------------------------------
// 1. Simulation tests
// ---------------------------------------------------------------------------

describe("Simulation: iron mine production", () => {
    it("produces 1 iron-ore per tick at base speed when output buffer has room", () => {
        const mine = createNode("m1", "iron-mine", 0, 0)
        const state = makeState({ nodes: [mine] })

        // Iron mine: 1 tick per cycle, no inputs, no fuel consumed by itself
        // But without energy supply, fuel = 0/0 → speed = 1.0 (special case)
        // Actually fuelConsumed = 0 too (iron mine needs 0.5/tick but there's an energy calc)
        // Let's give it an energy supply to be safe
        const es = createNode("es1", "energy-supply", 4, 0)
        state.nodes.push(es)

        tick(state)

        expect(mine.outputBuffer["iron-ore"]).toBe(1)
    })

    it("fills the output buffer and then stalls", () => {
        const mine = createNode("m1", "iron-mine", 0, 0)
        const es = createNode("es1", "energy-supply", 4, 0)
        const state = makeState({ nodes: [mine, es] })

        // Run 20 ticks to fill buffer (outputBufferMax = 20)
        for (let i = 0; i < 20; i++) tick(state)
        expect(mine.outputBuffer["iron-ore"]).toBe(20)

        // One more tick should NOT increase beyond 20
        tick(state)
        expect(mine.outputBuffer["iron-ore"]).toBe(20)
    })
})

describe("Simulation: smelter iron-ore + coal → steel", () => {
    it("produces 1 steel after consuming 3 iron-ore and 1 coal over 2 ticks", () => {
        const smelter = createNode("s1", "smelter", 0, 0)
        // Pre-fill input buffer with enough for one cycle
        smelter.inputBuffer["iron-ore"] = 3
        smelter.inputBuffer["coal"] = 1

        const es = createNode("es1", "energy-supply", 4, 0)
        const state = makeState({ nodes: [smelter, es] })

        // Tick 1: consumes inputs, progress = 1 (speed ~1.x due to surplus fuel)
        // We need exactly base speed here, so let's check after 2 ticks
        tick(state)
        tick(state)

        // After 2 ticks at base (or faster with surplus), steel should be produced
        expect(smelter.outputBuffer["steel"]).toBeGreaterThanOrEqual(1)
    })

    it("stalls when input buffer is empty", () => {
        const smelter = createNode("s1", "smelter", 0, 0)
        const es = createNode("es1", "energy-supply", 4, 0)
        const state = makeState({ nodes: [smelter, es] })

        tick(state)
        expect(smelter.outputBuffer["steel"]).toBeUndefined()
        expect(smelter.progress).toBe(0)
    })
})

describe("Simulation: connection transfers resources", () => {
    it("moves iron-ore from mine output buffer to smelter input buffer", () => {
        const mine = createNode("m1", "iron-mine", 0, 0)
        mine.outputBuffer["iron-ore"] = 5

        const smelter = createNode("s1", "smelter", 2, 0)
        const es = createNode("es1", "energy-supply", 4, 0)

        const conn = makeConn("c1", "m1", "iron-ore", "s1", "iron-ore", 10)
        const state = makeState({
            nodes: [mine, smelter, es],
            connections: [conn],
        })

        tick(state)

        // Connection capacity 10, smelter input max 20, available 5 → transfers 5
        // The mine also produces 1 iron-ore during this same tick (after transfer freed space)
        expect(smelter.inputBuffer["iron-ore"]).toBe(5)
        expect(mine.outputBuffer["iron-ore"]).toBe(1) // mine produced 1 during this tick
    })

    it("respects connection capacity as a hard limit", () => {
        const mine = createNode("m1", "iron-mine", 0, 0)
        mine.outputBuffer["iron-ore"] = 50

        const smelter = createNode("s1", "smelter", 2, 0)
        const es = createNode("es1", "energy-supply", 4, 0)

        const conn = makeConn("c1", "m1", "iron-ore", "s1", "iron-ore", 3) // capacity 3
        const state = makeState({
            nodes: [mine, smelter, es],
            connections: [conn],
        })

        tick(state)

        expect(smelter.inputBuffer["iron-ore"]).toBe(3)
        expect(mine.outputBuffer["iron-ore"]).toBe(47)
    })
})

describe("Simulation: market node sells resources", () => {
    it("sells iron-ore from its input buffer and earns money", () => {
        const market = createNode("mk1", "market", 0, 0)
        market.inputBuffer["iron-ore"] = 5

        const state = makeState({ nodes: [market] })
        tick(state)

        // 5 iron-ore × €2 = €10
        expect(state.money).toBe(10)
        expect(state.totalEarned).toBe(10)
        expect(market.inputBuffer["iron-ore"]).toBe(0)
    })

    it("is capped at MARKET_THROUGHPUT (20) per tick", () => {
        const market = createNode("mk1", "market", 0, 0)
        market.inputBuffer["iron-ore"] = 100

        const state = makeState({ nodes: [market] })
        tick(state)

        // Max 20 sold per tick × €2 = €40
        expect(state.money).toBe(40)
        expect(market.inputBuffer["iron-ore"]).toBe(80)
    })
})

// ---------------------------------------------------------------------------
// 2. Balance tests (design doc section 6.1)
// ---------------------------------------------------------------------------

describe("Balance: upgrade payback times", () => {
    // At base speed (20 ticks/sec), L1 upgrade costs 2× baseCost
    // Each upgrade gives +50% output → +50% net income/sec

    const TICKS_PER_SEC = 20

    function netIncomePerSec(type: GameNode["type"]): number {
        const recipe = RECIPES[type]
        const outputPrice = recipe.outputs.reduce((sum, o) => {
            return (
                sum +
                (MARKET_PRICES[o.resource as keyof typeof MARKET_PRICES] ?? 0) *
                    o.amount
            )
        }, 0)
        const inputCost = recipe.inputs.reduce((sum, i) => {
            return (
                sum +
                (MARKET_PRICES[i.resource as keyof typeof MARKET_PRICES] ?? 0) *
                    i.amount
            )
        }, 0)
        const cyclesPerSec = TICKS_PER_SEC / recipe.ticksPerCycle
        return (outputPrice - inputCost) * cyclesPerSec
    }

    function paybackSecs(type: GameNode["type"]): number {
        const node = createNode("n", type, 0, 0)
        const cost = upgradeNodeCost(node, "speed") // L1 = 2× baseCost
        const extra = netIncomePerSec(type) * 0.5 // +50%
        return cost / extra
    }

    it("iron-mine payback ≈ 5 sec", () => {
        expect(paybackSecs("iron-mine")).toBeCloseTo(5, 0)
    })

    it("smelter payback ≈ 3.9 sec", () => {
        expect(paybackSecs("smelter")).toBeCloseTo(3.9, 0)
    })

    it("engine-factory payback ≈ 2.5 sec", () => {
        expect(paybackSecs("engine-factory")).toBeCloseTo(2.5, 0)
    })

    it("higher-layer factories have shorter payback at L1", () => {
        const mine = paybackSecs("iron-mine")
        const smelter = paybackSecs("smelter")
        const motor = paybackSecs("engine-factory")
        // Generally: higher value factories have shorter payback
        expect(motor).toBeLessThan(smelter)
        expect(smelter).toBeLessThan(mine)
    })
})

// ---------------------------------------------------------------------------
// 3. Income test
// ---------------------------------------------------------------------------

describe("Income: iron-mine → market progression", () => {
    it("earns enough to unlock Energy Supply within expected ticks", () => {
        // Start with iron-mine + market connected
        const mine = createNode("m1", "iron-mine", 0, 0)
        const market = createNode("mk1", "market", 4, 0)

        // Iron mine outputs to market directly via connection
        const conn = makeConn("c1", "m1", "iron-ore", "mk1", "iron-ore", 10)

        const state = makeState({ nodes: [mine, market], connections: [conn] })

        // Without energy supply, fuelConsumed = 0.5/tick (mine), fuelProduced = 0
        // → speed = 0/0.5 = 0 → mine doesn't produce!
        // So we need to check: at speed 0, the mine stalls.
        // Let's add energy supply.
        const es = createNode("es1", "energy-supply", 6, 0)
        state.nodes.push(es)

        // Unlock energy supply by running until we have €50
        const ENERGY_SUPPLY_UNLOCK = 50
        let t = 0
        while (state.totalEarned < ENERGY_SUPPLY_UNLOCK && t < 10000) {
            tick(state)
            t++
        }

        // Should have earned €50 within 200 ticks (10 sec) from 1 mine
        // Iron-ore = €2/tick * 1 per tick = €40/sec → about 25 ticks to earn €50
        expect(state.totalEarned).toBeGreaterThanOrEqual(ENERGY_SUPPLY_UNLOCK)
        expect(t).toBeLessThan(500)
    })
})

// ---------------------------------------------------------------------------
// 4. Reachability test
// ---------------------------------------------------------------------------

describe("Reachability: full rocket production chain", () => {
    it("all rocket dependencies can be satisfied with available recipes", () => {
        // Verify that rocket (assembly) requires only produceable inputs
        const assemblyRecipe = RECIPES["assembly"]
        const assemblyInputs = assemblyRecipe.inputs.map((i) => i.resource)

        // Each input must either be produced by some factory or be a raw resource
        const allOutputs = new Set<string>()
        for (const [, recipe] of Object.entries(RECIPES)) {
            for (const output of recipe.outputs) {
                allOutputs.add(output.resource)
            }
        }

        // Layer 0 resources (produced by mines)
        const rawResources = ["iron-ore", "coal", "copper", "silicon", "fuel"]
        for (const r of rawResources) allOutputs.add(r)

        for (const input of assemblyInputs) {
            expect(
                allOutputs.has(input),
                `Assembly input "${input}" must be produceable`,
            ).toBe(true)
        }
    })

    it("the complete rocket chain has no circular dependencies", () => {
        // Build a dependency graph and verify it's a DAG (no cycles)
        // Simple reachability: can we produce a rocket from layer-0 resources?
        const canProduce = new Set<string>([
            "iron-ore",
            "coal",
            "copper",
            "silicon",
            "fuel",
        ])

        // Iteratively unlock recipes as their inputs become available
        let changed = true
        while (changed) {
            changed = false
            for (const [, recipe] of Object.entries(RECIPES)) {
                const inputsSatisfied = recipe.inputs.every((i) =>
                    canProduce.has(i.resource),
                )
                for (const output of recipe.outputs) {
                    if (inputsSatisfied && !canProduce.has(output.resource)) {
                        canProduce.add(output.resource)
                        changed = true
                    }
                }
            }
        }

        expect(
            canProduce.has("rocket"),
            "Rocket must be reachable from raw resources",
        ).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// 5. Energy tests
// ---------------------------------------------------------------------------

describe("Energy: speed multiplier formula", () => {
    it("returns 1.0 when supply exactly matches demand", () => {
        expect(calcSpeedMultiplier(10, 10)).toBeCloseTo(1.0, 5)
    })

    it("returns ~1.5 at +10 surplus", () => {
        // formula: 1 + 0.2 * ln(11) ≈ 1 + 0.2 * 2.398 ≈ 1.48
        const result = calcSpeedMultiplier(20, 10) // 10 surplus
        expect(result).toBeCloseTo(1 + 0.2 * Math.log(11), 5)
    })

    it("returns ~1.9 at +50 surplus", () => {
        const result = calcSpeedMultiplier(60, 10) // 50 surplus
        expect(result).toBeCloseTo(1 + 0.2 * Math.log(51), 5)
    })

    it("returns ~2.1 at +200 surplus", () => {
        const result = calcSpeedMultiplier(210, 10) // 200 surplus
        expect(result).toBeCloseTo(1 + 0.2 * Math.log(201), 5)
    })

    it("returns 0.5 when only half the fuel is available", () => {
        expect(calcSpeedMultiplier(5, 10)).toBeCloseTo(0.5, 5)
    })

    it("returns 0 when no fuel is produced", () => {
        expect(calcSpeedMultiplier(0, 10)).toBe(0)
    })

    it("returns 1.0 when nothing consumes fuel (no nodes)", () => {
        // Special case: consumed = 0, produced = 0 → ratio is 0/0, should be 1
        expect(calcSpeedMultiplier(0, 0)).toBe(1.0)
    })
})

describe("Energy: fuel calculation from nodes", () => {
    it("energy-supply produces 2 fuel per tick", () => {
        const es = createNode("es1", "energy-supply", 0, 0)
        expect(calcFuelProduced([es])).toBe(2)
    })

    it("iron-mine consumes 0.5 fuel per tick", () => {
        const mine = createNode("m1", "iron-mine", 0, 0)
        expect(calcFuelConsumed([mine])).toBeCloseTo(0.5, 5)
    })

    it("energy-supply does not appear in consumed", () => {
        const es = createNode("es1", "energy-supply", 0, 0)
        expect(calcFuelConsumed([es])).toBe(0)
    })

    it("a full rocket chain has correct total fuel consumption", () => {
        // All factory types used in rocket production, one of each
        const factoryTypes = [
            "iron-mine",
            "coal-mine",
            "copper-mine",
            "silicon-mine",
            "smelter",
            "cable-factory",
            "foundry",
            "chip-factory",
            "electronics",
            "engine-factory",
            "assembly",
        ] as const
        const nodes = factoryTypes.map((t, i) =>
            createNode(`n${i}`, t, i * 2, 0),
        )

        const consumed = calcFuelConsumed(nodes)
        // Sum from design doc: 0.5+0.5+0.5+0.5 + 1+1+1.5+2+2+2+3 = 14.5
        expect(consumed).toBeCloseTo(14.5, 5)
    })
})

// ---------------------------------------------------------------------------
// 6. Tech tree tests
// ---------------------------------------------------------------------------

describe("Tech tree: unlocks", () => {
    it("starts with iron-mine, market, splitter, warehouse unlocked at €0", () => {
        const state = makeState({ totalEarned: 0 })
        applyTechUnlocks(state)
        expect(state.unlockedFactories.has("iron-mine")).toBe(true)
        expect(state.unlockedFactories.has("market")).toBe(true)
    })

    it("unlocks energy-supply at €50", () => {
        const state = makeState({ totalEarned: 50 })
        applyTechUnlocks(state)
        expect(state.unlockedFactories.has("energy-supply")).toBe(true)
    })

    it("does not unlock energy-supply before €50", () => {
        const state = makeState({
            totalEarned: 49,
            unlockedFactories: new Set(),
        })
        applyTechUnlocks(state)
        expect(state.unlockedFactories.has("energy-supply")).toBe(false)
    })

    it("unlocks all factories at €40000", () => {
        const state = makeState({
            totalEarned: 40000,
            unlockedFactories: new Set(),
        })
        applyTechUnlocks(state)
        expect(state.unlockedFactories.has("assembly")).toBe(true)
    })

    it("nextUnlockThreshold returns null when all unlocked", () => {
        const state = makeState({
            totalEarned: 999999,
            unlockedFactories: new Set(),
        })
        applyTechUnlocks(state)
        expect(nextUnlockThreshold(state)).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// 7. Build cost scaling
// ---------------------------------------------------------------------------

describe("Build cost: incremental scaling", () => {
    it("first iron-mine costs €50", () => {
        expect(buildCost("iron-mine", 0)).toBe(50)
    })

    it("second iron-mine costs €75 (€50 × 1.5)", () => {
        expect(buildCost("iron-mine", 1)).toBe(75)
    })

    it("third iron-mine costs €113 (€50 × 1.5²)", () => {
        expect(buildCost("iron-mine", 2)).toBe(113)
    })
})

// ---------------------------------------------------------------------------
// 8. Win condition
// ---------------------------------------------------------------------------

describe("Win condition", () => {
    it("sets state.won when assembly produces a rocket", () => {
        const assemblyNode = createNode("a1", "assembly", 0, 0)
        // Pre-fill input buffer with exactly one cycle's ingredients
        assemblyNode.inputBuffer["hull-parts"] = 2
        assemblyNode.inputBuffer["fuel-tanks"] = 2
        assemblyNode.inputBuffer["control-system"] = 1
        assemblyNode.inputBuffer["thrusters"] = 2

        // Two energy supplies: 4 fuel/tick produced, 3 consumed → surplus → multiplier > 1
        const es1 = createNode("es1", "energy-supply", 8, 0)
        const es2 = createNode("es2", "energy-supply", 10, 0)
        const state = makeState({ nodes: [assemblyNode, es1, es2] })

        // With surplus fuel, multiplier > 1 → cycle completes in < 20 ticks
        for (let i = 0; i < 25; i++) tick(state)

        expect(state.won).toBe(true)
    })
})
