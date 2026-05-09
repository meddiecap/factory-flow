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
    /**
     * Called when the user clicks (no drag) on an occupied dot.
     * The controller should prompt the user to confirm removal.
     */
    onClickOccupiedDot: (connectionId: string) => void
    /**
     * Called when the user finishes a reconnect drag on a valid new dot.
     * The controller should call reconnectConnection with these args.
     */
    onReconnect: (
        connectionId: string,
        fromNodeId: string,
        fromDotIndex: number,
        toNodeId: string,
        toDotIndex: number,
    ) => void
}

/** Minimum pixel movement before a dot drag is treated as a drag vs a click. */
const DOT_DRAG_THRESHOLD = 4

/** Minimum pixel movement before a node body drag is treated as a move vs a click. */
const NODE_DRAG_THRESHOLD = 4

/** Additional state kept while reconnecting an existing connection by dragging. */
interface ReconnectState {
    /** Id of the connection being re-routed. */
    connectionId: string
    /** The original endpoints, used to restore on cancel. */
    originalFromNodeId: string
    originalFromDotIndex: number
    originalToNodeId: string
    originalToDotIndex: number
    /** Which side the user grabbed (determines which end is being moved). */
    grabbedSide: "output" | "input"
    /** Pixel start position, for threshold detection. */
    startX: number
    startY: number
    /** Whether the drag threshold has been exceeded. */
    active: boolean
}

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
    private reconnectDrag: ReconnectState | null = null
    private callbacks: CanvasInteractionCallbacks
    private containerEl: HTMLElement
    /** Snapshot of the game state connections, updated on every rebuildDotHits call. */
    private _state: GameState | null = null

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
        this._state = state
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
            hitRect.on("mousedown touchstart", (_e) => {
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
                    this._startDotInteraction(node.id, i, "output", x, y),
                )
                this.dragLayer.add(circle)
            }

            // Input dots — also interactive for reconnect/remove
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
                circle.on("mousedown touchstart", () =>
                    this._startDotInteraction(node.id, i, "input", x, y),
                )
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
        const state = this._state
        if (state === null) return

        // Check if this dot already has a connection.
        const existingConn = state.connections.find((c) =>
            side === "output"
                ? c.fromNodeId === nodeId && c.fromDotIndex === dotIndex
                : c.toNodeId === nodeId && c.toDotIndex === dotIndex,
        )

        if (existingConn !== undefined) {
            // Occupied dot: begin a potential reconnect drag.
            const pos = this.stage.getPointerPosition()
            if (pos === null) return
            this.reconnectDrag = {
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
            // Reuse dragLine for the in-progress reconnect line.
            this.dragLine = new Konva.Line({
                points: [x, y, x, y],
                stroke: "#fb923c",
                strokeWidth: 2,
                dash: [6, 4],
            })
            this.dragLayer.add(this.dragLine)
            this.dragLayer.batchDraw()
        } else if (side === "output") {
            // Free output dot: start a new connection drag.
            this._startDrag(nodeId, dotIndex, x, y)
        }
        // Free input dot without an existing connection → no action on mousedown;
        // it acts only as a drop target.
    }

    private _onDragMove(
        _e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    ): void {
        const pos = this.stage.getPointerPosition()
        if (pos === null) return

        // --- Connection / reconnect drag line ---
        if (this.dragLine !== null) {
            if (this.reconnectDrag !== null) {
                const rd = this.reconnectDrag
                const dx = pos.x - rd.startX
                const dy = pos.y - rd.startY
                if (
                    !rd.active &&
                    Math.sqrt(dx * dx + dy * dy) >= DOT_DRAG_THRESHOLD
                ) {
                    rd.active = true
                }
                if (rd.active && this._state !== null) {
                    // Determine the fixed anchor: the end that was NOT grabbed.
                    let ax = pos.x
                    let ay = pos.y
                    if (rd.grabbedSide === "output") {
                        // Grabbed the output end; fixed end is the input.
                        const toNode = this._state.nodes.find(
                            (n) => n.id === rd.originalToNodeId,
                        )
                        if (toNode !== undefined) {
                            ;[ax, ay] = inputDotPos(
                                toNode,
                                rd.originalToDotIndex,
                            )
                        }
                    } else {
                        // Grabbed the input end; fixed end is the output.
                        const fromNode = this._state.nodes.find(
                            (n) => n.id === rd.originalFromNodeId,
                        )
                        if (fromNode !== undefined) {
                            ;[ax, ay] = outputDotPos(
                                fromNode,
                                rd.originalFromDotIndex,
                            )
                        }
                    }
                    this.dragLine.points([ax, ay, pos.x, pos.y])
                    this.dragLayer.batchDraw()
                }
            } else if (this.dragStart !== null) {
                this.dragLine.points([
                    this.dragStart.x,
                    this.dragStart.y,
                    pos.x,
                    pos.y,
                ])
                this.dragLayer.batchDraw()
            }
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

    /** Finds the nearest dot hit shape within radius at `pos`, filtered by side. */
    private _findNearestDot(
        pos: { x: number; y: number },
        side: "input" | "output",
    ): { nodeId: string; dotIndex: number } | null {
        const hits = this.dragLayer.find(".dot-hit")
        for (const shape of hits) {
            if (shape.getAttr("dotSide") !== side) continue
            const sx =
                (shape.getAttr("x") as number | undefined) ??
                (shape as Konva.Circle).x()
            const sy =
                (shape.getAttr("y") as number | undefined) ??
                (shape as Konva.Circle).y()
            const dx = pos.x - sx
            const dy = pos.y - sy
            if (Math.sqrt(dx * dx + dy * dy) <= DOT_HIT_RADIUS * 1.5) {
                return {
                    nodeId: shape.getAttr("dotNodeId") as string,
                    dotIndex: shape.getAttr("dotIndex") as number,
                }
            }
        }
        return null
    }

    private _onDragEnd(
        _e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    ): void {
        const pos = this.stage.getPointerPosition()

        // --- Reconnect drag end ---
        if (this.reconnectDrag !== null) {
            const rd = this.reconnectDrag
            if (!rd.active) {
                // No movement → treat as click → prompt delete.
                this.callbacks.onClickOccupiedDot(rd.connectionId)
            } else if (pos !== null) {
                // Drop on a dot of the SAME type as the grabbed side:
                // grabbing an output → drop on a new output → change the source.
                // grabbing an input  → drop on a new input  → change the destination.
                const targetSide: "input" | "output" = rd.grabbedSide
                const hit = this._findNearestDot(pos, targetSide)
                if (hit !== null) {
                    const fromNodeId =
                        rd.grabbedSide === "output"
                            ? hit.nodeId  // grabbed output → replace source
                            : rd.originalFromNodeId
                    const fromDotIndex =
                        rd.grabbedSide === "output"
                            ? hit.dotIndex
                            : rd.originalFromDotIndex
                    const toNodeId =
                        rd.grabbedSide === "input"
                            ? hit.nodeId  // grabbed input → replace destination
                            : rd.originalToNodeId
                    const toDotIndex =
                        rd.grabbedSide === "input"
                            ? hit.dotIndex
                            : rd.originalToDotIndex
                    this.callbacks.onReconnect(
                        rd.connectionId,
                        fromNodeId,
                        fromDotIndex,
                        toNodeId,
                        toDotIndex,
                    )
                    // If validation fails in the controller, the connection is unchanged.
                }
                // Dropping on nothing → no change (original connection stays).
            }
            this.dragLine?.destroy()
            this.dragLine = null
            this.reconnectDrag = null
            this.dragLayer.batchDraw()
            return
        }

        // --- New connection drag end ---
        if (this.dragLine !== null && this.dragStart !== null) {
            if (pos !== null) {
                const hit = this._findNearestDot(pos, "input")
                if (hit !== null) {
                    this.callbacks.onConnect(
                        this.dragStart.nodeId,
                        this.dragStart.dotIndex,
                        hit.nodeId,
                        hit.dotIndex,
                    )
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
