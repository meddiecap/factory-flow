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
     * Transfer events from the most recent tick, used by the renderer to spawn
     * particle animations. Not persisted to localStorage.
     */
    lastTransfers?: import("../connections").TransferEvent[]
    /**
     * Per-node speed factors computed by the most recent tick.
     * Stored here so the renderer can reuse them without a second calcNodeSpeedFactors call.
     * Not persisted to localStorage.
     */
    lastSpeedFactors?: Map<string, number>
}
