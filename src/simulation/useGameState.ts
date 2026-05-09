import { reactive } from "vue"
import { NodeType, ResourceType } from "../simulation/types"
import type {
    GameState,
    NodeInstance,
    Connection,
    Buffer,
} from "../simulation/types"
import { NODE_DEFS } from "../simulation/recipes"
import { canUnlock, buildCost } from "../simulation/economy"

let _nodeSeq = 4 // start after the three pre-placed nodes

/** Generates a unique node id for each newly placed node. */
function newNodeId(): string {
    return `node-${++_nodeSeq}`
}

let _connSeq = 0

/** Generates a unique connection id. */
function newConnId(): string {
    return `conn-${++_connSeq}`
}

/**
 * Returns true when a newly placed node (at col, row) would overlap any existing node.
 * Overlap is determined by checking that the bounding rectangles do not intersect.
 *
 * @param nodes - Existing nodes on the canvas.
 * @param col - Proposed top-left column.
 * @param row - Proposed top-left row.
 * @param width - Width of the new node in grid cells.
 * @param height - Height of the new node in grid cells.
 */
function hasOverlap(
    nodes: NodeInstance[],
    col: number,
    row: number,
    width: number,
    height: number,
): boolean {
    for (const n of nodes) {
        const def = NODE_DEFS[n.type]
        const nRight = n.position.col + def.gridSize.width
        const nBottom = n.position.row + def.gridSize.height
        const newRight = col + width
        const newBottom = row + height

        const overlapsX = col < nRight && newRight > n.position.col
        const overlapsY = row < nBottom && newBottom > n.position.row
        if (overlapsX && overlapsY) return true
    }
    return false
}

/**
 * Creates a fresh NodeInstance for a given type at a given grid position.
 * Initialises input/output buffers from NODE_DEFS defaults.
 *
 * @param id - Unique identifier for the new node.
 * @param type - The factory type to instantiate.
 * @param col - Grid column for the top-left of the node.
 * @param row - Grid row for the top-left of the node.
 */
function createNodeInstance(
    id: string,
    type: NodeType,
    col: number,
    row: number,
): NodeInstance {
    const def = NODE_DEFS[type]
    const inputBuffers: Buffer[] = def.inputs.map((inp) => ({
        resource: inp.resource,
        amount: 0,
        capacity: def.defaultInputCapacity,
    }))
    const outputBuffers: Buffer[] = def.outputs.map((out) => ({
        resource: out.resource,
        amount: 0,
        capacity: def.defaultOutputCapacity,
    }))
    return {
        id,
        type,
        position: { col, row },
        progress: 0,
        status: "idle",
        inputBuffers,
        outputBuffers,
        speedUpgradeLevel: 0,
        bufferUpgradeLevel: 0,
        efficiencyUpgradeLevel: 0,
        energyEfficiencyUpgradeLevel: 0,
        salesPoints: type === NodeType.Market ? 1 : undefined,
        splitterAccumulators: type === NodeType.Splitter ? [0, 0] : undefined,
        splitterRatioA: type === NodeType.Splitter ? 0.5 : undefined,
    }
}

// ── Pre-placed starting nodes ────────────────────────────────────────────────

const ironMineStart = createNodeInstance("node-1", NodeType.IronMine, 1, 1)
const energySupplyStart = createNodeInstance(
    "node-2",
    NodeType.EnergySupply,
    1,
    5,
)
// The first Market is free and pre-placed so the player always has a sales outlet.
const marketStart = createNodeInstance("node-3", NodeType.Market, 8, 1)

/**
 * Reactive game state shared across all Vue components and the canvas renderer.
 * Pre-populated with the three free starter nodes from the design doc.
 */
export const gameState = reactive<GameState>({
    nodes: [ironMineStart, energySupplyStart, marketStart],
    connections: [],
    money: 0,
    totalEarned: 0,
    tick: 0,
})

/**
 * Returns how many nodes of `type` are currently on the canvas.
 * Used to calculate the escalating build cost for the next placement.
 *
 * @param type - The NodeType to count.
 */
