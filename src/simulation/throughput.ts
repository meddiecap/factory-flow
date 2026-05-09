import { NodeType } from "./types"
import type { NodeInstance, Connection } from "./types"
import { NODE_DEFS } from "./recipes"

/**
 * Recursively traces back through pass-through nodes (Splitter, Warehouse) to
 * find the steady-state throughput in units/tick reaching a given output dot.
 * Used by the UI to compute projected revenue on Market nodes.
 *
 * @param nodeId - The id of the source node to trace from.
 * @param dotIndex - The output dot index on the source node.
 * @param nodes - All active node instances.
 * @param connections - All active connections.
 * @param speedFactors - Pre-computed per-node speed factors (from calcNodeSpeedFactors).
 * @param depth - Recursion depth guard; stops at 20 to prevent infinite loops.
 * @returns Steady-state units/tick, or null when no producing node is reachable.
 */
export function traceUnitsPerTick(
    nodeId: string,
    dotIndex: number,
    nodes: NodeInstance[],
    connections: Connection[],
    speedFactors: Map<string, number>,
    depth = 0,
): number | null {
    if (depth > 20) return null // guard against cycles
    const srcNode = nodes.find((n) => n.id === nodeId)
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
        const inConn = connections.find(
            (c) =>
                !c.isEnergy && c.toNodeId === srcNode.id && c.toDotIndex === 0,
        )
        if (!inConn) return null
        const upstreamRate = traceUnitsPerTick(
            inConn.fromNodeId,
            inConn.fromDotIndex,
            nodes,
            connections,
            speedFactors,
            depth + 1,
        )
        if (upstreamRate === null) return null
        const ratio =
            dotIndex === 0
                ? (srcNode.splitterRatioA ?? 0.5)
                : 1 - (srcNode.splitterRatioA ?? 0.5)
        return upstreamRate * ratio
    }

    if (srcNode.type === NodeType.Warehouse) {
        // Warehouse is a straight passthrough — trace back its input.
        const inConn = connections.find(
            (c) =>
                !c.isEnergy && c.toNodeId === srcNode.id && c.toDotIndex === 0,
        )
        if (!inConn) return null
        return traceUnitsPerTick(
            inConn.fromNodeId,
            inConn.fromDotIndex,
            nodes,
            connections,
            speedFactors,
            depth + 1,
        )
    }

    return null
}
