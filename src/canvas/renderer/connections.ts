import Konva from "konva"
import { NODE_DEFS } from "../../simulation/recipes"
import type { Connection, NodeInstance } from "../../simulation/types"
import {
    outputDotPos,
    energyOutputDotPos,
    inputDotPos,
    routeWaypoints,
} from "../shared/geometry"
import { CONNECTION_COLOR, ENERGY_DOT_COLOR } from "./constants"

/**
 * Draws a Manhattan-routed polyline between two pixel positions.
 * Delegates routing to routeWaypoints and renders the result as a Konva.Line.
 *
 * @param layer - The Konva layer to draw onto.
 * @param x1 - Start x (output dot, right edge of source node).
 * @param y1 - Start y.
 * @param x2 - End x (input dot, left edge of target node).
 * @param y2 - End y.
 * @param color - Stroke colour (defaults to the standard connection grey).
 */
function drawManhattanLine(
    layer: Konva.Layer,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string = CONNECTION_COLOR,
): void {
    const waypoints = routeWaypoints(x1, y1, x2, y2)
    const points = waypoints.flat()
    layer.add(
        new Konva.Line({
            points,
            stroke: color,
            strokeWidth: 2,
            lineJoin: "round",
        }),
    )
}

/**
 * Draws all connections between nodes as Manhattan-routed polylines.
 * Energy connections are drawn in yellow; resource connections in grey.
 *
 * @param layer - The Konva layer to draw onto.
 * @param connections - All active connections in the game state.
 * @param nodeMap - Map of node id → NodeInstance for fast lookup.
 * @param energyOutputCounts - Pre-built map of EnergySupply node id → number of outgoing energy connections.
 */
export function drawConnections(
    layer: Konva.Layer,
    connections: Connection[],
    nodeMap: Map<string, NodeInstance>,
    energyOutputCounts: Map<string, number>,
): void {
    for (const conn of connections) {
        const src = nodeMap.get(conn.fromNodeId)
        const tgt = nodeMap.get(conn.toNodeId)
        if (src === undefined || tgt === undefined) continue

        let x1: number, y1: number, x2: number, y2: number

        if (conn.isEnergy) {
            // O(1): count was pre-computed before this loop.
            const energyCount = energyOutputCounts.get(src.id) ?? 0
            const totalDots = energyCount + 1
            ;[x1, y1] = energyOutputDotPos(src, conn.fromDotIndex, totalDots)
            ;[x2, y2] = inputDotPos(tgt, NODE_DEFS[tgt.type].inputs.length)
        } else {
            ;[x1, y1] = outputDotPos(src, conn.fromDotIndex)
            ;[x2, y2] = inputDotPos(tgt, conn.toDotIndex)
        }

        const color = conn.isEnergy ? ENERGY_DOT_COLOR : CONNECTION_COLOR
        drawManhattanLine(layer, x1, y1, x2, y2, color)
    }
}
