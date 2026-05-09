import type { NodeInstance, Connection } from "./types"

/**
 * Computes the visual flow status of a connection based on how full it is.
 * Used by the canvas renderer to colour connection lines.
 *
 * @param flow - Actual units transported this tick.
 * @param capacity - Maximum units the connection can carry per tick.
 * @returns 'green' when below 50% capacity, 'orange' from 50–90%, 'red' at 100%.
 */
export function connectionFlowStatus(
    flow: number,
    capacity: number,
): "green" | "orange" | "red" {
    if (capacity === 0) return "green"
    const ratio = flow / capacity
    if (ratio >= 1) return "red"
    if (ratio >= 0.5) return "orange"
    return "green"
}

/**
 * Moves goods along all connections for one simulation tick.
 * For each connection, up to `connection.capacity` units are transferred from the source
 * node's output buffer to the target node's input buffer. Transfer stops when either
 * buffer limit is reached. Called before nodes are ticked so fresh outputs are available
 * next tick.
 *
 * @param nodes - All node instances on the canvas, indexed by id for fast lookup.
 * @param connections - All active connections to process.
 */
export function tickConnections(
    nodes: NodeInstance[],
    connections: Connection[],
): void {
    // Build a lookup map for O(1) node access.
    const nodeMap = new Map<string, NodeInstance>()
    for (const node of nodes) {
        nodeMap.set(node.id, node)
    }

    for (const conn of connections) {
        const source = nodeMap.get(conn.fromNodeId)
        const target = nodeMap.get(conn.toNodeId)
        if (source === undefined || target === undefined) continue

        const outBuf = source.outputBuffers[conn.fromDotIndex]
        const inBuf = target.inputBuffers[conn.toDotIndex]
        if (outBuf === undefined || inBuf === undefined) continue

        // Capacity is upgraded per level: base 10 + 10 per level.
        const capacity = 10 + conn.capacityUpgradeLevel * 10

        const space = inBuf.capacity - inBuf.amount
        const available = outBuf.amount
        const transfer = Math.min(available, space, capacity)

        if (transfer <= 0) continue

        outBuf.amount -= transfer
        inBuf.amount += transfer
    }
}
