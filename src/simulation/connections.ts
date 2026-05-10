import type { NodeInstance, Connection, ResourceType } from "./types"

/**
 * Returns only the energy connections from a connection list.
 * Centralises the `c.isEnergy` filter so callers don't repeat the predicate.
 *
 * @param connections - The full connection list to filter.
 * @returns A new array containing only connections where `isEnergy` is true.
 */
export function filterEnergyConnections(
    connections: Connection[],
): Connection[] {
    return connections.filter((c) => c.isEnergy === true)
}

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
 * Describes one successful transfer event that occurred during a tick.
 * Used by the renderer to spawn particle animations.
 */
export interface TransferEvent {
    /** The connection along which goods were transferred. */
    connectionId: string
    /** Number of units transferred (one particle will be spawned per unit, up to a cap). */
    amount: number
    /** The resource type that was transferred, for colouring the particle. */
    resource: ResourceType
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
 * @param nodeMap - Optional pre-built id → node map; built internally when omitted.
 * @returns A list of transfer events, one per connection where goods moved.
 */
export function tickConnections(
    nodes: NodeInstance[],
    connections: Connection[],
    nodeMap?: Map<string, NodeInstance>,
): TransferEvent[] {
    // Reuse a pre-built map when provided (avoids a redundant O(n) build in tick()).
    const map: Map<string, NodeInstance> = nodeMap ?? new Map()
    if (nodeMap === undefined) {
        for (const node of nodes) map.set(node.id, node)
    }

    const events: TransferEvent[] = []

    for (const conn of connections) {
        // Energy connections are handled by the energy system, not as buffer transfers.
        if (conn.isEnergy) continue

        const source = map.get(conn.fromNodeId)
        const target = map.get(conn.toNodeId)
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
        // Keep the target buffer's resource type in sync so downstream logic
        // (Market pricing, DetailPanel display) always sees the correct resource.
        inBuf.resource = outBuf.resource

        events.push({
            connectionId: conn.id,
            amount: transfer,
            resource: outBuf.resource,
        })
    }

    return events
}
