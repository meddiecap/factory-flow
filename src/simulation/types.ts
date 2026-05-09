/**
 * Core type definitions for the Factory Flow simulation layer.
 * All simulation types are plain objects; no DOM or canvas dependencies here.
 */

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

/** Every distinct resource in the game. */
export type ResourceId =
    | "iron-ore"
    | "coal"
    | "copper"
    | "silicon"
    | "fuel"
    | "steel"
    | "cables"
    | "hull-parts"
    | "fuel-tanks"
    | "circuits"
    | "control-system"
    | "thrusters"
    | "rocket"

// ---------------------------------------------------------------------------
// Factory types
// ---------------------------------------------------------------------------

/** Every placeable factory type, including special nodes. */
export type FactoryType =
    | "iron-mine"
    | "coal-mine"
    | "copper-mine"
    | "silicon-mine"
    | "energy-supply"
    | "smelter"
    | "cable-factory"
    | "foundry"
    | "chip-factory"
    | "electronics"
    | "engine-factory"
    | "assembly"
    | "splitter"
    | "warehouse"
    | "market"

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

/** One ingredient in a recipe (resource + amount per cycle). */
export interface RecipeIngredient {
    resource: ResourceId
    amount: number
}

/** Production recipe for a factory type. */
export interface Recipe {
    /** Inputs consumed per production cycle. Empty for source nodes. */
    inputs: RecipeIngredient[]
    /** Outputs produced per production cycle. */
    outputs: RecipeIngredient[]
    /** Duration of one production cycle in ticks at base speed. */
    ticksPerCycle: number
    /** Fuel consumed from the global energy pool per tick (0 for Energy Supply). */
    fuelPerTick: number
    /** Base build cost in money units. */
    baseCost: number
    /** Grid size [columns, rows]. */
    gridSize: [number, number]
}

// ---------------------------------------------------------------------------
// Upgrades
// ---------------------------------------------------------------------------

export type UpgradeType =
    | "speed"
    | "buffer"
    | "efficiency"
    | "line-capacity"
    | "energy-efficiency"

/** Upgrade state for a single node. */
export interface NodeUpgrades {
    speed: number
    buffer: number
    efficiency: number
    energyEfficiency: number
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

/**
 * A single factory (or special node) placed on the canvas grid.
 * Positions are in grid coordinates (col, row), not pixels.
 */
export interface GameNode {
    id: string
    type: FactoryType
    /** Top-left grid position. */
    col: number
    row: number
    /** Current input buffer: resource → amount. */
    inputBuffer: Partial<Record<ResourceId, number>>
    /** Current output buffer: resource → amount. */
    outputBuffer: Partial<Record<ResourceId, number>>
    /** Max size of each input buffer slot (per resource). */
    inputBufferMax: number
    /** Max size of each output buffer slot (per resource). */
    outputBufferMax: number
    /**
     * Fractional cycle progress (0.0 – cycleLength).
     * Incremented each tick by the speed factor; triggers output when ≥ ticksPerCycle.
     */
    progress: number
    /** Per-node upgrade levels. */
    upgrades: NodeUpgrades
    /** For Splitter: ratio sent to the first output (0–1). */
    splitRatio?: number
    /** For Splitter: internal fractional accumulators [outputA, outputB]. */
    splitAccumulator?: [number, number]
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

/**
 * A directed connection from one node's output dot to another node's input dot.
 * One connection per dot is enforced by the UI layer.
 */
export interface Connection {
    id: string
    fromNodeId: string
    /** Which output resource this connection carries (must match a recipe output). */
    fromResource: ResourceId
    toNodeId: string
    /** Which input resource slot this connects to. */
    toResource: ResourceId
    /** Maximum units transferred per tick. */
    capacityPerTick: number
    /** Current upgrade level of the line capacity. */
    capacityUpgradeLevel: number
}

// ---------------------------------------------------------------------------
// Tech tree
// ---------------------------------------------------------------------------

/** An entry in the tech tree unlock table. */
export interface TechUnlock {
    factories: FactoryType[]
    /** Total money earned required to unlock this group. */
    requiredEarned: number
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

/**
 * The complete serialisable game state.
 * Consumed and updated by the tick engine each simulation step.
 */
export interface GameState {
    nodes: GameNode[]
    connections: Connection[]
    /** Player's current money balance. */
    money: number
    /** Total money ever earned (drives tech tree unlocks). */
    totalEarned: number
    /** Set of factory types the player has unlocked. */
    unlockedFactories: Set<FactoryType>
    /** How many of each factory type have been built (for incremental cost scaling). */
    builtCount: Partial<Record<FactoryType, number>>
    /** Number of canvas expansion purchases (for cost scaling). */
    expansionsPurchased: number
    /** Whether the player has won this run. */
    won: boolean
}

// ---------------------------------------------------------------------------
// Tick result
// ---------------------------------------------------------------------------

/**
 * Summary of what happened during a single tick.
 * Used by the UI layer to animate or display feedback.
 */
export interface TickResult {
    /** Money earned this tick (from market nodes). */
    moneyEarned: number
    /** Global fuel speed multiplier applied this tick. */
    speedMultiplier: number
    /** Whether the win condition was triggered. */
    wonThisTick: boolean
}
