import { NodeType } from "./types"
import type { GameState } from "./types"
import { NODE_DEFS } from "./recipes"
import { calcSpeedFactor } from "./energy"
import { tickConnections } from "./connections"
import { tickNode } from "./tick"
import { tickSplitter } from "./splitter"

/**
 * Advances the entire simulation by one tick, updating all node buffers and connections.
 * Called by the game loop at a fixed interval (50 ms = 20 ticks/sec) to drive production flow.
 * Execution order per tick:
 *   1. Calculate the global speed factor from the energy balance.
 *   2. Transport goods along all connections (output → input buffers).
 *   3. Advance each production node's cycle progress.
 *   4. Process each Splitter node's fractional distribution.
 *   5. Increment the tick counter.
 *
 * @param state - The complete mutable game state to advance in place.
 */
export function tick(state: GameState): void {
    const { nodes, connections } = state

    // 1. Global speed factor from energy balance.
    const speedFactor = calcSpeedFactor(nodes, NODE_DEFS)

    // 2. Transport goods along connections.
    tickConnections(nodes, connections)

    // 3. Advance each production node.
    for (const node of nodes) {
        const def = NODE_DEFS[node.type]
        if (def === undefined) continue

        if (node.type === NodeType.Splitter) {
            // Splitters are handled in step 4.
            continue
        }

        tickNode(node, def, speedFactor)
    }

    // 4. Process Splitter nodes.
    for (const node of nodes) {
        if (node.type === NodeType.Splitter) {
            tickSplitter(node)
        }
    }

    // 5. Advance tick counter.
    state.tick++
}
