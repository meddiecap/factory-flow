import { describe, it, expect, beforeEach } from "vitest"
import { NodeType, ResourceType } from "../src/simulation/types"
import type { NodeInstance, Connection } from "../src/simulation/types"

// These functions operate on the exported reactive gameState.
// We import them after a fresh module reset via vi.resetModules() if needed,
// but for simplicity we rebuild the relevant parts manually and test the
// pure helper logic through the exported public API.
import {
    removeConnection,
    reconnectConnection,
    connectionAtDot,
    addConnection,
} from "../src/simulation/useGameState"

// Access the mutable gameState to set up fixtures.
import { gameState } from "../src/simulation/useGameState"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, type = NodeType.IronMine): NodeInstance {
    return {
        id,
        type,
        position: { col: 0, row: 0 },
        progress: 0,
        status: "active",
        inputBuffers: [
            { resource: ResourceType.IronOre, amount: 0, capacity: 20 },
        ],
        outputBuffers: [
            { resource: ResourceType.IronOre, amount: 0, capacity: 20 },
        ],
        speedUpgradeLevel: 0,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
    }
}

function makeConnection(
    id: string,
    fromNodeId: string,
    fromDotIndex: number,
    toNodeId: string,
    toDotIndex: number,
): Connection {
    return {
        id,
        fromNodeId,
        fromDotIndex,
        toNodeId,
        toDotIndex,
        capacity: 10,
        capacityUpgradeLevel: 0,
    }
}

/** Resets gameState nodes and connections to the provided fixtures. */
function setup(
    nodes: NodeInstance[],
    connections: Connection[],
): void {
    gameState.nodes.splice(0, Infinity, ...nodes)
    gameState.connections.splice(0, Infinity, ...connections)
}

// ---------------------------------------------------------------------------
// removeConnection
// ---------------------------------------------------------------------------

describe("removeConnection", () => {
    beforeEach(() => {
        setup(
            [makeNode("n1"), makeNode("n2")],
            [makeConnection("c1", "n1", 0, "n2", 0)],
        )
    })

    it("removes the connection with the given id", () => {
        removeConnection("c1")
        expect(gameState.connections).toHaveLength(0)
    })

    it("does nothing when the id does not exist", () => {
        removeConnection("cx")
        expect(gameState.connections).toHaveLength(1)
    })

    it("removes only the targeted connection when multiple exist", () => {
        gameState.connections.push(makeConnection("c2", "n1", 0, "n2", 0))
        removeConnection("c1")
        expect(gameState.connections).toHaveLength(1)
        expect(gameState.connections[0]!.id).toBe("c2")
    })
})

// ---------------------------------------------------------------------------
// connectionAtDot
// ---------------------------------------------------------------------------

describe("connectionAtDot", () => {
    beforeEach(() => {
        setup(
            [makeNode("n1"), makeNode("n2"), makeNode("n3")],
            [makeConnection("c1", "n1", 0, "n2", 0)],
        )
    })

    it("finds the connection on the output side", () => {
        const result = connectionAtDot("n1", 0, "output")
        expect(result?.id).toBe("c1")
    })

    it("finds the connection on the input side", () => {
        const result = connectionAtDot("n2", 0, "input")
        expect(result?.id).toBe("c1")
    })

    it("returns undefined for a free dot", () => {
        expect(connectionAtDot("n3", 0, "output")).toBeUndefined()
        expect(connectionAtDot("n3", 0, "input")).toBeUndefined()
    })

    it("respects the dot index", () => {
        expect(connectionAtDot("n1", 1, "output")).toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// wouldCreateCycle (tested indirectly through addConnection)
// ---------------------------------------------------------------------------

describe("addConnection cycle detection", () => {
    beforeEach(() => {
        setup(
            [makeNode("n1"), makeNode("n2"), makeNode("n3")],
            [],
        )
    })

    it("rejects a self-loop", () => {
        const ok = addConnection("n1", 0, "n1", 0)
        expect(ok).toBe(false)
        expect(gameState.connections).toHaveLength(0)
    })

    it("rejects a direct cycle (A→B then B→A)", () => {
        addConnection("n1", 0, "n2", 0)
        const ok = addConnection("n2", 0, "n1", 0)
        expect(ok).toBe(false)
    })

    it("rejects an indirect cycle (A→B→C then C→A)", () => {
        addConnection("n1", 0, "n2", 0)
        addConnection("n2", 0, "n3", 0)
        const ok = addConnection("n3", 0, "n1", 0)
        expect(ok).toBe(false)
    })

    it("allows a valid chain without a cycle", () => {
        const ok1 = addConnection("n1", 0, "n2", 0)
        const ok2 = addConnection("n2", 0, "n3", 0)
        expect(ok1).toBe(true)
        expect(ok2).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// reconnectConnection
// ---------------------------------------------------------------------------

describe("reconnectConnection", () => {
    beforeEach(() => {
        setup(
            [makeNode("n1"), makeNode("n2"), makeNode("n3")],
            [makeConnection("c1", "n1", 0, "n2", 0)],
        )
    })

    it("successfully reroutes to a free dot", () => {
        const ok = reconnectConnection("c1", "n1", 0, "n3", 0)
        expect(ok).toBe(true)
        expect(gameState.connections[0]!.toNodeId).toBe("n3")
        expect(gameState.connections[0]!.toDotIndex).toBe(0)
    })

    it("returns false for a non-existent connection id", () => {
        const ok = reconnectConnection("cx", "n1", 0, "n3", 0)
        expect(ok).toBe(false)
    })

    it("rejects a cycle via reconnect", () => {
        // Graph: n2→n1 already in others.
        // Reconnecting c2 to n1→n2 when others has n2→n1 creates a direct cycle.
        setup(
            [makeNode("n1"), makeNode("n2"), makeNode("n3")],
            [
                makeConnection("c1", "n2", 0, "n1", 0), // stays: n2→n1
                makeConnection("c2", "n3", 0, "n2", 0), // being reconnected
            ],
        )
        // Proposed: c2 becomes n1→n2.  others already has n2→n1, so DFS from n2→n1 finds n1 → cycle.
        const ok = reconnectConnection("c2", "n1", 0, "n2", 0)
        expect(ok).toBe(false)
        // Original connection is unchanged
        expect(gameState.connections.find((c) => c.id === "c2")!.fromNodeId).toBe(
            "n3",
        )
    })

    it("rejects when the target dot is already occupied by another connection", () => {
        // n1→n2 (c1) and n1→n3 (c2); try to reconnect c1 to n3 input dot 0 which c2 uses
        gameState.connections.push(makeConnection("c2", "n1", 0, "n3", 0))
        const ok = reconnectConnection("c1", "n1", 0, "n3", 0)
        expect(ok).toBe(false)
    })

    it("rejects a self-loop via reconnect", () => {
        const ok = reconnectConnection("c1", "n1", 0, "n1", 0)
        expect(ok).toBe(false)
    })
})
