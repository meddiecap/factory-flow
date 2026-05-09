import Konva from "konva"
import type { GameState } from "../../simulation/types"
import { CELL_SIZE } from "../shared/geometry"
import { buildDotHitShapes } from "./hit-builder"
import type { HitBuilderCallbacks } from "./hit-builder"
import { handleDragMove, handleDragEnd } from "./drag-handlers"
import type { DragContext } from "./drag-handlers"
import type { CanvasInteractionCallbacks } from "./types"

export type { CanvasInteractionCallbacks }

/**
 * Adds pointer-event-based interactivity to a Konva Stage.
 * Handles: output-dot drag to create connections, node body click to select,
 * and drop events from the HTML palette sidebar onto the canvas container.
 * Keeps interaction logic separate from rendering logic.
 */
export class CanvasInteraction {
    private stage: Konva.Stage
    private dragLayer: Konva.Layer
    private callbacks: CanvasInteractionCallbacks
    private containerEl: HTMLElement
    private ctx: DragContext = {
        dragLine: null,
        dragStart: null,
        reconnectDrag: null,
        nodeDrag: null,
        state: null,
    }

    /**
     * Sets up all pointer event listeners on the stage and its HTML container.
     *
     * @param stage - The Konva Stage to attach events to.
     * @param containerEl - The HTML element wrapping the canvas (used for drop events).
     * @param callbacks - Event handler functions for the game controller.
     */
    constructor(
        stage: Konva.Stage,
        containerEl: HTMLElement,
        callbacks: CanvasInteractionCallbacks,
    ) {
        this.stage = stage
        this.callbacks = callbacks
        this.containerEl = containerEl

        this.dragLayer = new Konva.Layer()
        stage.add(this.dragLayer)

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
        }

        buildDotHitShapes(this.dragLayer, state, this.stage, cbs)
        this.dragLayer.batchDraw()

        this.stage.off(
            "mousemove.drag mouseup.drag touchmove.drag touchend.drag",
        )
        this.stage.on("mousemove.drag touchmove.drag", () => {
            handleDragMove(
                this.ctx,
                this.stage.getPointerPosition(),
                this.dragLayer,
            )
        })
        this.stage.on("mouseup.drag touchend.drag", () => {
            handleDragEnd(
                this.ctx,
                this.stage.getPointerPosition(),
                this.dragLayer,
                this.callbacks,
            )
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
            const pos = this.stage.getPointerPosition()
            if (pos === null) return
            this.ctx.reconnectDrag = {
                connectionId: existingConn.id,
                originalFromNodeId: existingConn.fromNodeId,
                originalFromDotIndex: existingConn.fromDotIndex,
                originalToNodeId: existingConn.toNodeId,
                originalToDotIndex: existingConn.toDotIndex,
                grabbedSide: side,
                startX: pos.x,
                startY: pos.y,
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

    private _bindDrop(): void {
        this.containerEl.addEventListener("dragover", (e) => e.preventDefault())
        this.containerEl.addEventListener("drop", (e) => {
            e.preventDefault()
            const type = e.dataTransfer?.getData("text/x-node-type")
            if (!type) return
            const rect = this.containerEl.getBoundingClientRect()
            const col = Math.floor((e.clientX - rect.left) / CELL_SIZE)
            const row = Math.floor((e.clientY - rect.top) / CELL_SIZE)
            this.callbacks.onDropNode(type, col, row)
        })
    }
}
