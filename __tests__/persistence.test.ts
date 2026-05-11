import { describe, it, expect, beforeEach, vi } from "vitest"
import { saveState, loadState, clearState } from "../src/simulation/persistence"
import type { GameState } from "../src/simulation/types"

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

/**
 * A simple in-memory stand-in for localStorage so tests run without a browser.
 */
function makeLocalStorageMock(): Storage {
    let store: Record<string, string> = {}
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key]
        }),
        clear: vi.fn(() => {
            store = {}
        }),
        get length(): number {
            return Object.keys(store).length
        },
        key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    } as unknown as Storage
}

// ---------------------------------------------------------------------------
// Minimal valid GameState fixture
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<GameState> = {}): GameState {
    return {
        nodes: [],
        connections: [],
        money: 100,
        totalEarned: 500,
        tick: 42,
        ...overrides,
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("persistence", () => {
    let storage: Storage

    beforeEach(() => {
        storage = makeLocalStorageMock()
        vi.stubGlobal("localStorage", storage)
    })

    // ── saveState ──────────────────────────────────────────────────────────

    describe("saveState", () => {
        it("writes serialised JSON to localStorage under the expected key", () => {
            const state = makeState()
            saveState(state)
            expect(storage.setItem).toHaveBeenCalledOnce()
            const [key, value] = (storage.setItem as ReturnType<typeof vi.fn>)
                .mock.calls[0] as [string, string]
            expect(key).toBe("factory-flow-state-v2")
            const parsed = JSON.parse(value) as GameState
            expect(parsed.money).toBe(100)
            expect(parsed.tick).toBe(42)
        })

        it("serialises nodes and connections arrays", () => {
            const state = makeState({ nodes: [], connections: [] })
            saveState(state)
            const value = (storage.setItem as ReturnType<typeof vi.fn>).mock
                .calls[0]![1] as string
            const parsed = JSON.parse(value) as GameState
            expect(Array.isArray(parsed.nodes)).toBe(true)
            expect(Array.isArray(parsed.connections)).toBe(true)
        })

        it("does not throw when localStorage throws (quota exceeded)", () => {
            ;(storage.setItem as ReturnType<typeof vi.fn>).mockImplementation(
                () => {
                    throw new DOMException("QuotaExceededError")
                },
            )
            expect(() => saveState(makeState())).not.toThrow()
        })
    })

    // ── loadState ──────────────────────────────────────────────────────────

    describe("loadState", () => {
        it("returns null when localStorage has no saved state", () => {
            expect(loadState()).toBeNull()
        })

        it("round-trips a saved state correctly", () => {
            const state = makeState({ money: 999, tick: 7 })
            saveState(state)
            const loaded = loadState()
            expect(loaded).not.toBeNull()
            expect(loaded!.money).toBe(999)
            expect(loaded!.tick).toBe(7)
        })

        it("returns null when the stored JSON is malformed", () => {
            ;(storage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
                "not-valid-json{{{",
            )
            expect(loadState()).toBeNull()
        })

        it("returns null when stored object is missing the nodes array", () => {
            const broken = JSON.stringify({
                connections: [],
                money: 0,
                tick: 0,
            })
            ;(storage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
                broken,
            )
            expect(loadState()).toBeNull()
        })

        it("returns null when stored object is missing the connections array", () => {
            const broken = JSON.stringify({ nodes: [], money: 0, tick: 0 })
            ;(storage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
                broken,
            )
            expect(loadState()).toBeNull()
        })

        it("returns null when money is not a number", () => {
            const broken = JSON.stringify({
                nodes: [],
                connections: [],
                money: "rich",
                tick: 0,
            })
            ;(storage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
                broken,
            )
            expect(loadState()).toBeNull()
        })

        it("returns null when tick is not a number", () => {
            const broken = JSON.stringify({
                nodes: [],
                connections: [],
                money: 0,
                tick: null,
            })
            ;(storage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
                broken,
            )
            expect(loadState()).toBeNull()
        })

        it("returns null when the stored value is a JSON primitive (not an object)", () => {
            ;(storage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
                JSON.stringify(42),
            )
            expect(loadState()).toBeNull()
        })

        it("returns null when the stored value is null JSON", () => {
            ;(storage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
                JSON.stringify(null),
            )
            expect(loadState()).toBeNull()
        })

        it("does not throw when localStorage.getItem throws", () => {
            ;(storage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
                () => {
                    throw new Error("SecurityError")
                },
            )
            expect(loadState()).toBeNull()
        })
    })

    // ── clearState ─────────────────────────────────────────────────────────

    describe("clearState", () => {
        it("removes the saved state from localStorage", () => {
            saveState(makeState())
            clearState()
            expect(storage.removeItem).toHaveBeenCalledWith(
                "factory-flow-state-v2",
            )
        })

        it("does not throw when called before any state was saved", () => {
            expect(() => clearState()).not.toThrow()
        })

        it("makes loadState return null after clearing", () => {
            saveState(makeState())
            clearState()
            // After clear, getItem returns null (mock store is updated by removeItem)
            ;(storage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null)
            expect(loadState()).toBeNull()
        })
    })
})
