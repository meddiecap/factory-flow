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
        // acc[0] = fractional credit for output A, acc[1] = fractional credit for output B.
        node.splitterAccumulators = [0, 0]
    }
}

/**
 * Advances one Splitter node by one tick using fractional credit accumulation.
 * Each input item contributes ratioA credit to output A and ratioB credit to output B.
 * Whenever a credit reaches 1 an item is dispatched to that output and the credit
 * is decremented by 1; fractional remainder carries over to the next item.
 * When one output is full its pending credits overflow to the other output.
 * If both outputs are full, processing stops to preserve backpressure.
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

    const acc = node.splitterAccumulators!
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

    // Small epsilon to guard against floating-point drift (e.g. 0.9999…8 instead of 1).
    const THRESHOLD = 1 - 1e-9

    // Process all available items this tick.
    // Each item adds ratioA credit to acc[0] (→ A) and ratioB credit to acc[1] (→ B).
    // When a credit reaches 1, one item is dispatched; if that output is full the item
    // overflows to the other output instead. Credits below 1 carry over to the next item.
    while (inBuf.amount >= 1) {
        if (
            outBufA.amount >= outBufA.capacity &&
            outBufB.amount >= outBufB.capacity
        )
            break

        inBuf.amount -= 1
        acc[0] += ratioA
        acc[1] += ratioB

        // Dispatch A credit — overflow to B when A is full.
        if (acc[0] >= THRESHOLD) {
            acc[0] -= 1
            if (outBufA.amount < outBufA.capacity) {
                outBufA.amount += 1
            } else {
                outBufB.amount += 1
            }
        }

        // Dispatch B credit — overflow to A when B is full.
        if (acc[1] >= THRESHOLD) {
            acc[1] -= 1
            if (outBufB.amount < outBufB.capacity) {
                outBufB.amount += 1
            } else {
                outBufA.amount += 1
            }
        }
    }
}
