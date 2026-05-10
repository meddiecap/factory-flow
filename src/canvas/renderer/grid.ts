import Konva from "konva"
import { CELL_SIZE } from "../shared/geometry"
import { BACKGROUND_COLOR, GRID_LINE_COLOR } from "./constants"

/**
 * Re-draws the infinite grid on the given layer to cover only the visible viewport.
 * Clears the layer first so stale lines from the previous camera position are removed.
 * Must be called whenever the camera (pan or zoom) changes.
 *
 * @param layer - The Konva layer that holds the grid.
 * @param panX - Current stage x-position in screen pixels (stage.x()).
 * @param panY - Current stage y-position in screen pixels (stage.y()).
 * @param zoom - Current stage scale factor.
 * @param viewW - Viewport width in screen pixels.
 * @param viewH - Viewport height in screen pixels.
 */
export function drawGrid(
    layer: Konva.Layer,
    panX: number,
    panY: number,
    zoom: number,
    viewW: number,
    viewH: number,
): void {
    layer.destroyChildren()

    // Visible world-pixel bounds.
    const worldLeft = -panX / zoom
    const worldTop = -panY / zoom
    const worldRight = worldLeft + viewW / zoom
    const worldBottom = worldTop + viewH / zoom

    // Extend one cell beyond each edge so lines never clip at the border.
    const minCol = Math.floor(worldLeft / CELL_SIZE) - 1
    const maxCol = Math.ceil(worldRight / CELL_SIZE) + 1
    const minRow = Math.floor(worldTop / CELL_SIZE) - 1
    const maxRow = Math.ceil(worldBottom / CELL_SIZE) + 1

    // Background rect covering the visible world area.
    layer.add(
        new Konva.Rect({
            x: minCol * CELL_SIZE,
            y: minRow * CELL_SIZE,
            width: (maxCol - minCol) * CELL_SIZE,
            height: (maxRow - minRow) * CELL_SIZE,
            fill: BACKGROUND_COLOR,
        }),
    )

    for (let col = minCol; col <= maxCol; col++) {
        layer.add(
            new Konva.Line({
                points: [
                    col * CELL_SIZE,
                    minRow * CELL_SIZE,
                    col * CELL_SIZE,
                    maxRow * CELL_SIZE,
                ],
                stroke: GRID_LINE_COLOR,
                strokeWidth: 1,
            }),
        )
    }

    for (let row = minRow; row <= maxRow; row++) {
        layer.add(
            new Konva.Line({
                points: [
                    minCol * CELL_SIZE,
                    row * CELL_SIZE,
                    maxCol * CELL_SIZE,
                    row * CELL_SIZE,
                ],
                stroke: GRID_LINE_COLOR,
                strokeWidth: 1,
            }),
        )
    }
}
