/**
 * Static game data: recipes, market prices, tech tree, and default buffer sizes.
 * All values sourced directly from the game design document (sections 4.5, 5.2, 7.1).
 */

import type { FactoryType, Recipe, ResourceId, TechUnlock } from "./types"

// ---------------------------------------------------------------------------
// Recipes (design doc section 4.5)
// ---------------------------------------------------------------------------

/** All factory recipes keyed by factory type. */
export const RECIPES: Record<FactoryType, Recipe> = {
    "iron-mine": {
        inputs: [],
        outputs: [{ resource: "iron-ore", amount: 1 }],
        ticksPerCycle: 1,
        fuelPerTick: 0.5,
        baseCost: 50,
        gridSize: [2, 1],
    },
    "coal-mine": {
        inputs: [],
        outputs: [{ resource: "coal", amount: 1 }],
        ticksPerCycle: 1,
        fuelPerTick: 0.5,
        baseCost: 60,
        gridSize: [2, 1],
    },
    "copper-mine": {
        inputs: [],
        outputs: [{ resource: "copper", amount: 1 }],
        ticksPerCycle: 1,
        fuelPerTick: 0.5,
        baseCost: 80,
        gridSize: [2, 1],
    },
    "silicon-mine": {
        inputs: [],
        outputs: [{ resource: "silicon", amount: 1 }],
        ticksPerCycle: 1,
        fuelPerTick: 0.5,
        baseCost: 80,
        gridSize: [2, 1],
    },
    "energy-supply": {
        inputs: [],
        outputs: [{ resource: "fuel", amount: 2 }],
        ticksPerCycle: 1,
        fuelPerTick: 0, // Energy Supply does not consume fuel
        baseCost: 150,
        gridSize: [2, 1],
    },
    smelter: {
        inputs: [
            { resource: "iron-ore", amount: 3 },
            { resource: "coal", amount: 1 },
        ],
        outputs: [{ resource: "steel", amount: 1 }],
        ticksPerCycle: 2,
        fuelPerTick: 1,
        baseCost: 500,
        gridSize: [2, 2],
    },
    "cable-factory": {
        inputs: [{ resource: "copper", amount: 2 }],
        outputs: [{ resource: "cables", amount: 1 }],
        ticksPerCycle: 2,
        fuelPerTick: 1,
        baseCost: 400,
        gridSize: [2, 2],
    },
    foundry: {
        inputs: [{ resource: "steel", amount: 4 }],
        outputs: [
            { resource: "hull-parts", amount: 1 },
            { resource: "fuel-tanks", amount: 1 },
        ],
        ticksPerCycle: 4,
        fuelPerTick: 1.5,
        baseCost: 1000,
        gridSize: [2, 2],
    },
    "chip-factory": {
        inputs: [
            { resource: "silicon", amount: 2 },
            { resource: "cables", amount: 3 },
        ],
        outputs: [{ resource: "circuits", amount: 1 }],
        ticksPerCycle: 4,
        fuelPerTick: 2,
        baseCost: 3000,
        gridSize: [2, 2],
    },
    electronics: {
        inputs: [{ resource: "circuits", amount: 2 }],
        outputs: [{ resource: "control-system", amount: 1 }],
        ticksPerCycle: 4,
        fuelPerTick: 2,
        baseCost: 6000,
        gridSize: [2, 2],
    },
    "engine-factory": {
        // Note: also consumes 2 fuel per cycle via recipe input (on top of 2/tick from global pool)
        inputs: [
            { resource: "steel", amount: 4 },
            { resource: "fuel", amount: 2 },
        ],
        outputs: [{ resource: "thrusters", amount: 1 }],
        ticksPerCycle: 4,
        fuelPerTick: 2,
        baseCost: 15000,
        gridSize: [2, 2],
    },
    assembly: {
        inputs: [
            { resource: "hull-parts", amount: 2 },
            { resource: "fuel-tanks", amount: 2 },
            { resource: "control-system", amount: 1 },
            { resource: "thrusters", amount: 2 },
        ],
        outputs: [{ resource: "rocket", amount: 1 }],
        ticksPerCycle: 20,
        fuelPerTick: 3,
        baseCost: 50000,
        gridSize: [4, 3],
    },
    splitter: {
        inputs: [], // Handled separately in engine
        outputs: [], // Handled separately in engine
        ticksPerCycle: 1,
        fuelPerTick: 0,
        baseCost: 0, // Free utility node
        gridSize: [2, 1],
    },
    warehouse: {
        inputs: [], // Acts as a passthrough buffer
        outputs: [],
        ticksPerCycle: 1,
        fuelPerTick: 0,
        baseCost: 0,
        gridSize: [2, 2],
    },
    market: {
        inputs: [], // Sink node, handled separately
        outputs: [],
        ticksPerCycle: 1,
        fuelPerTick: 0,
        baseCost: 0,
        gridSize: [2, 1],
    },
}

