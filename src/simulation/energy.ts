import { NodeType } from "./types"
import type { NodeInstance } from "./types"
import type { NodeDef } from "./types"
import { effectiveFuelPerTick, isEnergySupply } from "./tick"

/**
 * Calculates the global speed factor based on fuel supply and demand.
 * Energy Supply nodes produce fuel into the global pool; all other active production
 * nodes consume from it. The ratio of supply to demand determines how fast every
 * factory runs this tick. A surplus bonus is applied via a logarithmic curve.
 * Called once per tick before any node is advanced.
 *
 * @param nodes - All active node instances on the canvas.
 * @param defs - Record mapping NodeType to its static definition.
 * @returns Speed factor to apply to all production nodes this tick (≥ 0).
 */
export function calcSpeedFactor(
    nodes: NodeInstance[],
    defs: Record<NodeType, NodeDef>,
): number {
    let produced = 0
    let consumed = 0

    for (const node of nodes) {
        const def = defs[node.type]
        if (def === undefined) continue

        if (isEnergySupply(node.type)) {
            // Energy Supply nodes that are not blocked produce fuel.
            if (node.status !== "output-blocked") {
                // Each cycle produces `outputs[0].amount` fuel over `cycleDuration` ticks.
                // The global pool counts fuel produced per tick at full speed.
                const fuelPerTick = def.outputs[0]!.amount / def.cycleDuration
                produced += fuelPerTick
            }
        } else if (def.cycleDuration > 0) {
            // Production node: only consumes fuel when active (not waiting or output-blocked).
            if (node.status !== "waiting" && node.status !== "output-blocked") {
                consumed += effectiveFuelPerTick(
                    def.fuelPerTick,
                    node.energyEfficiencyUpgradeLevel,
                )
            }
        }
    }

    // No consumers → no constraint; run at full speed.
    if (consumed === 0) return 1.0

    const ratio = produced / consumed

    if (ratio >= 1) {
        // Surplus: apply logarithmic bonus. Formula: 1 + 0.2 × ln(surplus + 1)
        const surplus = produced - consumed
        return 1 + 0.2 * Math.log(surplus + 1)
    }

    // Deficit: clamp to [0, 1].
    return Math.max(0, ratio)
}
