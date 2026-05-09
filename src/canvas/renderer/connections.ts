import Konva from "konva"
import { NODE_DEFS } from "../../simulation/recipes"
import type { Connection, NodeInstance } from "../../simulation/types"
import {
    outputDotPos,
    energyOutputDotPos,
    inputDotPos,
} from "../shared/geometry"
import { CONNECTION_COLOR, ENERGY_DOT_COLOR } from "./constants"

/**
 * Draws a Manhattan-routed polyline between two pixel positions.
 * The route goes: source → midpoint-x column → target. No diagonals.
 *
 * @param layer - The Konva layer to draw onto.
 * @param x1 - Start x.
 * @param y1 - Start y.
 * @param x2 - End x.
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
    const midX = x1 + (x2 - x1) / 2
    layer.add(
        new Konva.Line({
            points: [x1, y1, midX, y1, midX, y2, x2, y2],
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
 */
export function drawConnections(
    layer: Konva.Layer,
    connections: Connection[],
    nodeMap: Map<string, NodeInstance>,
): void {
    for (const conn of connections) {
        const src = nodeMap.get(conn.fromNodeId)
        const tgt = nodeMap.get(conn.toNodeId)
        if (src === undefined || tgt === undefined) continue

        let x1: number, y1: number, x2: number, y2: number

        if (conn.isEnergy) {
            const energyCount = connections.filter(
                (c) => c.isEnergy && c.fromNodeId === src.id,
            ).length
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
