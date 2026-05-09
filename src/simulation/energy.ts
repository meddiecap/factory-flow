/**
 * Energy pool calculations for the global fuel system.
 * Determines the production speed multiplier based on fuel surplus/deficit.
 * Implements design doc section 5.3.
 */

import type { GameNode } from "./types"
import { RECIPES } from "./recipes"

/**
 * Calculates the total fuel produced per tick by all Energy Supply nodes.
 * Only nodes of type 'energy-supply' contribute to the global pool.
 *
 * @param nodes - All active nodes on the canvas
 * @returns Total fuel produced per tick
 */
export function calcFuelProduced(nodes: GameNode[]): number {
    return nodes
        .filter((n) => n.type === "energy-supply")
        .reduce((sum, n) => {
            const speedLevel = n.upgrades.speed
            const speedFactor = Math.pow(1.5, speedLevel)
            // Energy Supply outputs 2 fuel per tick at base speed
            return sum + 2 * speedFactor
        }, 0)
}

/**
 * Calculates the total fuel consumed per tick by all non-Energy-Supply nodes.
 * Uses each node's recipe fuelPerTick, adjusted by energy-efficiency upgrades.
 *
 * @param nodes - All active nodes on the canvas
 * @returns Total fuel consumed per tick at current upgrade levels
 */
export function calcFuelConsumed(nodes: GameNode[]): number {
    return nodes
        .filter((n) => n.type !== "energy-supply")
        .reduce((sum, n) => {
            const recipe = RECIPES[n.type]
            const effLevel = n.upgrades.energyEfficiency
            const effFactor = Math.max(0.5, 1 - effLevel * 0.1)
            return sum + recipe.fuelPerTick * effFactor
        }, 0)
}

/**
 * Computes the global production speed multiplier for this tick.
 * - Surplus: multiplier = 1 + 0.2 * ln(surplus + 1), asymptote ≈ 2.2
 * - Deficit: multiplier = available / required (linear, can reach 0)
 *
 * @param produced - Fuel produced per tick
 * @param consumed - Fuel consumed per tick
 * @returns Speed multiplier (0.0 – ~2.2)
 */
export function calcSpeedMultiplier(
    produced: number,
    consumed: number,
): number {
    if (consumed === 0) return 1.0
    if (produced >= consumed) {
        const surplus = produced - consumed
        return 1 + 0.2 * Math.log(surplus + 1)
    }
    // Deficit: proportional slowdown, can reach 0
    return produced / consumed
}
