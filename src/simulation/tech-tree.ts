/**
 * Tech tree unlock logic.
 * Checks the player's total earned money against unlock thresholds and
 * adds newly available factory types to the game state.
 * Implements design doc section 7.
 */

import type { GameState } from "./types"
import { TECH_UNLOCKS } from "./recipes"

/**
 * Updates the set of unlocked factories based on totalEarned.
 * Safe to call every tick; no-ops when nothing new is unlocked.
 * Mutates state.unlockedFactories in place.
 *
 * @param state - Current game state (mutated)
 */
export function applyTechUnlocks(state: GameState): void {
    for (const tier of TECH_UNLOCKS) {
        if (state.totalEarned >= tier.requiredEarned) {
            for (const factory of tier.factories) {
                state.unlockedFactories.add(factory)
            }
        }
    }
}

/**
 * Returns the money required to unlock the next unavailable factory tier.
 * Returns null if all factories are already unlocked.
 *
 * @param state - Current game state
 * @returns Required money for next unlock, or null
 */
export function nextUnlockThreshold(state: GameState): number | null {
    for (const tier of TECH_UNLOCKS) {
        if (state.totalEarned < tier.requiredEarned) {
            return tier.requiredEarned
        }
    }
    return null
}