// ---------------------------------------------------------------------------
// Market prices (design doc section 5.2)
// ---------------------------------------------------------------------------

/** Sell price for each resource at the market. */
export const MARKET_PRICES: Partial<Record<ResourceId, number>> = {
    "iron-ore": 2,
    coal: 3,
    copper: 4,
    silicon: 4,
    fuel: 10,
    steel: 60,
    cables: 40,
    "hull-parts": 250,
    "fuel-tanks": 200,
    circuits: 400,
    "control-system": 1600,
    thrusters: 5000,
    // 'rocket' is the win condition, not sellable
}

// ---------------------------------------------------------------------------
// Default buffer sizes per factory category (design doc section 4.3)
// ---------------------------------------------------------------------------

/** Default [inputBufferMax, outputBufferMax] for each factory type. */
export const DEFAULT_BUFFERS: Record<FactoryType, [number, number]> = {
    "iron-mine": [0, 20],
    "coal-mine": [0, 20],
    "copper-mine": [0, 20],
    "silicon-mine": [0, 20],
    "energy-supply": [0, 20],
    smelter: [20, 10],
    "cable-factory": [20, 10],
    foundry: [10, 10],
    "chip-factory": [10, 10],
    electronics: [10, 5],
    "engine-factory": [10, 5],
    assembly: [10, 1],
    splitter: [20, 20],
    warehouse: [200, 200],
    market: [20, 0],
}

// ---------------------------------------------------------------------------
// Tech tree unlock table (design doc section 7.1)
// ---------------------------------------------------------------------------

/** Ordered unlock tiers. Checked each tick against totalEarned. */
export const TECH_UNLOCKS: TechUnlock[] = [
    {
        factories: ["iron-mine", "market", "splitter", "warehouse"],
        requiredEarned: 0,
    },
    {
        factories: ["energy-supply"],
        requiredEarned: 50,
    },
    {
        factories: ["coal-mine", "copper-mine", "silicon-mine"],
        requiredEarned: 200,
    },
    {
        factories: ["smelter"],
        requiredEarned: 800,
    },
    {
        factories: ["foundry", "cable-factory"],
        requiredEarned: 3000,
    },
    {
        factories: ["chip-factory", "electronics", "engine-factory"],
        requiredEarned: 15000,
    },
    {
        factories: ["assembly"],
        requiredEarned: 40000,
    },
]

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Ticks per second at base simulation speed. */
export const TICKS_PER_SECOND = 20

/** Default connection capacity in units per tick. */
export const DEFAULT_LINE_CAPACITY = 10

/** Market node maximum throughput in units per tick. */
export const MARKET_THROUGHPUT = 20

/** Starting canvas dimensions. */
export const CANVAS_START_COLS = 20
export const CANVAS_START_ROWS = 12

/** Upgrade: speed multiplier is 1.5^level (multiplicative). */
export const SPEED_UPGRADE_FACTOR = 1.5

/** Upgrade: buffer increase per level (units). */
export const BUFFER_UPGRADE_STEP = 10

/** Upgrade: efficiency reduction per level (fraction). Minimum 0.5 of base. */
export const EFFICIENCY_UPGRADE_REDUCTION = 0.1

/** Upgrade: line capacity increase per level (units/tick). */
export const LINE_CAPACITY_UPGRADE_STEP = 10

/** Upgrade: energy efficiency reduction per level (fraction). Minimum 0.5 of base. */
export const ENERGY_EFFICIENCY_UPGRADE_REDUCTION = 0.1

/** Upgrade cost multiplier per level after the first. */
export const UPGRADE_COST_MULTIPLIER = 3

/** Incremental build cost scaling factor per additional factory of the same type. */
export const BUILD_COST_SCALING = 1.5

/** Canvas expansion base cost. */
export const EXPANSION_BASE_COST = 200

/** Canvas expansion cost scaling factor per purchase. */
export const EXPANSION_COST_SCALING = 1.5
