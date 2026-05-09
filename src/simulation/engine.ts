/**
 * Core tick engine for Factory Flow.
 * Advances the simulation by one tick, updating all node buffers,
 * processing connections, collecting market income, and checking win condition.
 * Called by the game loop at a fixed interval (20 ticks/sec = 50 ms).
 */

import type { GameNode, GameState, ResourceId, TickResult } from "./types"
import {
    RECIPES,
    MARKET_PRICES,
    MARKET_THROUGHPUT,
    DEFAULT_BUFFERS,
} from "./recipes"
import {
    calcFuelProduced,
    calcFuelConsumed,
    calcSpeedMultiplier,
} from "./energy"
import { nodeSpeedFactor, nodeEfficiencyFactor } from "./upgrades"
import { applyTechUnlocks } from "./tech-tree"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Advances the simulation by one tick, updating all node buffers and connections.
 * Called by the game loop at a fixed interval to drive production flow.
 *
 * @param state - The current game state (mutated in place)
 * @returns A summary of what happened during this tick
 */
export function tick(state: GameState): TickResult {
    // 1. Determine global speed multiplier from energy pool
    const fuelProduced = calcFuelProduced(state.nodes)
    const fuelConsumed = calcFuelConsumed(state.nodes)
    const speedMultiplier = calcSpeedMultiplier(fuelProduced, fuelConsumed)

    // 2. Process connections: move resources between output and input buffers
    transferAlongConnections(state)

    // 3. Advance production cycles for all factory nodes
    let moneyEarned = 0
    let wonThisTick = false

    for (const node of state.nodes) {
        if (node.type === "market") {
            moneyEarned += processMarketNode(node)
            continue
        }
        if (node.type === "splitter" || node.type === "warehouse") {
            // Splitter and warehouse act as pass-through buffers, handled via connections only
            continue
        }

        const result = advanceNode(node, speedMultiplier)
        if (result.producedRocket) {
            wonThisTick = true
        }
    }

    // 4. Update economy
    state.money += moneyEarned
    state.totalEarned += moneyEarned

    // 5. Check tech tree unlocks
    applyTechUnlocks(state)

    // 6. Set win flag
    if (wonThisTick) {
        state.won = true
    }

    return { moneyEarned, speedMultiplier, wonThisTick }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Advances one factory node by one tick.
 * When idle (progress = 0), checks output room and input availability before
 * starting a new cycle. Accumulates fractional progress and completes full
 * cycles by depositing output into the output buffer.
 *
 * @param node - The factory node to advance
 * @param globalSpeedMultiplier - Global energy speed factor
 * @returns Whether a rocket was produced this tick
 */
function advanceNode(
    node: GameNode,
    globalSpeedMultiplier: number,
): { producedRocket: boolean } {
    const recipe = RECIPES[node.type]
    const effectiveSpeed = nodeSpeedFactor(node) * globalSpeedMultiplier
    const effFactor = nodeEfficiencyFactor(node)

    // When idle, check whether a new cycle can start
    if (node.progress === 0) {
        if (!hasOutputRoom(node, recipe)) return { producedRocket: false }
        if (recipe.inputs.length > 0) {
            if (!hasInputIngredients(node, recipe, effFactor))
                return { producedRocket: false }
            consumeInputs(node, recipe, effFactor)
        }
    }

    // Advance fractional progress (mid-cycle or just started)
    node.progress += effectiveSpeed

    // Complete as many cycles as the accumulated progress allows
    let producedRocket = false
    while (node.progress >= recipe.ticksPerCycle) {
        node.progress -= recipe.ticksPerCycle

        // Deposit outputs (per-resource buffer cap)
        for (const output of recipe.outputs) {
            const current = node.outputBuffer[output.resource] ?? 0
            node.outputBuffer[output.resource] = Math.min(
                node.outputBufferMax,
                current + output.amount,
            )
            if (output.resource === "rocket") producedRocket = true
        }

        // If overflow progress remains (speed > 1 cycle/tick), attempt next cycle immediately
        if (node.progress > 0) {
            if (!hasOutputRoom(node, recipe)) {
                node.progress = 0
                break
            }
            if (recipe.inputs.length > 0) {
                if (!hasInputIngredients(node, recipe, effFactor)) {
                    node.progress = 0
                    break
                }
                consumeInputs(node, recipe, effFactor)
            }
        }
    }

    return { producedRocket }
}

/**
 * Transfers resources along all connections each tick.
 * Connection capacity is a hard limit per tick — it represents physical
 * pipe throughput, not scaled by the energy speed multiplier.
 *
 * @param state - Game state with nodes and connections
 */
function transferAlongConnections(state: GameState): void {
    for (const conn of state.connections) {
        const fromNode = state.nodes.find((n) => n.id === conn.fromNodeId)
        const toNode = state.nodes.find((n) => n.id === conn.toNodeId)
        if (!fromNode || !toNode) continue

        const available = fromNode.outputBuffer[conn.fromResource] ?? 0
        if (available <= 0) continue

        const toCurrentSlot = toNode.inputBuffer[conn.toResource] ?? 0
        const toSpace = toNode.inputBufferMax - toCurrentSlot
        const transferable = Math.min(available, conn.capacityPerTick, toSpace)
        if (transferable <= 0) continue

        fromNode.outputBuffer[conn.fromResource] = available - transferable
        toNode.inputBuffer[conn.toResource] = toCurrentSlot + transferable
    }
}

/**
 * Processes a market (sink) node: sells all resources in its input buffer,
 * up to the MARKET_THROUGHPUT limit per tick.
 *
 * @param node - The market node to process
 * @returns Money earned this tick from this node
 */
function processMarketNode(node: GameNode): number {
    let earned = 0
    let sold = 0

    for (const resource of Object.keys(node.inputBuffer) as ResourceId[]) {
        const amount = node.inputBuffer[resource] ?? 0
        if (amount <= 0) continue
        const canSell = Math.min(amount, MARKET_THROUGHPUT - sold)
        if (canSell <= 0) break

        const price = MARKET_PRICES[resource] ?? 0
        earned += canSell * price
        sold += canSell
        node.inputBuffer[resource] = amount - canSell
    }

    return earned
}

/**
 * Returns true if the output buffer has room for all outputs of one complete cycle.
 * Each resource slot is capped independently at outputBufferMax.
 */
function hasOutputRoom(
    node: GameNode,
    recipe: (typeof RECIPES)[keyof typeof RECIPES],
): boolean {
    for (const output of recipe.outputs) {
        const current = node.outputBuffer[output.resource] ?? 0
        if (current + output.amount > node.outputBufferMax) return false
    }
    return true
}

/**
 * Returns true if the input buffer holds enough of each ingredient for one cycle.
 * Ingredient amounts are adjusted by the efficiency upgrade factor.
 */
function hasInputIngredients(
    node: GameNode,
    recipe: (typeof RECIPES)[keyof typeof RECIPES],
    effFactor: number,
): boolean {
    for (const input of recipe.inputs) {
        const required = Math.ceil(input.amount * effFactor)
        if ((node.inputBuffer[input.resource] ?? 0) < required) return false
    }
    return true
}

/**
 * Deducts one cycle's worth of inputs from the node's input buffer.
 */
function consumeInputs(
    node: GameNode,
    recipe: (typeof RECIPES)[keyof typeof RECIPES],
    effFactor: number,
): void {
    for (const input of recipe.inputs) {
        const required = Math.ceil(input.amount * effFactor)
        node.inputBuffer[input.resource] =
            (node.inputBuffer[input.resource] ?? 0) - required
    }
}

// ---------------------------------------------------------------------------
// Factory helpers (public)
// ---------------------------------------------------------------------------

/**
 * Creates a new GameNode with default buffer sizes and zeroed upgrade levels.
 * Buffer sizes are sourced from the design spec (DEFAULT_BUFFERS in recipes.ts).
 *
 * @param id - Unique node identifier
 * @param type - The factory type to create
 * @param col - Grid column for the top-left cell
 * @param row - Grid row for the top-left cell
 * @returns A fresh GameNode ready to be added to the game state
 */
export function createNode(
    id: string,
    type: GameNode["type"],
    col: number,
    row: number,
): GameNode {
    const [inputMax, outputMax] = DEFAULT_BUFFERS[type]
    return {
        id,
        type,
        col,
        row,
        inputBuffer: {},
        outputBuffer: {},
        inputBufferMax: inputMax,
        outputBufferMax: outputMax,
        progress: 0,
        upgrades: { speed: 0, buffer: 0, efficiency: 0, energyEfficiency: 0 },
    }
}

/**
 * Calculates the build cost for a factory when the player already owns some of the same type.
 * Formula: baseCost x 1.5^alreadyBuilt (design doc section 4.5).
 *
 * @param type - Factory type
 * @param alreadyBuilt - Number of this factory type already placed
 * @returns Cost in money units (integer)
 */
export function buildCost(
    type: GameNode["type"],
    alreadyBuilt: number,
): number {
    return Math.round(RECIPES[type].baseCost * Math.pow(1.5, alreadyBuilt))
}
