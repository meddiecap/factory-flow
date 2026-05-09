import type Konva from "konva"

/** Radius of interactive hit area around each dot (larger than visual radius). */
export const DOT_HIT_RADIUS = 10

/** Minimum pixel movement before a dot drag is treated as a drag vs a click. */
export const DOT_DRAG_THRESHOLD = 4

/** Minimum pixel movement before a node body drag is treated as a move vs a click. */
export const NODE_DRAG_THRESHOLD = 4

/** Describes a dot that was clicked to start a connection drag. */
export interface DotRef {
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

/** Additional state kept while reconnecting an existing connection by dragging. */
export interface ReconnectState {
    /** Id of the connection being re-routed. */
    connectionId: string
    originalFromNodeId: string
    originalFromDotIndex: number
    originalToNodeId: string
    originalToDotIndex: number
    /** Which side the user grabbed (determines which end is being moved). */
    grabbedSide: "output" | "input"
    startX: number
    startY: number
    active: boolean
}

/** State tracked while the user is dragging a node body. */
export interface NodeDragState {
    nodeId: string
    widthCells: number
    heightCells: number
    /** Canvas-pixel offset from pointer to top-left of node at drag start. */
    offsetX: number
    offsetY: number
    startX: number
    startY: number
    active: boolean
    /** Ghost rectangle shown during drag. */
    ghost: Konva.Rect
}
