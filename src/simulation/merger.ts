import type { NodeInstance } from "./types"

/**
 * Advances one Merger node by one tick, draining one item from an input buffer
 * into the single output buffer using round-robin selection between the two inputs.
 * Alternates between input A and input B each tick to give both sources equal
 * throughput. Falls back to the other input when the preferred one is empty.
 * Stops when the output buffer is full (backpressure).
 * Called after connection transport so the input buffers hold the latest goods.
 *
 * @param node - The Merger node instance to advance.
 */
export function tickMerger(node: NodeInstance): void {
    const inBufA = node.inputBuffers[0]
    const inBufB = node.inputBuffers[1]
    const outBuf = node.outputBuffers[0]

    if (inBufA === undefined || inBufB === undefined || outBuf === undefined)
        return
    if (outBuf.amount >= outBuf.capacity) return

    // Alternate preferred input each tick; fall back to the other when preferred is empty.
    const preferred: 0 | 1 = node.mergerLastInput === 0 ? 1 : 0
    const fallback: 0 | 1 = preferred === 0 ? 1 : 0

    const preferredBuf = preferred === 0 ? inBufA : inBufB
    const fallbackBuf = fallback === 0 ? inBufA : inBufB

    if (preferredBuf.amount >= 1) {
        outBuf.resource = preferredBuf.resource
        preferredBuf.amount -= 1
        outBuf.amount += 1
        node.mergerLastInput = preferred
    } else if (fallbackBuf.amount >= 1) {
        outBuf.resource = fallbackBuf.resource
        fallbackBuf.amount -= 1
        outBuf.amount += 1
        node.mergerLastInput = fallback
    }
}