export function countNodes(type: NodeType): number {
    return gameState.nodes.filter((n) => n.type === type).length
}

/**
 * Attempts to place a new node of the given type at the specified grid position.
 * Validates unlock status, build cost and grid overlap before placing.
 * Deducts the build cost from `gameState.money` on success.
 *
 * @param type - The factory type to place.
 * @param col - Target grid column (top-left, snapped).
 * @param row - Target grid row (top-left, snapped).
 * @returns `true` when the node was placed, `false` when rejected.
 */
export function placeNode(type: NodeType, col: number, row: number): boolean {
    if (!canUnlock(type, gameState)) return false

    const def = NODE_DEFS[type]
    const existing = countNodes(type)
    const cost = buildCost(type, existing)

    if (gameState.money < cost) return false

    // Clamp to grid bounds
    const clampedCol = Math.max(0, Math.min(col, 40 - def.gridSize.width))
    const clampedRow = Math.max(0, Math.min(row, 24 - def.gridSize.height))

    if (
        hasOverlap(
            gameState.nodes,
            clampedCol,
            clampedRow,
            def.gridSize.width,
            def.gridSize.height,
        )
    ) {
        return false
    }

    const node = createNodeInstance(newNodeId(), type, clampedCol, clampedRow)
    gameState.nodes.push(node)
    gameState.money -= cost
    return true
}

/**
 * Moves an existing node to a new grid position, clamped to the canvas bounds.
 * Connections are not affected; they follow because they reference node ids.
 * No overlap check is performed (nodes may overlap by design).
 *
 * @param nodeId - The id of the node to move.
 * @param col - Target grid column (top-left).
 * @param row - Target grid row (top-left).
 */
export function moveNode(nodeId: string, col: number, row: number): void {
    const node = gameState.nodes.find((n) => n.id === nodeId)
    if (node === undefined) return
    const def = NODE_DEFS[node.type]
    node.position.col = Math.max(0, Math.min(col, 40 - def.gridSize.width))
    node.position.row = Math.max(0, Math.min(row, 24 - def.gridSize.height))
}

/**
 * Removes a connection by id.
 * The goods flow through that connection stops immediately.
 *
 * @param connectionId - Id of the connection to remove.
 */
export function removeConnection(connectionId: string): void {
    const idx = gameState.connections.findIndex((c) => c.id === connectionId)
    if (idx !== -1) gameState.connections.splice(idx, 1)
}

/**
 * Returns true when adding an edge from `fromId` to `toId` would create a cycle
 * in the directed connection graph. Uses iterative depth-first search from `toId`.
 * A self-loop (fromId === toId) is also considered a cycle.
 *
 * @param fromId - Proposed source node id.
 * @param toId - Proposed target node id.
 * @param connections - Current connection list to traverse.
 */
function wouldCreateCycle(
    fromId: string,
    toId: string,
    connections: Connection[],
): boolean {
    if (fromId === toId) return true
    // DFS: can we reach `fromId` starting from `toId`?
    const visited = new Set<string>()
    const stack = [toId]
    while (stack.length > 0) {
        const current = stack.pop()!
        if (current === fromId) return true
        if (visited.has(current)) continue
        visited.add(current)
        for (const c of connections) {
            if (c.fromNodeId === current) stack.push(c.toNodeId)
        }
    }
    return false
}

/**
 * Reconnects an existing connection to new endpoints.
 * The original connection is restored unchanged if validation fails:
 * - new endpoints have the same validity rules as addConnection
 * - cycles (A→B→…→A) and self-loops are rejected
 *
 * @param connectionId - Id of the connection to modify.
 * @param fromNodeId - New source node id.
 * @param fromDotIndex - New output dot index on the source node.
 * @param toNodeId - New target node id.
 * @param toDotIndex - New input dot index on the target node.
 * @returns `true` when the reconnection succeeded, `false` when rejected.
 */
