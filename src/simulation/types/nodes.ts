import type { RecipeInput, RecipeOutput } from "./resources"

/**
 * All placeable node types on the canvas, including special utility nodes.
 * Each type maps to a static NodeDef that describes its recipe and properties.
 */
export const NodeType = {
    // Layer 0 – Raw material sources
    IronMine: "IronMine",
    CoalMine: "CoalMine",
    CopperMine: "CopperMine",
    SiliconMine: "SiliconMine",
    // Energy
    EnergySupply: "EnergySupply",
    // Layer 2 – Processing
    Smelter: "Smelter",
    CableFactory: "CableFactory",
    // Layer 3 – Component manufacturing
    Foundry: "Foundry",
    ChipFactory: "ChipFactory",
    Electronics: "Electronics",
    EngineFactory: "EngineFactory",
    // Layer 4/5 – Final assembly
    Assembly: "Assembly",
    // Special utility nodes
    Splitter: "Splitter",
    Market: "Market",
} as const
export type NodeType = (typeof NodeType)[keyof typeof NodeType]

/**
 * Operational status of a node during simulation.
 * Drives whether progress increases and fuel is consumed each tick.
 */
export type NodeStatus =
    | "active"
    | "waiting"
    | "output-blocked"
    | "idle"
    | "no-energy"

/**
 * A single resource slot in a node's input or output buffer.
 * Tracks current stock and the maximum it can hold.
 */
export interface Buffer {
    resource: import("./resources").ResourceType
    /** Current number of units stored. */
    amount: number
    /** Maximum number of units this buffer slot can hold. */
    capacity: number
}

/**
 * The footprint of a node on the 2D grid, measured in grid cells.
 */
export interface GridSize {
    /** Width in columns. */
    width: number
    /** Height in rows. */
    height: number
}

/**
 * Static definition of a factory type: recipe, timing, costs and layout.
 * Shared across all instances of the same NodeType; never mutated at runtime.
 */
export interface NodeDef {
    /** Human-readable label shown on the canvas and in the palette. */
    displayName: string
    /** Resources consumed from input buffers each production cycle. */
    inputs: RecipeInput[]
    /** Resources added to output buffers each production cycle. */
    outputs: RecipeOutput[]
    /**
     * Number of ticks for one production cycle.
     * Set to 0 for pass-through nodes (Splitter, Warehouse, Market).
     */
    cycleDuration: number
    /** Base purchase price in currency units (€). */
    buildCost: number
    /**
     * Energy units consumed per tick from the connected Energy Supply.
     * Used to compute the per-node speedFactor in the energy system.
     * EnergySupply and utility nodes set this to 0.
     */
    fuelPerTick: number
    /**
     * Whether this node requires an explicit energy connection to operate.
     * True for all production factories; false for EnergySupply, Splitter, Market, Warehouse.
     */
    hasEnergyInput?: boolean
    /**
     * Energy units produced per tick (EnergySupply only).
     * Autonomous: no cycle, no input required. Distributed equally over all connected factories.
     */
    energyOutputPerTick?: number
    /** Grid footprint of this node type. */
    gridSize: GridSize
    /** Default capacity of each input buffer slot at placement. */
    defaultInputCapacity: number
    /** Default capacity of each output buffer slot at placement. */
    defaultOutputCapacity: number
}

/**
 * Runtime instance of a factory node placed on the canvas.
 * Holds mutable simulation state: position, buffers, progress and upgrade levels.
 */
export interface NodeInstance {
    /** Unique identifier for this node instance. */
    id: string
    type: NodeType
    /** Top-left grid position of the node (0-indexed column and row). */
    position: { col: number; row: number }
    /**
     * Fractional cycle progress (0.0 up to cycleDuration).
     * Incremented each tick by the current speed factor.
     */
    progress: number
    status: NodeStatus
    /** One Buffer entry per recipe input slot. */
    inputBuffers: Buffer[]
    /** One Buffer entry per recipe output slot. */
    outputBuffers: Buffer[]
    /** Speed upgrade level; each level multiplies cycle speed by ×1.5. */
    speedUpgradeLevel: number
    /** Buffer upgrade level; each level adds +10 capacity to all buffer slots. */
    bufferUpgradeLevel: number
    /** Efficiency upgrade level; each level reduces input consumption by 10% (min 50%). */
    efficiencyUpgradeLevel: number
    /** Energy efficiency upgrade level; reduces fuelPerTick by 10% per level (min 50%). */
    energyEfficiencyUpgradeLevel: number
    /** Energy output upgrade level (EnergySupply only); each level adds +1.0 energyOutputPerTick. */
    energyOutputUpgradeLevel: number
    /**
     * Number of active sales points (Market only).
     * Starts at 1; each Verkooppunten upgrade adds 1.
     */
    salesPoints?: number
    /**
     * Internal accumulators for fractional distribution (Splitter only).
     * Indexed by output dot; accumulates ratio each tick until ≥ 1 to dispatch a unit.
     */
    splitterAccumulators?: [number, number]
    /**
     * Split ratio for output A (Splitter only), value between 0 and 1.
     * Output B receives (1 - ratioA).
     */
    splitterRatioA?: number
}
