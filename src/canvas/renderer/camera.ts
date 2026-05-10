import Konva from "konva"
import type { NodeInstance } from "../../simulation/types"
import { NODE_DEFS } from "../../simulation/recipes"
import { CELL_SIZE } from "../shared/geometry"
import { drawGrid } from "./grid"

/** Minimum allowed zoom factor. */
export const ZOOM_MIN = 0.25
/** Maximum allowed zoom factor. */
export const ZOOM_MAX = 3.0

/**
 * Manages camera pan/zoom state for a Konva Stage.
 * Applies scale and position transforms to the stage and redraws the grid on
 * every camera change. Separates camera logic from rendering and interaction.
 */
export class Camera {
    private _panX = 0
    private _panY = 0
    private _zoom = 1.0
    private _stage: Konva.Stage
    private _gridLayer: Konva.Layer

    /**
     * Creates a Camera tied to the given stage and grid layer.
     *
     * @param stage - The Konva Stage to apply transforms to.
     * @param gridLayer - The layer used to draw the background grid.
     */
    constructor(stage: Konva.Stage, gridLayer: Konva.Layer) {
        this._stage = stage
        this._gridLayer = gridLayer
    }

    /**
     * Applies current pan/zoom to the stage and redraws the grid.
     * Called after every camera state change.
     */
    update(): void {
        this._stage.scale({ x: this._zoom, y: this._zoom })
        this._stage.position({ x: this._panX, y: this._panY })
        drawGrid(
            this._gridLayer,
            this._panX,
            this._panY,
            this._zoom,
            this._stage.width(),
            this._stage.height(),
        )
        this._gridLayer.batchDraw()
    }

    /**
     * Converts a screen-space position to world-pixel coordinates.
     * Used by the interaction layer to translate pointer events.
     *
     * @param pos - Position in screen pixels.
     * @returns Position in world pixels.
     */
    screenToWorld(pos: { x: number; y: number }): { x: number; y: number } {
        return {
            x: (pos.x - this._panX) / this._zoom,
            y: (pos.y - this._panY) / this._zoom,
        }
    }

    /**
     * Pans the camera by a screen-pixel delta (e.g. from a mouse drag).
     *
     * @param dx - Horizontal delta in screen pixels.
     * @param dy - Vertical delta in screen pixels.
     */
    panBy(dx: number, dy: number): void {
        this._panX += dx
        this._panY += dy
        this.update()
    }

    /**
     * Zooms in or out at a fixed screen-space cursor position.
     * Adjusts pan so the point under the cursor stays fixed on screen.
     *
     * @param factor - Multiplicative scale change (> 1 = zoom in, < 1 = zoom out).
     * @param screenX - Cursor x in screen pixels.
     * @param screenY - Cursor y in screen pixels.
     */
    zoomAt(factor: number, screenX: number, screenY: number): void {
        const newZoom = Math.max(
            ZOOM_MIN,
            Math.min(ZOOM_MAX, this._zoom * factor),
        )
        if (newZoom === this._zoom) return
        const worldX = (screenX - this._panX) / this._zoom
        const worldY = (screenY - this._panY) / this._zoom
        this._zoom = newZoom
        this._panX = screenX - worldX * this._zoom
        this._panY = screenY - worldY * this._zoom
        this.update()
    }

    /**
     * Resets zoom to 1.0×, keeping the screen centre fixed.
     * Triggered by the `0` keyboard shortcut.
     */
    resetZoom(): void {
        const cx = this._stage.width() / 2
        const cy = this._stage.height() / 2
        this.zoomAt(1.0 / this._zoom, cx, cy)
    }

    /**
     * Zooms and pans so that all placed nodes are visible with a 2-cell margin.
     * Triggered by the `F` keyboard shortcut and after loading a schematic.
     *
     * @param nodes - All active nodes on the canvas.
     */
    fitToView(nodes: NodeInstance[]): void {
        if (nodes.length === 0) return
        const MARGIN = 2
        let minCol = Infinity,
            minRow = Infinity
        let maxCol = -Infinity,
            maxRow = -Infinity
        for (const n of nodes) {
            const def = NODE_DEFS[n.type]
            minCol = Math.min(minCol, n.position.col)
            minRow = Math.min(minRow, n.position.row)
            maxCol = Math.max(maxCol, n.position.col + def.gridSize.width)
            maxRow = Math.max(maxRow, n.position.row + def.gridSize.height)
        }
        minCol -= MARGIN
        minRow -= MARGIN
        maxCol += MARGIN
        maxRow += MARGIN
        const bbW = (maxCol - minCol) * CELL_SIZE
        const bbH = (maxRow - minRow) * CELL_SIZE
        const zoom = Math.max(
            ZOOM_MIN,
            Math.min(
                ZOOM_MAX,
                Math.min(this._stage.width() / bbW, this._stage.height() / bbH),
            ),
        )
        const centerWorldX = ((minCol + maxCol) / 2) * CELL_SIZE
        const centerWorldY = ((minRow + maxRow) / 2) * CELL_SIZE
        this._zoom = zoom
        this._panX = this._stage.width() / 2 - centerWorldX * zoom
        this._panY = this._stage.height() / 2 - centerWorldY * zoom
        this.update()
    }

    /**
     * Returns current camera state for persistence.
     *
     * @returns Pan offsets in screen pixels and zoom factor.
     */
    getCamera(): { panX: number; panY: number; zoom: number } {
        return { panX: this._panX, panY: this._panY, zoom: this._zoom }
    }

    /**
     * Restores a previously persisted camera state.
     *
     * @param panX - Horizontal pan offset in screen pixels.
     * @param panY - Vertical pan offset in screen pixels.
     * @param zoom - Zoom factor, clamped to [ZOOM_MIN, ZOOM_MAX].
     */
    setCamera(panX: number, panY: number, zoom: number): void {
        this._panX = panX
        this._panY = panY
        this._zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom))
        this.update()
    }
}
