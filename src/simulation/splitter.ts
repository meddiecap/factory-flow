import type { NodeInstance } from "./types"

/**
 * Initialises the splitter accumulators and ratio on a node instance if not already set.
 * Called at node placement to ensure the splitter always has valid internal state.
 *
 * @param node - The Splitter node instance to initialise.
 */
export function initSplitter(node: NodeInstance): void {
    if (node.splitterRatioA === undefined) {
        node.splitterRatioA = 0.5
    }
    if (node.splitterAccumulators === undefined) {
        // Start accumulator A pre-charged with one full ratio credit so the two
        // outputs fire on alternating ticks instead of simultaneously.
        node.splitterAccumulators = [node.splitterRatioA, 0]
    }
}

/**
 * Advances one Splitter node by one tick using fractional accumulation.
 * Each tick the ratio for each output is added to its internal accumulator.
 * Whenever an accumulator reaches or exceeds 1, one unit is dispatched to that output
 * and the accumulator is decremented by 1. This ensures the long-run output ratio
 * matches the configured ratio without rounding errors.
 * Called after connection transport so the input buffer holds the latest goods.
 *
 * @param node - The Splitter node instance to advance.
 */
export function tickSplitter(node: NodeInstance): void {
    if (
        node.splitterAccumulators === undefined ||
        node.splitterRatioA === undefined
    ) {
        initSplitter(node)
    }

    const accumulators = node.splitterAccumulators!
    const ratioA = node.splitterRatioA!
    const ratioB = 1 - ratioA

    const inBuf = node.inputBuffers[0]
    const outBufA = node.outputBuffers[0]
    const outBufB = node.outputBuffers[1]

    if (inBuf === undefined || outBufA === undefined || outBufB === undefined)
        return

    // Keep output resource types in sync with whatever flows in.
    outBufA.resource = inBuf.resource
    outBufB.resource = inBuf.resource

    // Accumulate ratio each tick.
    accumulators[0] += ratioA
    accumulators[1] += ratioB

    // Use a small epsilon to guard against floating-point drift (e.g. 0.9999…98 instead of 1).
    const THRESHOLD = 1 - 1e-9

    // Dispatch units when accumulator reaches 1.
    if (accumulators[0] >= THRESHOLD && inBuf.amount >= 1) {
        const canSend = outBufA.amount < outBufA.capacity
        if (canSend) {
            inBuf.amount -= 1
            outBufA.amount += 1
            accumulators[0] -= 1
        }
        // If output A is blocked, accumulator keeps building — handled naturally.
    }

    if (accumulators[1] >= THRESHOLD && inBuf.amount >= 1) {
        const canSend = outBufB.amount < outBufB.capacity
        if (canSend) {
            inBuf.amount -= 1
            outBufB.amount += 1
            accumulators[1] -= 1
        }
    }
}
