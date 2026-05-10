import { describe, it, expect } from "vitest"
import { tick } from "../src/simulation/simulator"
import { NODE_DEFS } from "../src/simulation/recipes"
import { NodeType, ResourceType } from "../src/simulation/types"
import type {
    NodeInstance,
    Connection,
    GameState,
    Buffer,
} from "../src/simulation/types"

let _id = 0
function nextId(): string {
    return `n${++_id}`
}

/**
 * Creates a NodeInstance with buffer sizes from NODE_DEFS defaults.
 * Pass outputCapacity to override only the output buffer size
 * (useful for pool EnergySupply nodes that must not block during the run).
 */
function makeNode(type: NodeType, outputCapacity?: number): NodeInstance {
    const def = NODE_DEFS[type]
    const inCap = def.defaultInputCapacity
    const outCap = outputCapacity ?? def.defaultOutputCapacity

    const inputBuffers: Buffer[] = def.inputs.map((inp) => ({
        resource: inp.resource,
        amount: 0,
        capacity: inCap,
    }))
    const outputBuffers: Buffer[] = def.outputs.map((out) => ({
        resource: out.resource,
        amount: 0,
        capacity: outCap,
    }))

    return {
        id: nextId(),
        type,
        position: { col: 0, row: 0 },
        progress: 0,
        status: "idle",
        inputBuffers,
        outputBuffers,
        speedUpgradeLevel: 0,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
        energyOutputUpgradeLevel: 0,
    }
}

/** Creates a connection with capacity level 2 (30 units/tick). */
function makeConn(
    from: NodeInstance,
    fromDot: number,
    to: NodeInstance,
    toDot: number,
): Connection {
    return {
        id: `c-${from.id}.${fromDot}->${to.id}.${toDot}`,
        fromNodeId: from.id,
        fromDotIndex: fromDot,
        toNodeId: to.id,
        toDotIndex: toDot,
        capacity: 10,
        capacityUpgradeLevel: 2, // 30 units/tick
    }
}

/** Creates an energy connection from an EnergySupply to a production factory. */
function makeEnergyConn(es: NodeInstance, factory: NodeInstance): Connection {
    const def = NODE_DEFS[factory.type]
    return {
        id: `ec-${es.id}->${factory.id}`,
        fromNodeId: es.id,
        fromDotIndex: 0,
        toNodeId: factory.id,
        toDotIndex: def.inputs.length, // energy input dot is after all recipe inputs
        capacity: 0,
        capacityUpgradeLevel: 0,
        isEnergy: true,
    }
}

