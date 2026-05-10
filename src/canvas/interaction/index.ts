import Konva from "konva"
import type { GameState } from "../../simulation/types"
import { CELL_SIZE } from "../shared/geometry"
import { buildDotHitShapes } from "./hit-builder"
import type { HitBuilderCallbacks } from "./hit-builder"
import { handleDragMove, handleDragEnd } from "./drag-handlers"
import type { DragContext } from "./drag-handlers"
import type { CanvasInteractionCallbacks, CameraController } from "./types"

export type { CanvasInteractionCallbacks }

/** Zoom step per scroll-wheel tick (12 % in/out). */
const ZOOM_FACTOR = 1.12

/**
 * Adds pointer-event-based interactivity to a Konva Stage.
 * Handles: connection dragging, node selection and movement, palette drops,
 * infinite-canvas pan (middle mouse / spacebar) and zoom (scroll wheel).
 * Keeps interaction logic separate from rendering logic.
 */
export class CanvasInteraction {
    private stage: Konva.Stage
    private dragLayer: Konva.Layer
    private callbacks: CanvasInteractionCallbacks
    private containerEl: HTMLElement
    private camera: CameraController
    private ctx: DragContext = {
        dragLine: null,
        dragStart: null,
        reconnectDrag: null,
        nodeDrag: null,
        state: null,
    }

    /** True while spacebar is held — enables LMB-drag panning. */
    private _spacebarHeld = false
    /** True while a pan gesture (middle mouse or spacebar+LMB) is active. */
    private _isPanning = false

    // Stored handlers needed for cleanup in destroy().
    private _keyDown: (e: KeyboardEvent) => void
    private _keyUp: (e: KeyboardEvent) => void
    private _winMouseMove: (e: MouseEvent) => void
    private _winMouseUp: (e: MouseEvent) => void

