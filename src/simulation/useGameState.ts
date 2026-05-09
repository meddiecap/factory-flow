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

let _nodeSeq = 3 // start after the two pre-placed nodes

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
    3,
)

/**
 * Reactive game state shared across all Vue components and the canvas renderer.
 * Pre-populated with the two free starter nodes from section 2 of the design doc.
 */
export const gameState = reactive<GameState>({
    nodes: [ironMineStart, energySupplyStart],
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
    const cost = buildCost(def.buildCost, existing)

    if (gameState.money < cost) return false

    // Clamp to grid bounds
    const clampedCol = Math.max(0, Math.min(col, 20 - def.gridSize.width))
    const clampedRow = Math.max(0, Math.min(row, 12 - def.gridSize.height))

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
 * Adds a directed connection from an output dot to an input dot.
 * Validates that neither dot is already connected (one line per dot rule).
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
