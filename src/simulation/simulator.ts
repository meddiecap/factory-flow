import { NodeType, ResourceType } from "./types"
import type { GameState, NodeInstance } from "./types"
import { NODE_DEFS } from "./recipes"
import { calcNodeSpeedFactors } from "./energy"
import { tickConnections } from "./connections"
import { tickNode } from "./tick"
import { tickSplitter } from "./splitter"

/**
 * Speed factors computed by the most recent tick, keyed by node id.
 * Stored as a plain module-level variable (not in reactive GameState) so the renderer
 * can read it without Vue wrapping the Map in a Proxy.
 */
export let lastSpeedFactors: Map<string, number> = new Map()

/**
 * Advances the entire simulation by one tick, updating all node buffers and connections.
 * Called by the game loop at a fixed interval (50 ms = 20 ticks/sec) to drive production flow.
 * Execution order per tick:
 *   1. Calculate per-node speed factors from explicit energy connections.
 *   2. Transport goods along all resource connections (output → input buffers).
 *   3. Advance each production node's cycle progress.
 *   4. Process each Splitter node's fractional distribution.
 *   5. Increment the tick counter.
 *
 * @param state - The complete mutable game state to advance in place.
 */
export function tick(state: GameState): void {
    const { nodes, connections } = state

    // Build nodeMap once and share it with all sub-steps to avoid redundant O(n) builds.
    const nodeMap = new Map<string, NodeInstance>()
    for (const node of nodes) nodeMap.set(node.id, node)

    // 1. Per-node speed factors from explicit energy connections.
    const speedFactors = calcNodeSpeedFactors(
        nodes,
        connections,
        NODE_DEFS,
        nodeMap,
    )

    // 2. Transport goods along resource connections (energy connections are skipped).
    state.lastTransfers = tickConnections(nodes, connections, nodeMap)

    // 3. Advance each production node.
    for (const node of nodes) {
        const def = NODE_DEFS[node.type]
        if (def === undefined) continue

        if (node.type === NodeType.Splitter) {
            // Splitters are handled in step 4.
            continue
        }

        const sf = speedFactors.get(node.id) ?? 1.0
        tickNode(node, def, sf)
    }

    // 4. Process Splitter nodes.
    for (const node of nodes) {
        if (node.type === NodeType.Splitter) {
            tickSplitter(node)
        }
    }

    // 5. Cache speed factors for the renderer and advance tick counter.
    lastSpeedFactors = speedFactors
    state.tick++
}

/**
 * Returns true when the win condition is met: at least one Rocket is present
 * in any Assembly node's output buffer.
 * Called once per tick by the game loop immediately after tick().
 *
 * @param state - The current game state to inspect.
 * @returns `true` when the player has assembled at least one Rocket.
 */
export function checkWin(state: GameState): boolean {
    for (const node of state.nodes) {
        if (node.type !== NodeType.Assembly) continue
        for (const buf of node.outputBuffers) {
            if (buf.resource === ResourceType.Rocket && buf.amount >= 1) {
                return true
            }
        }
    }
    return false
}
