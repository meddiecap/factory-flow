import Konva from "konva"
import { NODE_DEFS } from "../../simulation/recipes"
import type { NodeInstance } from "../../simulation/types"
import {
    colToPx,
    rowToPx,
    CELL_SIZE,
    nodeRenderedHeight,
} from "../shared/geometry"
import { NODE_FILL_COLOR, NODE_STROKE_COLOR } from "./constants"
import {
    drawNodeTitle,
    drawEnergySupplyStats,
    drawEnergyConsumptionLabel,
    drawUpgradeLabel,
} from "./node-labels"
import { drawInputDots, drawOutputDots } from "./node-dots"
import { drawNodeStatus } from "./node-status"

/**
 * Draws a single node as a rectangle with label, input/output dots and a status bar.
 * Production nodes show a cycle-progress bar; Splitter shows its ratio.
 * EnergySupply receives a dynamic output dot count.
 * Market nodes grow vertically and show per-slot revenue labels next to each input dot.
 *
 * @param layer - The Konva layer to draw onto.
 * @param node - Runtime node instance with position data.
 * @param energyOutputCount - For EnergySupply: number of existing energy connections.
 * @param speedFactor - Current speed factor (0–1+) for energy-powered nodes.
 * @param slotRevenues - For Market nodes: projected €/s per input slot (null = unconnected).
 */
export function drawNode(
    layer: Konva.Layer,
    node: NodeInstance,
    energyOutputCount = 0,
    speedFactor = 1.0,
    slotRevenues?: (number | null)[],
): void {
    const def = NODE_DEFS[node.type]
    const x = colToPx(node.position.col)
    const y = rowToPx(node.position.row)
    const w = def.gridSize.width * CELL_SIZE
    const h = nodeRenderedHeight(node)

    layer.add(
        new Konva.Rect({
            x,
            y,
            width: w,
            height: h,
            fill: NODE_FILL_COLOR,
            stroke: NODE_STROKE_COLOR,
            strokeWidth: 2,
            cornerRadius: 4,
        }),
    )

    drawNodeTitle(layer, def, x, y, w)
    drawEnergySupplyStats(layer, node, def, x, y, w, energyOutputCount)
    drawEnergyConsumptionLabel(layer, node, def, x, y, w, speedFactor)
    drawUpgradeLabel(layer, node, x, y, w, h)
    drawInputDots(layer, node, def, x, y, w, h, slotRevenues)
    drawOutputDots(layer, node, def, x, w, energyOutputCount)
    drawNodeStatus(layer, node, def, x, y, w, h)
}
