import Konva from "konva"
import { NODE_DEFS } from "../../simulation/recipes"
import { NodeType } from "../../simulation/types"
import type { NodeInstance } from "../../simulation/types"
import { effectiveFuelPerTick } from "../../simulation/tick"
import { effectiveEnergyOutput } from "../../simulation/energy"
import {
    colToPx,
    rowToPx,
    dotY,
    CELL_SIZE,
    nodeRenderedHeight,
} from "../shared/geometry"
import {
    DOT_RADIUS,
    DOT_INPUT_COLOR,
    DOT_OUTPUT_COLOR,
    ENERGY_DOT_COLOR,
    NODE_FILL_COLOR,
    NODE_STROKE_COLOR,
    PROGRESS_BAR_HEIGHT,
    STATUS_COLORS,
} from "./constants"

/**
 * Returns a compact upgrade-level string for a node, or null when no upgrades
 * are relevant for this node type (Splitter).
 *
 * @param node - The node instance to summarize.
 */
function _upgradeText(node: NodeInstance): string | null {
    const s = node.speedUpgradeLevel
    const b = node.bufferUpgradeLevel
    const e = node.energyEfficiencyUpgradeLevel

    switch (node.type) {
        case NodeType.Splitter:
            return null
        case NodeType.Warehouse:
            return `— / ${b} / —`
        case NodeType.Market:
            return `${node.salesPoints ?? 1} / — / —`
        case NodeType.EnergySupply:
            return `⚡ Lv${node.energyOutputUpgradeLevel ?? 0}`
        default:
            return `${s} / ${b} / ${e}`
    }
}

/**
 * Draws a single node as a rectangle with label, input/output dots and a status bar.
 * Production nodes show a cycle-progress bar; Splitter shows its ratio; Warehouse
 * shows its buffer fill fraction. EnergySupply receives a dynamic output dot count.
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

    // Node body
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

    // Node label
    layer.add(
        new Konva.Text({
            x: x + 4,
            y: y + 4,
            width: w - 8,
            text: def.displayName,
            fontSize: 11,
            fontFamily: "monospace",
            fill: "#e5e7eb",
            align: "center",
        }),
    )

    // Energy Supply stats – output rate and connected factory count.
    if (node.type === NodeType.EnergySupply) {
        const effectiveOutput = effectiveEnergyOutput(node, def)
        layer.add(
            new Konva.Text({
                x: x + 4,
                y: y + 19,
                width: w - 8,
                text: `⚡ ${effectiveOutput.toFixed(1)} /tick`,
                fontSize: 9,
                fontFamily: "monospace",
                fill: ENERGY_DOT_COLOR,
                align: "center",
            }),
        )
        layer.add(
            new Konva.Text({
                x: x + 4,
                y: y + 30,
                width: w - 8,
                text: `→ ${energyOutputCount} connected`,
                fontSize: 9,
                fontFamily: "monospace",
                fill: "#9ca3af",
                align: "center",
            }),
        )
    }

    // Energy consumption label (below node title, yellow) – production factories only.
    if (def.hasEnergyInput) {
        const fuelVal = effectiveFuelPerTick(
            def.fuelPerTick,
            node.energyEfficiencyUpgradeLevel,
        )
        layer.add(
            new Konva.Text({
                x: x + 4,
                y: y + 19,
                width: w - 8,
                text: `⚡ ${fuelVal.toFixed(2)} /tick`,
                fontSize: 9,
                fontFamily: "monospace",
                fill: ENERGY_DOT_COLOR,
                align: "center",
            }),
        )

        const speedPct = Math.round(speedFactor * 100)
        const speedMultiplier = 1.5 ** node.speedUpgradeLevel
        const primaryOutput = def.outputs[0]
        const ratePerSec = primaryOutput
            ? ((primaryOutput.amount * speedFactor * speedMultiplier) /
                  def.cycleDuration) *
              20
            : 0
        const statsColor =
            speedFactor === 0
                ? "#f87171"
                : speedFactor < 1
                  ? "#fbbf24"
                  : "#9ca3af"
        layer.add(
            new Konva.Text({
                x: x + 4,
                y: y + 30,
                width: w - 8,
                text: `${speedPct}% · ${ratePerSec.toFixed(2)}/s`,
                fontSize: 9,
                fontFamily: "monospace",
                fill: statsColor,
                align: "center",
            }),
        )
    }

    // Upgrade level display (bottom, small monospace text)
    const upgradeText = _upgradeText(node)
    if (upgradeText !== null) {
        layer.add(
            new Konva.Text({
                x: x + 4,
                y: y + h - 16,
                width: w - 8,
                text: upgradeText,
                fontSize: 9,
                fontFamily: "monospace",
                fill: "#9ca3af",
                align: "center",
            }),
        )
    }

    // Input dots (left edge)
    const inputCount = node.inputBuffers.length
    const totalInputDots = def.hasEnergyInput ? inputCount + 1 : inputCount

    for (let i = 0; i < inputCount; i++) {
        const dotYPos =
            rowToPx(node.position.row) + (h / (totalInputDots + 1)) * (i + 1)
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
        // Market: revenue label next to each input dot
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

    // Energy input dot (left edge, yellow) – production factories only.
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

    // Output dots (right edge)
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

    // Status indicator (bottom of node body)
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
    } else if (node.type === NodeType.Warehouse) {
        const buf = node.inputBuffers[0]
        if (buf !== undefined && buf.capacity > 0) {
            const fill = Math.min(buf.amount / buf.capacity, 1)
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
                        fill: "#60a5fa",
                        cornerRadius: 2,
                    }),
                )
            }
        }
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
