import Konva from "konva"
import { NODE_DEFS } from "../simulation/recipes"
import type { GameState, NodeInstance } from "../simulation/types"

/** Width and height of one grid cell in pixels. */
const CELL_SIZE = 32

/** Radius of interactive hit area around each dot (larger than visual radius). */
const DOT_HIT_RADIUS = 10

/**
 * Converts grid column to pixel x.
 * @param col - Zero-based column.
 */
function colToPx(col: number): number {
    return col * CELL_SIZE
}

/**
 * Converts grid row to pixel y.
 * @param row - Zero-based row.
 */
function rowToPx(row: number): number {
    return row * CELL_SIZE
}

/**
 * Evenly spaces a dot within the node's pixel height.
 * @param nodeRow - Top row of the node.
 * @param dotIndex - Zero-based dot index.
 * @param total - Total dots on that side.
 * @param heightCells - Node height in grid cells.
 */
function dotY(
    nodeRow: number,
    dotIndex: number,
    total: number,
    heightCells: number,
): number {
    const h = heightCells * CELL_SIZE
    return rowToPx(nodeRow) + (h / (total + 1)) * (dotIndex + 1)
}

/** Pixel position of an output dot. */
function outputDotPos(node: NodeInstance, dotIndex: number): [number, number] {
    const def = NODE_DEFS[node.type]
    return [
        colToPx(node.position.col) + def.gridSize.width * CELL_SIZE,
        dotY(
            node.position.row,
            dotIndex,
            def.outputs.length,
            def.gridSize.height,
        ),
    ]
}

/** Pixel position of an input dot. */
function inputDotPos(node: NodeInstance, dotIndex: number): [number, number] {
    const def = NODE_DEFS[node.type]
    return [
        colToPx(node.position.col),
        dotY(
            node.position.row,
            dotIndex,
            def.inputs.length,
            def.gridSize.height,
        ),
    ]
}

/** Describes a dot that was clicked to start a connection drag. */
interface DotRef {
    nodeId: string
    dotIndex: number
    x: number
    y: number
}

/**
 * Callback types emitted by CanvasInteraction.
 */
export interface CanvasInteractionCallbacks {
    /** Called when the user completes a drag from an output dot to an input dot. */
    onConnect: (
        fromNodeId: string,
        fromDotIndex: number,
        toNodeId: string,
        toDotIndex: number,
    ) => void
    /** Called when the user clicks a node body to select it. */
    onSelectNode: (nodeId: string | null) => void
    /** Called when the user drops a palette item onto the canvas. */
    onDropNode: (type: string, col: number, row: number) => void
    /** Called when the user finishes dragging a node to a new grid position. */
    onMoveNode: (nodeId: string, col: number, row: number) => void
}

/** Minimum pixel movement before a node body mousedown is treated as a drag. */
const NODE_DRAG_THRESHOLD = 4

/** State tracked while the user is dragging a node body. */
interface NodeDragState {
    nodeId: string
    /** Width and height of the node in grid cells (for clamping and ghost). */
    widthCells: number
    heightCells: number
    /** Canvas-pixel offset from pointer to top-left of node at drag start. */
    offsetX: number
    offsetY: number
    /** Pixel position where the drag started (to detect threshold). */
    startX: number
    startY: number
    /** Whether the drag threshold has been exceeded. */
    active: boolean
    /** Ghost rectangle shown during drag. */
    ghost: Konva.Rect
}

/**
 * Adds pointer-event-based interactivity to a Konva Stage.
 * Handles: output-dot drag to create connections, node body click to select,
 * and drop events from the HTML palette sidebar onto the canvas container.
 * Keeps interaction logic separate from rendering logic.
 */
export class CanvasInteraction {
    private stage: Konva.Stage
    private dragLayer: Konva.Layer
    private dragLine: Konva.Line | null = null
    private dragStart: DotRef | null = null
    private nodeDrag: NodeDragState | null = null
    private callbacks: CanvasInteractionCallbacks
    private containerEl: HTMLElement

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