describe("reachability", () => {
    it("produces at least 1 Rocket within 10,000 ticks using the complete production chain", () => {
        _id = 0

        //
        // ── Foundry supply chain ──────────────────────────────────────────────────────
        // IronMine + CoalMine → Smelter → Foundry → Assembly (HullParts + FuelTanks)
        //
        const ironMineA = makeNode(NodeType.IronMine)
        const coalMineA = makeNode(NodeType.CoalMine)
        const smelterA = makeNode(NodeType.Smelter)
        const foundry = makeNode(NodeType.Foundry)

        //
        // ── Engine supply chain ───────────────────────────────────────────────────────
        // IronMine + CoalMine → Smelter → EngineFactory (+ CoalMine via connection) → Assembly
        //
        const ironMineB = makeNode(NodeType.IronMine)
        const coalMineB = makeNode(NodeType.CoalMine)
        const smelterB = makeNode(NodeType.Smelter)
        const coalMineC = makeNode(NodeType.CoalMine) // recipe coal for EngineFactory
        const engineFactory = makeNode(NodeType.EngineFactory)

        //
        // ── Electronics supply chain ──────────────────────────────────────────────────
        // CopperMine → CableFactory ──┐
        //                             ├─→ ChipFactory → Electronics → Assembly (ControlSystem)
        // SiliconMine ───────────────┘
        //
        const copperMine = makeNode(NodeType.CopperMine)
        const siliconMine = makeNode(NodeType.SiliconMine)
        const cableFactory = makeNode(NodeType.CableFactory)
        const chipFactory = makeNode(NodeType.ChipFactory)
        const electronics = makeNode(NodeType.Electronics)

        //
        // ── Final assembly ────────────────────────────────────────────────────────────
        //
        const assembly = makeNode(NodeType.Assembly)

        //
        // ── Energy Supply nodes (one per production factory) ──────────────────────────
        // Each ES produces 1.0 energy/tick. Factories needing > 1.0/tick run at partial
        // speed (speedFactor < 1), but the chain completes well within 10,000 ticks.
        //
        const esIronMineA = makeNode(NodeType.EnergySupply)
        const esCoalMineA = makeNode(NodeType.EnergySupply)
        const esSmelterA = makeNode(NodeType.EnergySupply)
        const esFoundry = makeNode(NodeType.EnergySupply)
        const esIronMineB = makeNode(NodeType.EnergySupply)
        const esCoalMineB = makeNode(NodeType.EnergySupply)
        const esSmelterB = makeNode(NodeType.EnergySupply)
        const esCoalMineC = makeNode(NodeType.EnergySupply)
        const esEngineFactory = makeNode(NodeType.EnergySupply)
        const esCopperMine = makeNode(NodeType.EnergySupply)
        const esSiliconMine = makeNode(NodeType.EnergySupply)
        const esCableFactory = makeNode(NodeType.EnergySupply)
        const esChipFactory = makeNode(NodeType.EnergySupply)
        const esElectronics = makeNode(NodeType.EnergySupply)
        const esAssembly = makeNode(NodeType.EnergySupply)

        const connections: Connection[] = [
            // Foundry chain
            makeConn(ironMineA, 0, smelterA, 0), // IronOre  → Smelter   input[0]
            makeConn(coalMineA, 0, smelterA, 1), // Coal     → Smelter   input[1]
            makeConn(smelterA, 0, foundry, 0), // Steel    → Foundry   input[0]
            makeConn(foundry, 0, assembly, 0), // HullParts  → Assembly input[0]
            makeConn(foundry, 1, assembly, 1), // FuelTanks  → Assembly input[1]

            // Engine chain
            makeConn(ironMineB, 0, smelterB, 0), // IronOre → Smelter      input[0]
            makeConn(coalMineB, 0, smelterB, 1), // Coal    → Smelter      input[1]
            makeConn(smelterB, 0, engineFactory, 0), // Steel   → EngineFactory input[0]
            makeConn(coalMineC, 0, engineFactory, 1), // Coal    → EngineFactory input[1]
            makeConn(engineFactory, 0, assembly, 3), // Thrusters → Assembly   input[3]

            // Electronics chain
            makeConn(copperMine, 0, cableFactory, 0), // Copper   → CableFactory input[0]
            makeConn(siliconMine, 0, chipFactory, 0), // Silicon  → ChipFactory  input[0]
            makeConn(cableFactory, 0, chipFactory, 1), // Cables   → ChipFactory  input[1]
            makeConn(chipFactory, 0, electronics, 0), // Circuits → Electronics  input[0]
            makeConn(electronics, 0, assembly, 2), // ControlSystem → Assembly input[2]

            // Energy connections (one ES per factory)
            makeEnergyConn(esIronMineA, ironMineA),
            makeEnergyConn(esCoalMineA, coalMineA),
            makeEnergyConn(esSmelterA, smelterA),
            makeEnergyConn(esFoundry, foundry),
            makeEnergyConn(esIronMineB, ironMineB),
            makeEnergyConn(esCoalMineB, coalMineB),
            makeEnergyConn(esSmelterB, smelterB),
            makeEnergyConn(esCoalMineC, coalMineC),
            makeEnergyConn(esEngineFactory, engineFactory),
            makeEnergyConn(esCopperMine, copperMine),
            makeEnergyConn(esSiliconMine, siliconMine),
            makeEnergyConn(esCableFactory, cableFactory),
            makeEnergyConn(esChipFactory, chipFactory),
            makeEnergyConn(esElectronics, electronics),
            makeEnergyConn(esAssembly, assembly),
        ]

        const nodes: NodeInstance[] = [
            ironMineA,
            coalMineA,
            smelterA,
            foundry,
            ironMineB,
            coalMineB,
            smelterB,
            coalMineC,
            engineFactory,
            copperMine,
            siliconMine,
            cableFactory,
            chipFactory,
            electronics,
            assembly,
            esIronMineA,
            esCoalMineA,
            esSmelterA,
            esFoundry,
            esIronMineB,
            esCoalMineB,
            esSmelterB,
            esCoalMineC,
            esEngineFactory,
            esCopperMine,
            esSiliconMine,
            esCableFactory,
            esChipFactory,
            esElectronics,
            esAssembly,
        ]

        const state: GameState = {
            nodes,
            connections,
            money: 0,
            totalEarned: 0,
            tick: 0,
        }

        for (let i = 0; i < 10_000; i++) {
            tick(state)
        }

        // The Assembly output buffer should contain at least 1 Rocket.
        expect(assembly.outputBuffers[0]!.amount).toBeGreaterThanOrEqual(1)
        expect(assembly.outputBuffers[0]!.resource).toBe(ResourceType.Rocket)
    })
})
