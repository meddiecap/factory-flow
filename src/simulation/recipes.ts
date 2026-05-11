import { NodeType, ResourceType } from "./types"
import type { NodeDef } from "./types"

/**
 * Static definitions for all node types, keyed by NodeType.
 * Provides the recipe, timing, costs and layout for every factory the player can build.
 * This record is the single source of truth for simulation and UI rendering.
 */
export const NODE_DEFS: Record<NodeType, NodeDef> = {
    [NodeType.IronMine]: {
        displayName: "Iron Mine",
        inputs: [],
        outputs: [{ resource: ResourceType.IronOre, amount: 1 }],
        cycleDuration: 40,
        buildCost: 50,
        fuelPerTick: 0.5,
        hasEnergyInput: true,
        gridSize: { width: 4, height: 2 },
        defaultInputCapacity: 0,
        defaultOutputCapacity: 20,
    },

    [NodeType.CoalMine]: {
        displayName: "Coal Mine",
        inputs: [],
        outputs: [{ resource: ResourceType.Coal, amount: 1 }],
        cycleDuration: 40,
        buildCost: 60,
        fuelPerTick: 0.5,
        hasEnergyInput: true,
        gridSize: { width: 4, height: 2 },
        defaultInputCapacity: 0,
        defaultOutputCapacity: 20,
    },

    [NodeType.CopperMine]: {
        displayName: "Copper Mine",
        inputs: [],
        outputs: [{ resource: ResourceType.Copper, amount: 1 }],
        cycleDuration: 40,
        buildCost: 80,
        fuelPerTick: 0.5,
        hasEnergyInput: true,
        gridSize: { width: 4, height: 2 },
        defaultInputCapacity: 0,
        defaultOutputCapacity: 20,
    },

    [NodeType.SiliconMine]: {
        displayName: "Silicon Mine",
        inputs: [],
        outputs: [{ resource: ResourceType.Silicon, amount: 1 }],
        cycleDuration: 40,
        buildCost: 80,
        fuelPerTick: 0.5,
        hasEnergyInput: true,
        gridSize: { width: 4, height: 2 },
        defaultInputCapacity: 0,
        defaultOutputCapacity: 20,
    },

    [NodeType.EnergySupply]: {
        displayName: "Energy Supply",
        inputs: [],
        outputs: [],
        cycleDuration: 0,
        buildCost: 150,
        fuelPerTick: 0,
        energyOutputPerTick: 1.0,
        gridSize: { width: 4, height: 2 },
        defaultInputCapacity: 0,
        defaultOutputCapacity: 0,
    },

    [NodeType.Smelter]: {
        displayName: "Smelter",
        inputs: [
            { resource: ResourceType.IronOre, amount: 3 },
            { resource: ResourceType.Coal, amount: 1 },
        ],
        outputs: [{ resource: ResourceType.Steel, amount: 1 }],
        cycleDuration: 80,
        buildCost: 500,
        fuelPerTick: 1,
        hasEnergyInput: true,
        gridSize: { width: 4, height: 4 },
        defaultInputCapacity: 20,
        defaultOutputCapacity: 10,
    },

    [NodeType.CableFactory]: {
        displayName: "Cable Factory",
        inputs: [{ resource: ResourceType.Copper, amount: 2 }],
        outputs: [{ resource: ResourceType.Cables, amount: 1 }],
        cycleDuration: 80,
        buildCost: 400,
        fuelPerTick: 1,
        hasEnergyInput: true,
        gridSize: { width: 4, height: 4 },
        defaultInputCapacity: 20,
        defaultOutputCapacity: 10,
    },

    [NodeType.Foundry]: {
        displayName: "Foundry",
        inputs: [{ resource: ResourceType.Steel, amount: 4 }],
        outputs: [
            { resource: ResourceType.HullParts, amount: 1 },
            { resource: ResourceType.FuelTanks, amount: 1 },
        ],
        cycleDuration: 160,
        buildCost: 1000,
        fuelPerTick: 1.5,
        hasEnergyInput: true,
        gridSize: { width: 4, height: 4 },
        defaultInputCapacity: 10,
        defaultOutputCapacity: 10,
    },

    [NodeType.ChipFactory]: {
        displayName: "Chip Factory",
        inputs: [
            { resource: ResourceType.Silicon, amount: 2 },
            { resource: ResourceType.Cables, amount: 3 },
        ],
        outputs: [{ resource: ResourceType.Circuits, amount: 1 }],
        cycleDuration: 160,
        buildCost: 3000,
        fuelPerTick: 2,
        hasEnergyInput: true,
        gridSize: { width: 4, height: 4 },
        defaultInputCapacity: 10,
        defaultOutputCapacity: 10,
    },

    [NodeType.Electronics]: {
        displayName: "Electronics",
        inputs: [{ resource: ResourceType.Circuits, amount: 2 }],
        outputs: [{ resource: ResourceType.ControlSystem, amount: 1 }],
        cycleDuration: 160,
        buildCost: 6000,
        fuelPerTick: 2,
        hasEnergyInput: true,
        gridSize: { width: 4, height: 4 },
        defaultInputCapacity: 10,
        defaultOutputCapacity: 5,
    },

    [NodeType.EngineFactory]: {
        displayName: "Engine Factory",
        inputs: [
            { resource: ResourceType.Steel, amount: 4 },
            { resource: ResourceType.Coal, amount: 2 },
        ],
        outputs: [{ resource: ResourceType.Thrusters, amount: 1 }],
        cycleDuration: 160,
        buildCost: 15000,
        fuelPerTick: 2,
        hasEnergyInput: true,
        gridSize: { width: 4, height: 4 },
        defaultInputCapacity: 10,
        defaultOutputCapacity: 5,
    },

    [NodeType.Assembly]: {
        displayName: "Assembly",
        inputs: [
            { resource: ResourceType.HullParts, amount: 2 },
            { resource: ResourceType.FuelTanks, amount: 2 },
            { resource: ResourceType.ControlSystem, amount: 1 },
            { resource: ResourceType.Thrusters, amount: 2 },
        ],
        outputs: [{ resource: ResourceType.Rocket, amount: 1 }],
        cycleDuration: 800,
        buildCost: 50000,
        fuelPerTick: 3,
        hasEnergyInput: true,
        gridSize: { width: 8, height: 6 },
        defaultInputCapacity: 10,
        defaultOutputCapacity: 1,
    },

    // --- Special utility nodes ---

    [NodeType.Splitter]: {
        displayName: "Splitter",
        inputs: [{ resource: ResourceType.IronOre, amount: 0 }], // dynamic: any resource
        outputs: [
            { resource: ResourceType.IronOre, amount: 0 }, // dynamic: mirrors input resource
            { resource: ResourceType.IronOre, amount: 0 },
        ],
        // Splitter operates per-tick via fractional accumulators, not per cycle.
        cycleDuration: 0,
        buildCost: 100,
        fuelPerTick: 0,
        gridSize: { width: 4, height: 2 },
        defaultInputCapacity: 10,
        defaultOutputCapacity: 10,
    },

    [NodeType.Market]: {
        displayName: "Market",
        inputs: [{ resource: ResourceType.IronOre, amount: 0 }], // dynamic: any resource
        outputs: [], // pure sink
        cycleDuration: 0,
        buildCost: 500,
        fuelPerTick: 0,
        gridSize: { width: 4, height: 2 },
        defaultInputCapacity: 20,
        defaultOutputCapacity: 0,
    },
}

/**
 * Fixed sell prices for all resources, in whole currency units (€).
 * Prices increase sharply per production layer to incentivise deeper processing.
 * The Rocket has no sell price — producing one is the win condition.
 */
export const MARKET_PRICES: Record<ResourceType, number> = {
    [ResourceType.IronOre]: 2,
    [ResourceType.Coal]: 3,
    [ResourceType.Copper]: 4,
    [ResourceType.Silicon]: 4,
    [ResourceType.Fuel]: 10,
    [ResourceType.Steel]: 60,
    [ResourceType.Cables]: 40,
    [ResourceType.HullParts]: 250,
    [ResourceType.FuelTanks]: 200,
    [ResourceType.Circuits]: 400,
    [ResourceType.ControlSystem]: 1600,
    [ResourceType.Thrusters]: 5000,
    [ResourceType.Rocket]: 0,
}