        // Temporary layer for the in-progress connection line
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
        // Remove old hit shapes from the drag layer (not the node layer)
        const existing = this.dragLayer.find(".dot-hit")
        existing.forEach((s) => s.destroy())

        // Pass 1: body hit rects (below dots in z-order so dots take priority).
        for (const node of state.nodes) {
            const def = NODE_DEFS[node.type]
            const bx = colToPx(node.position.col)
            const by = rowToPx(node.position.row)
            const bw = def.gridSize.width * CELL_SIZE
            const bh = def.gridSize.height * CELL_SIZE
            const hitRect = new Konva.Rect({
                name: "dot-hit",
                x: bx,
                y: by,
                width: bw,
                height: bh,
                fill: "transparent",
            })
            hitRect.setAttr("selectNodeId", node.id)
            hitRect.on("mousedown touchstart", (e) => {
                // Don't initiate a node drag when a dot drag is already started.
                if (this.dragStart !== null) return
                const pos = this.stage.getPointerPosition()
                if (pos === null) return
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
                this.nodeDrag = {
                    nodeId: node.id,
                    widthCells: def.gridSize.width,
                    heightCells: def.gridSize.height,
                    offsetX: pos.x - bx,
                    offsetY: pos.y - by,
                    startX: pos.x,
                    startY: pos.y,
                    active: false,
                    ghost,
                }
            })
            hitRect.on("click tap", () => {
                // Only select when not finishing a drag.
                if (this.nodeDrag === null || !this.nodeDrag.active) {
                    this.callbacks.onSelectNode(node.id)
                }
            })
            this.dragLayer.add(hitRect)
        }

        // Pass 2: dot circles (on top of body rects so they get priority for mousedown).
        for (const node of state.nodes) {
            const def = NODE_DEFS[node.type]

            // Output dots
            for (let i = 0; i < def.outputs.length; i++) {
                const [x, y] = outputDotPos(node, i)
                const circle = new Konva.Circle({
                    name: "dot-hit",
                    x,
                    y,
                    radius: DOT_HIT_RADIUS,
                    fill: "transparent",
                })
                circle.setAttr("dotNodeId", node.id)
                circle.setAttr("dotIndex", i)
                circle.setAttr("dotSide", "output")
                circle.on("mousedown touchstart", () =>
                    this._startDrag(node.id, i, x, y),
                )
                this.dragLayer.add(circle)
            }

            // Input dots — only hit-testable as drop targets during drag
            for (let i = 0; i < def.inputs.length; i++) {
                const [x, y] = inputDotPos(node, i)
                const circle = new Konva.Circle({
                    name: "dot-hit",
                    x,
                    y,
                    radius: DOT_HIT_RADIUS,
                    fill: "transparent",
                })
                circle.setAttr("dotNodeId", node.id)
                circle.setAttr("dotIndex", i)
                circle.setAttr("dotSide", "input")
                this.dragLayer.add(circle)
            }
        }

        this.dragLayer.batchDraw()

