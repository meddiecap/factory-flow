import { NodeType } from "./types"
import type { GameState } from "./types"
import { MARKET_PRICES } from "./recipes"

/** Maximum units sold per Market sales point per tick (from section 4.4). */
const MARKET_SALES_PER_POINT_PER_TICK = 20

/**
 * Unlock thresholds for each NodeType, keyed by total money earned.
 * NodeTypes not in this map are available from the start.
 * Values are taken from the tech tree table in section 7.1.
 */
const UNLOCK_THRESHOLDS: Partial<Record<NodeType, number>> = {
    [NodeType.EnergySupply]: 50,
    [NodeType.CoalMine]: 200,
    [NodeType.CopperMine]: 200,
    [NodeType.SiliconMine]: 200,
    [NodeType.Smelter]: 800,
    [NodeType.Foundry]: 3000,
    [NodeType.CableFactory]: 3000,
    [NodeType.ChipFactory]: 15000,
    [NodeType.Electronics]: 15000,
    [NodeType.EngineFactory]: 15000,
    [NodeType.Assembly]: 40000,
}

/**
 * Processes one tick of automatic selling for all Market nodes in the game state.
 * Each Market sells up to 20 units per active sales point from its input buffers,
 * crediting the sale price to `state.money` and `state.totalEarned`.
 * Called once per tick by the main game loop after node ticks.
 *
 * @param state - The mutable game state whose Market nodes and wallet are updated.
 */
export function tickMarket(state: GameState): void {
    for (const node of state.nodes) {
        if (node.type !== NodeType.Market) continue

        const points = node.salesPoints ?? 1

        // Each input buffer slot corresponds to one sales point.
        const slotsToProcess = Math.min(points, node.inputBuffers.length)

        for (let i = 0; i < slotsToProcess; i++) {
            const buf = node.inputBuffers[i]
            if (buf === undefined) continue

            const price = MARKET_PRICES[buf.resource]
            const units = Math.min(buf.amount, MARKET_SALES_PER_POINT_PER_TICK)

            if (units <= 0 || price === undefined) continue

            buf.amount -= units
            const revenue = units * price
            state.money += revenue
            state.totalEarned += revenue
        }
    }
}

/**
 * Returns whether a specific node type is available to the player at this point in the run.
 * Availability is determined by comparing `state.totalEarned` against the unlock threshold
 * defined in the tech tree. IronMine and Market are always available.
 *
 * @param type - The NodeType to check.
 * @param state - The current game state, used to read `totalEarned`.
 * @returns `true` when the node type can be purchased and placed.
 */
export function canUnlock(type: NodeType, state: GameState): boolean {
    // IronMine and Market are available from tick 0.
    if (!(type in UNLOCK_THRESHOLDS)) return true

    const threshold = UNLOCK_THRESHOLDS[type]
    if (threshold === undefined) return true

    return state.totalEarned >= threshold
}

/**
 * Calculates the purchase cost for the n-th node of a given type.
 * Uses the escalating cost formula from section 4.5:
 *   `cost_n = baseCost × 1.5^(n - 1)`
 * where n is the count of nodes of that type already placed (1-based).
 * Returns a whole number (rounded up).
 *
 * @param baseCost - The base build cost for the node type (from NODE_DEFS).
 * @param existingCount - How many nodes of this type are already on the canvas.
 * @returns The purchase price in whole currency units (€).
 */
export function buildCost(baseCost: number, existingCount: number): number {
    return Math.ceil(baseCost * 1.5 ** existingCount)
}

/**
 * Calculates the cost to purchase the next upgrade level for a node.
 * Level 1 costs 2× the node's base build cost; each subsequent level is 3× more expensive.
 * Formula: `baseCost × 2 × 3^currentLevel`
 * Matches the marginal-return table in section 6.1.
 *
 * @param baseCost - The base build cost of the node type (from NODE_DEFS).
 * @param currentLevel - The node's current upgrade level (0 = not yet upgraded).
 * @returns The cost in whole currency units (€) to reach the next level.
 */
export function upgradeCost(baseCost: number, currentLevel: number): number {
    return Math.ceil(baseCost * 2 * 3 ** currentLevel)
}
