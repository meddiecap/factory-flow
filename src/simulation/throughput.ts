import { NodeType } from "./types"
import type { NodeInstance, Connection } from "./types"
import { NODE_DEFS, MARKET_PRICES } from "./recipes"

/**
 * Recursively traces back through pass-through nodes (Splitter, Merger) to
 * find the steady-state throughput in units/tick reaching a given output dot.
 * Used by the UI to compute projected revenue on Market nodes.
 *
 * @param nodeId - The id of the source node to trace from.
 * @param dotIndex - The output dot index on the source node.
 * @param nodes - All active node instances.
 * @param connections - All active connections.
 * @param speedFactors - Pre-computed per-node speed factors (from calcNodeSpeedFactors).
 * @param depth - Recursion depth guard; stops at 20 to prevent infinite loops.
 * @param nodeMap - Optional pre-built node lookup map for O(1) access; built once on first call.
 * @param connsByTarget - Optional pre-built map keyed by `toNodeId:toDotIndex` for non-energy connections.
 * @returns Steady-state units/tick, or null when no producing node is reachable.
 */
export function traceUnitsPerTick(
    nodeId: string,
    dotIndex: number,
    nodes: NodeInstance[],
    connections: Connection[],
    speedFactors: Map<string, number>,
    depth = 0,
    nodeMap?: Map<string, NodeInstance>,
    connsByTarget?: Map<string, Connection>,
): number | null {
    if (depth > 20) return null // guard against cycles

    // Build index maps once on the initial call and pass through recursion.
    const nMap = nodeMap ?? new Map(nodes.map((n) => [n.id, n]))
    const cMap =
        connsByTarget ??
        new Map(
            connections
                .filter((c) => !c.isEnergy)
                .map((c) => [`${c.toNodeId}:${c.toDotIndex}`, c]),
        )

    const srcNode = nMap.get(nodeId)
    if (!srcNode) return null
    const srcDef = NODE_DEFS[srcNode.type]

    if (srcDef.cycleDuration > 0) {
        // Real producing node — calculate output rate from recipe.
        const output = srcDef.outputs[dotIndex]
        if (!output) return null
        const speedFactor = speedFactors.get(srcNode.id) ?? 1
        const speedMultiplier = 1.5 ** srcNode.speedUpgradeLevel
        return (
            (output.amount / srcDef.cycleDuration) *
            speedFactor *
            speedMultiplier
        )
    }

    if (srcNode.type === NodeType.Splitter) {
        // Trace back through the splitter's single input connection.
        const inConn = cMap.get(`${srcNode.id}:0`)
        if (!inConn) return null
        const upstreamRate = traceUnitsPerTick(
            inConn.fromNodeId,
            inConn.fromDotIndex,
            nodes,
            connections,
            speedFactors,
            depth + 1,
            nMap,
            cMap,
        )
        if (upstreamRate === null) return null
        const ratio =
            dotIndex === 0
                ? (srcNode.splitterRatioA ?? 0.5)
                : 1 - (srcNode.splitterRatioA ?? 0.5)
        return upstreamRate * ratio
    }

    if (srcNode.type === NodeType.Merger) {
        // A Merger combines both inputs into one output — sum both upstream rates.
        const inConnA = cMap.get(`${srcNode.id}:0`)
        const inConnB = cMap.get(`${srcNode.id}:1`)
        const rateA = inConnA
            ? traceUnitsPerTick(
                  inConnA.fromNodeId,
                  inConnA.fromDotIndex,
                  nodes,
                  connections,
                  speedFactors,
                  depth + 1,
                  nMap,
                  cMap,
              )
            : null
        const rateB = inConnB
            ? traceUnitsPerTick(
                  inConnB.fromNodeId,
                  inConnB.fromDotIndex,
                  nodes,
                  connections,
                  speedFactors,
                  depth + 1,
                  nMap,
                  cMap,
              )
            : null
        if (rateA === null && rateB === null) return null
        return (rateA ?? 0) + (rateB ?? 0)
    }

    return null
}

/**
 * Computes the projected steady-state revenue in €/s for each input slot of a Market node.
 * Traces back through the connection graph to find the upstream producer's output rate.
 *
 * @param node - The Market node to compute revenues for.
 * @param nodes - All active node instances.
 * @param connections - All active connections.
 * @param speedFactors - Pre-computed per-node speed factors (from calcNodeSpeedFactors).
 * @returns Array with one entry per input slot: revenue in €/s, or null when unconnected.
 */
export function calcMarketSlotRevenues(
    node: NodeInstance,
    nodes: NodeInstance[],
    connections: Connection[],
    speedFactors: Map<string, number>,
): (number | null)[] {
    // Build index maps once for all slot lookups and recursive traces.
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    const connsByTarget = new Map(
        connections
            .filter((c) => !c.isEnergy)
            .map((c) => [`${c.toNodeId}:${c.toDotIndex}`, c]),
    )

    return node.inputBuffers.map((_buf, i) => {
        const conn = connsByTarget.get(`${node.id}:${i}`)
        if (!conn) return null
        const srcNode = nodeMap.get(conn.fromNodeId)
        if (!srcNode) return null
        const unitsPerTick = traceUnitsPerTick(
            conn.fromNodeId,
            conn.fromDotIndex,
            nodes,
            connections,
            speedFactors,
            0,
            nodeMap,
            connsByTarget,
        )
        if (unitsPerTick === null) return null
        const resource = srcNode.outputBuffers[conn.fromDotIndex]?.resource
        if (resource === undefined) return null
        const price = MARKET_PRICES[resource] ?? 0
        return unitsPerTick * price * 20 // × 20 ticks/s → €/s
    })
}
