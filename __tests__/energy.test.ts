import { describe, it, expect, beforeEach } from "vitest"
import { calcNodeSpeedFactors } from "../src/simulation/energy"
import { NODE_DEFS } from "../src/simulation/recipes"
import { NodeType } from "../src/simulation/types"
import type { NodeInstance, Connection } from "../src/simulation/types"

let _id = 0
function nextId(): string {
    return `n${++_id}`
}

/** Creates a minimal NodeInstance for the given type. */
function makeNode(type: NodeType): NodeInstance {
    return {
        id: nextId(),
        type,
        position: { col: 0, row: 0 },
        progress: 0,
        status: "idle",
        inputBuffers: [],
        outputBuffers: [],
        speedUpgradeLevel: 0,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
    }
}

/** Creates an energy connection from an EnergySupply to a production factory. */
function energyConn(
    es: NodeInstance,
    dotIndex: number,
    factory: NodeInstance,
): Connection {
    const def = NODE_DEFS[factory.type]
    return {
        id: `ec-${es.id}-${dotIndex}->${factory.id}`,
        fromNodeId: es.id,
        fromDotIndex: dotIndex,
        toNodeId: factory.id,
        toDotIndex: def.inputs.length,
        capacity: 0,
        capacityUpgradeLevel: 0,
        isEnergy: true,
    }
}

describe("calcNodeSpeedFactors", () => {
    beforeEach(() => {
        _id = 0
    })

    it("factory with sufficient energy connection gets speedFactor 1.0", () => {
        // EnergySupply outputs 1.0/tick. IronMine needs 0.5/tick → speedFactor = 1.0.
        const es = makeNode(NodeType.EnergySupply)
        const mine = makeNode(NodeType.IronMine)
        const conn = energyConn(es, 0, mine)

        const factors = calcNodeSpeedFactors([es, mine], [conn], NODE_DEFS)
        expect(factors.get(mine.id)).toBeCloseTo(1.0, 5)
    })

    it("factory with insufficient energy gets speedFactor between 0 and 1", () => {
        // EnergySupply outputs 1.0/tick shared between 2 mines (0.5/tick each).
        // Each mine gets 0.5/tick, needs 0.5/tick → speedFactor = 1.0.
        const es = makeNode(NodeType.EnergySupply)
        const mine1 = makeNode(NodeType.IronMine)
        const mine2 = makeNode(NodeType.IronMine)
        const conn1 = energyConn(es, 0, mine1)
        const conn2 = energyConn(es, 1, mine2)

        const factors = calcNodeSpeedFactors(
            [es, mine1, mine2],
            [conn1, conn2],
            NODE_DEFS,
        )
        // 1.0 / 2 = 0.5 per mine; need 0.5 → ratio = 1.0
        expect(factors.get(mine1.id)).toBeCloseTo(1.0, 5)
        expect(factors.get(mine2.id)).toBeCloseTo(1.0, 5)
    })

    it("factory connected to ES that also feeds a high-need node gets partial speed", () => {
        // EnergySupply 1.0/tick shared between IronMine (0.5/tick) and Smelter (1.0/tick).
        // Each gets 0.5/tick. Mine: 0.5/0.5 = 1.0. Smelter: 0.5/1.0 = 0.5.
        const es = makeNode(NodeType.EnergySupply)
        const mine = makeNode(NodeType.IronMine)
        const smelter = makeNode(NodeType.Smelter)
        const c1 = energyConn(es, 0, mine)
        const c2 = energyConn(es, 1, smelter)

        const factors = calcNodeSpeedFactors(
            [es, mine, smelter],
            [c1, c2],
            NODE_DEFS,
        )
        expect(factors.get(mine.id)).toBeCloseTo(1.0, 5)
        expect(factors.get(smelter.id)).toBeCloseTo(0.5, 5)
    })

    it("factory without energy connection gets speedFactor 0", () => {
        const mine = makeNode(NodeType.IronMine)

        const factors = calcNodeSpeedFactors([mine], [], NODE_DEFS)
        expect(factors.get(mine.id)).toBe(0)
    })

    it("EnergySupply itself gets speedFactor 1.0 (no energy needed)", () => {
        const es = makeNode(NodeType.EnergySupply)

        const factors = calcNodeSpeedFactors([es], [], NODE_DEFS)
        expect(factors.get(es.id)).toBe(1.0)
    })

    it("utility nodes (Splitter, Market) get speedFactor 1.0", () => {
        const splitter = makeNode(NodeType.Splitter)
        const market = makeNode(NodeType.Market)

        const factors = calcNodeSpeedFactors([splitter, market], [], NODE_DEFS)
        expect(factors.get(splitter.id)).toBe(1.0)
        expect(factors.get(market.id)).toBe(1.0)
    })

    it("energy efficiency upgrade reduces the energy required, raising speedFactor", () => {
        // ES outputs 1.0/tick. Smelter normally needs 1.0/tick.
        // With 1 energy efficiency upgrade: effective need = 1.0 * max(0.5, 1 - 0.1) = 0.9/tick.
        // speedFactor = 1.0 / 0.9 → clamped to 1.0 (sufficient supply).
        // For a case where supply is 50%: use 2 smelters sharing 1 ES.
        // Each smelter gets 0.5/tick; with upgrade need = 0.9 → speedFactor = 0.5/0.9 ≈ 0.556.
        const es = makeNode(NodeType.EnergySupply)
        const smelterA = makeNode(NodeType.Smelter)
        const smelterB: NodeInstance = {
            ...makeNode(NodeType.Smelter),
            energyEfficiencyUpgradeLevel: 1,
        }
        const c1 = energyConn(es, 0, smelterA)
        const c2 = energyConn(es, 1, smelterB)

        const factors = calcNodeSpeedFactors(
            [es, smelterA, smelterB],
            [c1, c2],
            NODE_DEFS,
        )
        // smelterA: 0.5 / 1.0 = 0.5
        expect(factors.get(smelterA.id)).toBeCloseTo(0.5, 5)
        // smelterB: 0.5 / 0.9 ≈ 0.556
        expect(factors.get(smelterB.id)).toBeCloseTo(0.5 / 0.9, 5)
    })
})
