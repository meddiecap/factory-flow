import Konva from "konva"
import { NODE_DEFS } from "../../simulation/recipes"
import type { Connection, NodeInstance } from "../../simulation/types"
import {
    outputDotPos,
    energyOutputDotPos,
    inputDotPos,
    CELL_SIZE,
} from "../shared/geometry"
import { CONNECTION_COLOR, ENERGY_DOT_COLOR } from "./constants"

/** Pixel offset used when routing a backwards connection around node bodies. */
const ROUTE_OFFSET = CELL_SIZE

/**
 * Computes the ordered waypoints for a Manhattan-routed connection between two pixel positions.
 * Forward connections (x2 >= x1) use a 3-segment route through the horizontal midpoint.
 * Backward connections (x2 < x1) use a 6-segment S-route: exit right, bend at vertical midpoint,
 * enter the input dot from the left.
 * Used by both the line renderer and the particle animation system.
 *
 * @param x1 - Start x (output dot).
 * @param y1 - Start y.
 * @param x2 - End x (input dot).
 * @param y2 - End y.
 * @returns Ordered [x, y] waypoints the route passes through.
 */
export function routeWaypoints(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
): [number, number][] {
    if (x2 >= x1) {
        const midX = x1 + (x2 - x1) / 2
        return [
            [x1, y1],
            [midX, y1],
            [midX, y2],
            [x2, y2],
        ]
    } else {
        const exitX = x1 + ROUTE_OFFSET
        const entryX = x2 - ROUTE_OFFSET
        const midY = (y1 + y2) / 2
        return [
            [x1, y1],
            [exitX, y1],
            [exitX, midY],
            [entryX, midY],
            [entryX, y2],
            [x2, y2],
        ]
    }
}

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
export function drawManhattanLine(
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
