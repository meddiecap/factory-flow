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

describe("reachability", () => {
    it("produces at least 1 Rocket within 10,000 ticks using the complete production chain", () => {
        _id = 0

        //
        // ── Global energy pool ────────────────────────────────────────────────────────
        // 400 EnergySupply nodes with a large output buffer (600) so they never become
        // output-blocked during the run.  Each contributes 2/40 = 0.05 fuel/tick to
        // the global pool → 20 fuel/tick produced.
        // Steady-state consumption of all production nodes ≈ 16.5 fuel/tick
        // → speedFactor ≈ 1 + 0.2 × ln(3.5 + 1) ≈ 1.30.
        //
        const poolES = Array.from({ length: 400 }, () =>
            makeNode(NodeType.EnergySupply, 600),
        )

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
        // IronMine + CoalMine → Smelter → EngineFactory (+ Fuel via connection) → Assembly
        //
        const ironMineB = makeNode(NodeType.IronMine)
        const coalMineB = makeNode(NodeType.CoalMine)
        const smelterB = makeNode(NodeType.Smelter)
        const fuelSrc = makeNode(NodeType.EnergySupply, 600) // recipe fuel via connection
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
            makeConn(fuelSrc, 0, engineFactory, 1), // Fuel    → EngineFactory input[1]
            makeConn(engineFactory, 0, assembly, 3), // Thrusters → Assembly   input[3]

            // Electronics chain
            makeConn(copperMine, 0, cableFactory, 0), // Copper   → CableFactory input[0]
            makeConn(siliconMine, 0, chipFactory, 0), // Silicon  → ChipFactory  input[0]
            makeConn(cableFactory, 0, chipFactory, 1), // Cables   → ChipFactory  input[1]
            makeConn(chipFactory, 0, electronics, 0), // Circuits → Electronics  input[0]
            makeConn(electronics, 0, assembly, 2), // ControlSystem → Assembly input[2]
        ]

        const nodes: NodeInstance[] = [
            ...poolES,
            ironMineA,
            coalMineA,
            smelterA,
            foundry,
            ironMineB,
            coalMineB,
            smelterB,
            fuelSrc,
            engineFactory,
            copperMine,
            siliconMine,
            cableFactory,
            chipFactory,
            electronics,
            assembly,
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
        // First estimated Rocket appears around tick 1600-2000 given the chain above.
        expect(assembly.outputBuffers[0]!.amount).toBeGreaterThanOrEqual(1)
        expect(assembly.outputBuffers[0]!.resource).toBe(ResourceType.Rocket)
    })
})
