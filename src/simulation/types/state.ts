import type { NodeInstance } from "./nodes"

/**
 * A directed connection between the output dot of one node and the input dot of another.
 * Goods flow from the source node's output buffer to the target node's input buffer each tick.
 */
export interface Connection {
    /** Unique identifier for this connection. */
    id: string
    fromNodeId: string
    /** Index of the output dot on the source node (0-based). */
    fromDotIndex: number
    toNodeId: string
    /** Index of the input dot on the target node (0-based). */
    toDotIndex: number
    /**
     * Maximum units that can flow through this connection per tick.
     * Base value is 10; increased by line capacity upgrades.
     */
    capacity: number
    /** Line capacity upgrade level; each level adds +10 units/tick. */
    capacityUpgradeLevel: number
    /**
     * True when this connection carries energy from an Energy Supply to a factory.
     * Energy connections are drawn in yellow and processed separately from resource flow.
     */
    isEnergy?: boolean
}

/**
 * Complete runtime state of one game session.
 * Passed to every simulation tick function and persisted to localStorage.
 */
export interface GameState {
    nodes: NodeInstance[]
    connections: Connection[]
    /** Current spendable money in whole currency units (€). */
    money: number
    /** Cumulative money earned this run; used for tech tree unlock thresholds. */
    totalEarned: number
    /** Number of simulation ticks elapsed since the run started. */
    tick: number
    /**
     * Number of placed nodes per NodeType, maintained incrementally to avoid
     * O(n) `.filter()` scans every time the palette or build-cost logic reads the count.
     * Derived from `nodes` — not authoritative independently.
     */
    nodeTypeCounts?: Partial<Record<string, number>>
    /**
     * Transfer events from the most recent tick, used by the renderer to spawn
     * particle animations. Not persisted to localStorage.
     */
    lastTransfers?: import("../connections").TransferEvent[]
    /**
     * IDs of nodes whose production cycle completed during the most recent tick.
     * Used by the audio system for proximity-based sound effects. Not persisted.
     */
    lastProductionNodeIds?: string[]
    /**
     * Camera state (pan offset in screen pixels + zoom factor).
     * Persisted so the player returns to the same view on reload.
     * Absent in older saves; treated as { panX: 0, panY: 0, zoom: 1 }.
     */
    camera?: { panX: number; panY: number; zoom: number }
}
