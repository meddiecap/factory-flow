import Konva from "konva"
import type { GameState } from "../../simulation/types"
import { inputDotPos, outputDotPos, CELL_SIZE } from "../shared/geometry"
import {
    DOT_HIT_RADIUS,
    DOT_DRAG_THRESHOLD,
    NODE_DRAG_THRESHOLD,
} from "./types"
import type {
    DotRef,
    ReconnectState,
    NodeDragState,
    CanvasInteractionCallbacks,
} from "./types"

/** Mutable drag state shared across move and end handlers. */
export interface DragContext {
    dragLine: Konva.Line | null
    dragStart: DotRef | null
    reconnectDrag: ReconnectState | null
    nodeDrag: NodeDragState | null
    state: GameState | null
}

/** Snaps a pixel x-coordinate to the nearest grid column. */
export function snapCol(px: number): number {
    return Math.floor(px / CELL_SIZE)
}

/** Snaps a pixel y-coordinate to the nearest grid row. */
export function snapRow(py: number): number {
    return Math.floor(py / CELL_SIZE)
}

/**
 * Finds the nearest dot hit circle within DOT_HIT_RADIUS * 1.5 of pos with the given side.
 * Used to determine which dot a drag is released onto.
 *
 * @param dragLayer - Layer containing dot-hit shapes.
 * @param pos - Pointer position in canvas coordinates.
 * @param side - 'input' or 'output'.
 * @returns Matched dot nodeId/dotIndex, or null.
 */
export function findNearestDot(
    dragLayer: Konva.Layer,
    pos: { x: number; y: number },
    side: "input" | "output",
): { nodeId: string; dotIndex: number } | null {
    const hits = dragLayer.find(".dot-hit")
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

/**
 * Updates the drag line and node ghost position on pointer move.
 * Mutates ctx when the drag threshold is first exceeded.
 *
 * @param ctx - Mutable drag context.
 * @param pos - Current pointer position, or null if unavailable.
 * @param dragLayer - Layer for batchDraw.
 */
export function handleDragMove(
    ctx: DragContext,
    pos: { x: number; y: number } | null,
    dragLayer: Konva.Layer,
): void {
    if (pos === null) return

    if (ctx.dragLine !== null) {
        if (ctx.reconnectDrag !== null) {
            const rd = ctx.reconnectDrag
            const dx = pos.x - rd.startX
            const dy = pos.y - rd.startY
            if (
                !rd.active &&
                Math.sqrt(dx * dx + dy * dy) >= DOT_DRAG_THRESHOLD
            ) {
                rd.active = true
            }
            if (rd.active && ctx.state !== null) {
                let ax = pos.x
                let ay = pos.y
                if (rd.grabbedSide === "output") {
                    const toNode = ctx.state.nodes.find(
                        (n) => n.id === rd.originalToNodeId,
                    )
                    if (toNode !== undefined) {
                        ;[ax, ay] = inputDotPos(toNode, rd.originalToDotIndex)
                    }
                } else {
                    const fromNode = ctx.state.nodes.find(
                        (n) => n.id === rd.originalFromNodeId,
                    )
                    if (fromNode !== undefined) {
                        ;[ax, ay] = outputDotPos(
                            fromNode,
                            rd.originalFromDotIndex,
                        )
                    }
                }
                ctx.dragLine.points([ax, ay, pos.x, pos.y])
                dragLayer.batchDraw()
            }
        } else if (ctx.dragStart !== null) {
            ctx.dragLine.points([
                ctx.dragStart.x,
                ctx.dragStart.y,
                pos.x,
                pos.y,
            ])
            dragLayer.batchDraw()
        }
        return
    }

    if (ctx.nodeDrag === null) return
    const nd = ctx.nodeDrag
    const dx = pos.x - nd.startX
    const dy = pos.y - nd.startY
    if (!nd.active && Math.sqrt(dx * dx + dy * dy) >= NODE_DRAG_THRESHOLD) {
        nd.active = true
        nd.ghost.visible(true)
    }
    if (nd.active) {
        nd.ghost.x(snapCol(pos.x - nd.offsetX) * CELL_SIZE)
        nd.ghost.y(snapRow(pos.y - nd.offsetY) * CELL_SIZE)
        dragLayer.batchDraw()
    }
}

/**
 * Finalises a drag when the pointer is released.
 * Fires the appropriate callback and resets drag state in ctx.
 *
 * @param ctx - Mutable drag context (reset to idle on return).
 * @param pos - Pointer release position, or null.
 * @param dragLayer - Layer for batchDraw and shape removal.
 * @param callbacks - Game-controller callbacks to fire on completion.
 */
export function handleDragEnd(
    ctx: DragContext,
    pos: { x: number; y: number } | null,
    dragLayer: Konva.Layer,
    callbacks: CanvasInteractionCallbacks,
): void {
    // Reconnect drag end
    if (ctx.reconnectDrag !== null) {
        const rd = ctx.reconnectDrag
        if (!rd.active) {
            callbacks.onClickOccupiedDot(rd.connectionId)
        } else if (pos !== null) {
            const hit = findNearestDot(dragLayer, pos, rd.grabbedSide)
            if (hit !== null) {
                const fromNodeId =
                    rd.grabbedSide === "output"
                        ? hit.nodeId
                        : rd.originalFromNodeId
                const fromDotIndex =
                    rd.grabbedSide === "output"
                        ? hit.dotIndex
                        : rd.originalFromDotIndex
                const toNodeId =
                    rd.grabbedSide === "input"
                        ? hit.nodeId
                        : rd.originalToNodeId
                const toDotIndex =
                    rd.grabbedSide === "input"
                        ? hit.dotIndex
                        : rd.originalToDotIndex
                callbacks.onReconnect(
                    rd.connectionId,
                    fromNodeId,
                    fromDotIndex,
                    toNodeId,
                    toDotIndex,
                )
            }
        }
        ctx.dragLine?.destroy()
        ctx.dragLine = null
        ctx.reconnectDrag = null
        dragLayer.batchDraw()
        return
    }

    // New connection drag end
    if (ctx.dragLine !== null && ctx.dragStart !== null) {
        if (pos !== null) {
            const hit = findNearestDot(dragLayer, pos, "input")
            if (hit !== null) {
                callbacks.onConnect(
                    ctx.dragStart.nodeId,
                    ctx.dragStart.dotIndex,
                    hit.nodeId,
                    hit.dotIndex,
                )
            }
        }
        ctx.dragLine.destroy()
        ctx.dragLine = null
        ctx.dragStart = null
        dragLayer.batchDraw()
        return
    }

    // Node drag end
    if (ctx.nodeDrag !== null) {
        const nd = ctx.nodeDrag
        if (nd.active && pos !== null) {
            callbacks.onMoveNode(
                nd.nodeId,
                snapCol(pos.x - nd.offsetX),
                snapRow(pos.y - nd.offsetY),
            )
        }
        nd.ghost.destroy()
        ctx.nodeDrag = null
        dragLayer.batchDraw()
    }
}
