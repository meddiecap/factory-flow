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
