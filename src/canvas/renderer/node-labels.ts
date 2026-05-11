import Konva from "konva"
import { NodeType } from "../../simulation/types"
import type { NodeInstance, NodeDef } from "../../simulation/types"
import { effectiveFuelPerTick } from "../../simulation/tick"
import { effectiveEnergyOutput } from "../../simulation/energy"
import { ENERGY_DOT_COLOR } from "./constants"

/**
 * Returns a compact upgrade-level string for a node, or null when no upgrades
 * are relevant for this node type (Splitter, Merger).
 *
 * @param node - The node instance to summarize.
 */
function _upgradeText(node: NodeInstance): string | null {
    const s = node.speedUpgradeLevel
    const b = node.bufferUpgradeLevel
    const e = node.energyEfficiencyUpgradeLevel

    switch (node.type) {
        case NodeType.Splitter:
        case NodeType.Merger:
            return null
        case NodeType.Market:
            return `${node.salesPoints ?? 1} / — / —`
        case NodeType.EnergySupply:
            return `⚡ Lv${node.energyOutputUpgradeLevel ?? 0}`
        default:
            return `${s} / ${b} / ${e}`
    }
}

/**
 * Draws the node title label centered at the top of the node body.
 * Provides the primary visual identity of each node on the canvas.
 *
 * @param layer - Konva layer to draw onto.
 * @param def - Static node definition containing the display name.
 * @param x - Left edge pixel coordinate.
 * @param y - Top edge pixel coordinate.
 * @param w - Node pixel width.
 */
export function drawNodeTitle(
    layer: Konva.Layer,
    def: NodeDef,
    x: number,
    y: number,
    w: number,
): void {
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
}

/**
 * Draws the energy output rate and connected-factory count for EnergySupply nodes.
 * No-ops for any other node type.
 *
 * @param layer - Konva layer to draw onto.
 * @param node - Node instance; must be EnergySupply to produce output.
 * @param def - Static definition used to compute effective output.
 * @param x - Left edge pixel coordinate.
 * @param y - Top edge pixel coordinate.
 * @param w - Node pixel width.
 * @param energyOutputCount - Number of active energy connections from this node.
 */
export function drawEnergySupplyStats(
    layer: Konva.Layer,
    node: NodeInstance,
    def: NodeDef,
    x: number,
    y: number,
    w: number,
    energyOutputCount: number,
): void {
    if (node.type !== NodeType.EnergySupply) return

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

/**
 * Draws energy consumption (fuel/tick) and live speed/throughput stats for
 * production nodes that have an energy input. No-ops for nodes without energy input.
 *
 * @param layer - Konva layer to draw onto.
 * @param node - Production node instance.
 * @param def - Static definition providing fuel rate and cycle data.
 * @param x - Left edge pixel coordinate.
 * @param y - Top edge pixel coordinate.
 * @param w - Node pixel width.
 * @param speedFactor - Current energy speed multiplier (0–1+).
 */
export function drawEnergyConsumptionLabel(
    layer: Konva.Layer,
    node: NodeInstance,
    def: NodeDef,
    x: number,
    y: number,
    w: number,
    speedFactor: number,
): void {
    if (!def.hasEnergyInput) return

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
        speedFactor === 0 ? "#f87171" : speedFactor < 1 ? "#fbbf24" : "#9ca3af"
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

/**
 * Draws the compact upgrade-level summary at the bottom of the node.
 * No-ops when the node type has no relevant upgrade display (Splitter, Merger).
 *
 * @param layer - Konva layer to draw onto.
 * @param node - Node instance.
 * @param x - Left edge pixel coordinate.
 * @param y - Top edge pixel coordinate.
 * @param w - Node pixel width.
 * @param h - Node rendered pixel height.
 */
export function drawUpgradeLabel(
    layer: Konva.Layer,
    node: NodeInstance,
    x: number,
    y: number,
    w: number,
    h: number,
): void {
    const upgradeText = _upgradeText(node)
    if (upgradeText === null) return

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