        // Wire up stage-level mousemove/mouseup for the drag line
        this.stage.off(
            "mousemove.drag mouseup.drag touchmove.drag touchend.drag",
        )
        this.stage.on("mousemove.drag touchmove.drag", (e) =>
            this._onDragMove(e),
        )
        this.stage.on("mouseup.drag touchend.drag", (e) => this._onDragEnd(e))
    }

    /** Snaps a pixel coordinate to the nearest grid column/row. */
    private _snapCol(px: number): number {
        return Math.max(0, Math.floor(px / CELL_SIZE))
    }
    private _snapRow(py: number): number {
        return Math.max(0, Math.floor(py / CELL_SIZE))
    }

    private _startDrag(
        nodeId: string,
        dotIndex: number,
        x: number,
        y: number,
    ): void {
        this.dragStart = { nodeId, dotIndex, x, y }
        this.dragLine = new Konva.Line({
            points: [x, y, x, y],
            stroke: "#fbbf24",
            strokeWidth: 2,
            dash: [6, 4],
        })
        this.dragLayer.add(this.dragLine)
        this.dragLayer.batchDraw()
    }

    private _onDragMove(
        e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    ): void {
        const pos = this.stage.getPointerPosition()
        if (pos === null) return

        // --- Connection drag ---
        if (this.dragLine !== null && this.dragStart !== null) {
            this.dragLine.points([
                this.dragStart.x,
                this.dragStart.y,
                pos.x,
                pos.y,
            ])
            this.dragLayer.batchDraw()
            return
        }

        // --- Node drag ---
        if (this.nodeDrag === null) return
        const nd = this.nodeDrag
        const dx = pos.x - nd.startX
        const dy = pos.y - nd.startY
        if (!nd.active && Math.sqrt(dx * dx + dy * dy) >= NODE_DRAG_THRESHOLD) {
            nd.active = true
            nd.ghost.visible(true)
        }
        if (nd.active) {
            const topLeftX = pos.x - nd.offsetX
            const topLeftY = pos.y - nd.offsetY
            // Snap ghost to grid
            const col = this._snapCol(topLeftX)
            const row = this._snapRow(topLeftY)
            nd.ghost.x(col * CELL_SIZE)
            nd.ghost.y(row * CELL_SIZE)
            this.dragLayer.batchDraw()
        }
    }

    private _onDragEnd(
        e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    ): void {
        const pos = this.stage.getPointerPosition()

        // --- Connection drag end ---
        if (this.dragLine !== null && this.dragStart !== null) {
            if (pos !== null) {
                const hits = this.dragLayer.find(".dot-hit")
                for (const shape of hits) {
                    if (shape.getAttr("dotSide") !== "input") continue
                    const sx =
                        (shape.getAttr("x") as number | undefined) ??
                        (shape as Konva.Circle).x()
                    const sy =
                        (shape.getAttr("y") as number | undefined) ??
                        (shape as Konva.Circle).y()
                    const dx = pos.x - sx
                    const dy = pos.y - sy
                    if (Math.sqrt(dx * dx + dy * dy) <= DOT_HIT_RADIUS * 1.5) {
                        const targetNodeId = shape.getAttr(
                            "dotNodeId",
                        ) as string
                        const targetDotIndex = shape.getAttr(
                            "dotIndex",
                        ) as number
                        this.callbacks.onConnect(
                            this.dragStart.nodeId,
                            this.dragStart.dotIndex,
                            targetNodeId,
                            targetDotIndex,
                        )
                        break
                    }
                }
            }
            this.dragLine.destroy()
            this.dragLine = null
            this.dragStart = null
            this.dragLayer.batchDraw()
            return
        }

        // --- Node drag end ---
        if (this.nodeDrag !== null) {
            const nd = this.nodeDrag
            if (nd.active && pos !== null) {
                const col = this._snapCol(pos.x - nd.offsetX)
                const row = this._snapRow(pos.y - nd.offsetY)
                this.callbacks.onMoveNode(nd.nodeId, col, row)
            }
            nd.ghost.destroy()
            this.nodeDrag = null
            this.dragLayer.batchDraw()
        }
    }

    private _bindDrop(): void {
        // The palette item sets data-node-type on dragstart.
        this.containerEl.addEventListener("dragover", (e) => {
            e.preventDefault()
        })

        this.containerEl.addEventListener("drop", (e) => {
            e.preventDefault()
            const type = e.dataTransfer?.getData("text/x-node-type")
            if (!type) return

            const rect = this.containerEl.getBoundingClientRect()
            const relX = e.clientX - rect.left
            const relY = e.clientY - rect.top

            // Snap to grid
            const col = Math.floor(relX / CELL_SIZE)
            const row = Math.floor(relY / CELL_SIZE)

            this.callbacks.onDropNode(type, col, row)
        })
    }
}