    /**
     * Sets up all pointer event listeners on the stage and its HTML container.
     *
     * @param stage - The Konva Stage to attach events to.
     * @param containerEl - The HTML element wrapping the canvas (used for drop events).
     * @param callbacks - Event handler functions for the game controller.
     * @param camera - Camera controller (provided by CanvasRenderer) for pan/zoom.
     */
    constructor(
        stage: Konva.Stage,
        containerEl: HTMLElement,
        callbacks: CanvasInteractionCallbacks,
        camera: CameraController,
    ) {
        this.stage = stage
        this.callbacks = callbacks
        this.containerEl = containerEl
        this.camera = camera

        this.dragLayer = new Konva.Layer()
        stage.add(this.dragLayer)

        this._keyDown = (e: KeyboardEvent) => {
            if (e.code === "Space" && !e.repeat) {
                this._spacebarHeld = true
                this.containerEl.style.cursor = "grab"
                e.preventDefault()
            }
        }
        this._keyUp = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                this._spacebarHeld = false
                this._isPanning = false
                this.containerEl.style.cursor = ""
            }
        }
        this._winMouseMove = (e: MouseEvent) => {
            if (!this._isPanning) return
            this.camera.panBy(e.movementX, e.movementY)
        }
        this._winMouseUp = (e: MouseEvent) => {
            if (
                this._isPanning &&
                (e.button === 1 || (e.button === 0 && this._spacebarHeld))
            ) {
                this._isPanning = false
                if (this._spacebarHeld) this.containerEl.style.cursor = "grab"
                else this.containerEl.style.cursor = ""
            }
        }
        window.addEventListener("keydown", this._keyDown)
        window.addEventListener("keyup", this._keyUp)
        window.addEventListener("mousemove", this._winMouseMove)
        window.addEventListener("mouseup", this._winMouseUp)

        this._bindPanZoom()
        this._bindDrop()
    }

    /**
     * Re-registers hit-area circles for all dots based on the current state.
     * Must be called after every render() so dot positions stay in sync.
     * Clears previous hit shapes before adding new ones.
     *
     * @param state - Current game state (used to enumerate all dots).
     */
    rebuildDotHits(state: GameState): void {
        this.ctx.state = state
        const existing = this.dragLayer.find(".dot-hit")
        existing.forEach((s) => s.destroy())

        const cbs: HitBuilderCallbacks = {
            onSelectNode: (id) => this.callbacks.onSelectNode(id),
            onNodeBodyDown: (nodeId, wc, hc, bx, by, bw, bh, pos) => {
                if (this.ctx.dragStart !== null) return
                const ghost = new Konva.Rect({
                    name: "node-ghost",
                    x: bx,
                    y: by,
                    width: bw,
                    height: bh,
                    fill: "#3b82f6",
                    opacity: 0.35,
                    stroke: "#93c5fd",
                    strokeWidth: 2,
                    dash: [6, 3],
                    visible: false,
                })
                this.dragLayer.add(ghost)
                this.ctx.nodeDrag = {
                    nodeId,
                    widthCells: wc,
                    heightCells: hc,
                    offsetX: pos.x - bx,
                    offsetY: pos.y - by,
                    startX: pos.x,
                    startY: pos.y,
                    active: false,
                    ghost,
                }
            },
            onDotDown: (nodeId, dotIndex, side, x, y) =>
                this._startDotInteraction(nodeId, dotIndex, side, x, y),
            isDragActive: () =>
                this.ctx.nodeDrag !== null && this.ctx.nodeDrag.active,
            isPanMode: () => this._spacebarHeld,
            screenToWorld: (pos) => this.camera.screenToWorld(pos),
        }

        buildDotHitShapes(this.dragLayer, state, this.stage, cbs)
        this.dragLayer.batchDraw()

        this.stage.off(
            "mousemove.drag mouseup.drag touchmove.drag touchend.drag",
        )
        this.stage.on("mousemove.drag touchmove.drag", () => {
            const screenPos = this.stage.getPointerPosition()
            const worldPos = screenPos
                ? this.camera.screenToWorld(screenPos)
                : null
            handleDragMove(this.ctx, worldPos, this.dragLayer)
        })
        this.stage.on("mouseup.drag touchend.drag", () => {
            const screenPos = this.stage.getPointerPosition()
            const worldPos = screenPos
                ? this.camera.screenToWorld(screenPos)
                : null
            handleDragEnd(this.ctx, worldPos, this.dragLayer, this.callbacks)
        })
    }

    private _startDrag(
        nodeId: string,
        dotIndex: number,
        x: number,
        y: number,
    ): void {
        this.ctx.dragStart = { nodeId, dotIndex, x, y }
        this.ctx.dragLine = new Konva.Line({
            points: [x, y, x, y],
            stroke: "#fbbf24",
            strokeWidth: 2,
            dash: [6, 4],
        })
        this.dragLayer.add(this.ctx.dragLine)
        this.dragLayer.batchDraw()
    }

    /**
     * Decides whether a dot mousedown starts a new connection drag, a reconnect drag,
     * or is a potential click-to-delete on an occupied dot.
     * Output dots initiate connection drag from their end.
     * Occupied input or output dots initiate reconnect drag.
     */
    private _startDotInteraction(
        nodeId: string,
        dotIndex: number,
        side: "output" | "input",
        x: number,
        y: number,
    ): void {
        const state = this.ctx.state
        if (state === null) return

        const existingConn = state.connections.find((c) =>
            side === "output"
                ? c.fromNodeId === nodeId && c.fromDotIndex === dotIndex
                : c.toNodeId === nodeId && c.toDotIndex === dotIndex,
        )

        if (existingConn !== undefined) {
            const screenPos = this.stage.getPointerPosition()
            if (screenPos === null) return
            const worldPos = this.camera.screenToWorld(screenPos)
            this.ctx.reconnectDrag = {
                connectionId: existingConn.id,
                originalFromNodeId: existingConn.fromNodeId,
                originalFromDotIndex: existingConn.fromDotIndex,
                originalToNodeId: existingConn.toNodeId,
                originalToDotIndex: existingConn.toDotIndex,
                grabbedSide: side,
                startX: worldPos.x,
                startY: worldPos.y,
                active: false,
            }
            this.ctx.dragLine = new Konva.Line({
                points: [x, y, x, y],
                stroke: "#fb923c",
                strokeWidth: 2,
                dash: [6, 4],
            })
            this.dragLayer.add(this.ctx.dragLine)
            this.dragLayer.batchDraw()
        } else if (side === "output") {
            this._startDrag(nodeId, dotIndex, x, y)
        }
        // Free input dot without an existing connection → no action on mousedown.
    }

    /**
     * Binds scroll-wheel zoom and middle-mouse / spacebar pan to the stage.
     * Pan deltas come from window mousemove (captured outside the stage for reliability).
     */
    private _bindPanZoom(): void {
        this.stage.on("wheel", (e) => {
            e.evt.preventDefault()
            const pos = this.stage.getPointerPosition()
            if (pos === null) return
            const factor = e.evt.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
            this.camera.zoomAt(factor, pos.x, pos.y)
        })

        // Middle mouse button starts panning.
        this.stage.on("mousedown", (e) => {
            if (e.evt.button === 1) {
                e.evt.preventDefault()
                this._isPanning = true
                this.containerEl.style.cursor = "grabbing"
            }
            // Spacebar + LMB also starts panning.
            if (e.evt.button === 0 && this._spacebarHeld) {
                this._isPanning = true
                this.containerEl.style.cursor = "grabbing"
            }
        })
    }

    private _bindDrop(): void {
        this.containerEl.addEventListener("dragover", (e) => e.preventDefault())
        this.containerEl.addEventListener("drop", (e) => {
            e.preventDefault()
            const type = e.dataTransfer?.getData("text/x-node-type")
            if (!type) return
            const rect = this.containerEl.getBoundingClientRect()
            const screenPos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            }
            const worldPos = this.camera.screenToWorld(screenPos)
            const col = Math.floor(worldPos.x / CELL_SIZE)
            const row = Math.floor(worldPos.y / CELL_SIZE)
            this.callbacks.onDropNode(type, col, row)
        })
    }

    /**
     * Removes all window-level event listeners registered by this instance.
     * Call when the Vue component is unmounted.
     */
    destroy(): void {
        window.removeEventListener("keydown", this._keyDown)
        window.removeEventListener("keyup", this._keyUp)
        window.removeEventListener("mousemove", this._winMouseMove)
        window.removeEventListener("mouseup", this._winMouseUp)
    }
}
