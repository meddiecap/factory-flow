import { NodeType } from "./types"
import type { NodeInstance, NodeDef } from "./types"

/**
 * Computes the effective fuel per tick for a node, accounting for energy efficiency upgrades.
 * Each upgrade level reduces fuel consumption by 10%, with a minimum of 50% of the base value.
 *
 * @param base - Base fuelPerTick from the node definition.
 * @param level - Current energy efficiency upgrade level of the node.
 * @returns Effective fuel consumption per tick.
 */
export function effectiveFuelPerTick(base: number, level: number): number {
    const factor = Math.max(0.5, 1 - level * 0.1)
    return base * factor
}

/**
 * Computes the effective recipe input amount for a node, accounting for efficiency upgrades.
 * Each upgrade level reduces input consumption by 10%, with a minimum of 50% of the base.
 *
 * @param base - Base input amount from the recipe.
 * @param level - Current efficiency upgrade level of the node.
 * @returns Effective input amount per cycle.
 */
export function effectiveInputAmount(base: number, level: number): number {
    const factor = Math.max(0.5, 1 - level * 0.1)
    return base * factor
}

/**
 * Advances one production node by one simulation tick.
 * Handles progress accumulation, cycle completion, input/output buffer management,
 * and status transitions (active, waiting, output-blocked, no-energy).
 * Called by the main simulator for every non-utility node each tick.
 *
 * @param node - The runtime node instance to advance.
 * @param def - The static definition for this node type.
 * @param speedFactor - Per-node speed multiplier derived from the energy system (0–1).
 */
export function tickNode(
    node: NodeInstance,
    def: NodeDef,
    speedFactor: number,
): void {
    // Utility / pass-through nodes are handled elsewhere.
    if (def.cycleDuration === 0) return

    // No energy connection → factory is completely stopped.
    if (def.hasEnergyInput && speedFactor === 0) {
        node.status = "no-energy"
        return
    }

    // --- Output-blocked check ---
    const outputFull = def.outputs.some((out, i) => {
        const buf = node.outputBuffers[i]
        return buf !== undefined && buf.amount >= buf.capacity
    })

    if (outputFull) {
        node.status = "output-blocked"
        return
    }

    // --- Input check: does the node have enough resources for one cycle? ---
    const hasEnoughInput = def.inputs.every((inp, i) => {
        const buf = node.inputBuffers[i]
        const needed = Math.ceil(
            effectiveInputAmount(inp.amount, node.efficiencyUpgradeLevel),
        )
        return buf !== undefined ? buf.amount >= needed : true
    })

    if (!hasEnoughInput) {
        node.status = "waiting"
        return
    }

    // --- Advance progress ---
    const speedMultiplier = 1.5 ** node.speedUpgradeLevel
    node.progress += speedFactor * speedMultiplier

    if (node.progress >= def.cycleDuration) {
        // Complete one cycle: deduct inputs and add outputs.
        for (let i = 0; i < def.inputs.length; i++) {
            const inp = def.inputs[i]
            const buf = node.inputBuffers[i]
            if (buf === undefined) continue
            const needed = Math.ceil(
                effectiveInputAmount(inp.amount, node.efficiencyUpgradeLevel),
            )
            buf.amount = Math.max(0, buf.amount - needed)
        }

        for (let i = 0; i < def.outputs.length; i++) {
            const buf = node.outputBuffers[i]
            if (buf === undefined) continue
            buf.amount = Math.min(
                buf.capacity,
                buf.amount + def.outputs[i]!.amount,
            )
        }

        node.progress -= def.cycleDuration
        node.status = "active"
    } else {
        node.status = "active"
    }
}

/**
 * Returns true when the node type is an Energy Supply (fuel producer).
 * Used by the energy system to separate producers from consumers.
 *
 * @param type - The NodeType to check.
 */
export function isEnergySupply(type: NodeType): boolean {
    return type === NodeType.EnergySupply
}
