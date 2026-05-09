import Konva from "konva"
import { CELL_SIZE } from "../shared/geometry"
import {
    GRID_COLS,
    GRID_ROWS,
    BACKGROUND_COLOR,
    GRID_LINE_COLOR,
} from "./constants"

/**
 * Draws the background and grid lines on the grid layer.
 * Renders a dark background and a regular line grid for cell alignment.
 *
 * @param layer - The Konva layer that holds the grid.
 */
export function drawGrid(layer: Konva.Layer): void {
    layer.add(
        new Konva.Rect({
            x: 0,
            y: 0,
            width: GRID_COLS * CELL_SIZE,
            height: GRID_ROWS * CELL_SIZE,
            fill: BACKGROUND_COLOR,
        }),
    )

    for (let col = 0; col <= GRID_COLS; col++) {
        layer.add(
            new Konva.Line({
                points: [
                    col * CELL_SIZE,
                    0,
                    col * CELL_SIZE,
                    GRID_ROWS * CELL_SIZE,
                ],
                stroke: GRID_LINE_COLOR,
                strokeWidth: 1,
            }),
        )
    }

    for (let row = 0; row <= GRID_ROWS; row++) {
        layer.add(
            new Konva.Line({
                points: [
                    0,
                    row * CELL_SIZE,
                    GRID_COLS * CELL_SIZE,
                    row * CELL_SIZE,
                ],
                stroke: GRID_LINE_COLOR,
                strokeWidth: 1,
            }),
        )
    }
}
