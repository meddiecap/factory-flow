import { describe, it, expect, beforeEach } from "vitest"
import { NodeType } from "../src/simulation/types"
import type { NodeInstance, Connection } from "../src/simulation/types"
import { NODE_DEFS } from "../src/simulation/recipes"
import {
    gameState,
    placeNode,
    moveNode,
    removeNode,
    initSequences,
} from "../src/simulation/useGameState"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(
    id: string,
    type: NodeType = NodeType.IronMine,
    col = 0,
    row = 0,
): NodeInstance {
    const def = NODE_DEFS[type]
    return {
        id,
        type,
        position: { col, row },
        progress: 0,
        status: "idle",
        inputBuffers: def.inputs.map((inp) => ({
            resource: inp.resource,
            amount: 0,
            capacity: def.defaultInputCapacity,
        })),
        outputBuffers: def.outputs.map((out) => ({
            resource: out.resource,
            amount: 0,
            capacity: def.defaultOutputCapacity,
        })),
        speedUpgradeLevel: 0,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
        energyOutputUpgradeLevel: 0,
    }
}

function makeConnection(
    id: string,
    fromNodeId: string,
    toNodeId: string,
): Connection {
    return {
        id,
        fromNodeId,
        fromDotIndex: 0,
        toNodeId,
        toDotIndex: 0,
        capacity: 10,
        capacityUpgradeLevel: 0,
    }
}

/** Resets the full gameState to an empty board with enough money to build. */
function resetState(money = 100_000): void {
    gameState.nodes.splice(0, Infinity)
    gameState.connections.splice(0, Infinity)
    gameState.money = money
    gameState.totalEarned = 100_000 // all nodes unlocked
    gameState.nodeTypeCounts = {}
}

// ---------------------------------------------------------------------------
// placeNode
// ---------------------------------------------------------------------------

describe("placeNode", () => {
    beforeEach(resetState)

    it("returns true and adds a node when all conditions are met", () => {
        const result = placeNode(NodeType.IronMine, 0, 0)
        expect(result).toBe(true)
        expect(gameState.nodes.some((n) => n.type === NodeType.IronMine)).toBe(
            true,
        )
    })

    it("deducts the build cost from gameState.money", () => {
        const moneyBefore = gameState.money
        placeNode(NodeType.IronMine, 0, 0)
        // buildCost(IronMine, 0) = ceil(50 × 1.5^0) = 50
        expect(gameState.money).toBe(moneyBefore - 50)
    })

    it("returns false and does not place when money is insufficient", () => {
        gameState.money = 0
        const result = placeNode(NodeType.IronMine, 0, 0)
        expect(result).toBe(false)
        expect(gameState.nodes.length).toBe(0)
    })

    it("returns false when the node type is not yet unlocked", () => {
        gameState.totalEarned = 0 // nothing earned → Smelter locked
        const result = placeNode(NodeType.Smelter, 0, 0)
        expect(result).toBe(false)
        expect(gameState.nodes.length).toBe(0)
    })

    it("returns false when the placement overlaps an existing node", () => {
        // Place first node at (0, 0); IronMine is 4×2 grid cells.
        const first = placeNode(NodeType.IronMine, 0, 0)
        expect(first).toBe(true)
        // Try placing at the same position.
        const second = placeNode(NodeType.IronMine, 0, 0)
        expect(second).toBe(false)
        expect(
            gameState.nodes.filter((n) => n.type === NodeType.IronMine).length,
        ).toBe(1)
    })

    it("increments the nodeTypeCounts entry for the placed type", () => {
        placeNode(NodeType.IronMine, 0, 0)
        expect(gameState.nodeTypeCounts?.[NodeType.IronMine]).toBe(1)
        placeNode(NodeType.IronMine, 10, 10)
        expect(gameState.nodeTypeCounts?.[NodeType.IronMine]).toBe(2)
    })

    it("assigns a unique id to each placed node", () => {
        placeNode(NodeType.IronMine, 0, 0)
        placeNode(NodeType.IronMine, 10, 10)
        const ids = gameState.nodes.map((n) => n.id)
        expect(new Set(ids).size).toBe(ids.length)
    })
})

// ---------------------------------------------------------------------------
// moveNode
// ---------------------------------------------------------------------------

describe("moveNode", () => {
    beforeEach(resetState)

    it("updates the position of the specified node", () => {
        gameState.nodes.push(makeNode("n1", NodeType.IronMine, 0, 0))
        moveNode("n1", 5, 3)
        const node = gameState.nodes.find((n) => n.id === "n1")
        expect(node?.position.col).toBe(5)
        expect(node?.position.row).toBe(3)
    })

    it("does nothing when the node id does not exist", () => {
        expect(() => moveNode("ghost", 5, 3)).not.toThrow()
    })

    it("does not remove any connections when moving a node", () => {
        gameState.nodes.push(
            makeNode("n1"),
            makeNode("n2", NodeType.Market, 20, 0),
        )
        gameState.connections.push(makeConnection("c1", "n1", "n2"))
        moveNode("n1", 10, 10)
        expect(gameState.connections.length).toBe(1)
    })
})