export function reconnectConnection(
    connectionId: string,
    fromNodeId: string,
    fromDotIndex: number,
    toNodeId: string,
    toDotIndex: number,
): boolean {
    const conn = gameState.connections.find((c) => c.id === connectionId)
    if (conn === undefined) return false

    // Validate that fromDotIndex refers to a real output and toDotIndex to a real input.
    const fromNode = gameState.nodes.find((n) => n.id === fromNodeId)
    const toNode = gameState.nodes.find((n) => n.id === toNodeId)
    if (fromNode === undefined || toNode === undefined) return false
    if (fromDotIndex >= fromNode.outputBuffers.length) return false
    if (toDotIndex >= toNode.inputBuffers.length) return false

    // Build the connection list without this connection for cycle/dot checks.
    const others = gameState.connections.filter((c) => c.id !== connectionId)

    if (wouldCreateCycle(fromNodeId, toNodeId, others)) return false

    // Check that no other connection already uses either dot.
    const dotConflict = others.some(
        (c) =>
            (c.fromNodeId === fromNodeId && c.fromDotIndex === fromDotIndex) ||
            (c.toNodeId === toNodeId && c.toDotIndex === toDotIndex),
    )
    if (dotConflict) return false

    conn.fromNodeId = fromNodeId
    conn.fromDotIndex = fromDotIndex
    conn.toNodeId = toNodeId
    conn.toDotIndex = toDotIndex
    return true
}

/**
 * Returns the connection that uses the given dot, or undefined when the dot is free.
 * Used by the interaction layer to detect occupied dots.
 *
 * @param nodeId - The node id to check.
 * @param dotIndex - The dot index to check.
 * @param side - 'input' or 'output'.
 */
export function connectionAtDot(
    nodeId: string,
    dotIndex: number,
    side: "input" | "output",
): Connection | undefined {
    return gameState.connections.find((c) =>
        side === "output"
            ? c.fromNodeId === nodeId && c.fromDotIndex === dotIndex
            : c.toNodeId === nodeId && c.toDotIndex === dotIndex,
    )
}

/**
 * Adds a directed connection from an output dot to an input dot.
 * Validates that neither dot is already connected (one line per dot rule),
 * and that the connection would not create a cycle in the flow graph.
 *
 * @param fromNodeId - Source node id.
 * @param fromDotIndex - Output dot index on the source node.
 * @param toNodeId - Target node id.
 * @param toDotIndex - Input dot index on the target node.
 * @returns `true` when the connection was created, `false` when rejected.
 */
export function addConnection(
    fromNodeId: string,
    fromDotIndex: number,
    toNodeId: string,
    toDotIndex: number,
): boolean {
    if (fromNodeId === toNodeId) return false

    // Validate that fromDotIndex refers to a real output and toDotIndex to a real input.
    const fromNode = gameState.nodes.find((n) => n.id === fromNodeId)
    const toNode = gameState.nodes.find((n) => n.id === toNodeId)
    if (fromNode === undefined || toNode === undefined) return false
    if (fromDotIndex >= fromNode.outputBuffers.length) return false
    if (toDotIndex >= toNode.inputBuffers.length) return false

    if (wouldCreateCycle(fromNodeId, toNodeId, gameState.connections))
        return false

    // Check one-line-per-dot rule
    const alreadyUsed = gameState.connections.some(
        (c) =>
            (c.fromNodeId === fromNodeId && c.fromDotIndex === fromDotIndex) ||
            (c.toNodeId === toNodeId && c.toDotIndex === toDotIndex),
    )
    if (alreadyUsed) return false

    const conn: Connection = {
        id: newConnId(),
        fromNodeId,
        fromDotIndex,
        toNodeId,
        toDotIndex,
        capacity: 10,
        capacityUpgradeLevel: 0,
    }
    gameState.connections.push(conn)
    return true
}

/**
 * Returns the numeric resource type represented by a resource name string.
 * Used by the market to know what resource flows through a connected dot.
 * This is a convenience re-export used by UI components.
 */
export { ResourceType }
