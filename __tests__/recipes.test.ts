import { describe, it, expect } from "vitest"
import { NODE_DEFS } from "../src/simulation/recipes"
import { NodeType } from "../src/simulation/types"

/** Node types that operate without a production cycle (pass-through / utility). */
const UTILITY_TYPES: NodeType[] = [
    NodeType.Splitter,
    NodeType.Merger,
    NodeType.Market,
    NodeType.EnergySupply,
]

/** Node types that are production factories requiring an energy connection. */
const FACTORY_TYPES: NodeType[] = Object.values(NodeType).filter(
    (t) => !UTILITY_TYPES.includes(t),
)

describe("NODE_DEFS completeness", () => {
    it("has a definition for every NodeType", () => {
        for (const type of Object.values(NodeType)) {
            expect(
                NODE_DEFS[type],
                `missing definition for NodeType.${type}`,
            ).toBeDefined()
        }
    })

    it("has no extra keys beyond the declared NodeTypes", () => {
        const defined = new Set(Object.values(NodeType))
        for (const key of Object.keys(NODE_DEFS)) {
            expect(
                defined.has(key as NodeType),
                `unexpected key "${key}" in NODE_DEFS`,
            ).toBe(true)
        }
    })
})

describe("NODE_DEFS factory invariants", () => {
    it("all production factories have hasEnergyInput: true", () => {
        for (const type of FACTORY_TYPES) {
            const def = NODE_DEFS[type]
            expect(
                def.hasEnergyInput,
                `${type} should have hasEnergyInput: true`,
            ).toBe(true)
        }
    })

    it("all production factories have fuelPerTick > 0", () => {
        for (const type of FACTORY_TYPES) {
            const def = NODE_DEFS[type]
            expect(
                def.fuelPerTick,
                `${type} should have fuelPerTick > 0`,
            ).toBeGreaterThan(0)
        }
    })

    it("all production factories have cycleDuration > 0", () => {
        for (const type of FACTORY_TYPES) {
            const def = NODE_DEFS[type]
            expect(
                def.cycleDuration,
                `${type} should have cycleDuration > 0`,
            ).toBeGreaterThan(0)
        }
    })

    it("all production factories have at least one output", () => {
        for (const type of FACTORY_TYPES) {
            const def = NODE_DEFS[type]
            expect(
                def.outputs.length,
                `${type} should have at least one output`,
            ).toBeGreaterThan(0)
        }
    })

    it("all production factories have buildCost > 0", () => {
        for (const type of FACTORY_TYPES) {
            const def = NODE_DEFS[type]
            expect(
                def.buildCost,
                `${type} should have buildCost > 0`,
            ).toBeGreaterThan(0)
        }
    })
})

describe("NODE_DEFS utility node invariants", () => {
    it("all utility nodes have cycleDuration === 0", () => {
        for (const type of UTILITY_TYPES) {
            const def = NODE_DEFS[type]
            expect(
                def.cycleDuration,
                `${type} should have cycleDuration 0`,
            ).toBe(0)
        }
    })

    it("all utility nodes have fuelPerTick === 0", () => {
        for (const type of UTILITY_TYPES) {
            const def = NODE_DEFS[type]
            expect(def.fuelPerTick, `${type} should have fuelPerTick 0`).toBe(0)
        }
    })

    it("EnergySupply has energyOutputPerTick > 0", () => {
        const def = NODE_DEFS[NodeType.EnergySupply]
        expect(def.energyOutputPerTick).toBeGreaterThan(0)
    })
})

describe("NODE_DEFS grid size invariants", () => {
    it("all nodes have positive grid dimensions", () => {
        for (const [type, def] of Object.entries(NODE_DEFS)) {
            expect(
                def.gridSize.width,
                `${type} gridSize.width must be > 0`,
            ).toBeGreaterThan(0)
            expect(
                def.gridSize.height,
                `${type} gridSize.height must be > 0`,
            ).toBeGreaterThan(0)
        }
    })
})

describe("NODE_DEFS buffer capacity invariants", () => {
    it("nodes with inputs have defaultInputCapacity > 0", () => {
        for (const [type, def] of Object.entries(NODE_DEFS)) {
            // Skip utility nodes whose inputs are dynamic (amount === 0)
            const hasRealInput = def.inputs.some((i) => i.amount > 0)
            if (hasRealInput) {
                expect(
                    def.defaultInputCapacity,
                    `${type} has real inputs but defaultInputCapacity is 0`,
                ).toBeGreaterThan(0)
            }
        }
    })

    it("nodes with outputs have defaultOutputCapacity > 0", () => {
        for (const [type, def] of Object.entries(NODE_DEFS)) {
            // Skip utility nodes whose outputs are dynamic (amount === 0) and EnergySupply (no output buffers)
            const hasRealOutput = def.outputs.some((o) => o.amount > 0)
            if (hasRealOutput) {
                expect(
                    def.defaultOutputCapacity,
                    `${type} has real outputs but defaultOutputCapacity is 0`,
                ).toBeGreaterThan(0)
            }
        }
    })
})
