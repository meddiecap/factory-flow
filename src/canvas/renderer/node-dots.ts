import Konva from "konva"
import { NodeType } from "../../simulation/types"
import type { NodeInstance, NodeDef } from "../../simulation/types"
import { dotY } from "../shared/geometry"
import {
    DOT_RADIUS,
    DOT_INPUT_COLOR,
    DOT_OUTPUT_COLOR,
    ENERGY_DOT_COLOR,
} from "./constants"

/**
 * Draws input dots on the left edge of a node, plus Market revenue labels.
 * The energy input dot (yellow) is included here for nodes with hasEnergyInput.
 *
 * @param layer - Konva layer to draw onto.
 * @param node - Node instance providing input buffer count and type.
 * @param def - Static definition for energy input flag and grid dimensions.
 * @param x - Left edge pixel coordinate.
 * @param y - Top edge pixel coordinate.
 * @param w - Node pixel width.
 * @param h - Node rendered pixel height.
 * @param slotRevenues - For Market nodes: projected €/s per slot, null if unconnected.
 */
export function drawInputDots(
    layer: Konva.Layer,
    node: NodeInstance,
    def: NodeDef,
    x: number,
    y: number,
    w: number,
    h: number,
    slotRevenues?: (number | null)[],
): void {
    const inputCount = node.inputBuffers.length
    const totalInputDots = def.hasEnergyInput ? inputCount + 1 : inputCount

    for (let i = 0; i < inputCount; i++) {
        const dotYPos = y + (h / (totalInputDots + 1)) * (i + 1)
        layer.add(
            new Konva.Circle({
                x,
                y: dotYPos,
                radius: DOT_RADIUS,
                fill: DOT_INPUT_COLOR,
                stroke: "#1e40af",
                strokeWidth: 1,
            }),
        )

        if (node.type === NodeType.Market && slotRevenues !== undefined) {
            const rev = slotRevenues[i] ?? null
            const text =
                rev === null
                    ? "—"
                    : rev > 0
                      ? `€${rev.toLocaleString(undefined, { maximumFractionDigits: 1 })}/s`
                      : "€0/s"
            const fill =
                rev === null ? "#6b7280" : rev > 0 ? "#fbbf24" : "#6b7280"
            layer.add(
                new Konva.Text({
                    x: x + DOT_RADIUS + 4,
                    y: dotYPos - 5,
                    width: w - DOT_RADIUS - 8,
                    text,
                    fontSize: 9,
                    fontFamily: "monospace",
                    fill,
                    align: "right",
                }),
            )
        }
    }

    if (def.hasEnergyInput) {
        layer.add(
            new Konva.Circle({
                x,
                y: dotY(
                    node.position.row,
                    inputCount,
                    totalInputDots,
                    def.gridSize.height,
                ),
                radius: DOT_RADIUS,
                fill: ENERGY_DOT_COLOR,
                stroke: "#b45309",
                strokeWidth: 1,
            }),
        )
    }
}

/**
 * Draws output dots on the right edge of a node.
 * EnergySupply renders one dot per active connection plus one spare;
 * all other nodes render one dot per recipe output.
 *
 * @param layer - Konva layer to draw onto.
 * @param node - Node instance used to determine type.
 * @param def - Static definition providing output count and grid dimensions.
 * @param x - Left edge pixel coordinate.
 * @param w - Node pixel width.
 * @param energyOutputCount - Active energy connections from this EnergySupply node.
 */
export function drawOutputDots(
    layer: Konva.Layer,
    node: NodeInstance,
    def: NodeDef,
    x: number,
    w: number,
    energyOutputCount: number,
): void {
    if (node.type === NodeType.EnergySupply) {
        const totalEnergyDots = energyOutputCount + 1
        for (let i = 0; i < totalEnergyDots; i++) {
            layer.add(
                new Konva.Circle({
                    x: x + w,
                    y: dotY(
                        node.position.row,
                        i,
                        totalEnergyDots,
                        def.gridSize.height,
                    ),
                    radius: DOT_RADIUS,
                    fill: ENERGY_DOT_COLOR,
                    stroke: "#b45309",
                    strokeWidth: 1,
                }),
            )
        }
    } else {
        const outputCount = def.outputs.length
        for (let i = 0; i < outputCount; i++) {
            layer.add(
                new Konva.Circle({
                    x: x + w,
                    y: dotY(
                        node.position.row,
                        i,
                        outputCount,
                        def.gridSize.height,
                    ),
                    radius: DOT_RADIUS,
                    fill: DOT_OUTPUT_COLOR,
                    stroke: "#166534",
                    strokeWidth: 1,
                }),
            )
        }
    }
}
