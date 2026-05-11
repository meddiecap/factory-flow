import Konva from "konva"
import { NodeType } from "../../simulation/types"
import type { NodeInstance, NodeDef } from "../../simulation/types"
import { PROGRESS_BAR_HEIGHT, STATUS_COLORS } from "./constants"

/**
 * Draws the status indicator at the bottom of a node.
 * Splitter nodes show a ratio text; production nodes show a cycle-progress bar.
 *
 * @param layer - Konva layer to draw onto.
 * @param node - Node instance providing progress, status, and type data.
 * @param def - Static definition providing cycle duration.
 * @param x - Left edge pixel coordinate.
 * @param y - Top edge pixel coordinate.
 * @param w - Node pixel width.
 * @param h - Node rendered pixel height.
 */
export function drawNodeStatus(
    layer: Konva.Layer,
    node: NodeInstance,
    def: NodeDef,
    x: number,
    y: number,
    w: number,
    h: number,
): void {
    const MARGIN = 4
    const barW = w - MARGIN * 2
    const barX = x + MARGIN
    const barY = y + h - MARGIN - PROGRESS_BAR_HEIGHT

    if (node.type === NodeType.Splitter) {
        const ratioA = node.splitterRatioA ?? 0.5
        const pctA = Math.round(ratioA * 100)
        const pctB = 100 - pctA
        layer.add(
            new Konva.Text({
                x: barX,
                y: barY - 2,
                width: barW,
                text: `${pctA} / ${pctB}`,
                fontSize: 9,
                fontFamily: "monospace",
                fill: "#9ca3af",
                align: "center",
            }),
        )
    } else if (def.cycleDuration > 0) {
        const fill = Math.min(node.progress / def.cycleDuration, 1)
        const color = STATUS_COLORS[node.status] ?? STATUS_COLORS["idle"]!
        layer.add(
            new Konva.Rect({
                x: barX,
                y: barY,
                width: barW,
                height: PROGRESS_BAR_HEIGHT,
                fill: "#374151",
                cornerRadius: 2,
            }),
        )
        if (fill > 0) {
            layer.add(
                new Konva.Rect({
                    x: barX,
                    y: barY,
                    width: Math.round(barW * fill),
                    height: PROGRESS_BAR_HEIGHT,
                    fill: color,
                    cornerRadius: 2,
                }),
            )
        }
    }
}
