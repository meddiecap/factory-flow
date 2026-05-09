import type { GameState } from "./types"

/** localStorage key used to store and retrieve the serialised game state. */
const STORAGE_KEY = "factory-flow-state"

/**
 * Serialises the current game state to JSON and writes it to localStorage.
 * Called automatically every 5 seconds while the game is running.
 *
 * @param state - The game state to persist.
 */
export function saveState(state: GameState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
        // Silently ignore quota or security errors; saving is best-effort.
    }
}

/**
 * Reads and deserialises a previously saved game state from localStorage.
 * Returns null when no valid save is found, so the caller can start fresh.
 *
 * @returns The restored GameState, or null when absent or unreadable.
 */
export function loadState(): GameState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw === null) return null
        const parsed: unknown = JSON.parse(raw)
        // Minimal structural validation – prevents crashes from corrupted data.
        if (
            typeof parsed !== "object" ||
            parsed === null ||
            !Array.isArray((parsed as GameState).nodes) ||
            !Array.isArray((parsed as GameState).connections) ||
            typeof (parsed as GameState).money !== "number" ||
            typeof (parsed as GameState).tick !== "number"
        ) {
            return null
        }
        return parsed as GameState
    } catch {
        return null
    }
}

/**
 * Removes the saved game state from localStorage.
 * Called when the player chooses to start a new run from the win screen.
 */
export function clearState(): void {
    localStorage.removeItem(STORAGE_KEY)
}
