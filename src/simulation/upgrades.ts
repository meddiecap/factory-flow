/**
 * Upgrade logic: cost calculation and effect application.
 * Implements design doc section 6.
 */

import type { GameNode, GameState, UpgradeType } from "./types"
import {
    RECIPES,
    UPGRADE_COST_MULTIPLIER,
    SPEED_UPGRADE_FACTOR,
    BUFFER_UPGRADE_STEP,
    LINE_CAPACITY_UPGRADE_STEP,
} from "./recipes"
import type { Connection } from "./types"

/**
 * Calculates the cost of the next upgrade level for a node.
 * Level 1 costs 2× the base build cost; each subsequent level is ×3 more expensive.
 *
 * @param node - The node to upgrade
 * @param upgradeType - Which upgrade to price
 * @returns Cost in money units for the next level
 */
export function upgradeNodeCost(
    node: GameNode,
    upgradeType: UpgradeType,
): number {
    const baseCost = RECIPES[node.type].baseCost
    // Level 1 = 2× baseCost; level n = 2× baseCost × 3^(n-1)
    let currentLevel: number
    switch (upgradeType) {
        case "speed":
            currentLevel = node.upgrades.speed
            break
        case "buffer":
            currentLevel = node.upgrades.buffer
            break
        case "efficiency":
            currentLevel = node.upgrades.efficiency
            break
        case "energy-efficiency":
            currentLevel = node.upgrades.energyEfficiency
            break
        default:
            currentLevel = 0
    }
    return Math.round(
        2 * baseCost * Math.pow(UPGRADE_COST_MULTIPLIER, currentLevel),
    )
}

/**
 * Calculates the cost of the next line-capacity upgrade for a connection.
 * Uses a flat base of 100 × 3^level.
 *
 * @param connection - The connection to upgrade
 * @returns Cost in money units
 */
export function upgradeLineCost(connection: Connection): number {
    return Math.round(
        100 *
            Math.pow(UPGRADE_COST_MULTIPLIER, connection.capacityUpgradeLevel),
    )
}

/**
 * Applies a node upgrade if the player has sufficient funds.
 * Mutates the game state in place.
 *
 * @param state - Current game state
 * @param nodeId - ID of the node to upgrade
 * @param upgradeType - Which upgrade to apply
 * @returns true if the upgrade was applied, false if insufficient funds
 */
export function applyNodeUpgrade(
    state: GameState,
    nodeId: string,
    upgradeType: UpgradeType,
): boolean {
    const node = state.nodes.find((n) => n.id === nodeId)
    if (!node) return false

    const cost = upgradeNodeCost(node, upgradeType)
    if (state.money < cost) return false

    state.money -= cost

    switch (upgradeType) {
        case "speed":
            node.upgrades.speed += 1
            break
        case "buffer":
            node.upgrades.buffer += 1
            node.inputBufferMax += BUFFER_UPGRADE_STEP
            node.outputBufferMax += BUFFER_UPGRADE_STEP
            break
        case "efficiency":
            node.upgrades.efficiency += 1
            break
        case "energy-efficiency":
            node.upgrades.energyEfficiency += 1
            break
    }

    return true
}

/**
 * Applies a line-capacity upgrade if the player has sufficient funds.
 * Mutates the game state in place.
 *
 * @param state - Current game state
 * @param connectionId - ID of the connection to upgrade
 * @returns true if the upgrade was applied, false if insufficient funds
 */
export function applyLineUpgrade(
    state: GameState,
    connectionId: string,
): boolean {
    const conn = state.connections.find((c) => c.id === connectionId)
    if (!conn) return false

    const cost = upgradeLineCost(conn)
    if (state.money < cost) return false

    state.money -= cost
    conn.capacityUpgradeLevel += 1
    conn.capacityPerTick += LINE_CAPACITY_UPGRADE_STEP

    return true
}

/**
 * Returns the effective speed multiplier for a node from upgrades alone.
 * Does not account for the global energy multiplier.
 *
 * @param node - The node to evaluate
 * @returns Multiplicative speed factor from upgrade level
 */
export function nodeSpeedFactor(node: GameNode): number {
    return Math.pow(SPEED_UPGRADE_FACTOR, node.upgrades.speed)
}

/**
 * Returns the effective input multiplier for a node's recipe inputs.
 * Efficiency upgrades reduce input consumption by 10% per level (min 50%).
 *
 * @param node - The node to evaluate
 * @returns Fraction of base input cost (1.0 = no upgrade, 0.5 = max)
 */
export function nodeEfficiencyFactor(node: GameNode): number {
    return Math.max(0.5, 1 - node.upgrades.efficiency * 0.1)
}
