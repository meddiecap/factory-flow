import Konva from "konva"
import { NODE_DEFS } from "../../simulation/recipes"
import { NodeType } from "../../simulation/types"
import type { GameState } from "../../simulation/types"
import {
    colToPx,
    rowToPx,
    inputDotPos,
    outputDotPos,
    energyOutputDotPos,
    nodeRenderedHeight,
    CELL_SIZE,
} from "../shared/geometry"
import { energyInputDotPos } from "./geometry"
import { DOT_HIT_RADIUS } from "./types"
import { buildEnergyOutputCounts } from "../../simulation/connections"
import {
    DOT_INPUT_COLOR,
    DOT_OUTPUT_COLOR,
    ENERGY_DOT_COLOR,
} from "../renderer/constants"

/**
 * Callbacks fired by hit shapes created in buildDotHitShapes.
 */
export interface HitBuilderCallbacks {
    onSelectNode: (id: string | null) => void
    onNodeBodyDown: (
        nodeId: string,
        widthCells: number,
        heightCells: number,
        bx: number,
        by: number,
        bw: number,
        bh: number,
        pos: { x: number; y: number },
    ) => void
    onDotDown: (
        nodeId: string,
        dotIndex: number,
        side: "output" | "input",
        x: number,
        y: number,
    ) => void
    /** Called when the pointer enters a dot hit area. */
    onDotHover: (
        nodeId: string,
        dotIndex: number,
        side: "output" | "input",
        x: number,
        y: number,
        color: string,
    ) => void
    /** Called when the pointer leaves a dot hit area. */
    onDotHoverEnd: () => void
    /** Returns true when a node drag is currently active (suppresses click-to-select). */
    isDragActive: () => boolean
    /** Returns true when pan mode is active (spacebar held); suppresses normal LMB actions. */
    isPanMode: () => boolean
    /** Converts a screen-space pointer position to world-pixel coordinates. */
    screenToWorld: (pos: { x: number; y: number }) => { x: number; y: number }
}

/**
 * Builds all body hit rectangles and dot hit circles on the given Konva layer.
 * Should be called after clearing previous dot-hit shapes from the layer.
 * Fires callbacks on mousedown/click events.
 *
 * @param layer - Drag layer to add hit shapes to.
 * @param state - Current game state.
 * @param stage - Konva stage, used to read pointer position on mousedown.
 * @param cbs - Event callbacks fired by hit shapes.
 */
export function buildDotHitShapes(
    layer: Konva.Layer,
    state: GameState,
    stage: Konva.Stage,
    cbs: HitBuilderCallbacks,
): void {
    // Pass 1: body hit rects (below dots in z-order so dots take priority).
    for (const node of state.nodes) {
        const def = NODE_DEFS[node.type]
        const bx = colToPx(node.position.col)
        const by = rowToPx(node.position.row)
        const bw = def.gridSize.width * CELL_SIZE
        const bh = nodeRenderedHeight(node)

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
            // Ignore middle/right mouse button — those are reserved for panning.
            if (e.type === "mousedown" && (e.evt as MouseEvent).button !== 0)
                return
            if (cbs.isPanMode() || cbs.isDragActive()) return
            const screenPos = stage.getPointerPosition()
            if (screenPos === null) return
            const worldPos = cbs.screenToWorld(screenPos)
            cbs.onNodeBodyDown(
                node.id,
                def.gridSize.width,
                def.gridSize.height,
                bx,
                by,
                bw,
                bh,
                worldPos,
            )
        })
        hitRect.on("click tap", () => {
            if (!cbs.isDragActive() && !cbs.isPanMode())
                cbs.onSelectNode(node.id)
        })
        layer.add(hitRect)
    }

    // Pre-build energyOutputCounts so the dot loop below is O(n) instead of O(n²).
    const energyOutputCounts = buildEnergyOutputCounts(state.connections)

    // Pass 2: dot circles (on top of body rects so they get priority for mousedown).
    for (const node of state.nodes) {
        const def = NODE_DEFS[node.type]

        if (node.type === NodeType.EnergySupply) {
            // EnergySupply: dynamic energy output dots (N connected + 1 free).
            const totalDots = (energyOutputCounts.get(node.id) ?? 0) + 1
            for (let i = 0; i < totalDots; i++) {
                const [x, y] = energyOutputDotPos(node, i, totalDots)
                _addDotCircle(
                    layer,
                    node.id,
                    i,
                    "output",
                    x,
                    y,
                    ENERGY_DOT_COLOR,
                    cbs.onDotDown,
                    cbs.onDotHover,
                    cbs.onDotHoverEnd,
                )
            }
        } else {
            for (let i = 0; i < def.outputs.length; i++) {
                const [x, y] = outputDotPos(node, i)
                _addDotCircle(
                    layer,
                    node.id,
                    i,
                    "output",
                    x,
                    y,
                    DOT_OUTPUT_COLOR,
                    cbs.onDotDown,
                    cbs.onDotHover,
                    cbs.onDotHoverEnd,
                )
            }
        }

        // Recipe input dots
        for (let i = 0; i < node.inputBuffers.length; i++) {
            const [x, y] = inputDotPos(node, i)
            _addDotCircle(
                layer,
                node.id,
                i,
                "input",
                x,
                y,
                DOT_INPUT_COLOR,
                cbs.onDotDown,
                cbs.onDotHover,
                cbs.onDotHoverEnd,
            )
        }

        // Energy input dot – production factories only.
        if (def.hasEnergyInput) {
            const energyDotIdx = def.inputs.length
            const [x, y] = energyInputDotPos(node)
            _addDotCircle(
                layer,
                node.id,
                energyDotIdx,
                "input",
                x,
                y,
                ENERGY_DOT_COLOR,
                cbs.onDotDown,
                cbs.onDotHover,
                cbs.onDotHoverEnd,
            )
        }
    }
}

/** Creates and registers a single dot hit circle on the layer. */
function _addDotCircle(
    layer: Konva.Layer,
    nodeId: string,
    dotIndex: number,
    side: "output" | "input",
    x: number,
    y: number,
    color: string,
    onDown: (
        nodeId: string,
        dotIndex: number,
        side: "output" | "input",
        x: number,
        y: number,
    ) => void,
    onHover: (
        nodeId: string,
        dotIndex: number,
        side: "output" | "input",
        x: number,
        y: number,
        color: string,
    ) => void,
    onHoverEnd: () => void,
): void {
    const circle = new Konva.Circle({
        name: "dot-hit",
        x,
        y,
        radius: DOT_HIT_RADIUS,
        fill: "transparent",
    })
    circle.setAttr("dotNodeId", nodeId)
    circle.setAttr("dotIndex", dotIndex)
    circle.setAttr("dotSide", side)
    circle.on("mousedown touchstart", (e) => {
        // Ignore middle/right mouse button — those are reserved for panning.
        if (e.type === "mousedown" && (e.evt as MouseEvent).button !== 0) return
        onDown(nodeId, dotIndex, side, x, y)
    })
    circle.on("mouseenter", () => onHover(nodeId, dotIndex, side, x, y, color))
    circle.on("mouseleave", () => onHoverEnd())
    layer.add(circle)
}
