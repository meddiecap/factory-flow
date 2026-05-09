import { NodeType } from "./types"
import type { NodeInstance, NodeDef, Connection } from "./types"
import { effectiveFuelPerTick } from "./tick"

/**
 * Computes a per-node speed factor based on explicit energy connections.
 * Each production factory must be connected to an Energy Supply via an energy connection.
 * The Energy Supply distributes its output equally among all connected factories.
 * Factories without an energy connection receive speedFactor 0 (completely stopped).
 * Utility nodes (Splitter, Market, Warehouse) and EnergySupply itself receive 1.0.
 * Called once per tick before nodes are advanced.
 *
 * @param nodes - All node instances on the canvas.
 * @param connections - All active connections, including energy connections.
 * @param defs - Record mapping NodeType to its static definition.
 * @returns Map of node id → speed factor (0–1) for use in tickNode.
 */
export function calcNodeSpeedFactors(
    nodes: NodeInstance[],
    connections: Connection[],
    defs: Record<NodeType, NodeDef>,
): Map<string, number> {
    const result = new Map<string, number>()

    const nodeMap = new Map<string, NodeInstance>()
    for (const node of nodes) nodeMap.set(node.id, node)

    const energyConns = connections.filter((c) => c.isEnergy === true)

    for (const node of nodes) {
        const def = defs[node.type]
        if (def === undefined) continue

        if (!def.hasEnergyInput) {
            // Utility nodes and EnergySupply itself run unconstrained.
            result.set(node.id, 1.0)
            continue
        }

        // Find the single energy connection pointing to this factory.
        const energyConn = energyConns.find((c) => c.toNodeId === node.id)
        if (energyConn === undefined) {
            // No energy connection → factory is completely stopped.
            result.set(node.id, 0)
            continue
        }

        const supply = nodeMap.get(energyConn.fromNodeId)
        if (supply === undefined) {
            result.set(node.id, 0)
            continue
        }

        const supplyDef = defs[supply.type]
        const energyOutputPerTick =
            (supplyDef?.energyOutputPerTick ?? 0) +
            (supply.energyOutputUpgradeLevel ?? 0)

        // Count how many factories this supply is feeding.
        const connectedCount = energyConns.filter(
            (c) => c.fromNodeId === supply.id,
        ).length

        if (connectedCount === 0 || energyOutputPerTick === 0) {
            result.set(node.id, 0)
            continue
        }

        const receivedPerTick = energyOutputPerTick / connectedCount
        const neededPerTick = effectiveFuelPerTick(
            def.fuelPerTick,
            node.energyEfficiencyUpgradeLevel,
        )

        if (neededPerTick === 0) {
            result.set(node.id, 1.0)
            continue
        }

        result.set(node.id, Math.min(1, receivedPerTick / neededPerTick))
    }

    return result
}
