import { ResourceType } from "./types"
import type { NodeInstance, Connection, GameState } from "./types"
import { NODE_DEFS } from "./recipes"
import { upgradeCost } from "./economy"

/**
 * All upgrade types that can be applied to a node.
 * Used as discriminator in applyUpgrade to select the correct effect and cost.
 */
export type UpgradeType =
    | "speed"
    | "buffer"
    | "efficiency"
    | "energyEfficiency"
    | "salesPoint"
    | "energyOutput"

/**
 * Applies one upgrade level to a node, deducting the cost from the game state.
 * Returns false without making any changes if the player cannot afford the upgrade
 * or if the upgrade type is not applicable to this node.
 * Handles all per-node upgrade types defined in section 6 of the design doc.
 *
 * @param node - The node instance to upgrade.
 * @param type - The upgrade type to apply.
 * @param state - The mutable game state; money is deducted on success.
 * @returns `true` when the upgrade was applied, `false` when rejected.
 */
export function applyUpgrade(
    node: NodeInstance,
    type: UpgradeType,
    state: GameState,
): boolean {
    const def = NODE_DEFS[node.type]

    switch (type) {
        case "speed": {
            const cost = upgradeCost(def.buildCost, node.speedUpgradeLevel)
            if (state.money < cost) return false
            state.money -= cost
            node.speedUpgradeLevel++
            return true
        }

        case "buffer": {
            const cost = upgradeCost(def.buildCost, node.bufferUpgradeLevel)
            if (state.money < cost) return false
            state.money -= cost
            node.bufferUpgradeLevel++
            // Immediately expand all existing buffer slot capacities by +10.
            for (const buf of node.inputBuffers) buf.capacity += 10
            for (const buf of node.outputBuffers) buf.capacity += 10
            return true
        }

        case "efficiency": {
            if (def.inputs.length === 0) return false
            const cost = upgradeCost(def.buildCost, node.efficiencyUpgradeLevel)
            if (state.money < cost) return false
            state.money -= cost
            // tick.ts applies the reduced consumption via effectiveInputAmount().
            node.efficiencyUpgradeLevel++
            return true
        }

        case "energyEfficiency": {
            if (def.fuelPerTick === 0) return false
            const cost = upgradeCost(
                def.buildCost,
                node.energyEfficiencyUpgradeLevel,
            )
            if (state.money < cost) return false
            state.money -= cost
            // tick.ts applies the reduced fuel cost via effectiveFuelPerTick().
            node.energyEfficiencyUpgradeLevel++
            return true
        }

        case "salesPoint": {
            const pts = node.salesPoints ?? 1
            // Formula from section 6: €200 × 2^(currentPoints − 1).
            const cost = Math.ceil(200 * 2 ** (pts - 1))
            if (state.money < cost) return false
            state.money -= cost
            // Add a new input buffer slot; resource type is a placeholder until
            // the player draws a connection to this dot.
            node.inputBuffers.push({
                resource: ResourceType.IronOre,
                amount: 0,
                capacity: 20,
            })
            node.salesPoints = pts + 1
            return true
        }

        case "energyOutput": {
            // Only applicable to EnergySupply nodes.
            if (def.energyOutputPerTick === undefined) return false
            const cost = upgradeCost(
                def.buildCost,
                node.energyOutputUpgradeLevel,
            )
            if (state.money < cost) return false
            state.money -= cost
            node.energyOutputUpgradeLevel++
            return true
        }
    }
}

/**
 * Applies one capacity upgrade level to a connection, deducting the cost from the game state.
 * Each level adds +10 units/tick to the connection's throughput (base is 10 units/tick).
 * Cost formula: €50 × 2^currentLevel.
 *
 * @param connection - The connection to upgrade.
 * @param state - The mutable game state; money is deducted on success.
 * @returns `true` when the upgrade was applied, `false` when the player cannot afford it.
 */
export function applyConnectionUpgrade(
    connection: Connection,
    state: GameState,
): boolean {
    const cost = Math.ceil(50 * 2 ** connection.capacityUpgradeLevel)
    if (state.money < cost) return false
    state.money -= cost
    connection.capacityUpgradeLevel++
    return true
}
