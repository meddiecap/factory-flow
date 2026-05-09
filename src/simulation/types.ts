/**
 * All resource types that exist in the game, ordered by production layer.
 * Used throughout the simulation to identify goods flowing through connections.
 */
export enum ResourceType {
    // Layer 0 – Raw materials
    IronOre = "IronOre",
    Coal = "Coal",
    Copper = "Copper",
    Silicon = "Silicon",
    // Layer 1 – Energy
    Fuel = "Fuel",
    // Layer 2 – Semi-finished goods
    Steel = "Steel",
    Cables = "Cables",
    // Layer 3 – Components
    HullParts = "HullParts",
    FuelTanks = "FuelTanks",
    Circuits = "Circuits",
    ControlSystem = "ControlSystem",
    // Layer 4 – Products
    Thrusters = "Thrusters",
    // Layer 5 – End product (win condition)
    Rocket = "Rocket",
}

/**
 * All placeable node types on the canvas, including special utility nodes.
 * Each type maps to a static NodeDef that describes its recipe and properties.
 */
export enum NodeType {
    // Layer 0 – Raw material sources
    IronMine = "IronMine",
    CoalMine = "CoalMine",
    CopperMine = "CopperMine",
    SiliconMine = "SiliconMine",
    // Energy
    EnergySupply = "EnergySupply",
    // Layer 2 – Processing
    Smelter = "Smelter",
    CableFactory = "CableFactory",
    // Layer 3 – Component manufacturing
    Foundry = "Foundry",
    ChipFactory = "ChipFactory",
    Electronics = "Electronics",
    EngineFactory = "EngineFactory",
    // Layer 4/5 – Final assembly
    Assembly = "Assembly",
    // Special utility nodes
    Splitter = "Splitter",
    Warehouse = "Warehouse",
    Market = "Market",
}

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
    resource: ResourceType
    /** Current number of units stored. */
    amount: number
    /** Maximum number of units this buffer slot can hold. */
    capacity: number
}

/**
 * One ingredient required per production cycle.
 * Used in NodeDef.inputs to describe recipe requirements.
 */
export interface RecipeInput {
    resource: ResourceType
    /** Amount consumed from the input buffer per cycle. */
    amount: number
}

/**
 * One item produced per production cycle.
 * Used in NodeDef.outputs to describe what a node creates.
 */
export interface RecipeOutput {
    resource: ResourceType
    /** Amount added to the output buffer per cycle. */
    amount: number
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

/**
 * A directed connection between the output dot of one node and the input dot of another.
 * Goods flow from the source node's output buffer to the target node's input buffer each tick.
 */
export interface Connection {
    /** Unique identifier for this connection. */
    id: string
    fromNodeId: string
    /** Index of the output dot on the source node (0-based). */
    fromDotIndex: number
    toNodeId: string
    /** Index of the input dot on the target node (0-based). */
    toDotIndex: number
    /**
     * Maximum units that can flow through this connection per tick.
     * Base value is 10; increased by line capacity upgrades.
     */
    capacity: number
    /** Line capacity upgrade level; each level adds +10 units/tick. */
    capacityUpgradeLevel: number
    /**
     * True when this connection carries energy from an Energy Supply to a factory.
     * Energy connections are drawn in yellow and processed separately from resource flow.
     */
    isEnergy?: boolean
}

/**
 * Complete runtime state of one game session.
 * Passed to every simulation tick function and persisted to localStorage.
 */
export interface GameState {
    nodes: NodeInstance[]
    connections: Connection[]
    /** Current spendable money in whole currency units (€). */
    money: number
    /** Cumulative money earned this run; used for tech tree unlock thresholds. */
    totalEarned: number
    /** Number of simulation ticks elapsed since the run started. */
    tick: number
    /**
     * Transfer events from the most recent tick, used by the renderer to spawn
     * particle animations. Not persisted to localStorage.
     */
    lastTransfers?: import("./connections").TransferEvent[]
}