// ---------------------------------------------------------------------------
// removeNode
// ---------------------------------------------------------------------------

describe("removeNode", () => {
    beforeEach(resetState)

    it("removes the node from the state", () => {
        gameState.nodes.push(makeNode("n1"))
        removeNode("n1")
        expect(gameState.nodes.find((n) => n.id === "n1")).toBeUndefined()
    })

    it("does nothing when the node id does not exist", () => {
        const before = gameState.nodes.length
        expect(() => removeNode("ghost")).not.toThrow()
        expect(gameState.nodes.length).toBe(before)
    })

    it("removes all connections that reference the node as source", () => {
        gameState.nodes.push(
            makeNode("n1"),
            makeNode("n2", NodeType.Market, 20, 0),
        )
        gameState.connections.push(makeConnection("c1", "n1", "n2"))
        removeNode("n1")
        expect(gameState.connections.find((c) => c.id === "c1")).toBeUndefined()
    })

    it("removes all connections that reference the node as target", () => {
        gameState.nodes.push(
            makeNode("n1"),
            makeNode("n2", NodeType.Market, 20, 0),
        )
        gameState.connections.push(makeConnection("c1", "n1", "n2"))
        removeNode("n2")
        expect(gameState.connections.find((c) => c.id === "c1")).toBeUndefined()
    })

    it("only removes connections related to the removed node", () => {
        gameState.nodes.push(
            makeNode("n1"),
            makeNode("n2", NodeType.Market, 20, 0),
            makeNode("n3", NodeType.Market, 30, 0),
        )
        gameState.connections.push(
            makeConnection("c1", "n1", "n2"),
            makeConnection("c2", "n1", "n3"),
        )
        removeNode("n2")
        // c1 is removed (involved n2), but c2 should survive.
        expect(gameState.connections.find((c) => c.id === "c1")).toBeUndefined()
        expect(gameState.connections.find((c) => c.id === "c2")).toBeDefined()
    })

    it("decrements nodeTypeCounts for the removed type", () => {
        gameState.nodes.push(
            makeNode("n1"),
            makeNode("n2", NodeType.IronMine, 10, 0),
        )
        gameState.nodeTypeCounts = { [NodeType.IronMine]: 2 }
        removeNode("n1")
        expect(gameState.nodeTypeCounts[NodeType.IronMine]).toBe(1)
    })

    it("deletes the key from nodeTypeCounts when count reaches zero", () => {
        gameState.nodes.push(makeNode("n1"))
        gameState.nodeTypeCounts = { [NodeType.IronMine]: 1 }
        removeNode("n1")
        expect(NodeType.IronMine in (gameState.nodeTypeCounts ?? {})).toBe(
            false,
        )
    })
})

// ---------------------------------------------------------------------------
// initSequences
// ---------------------------------------------------------------------------

describe("initSequences", () => {
    it("updates the node id counter so new nodes get higher ids", () => {
        const state = {
            nodes: [makeNode("node-50")],
            connections: [],
            money: 0,
            totalEarned: 100_000,
            tick: 0,
            nodeTypeCounts: {},
        }
        initSequences(state)
        resetState()
        // Place a node; its id should be > node-50
        placeNode(NodeType.IronMine, 0, 0)
        const placed = gameState.nodes[gameState.nodes.length - 1]!
        const placedNum = parseInt(placed.id.replace("node-", ""), 10)
        expect(placedNum).toBeGreaterThan(50)
    })

    it("migrates old saves that lack energyOutputUpgradeLevel", () => {
        // Simulate a pre-migration save where the field is absent.
        const raw = makeNode("node-1") as unknown as Record<string, unknown>
        delete raw["energyOutputUpgradeLevel"]
        const state = {
            nodes: [raw as unknown as NodeInstance],
            connections: [],
            money: 0,
            totalEarned: 0,
            tick: 0,
        }
        initSequences(state)
        expect(state.nodes[0]!.energyOutputUpgradeLevel).toBe(0)
    })

    it("does not regress the counter when node ids are lower than the current sequence", () => {
        // After previously setting the sequence to a high value, calling initSequences
        // with low ids should not lower the counter.
        resetState()
        placeNode(NodeType.IronMine, 0, 0)
        const firstPlaced = gameState.nodes[gameState.nodes.length - 1]!
        const highNum = parseInt(firstPlaced.id.replace("node-", ""), 10)

        const state = {
            nodes: [makeNode("node-1")],
            connections: [],
            money: 0,
            totalEarned: 100_000,
            tick: 0,
        }
        initSequences(state)

        resetState()
        placeNode(NodeType.IronMine, 0, 0)
        const secondPlaced = gameState.nodes[gameState.nodes.length - 1]!
        const newNum = parseInt(secondPlaced.id.replace("node-", ""), 10)
        // New id must still be above the pre-existing high-water mark.
        expect(newNum).toBeGreaterThan(highNum)
    })
})
