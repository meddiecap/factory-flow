import { NodeType } from "./types"
import type { NodeInstance, NodeDef, Connection } from "./types"
import { effectiveFuelPerTick } from "./tick"
import { filterEnergyConnections } from "./connections"

/**
 * Computes the effective energy output per tick for an EnergySupply node.
 * Base output comes from the node definition; each upgrade level adds +1.0 unit/tick.
 *
 * @param node - The EnergySupply node instance.
 * @param def - The static node definition (must be EnergySupply).
 * @returns Total energy units produced per tick.
 */
export function effectiveEnergyOutput(
    node: NodeInstance,
    def: NodeDef,
): number {
    return (def.energyOutputPerTick ?? 0) + (node.energyOutputUpgradeLevel ?? 0)
}

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
    nodeMap?: Map<string, NodeInstance>,
): Map<string, number> {
    const result = new Map<string, number>()

    // Reuse a pre-built map when provided (avoids a redundant O(n) build in tick()).
    const map: Map<string, NodeInstance> = nodeMap ?? new Map()
    if (nodeMap === undefined) {
        for (const node of nodes) map.set(node.id, node)
    }

    // Build O(1) indexes from the energy connections so the node loop stays O(n).
    // energyByTarget: toNodeId → the single Connection powering that factory.
    // energyBySupply: fromNodeId → all Connections leaving that supply.
    const energyByTarget = new Map<string, Connection>()
    const energyBySupply = new Map<string, Connection[]>()
    for (const c of filterEnergyConnections(connections)) {
        energyByTarget.set(c.toNodeId, c)
        const list = energyBySupply.get(c.fromNodeId) ?? []
        list.push(c)
        energyBySupply.set(c.fromNodeId, list)
    }

    for (const node of nodes) {
        const def = defs[node.type]
        if (def === undefined) continue

        if (!def.hasEnergyInput) {
            // Utility nodes and EnergySupply itself run unconstrained.
            result.set(node.id, 1.0)
            continue
        }

        // O(1): look up the single energy connection pointing to this factory.
        const energyConn = energyByTarget.get(node.id)
        if (energyConn === undefined) {
            // No energy connection → factory is completely stopped.
            result.set(node.id, 0)
            continue
        }

        const supply = map.get(energyConn.fromNodeId)
        if (supply === undefined) {
            result.set(node.id, 0)
            continue
        }

        const supplyDef = defs[supply.type]
        const energyOutputPerTick = effectiveEnergyOutput(supply, supplyDef)

        // O(1): count how many factories this supply is feeding.
        const connectedCount = energyBySupply.get(supply.id)?.length ?? 0

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
