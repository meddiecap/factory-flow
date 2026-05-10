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
    /** Returns true when a node drag is currently active (suppresses click-to-select). */
    isDragActive: () => boolean
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
        hitRect.on("mousedown touchstart", () => {
            const pos = stage.getPointerPosition()
            if (pos === null || cbs.isDragActive()) return
            cbs.onNodeBodyDown(
                node.id,
                def.gridSize.width,
                def.gridSize.height,
                bx,
                by,
                bw,
                bh,
                pos,
            )
        })
        hitRect.on("click tap", () => {
            if (!cbs.isDragActive()) cbs.onSelectNode(node.id)
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
                _addDotCircle(layer, node.id, i, "output", x, y, cbs.onDotDown)
            }
        } else {
            for (let i = 0; i < def.outputs.length; i++) {
                const [x, y] = outputDotPos(node, i)
                _addDotCircle(layer, node.id, i, "output", x, y, cbs.onDotDown)
            }
        }

        // Recipe input dots
        for (let i = 0; i < node.inputBuffers.length; i++) {
            const [x, y] = inputDotPos(node, i)
            _addDotCircle(layer, node.id, i, "input", x, y, cbs.onDotDown)
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
                cbs.onDotDown,
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
    onDown: (
        nodeId: string,
        dotIndex: number,
        side: "output" | "input",
        x: number,
        y: number,
    ) => void,
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
    circle.on("mousedown touchstart", () =>
        onDown(nodeId, dotIndex, side, x, y),
    )
    layer.add(circle)
}
