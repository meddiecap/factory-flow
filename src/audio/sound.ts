import productionReadySfxUrl from "../assets/sfx/production_ready.wav?url"
import { ref } from "vue"
import { NODE_DEFS } from "../simulation/recipes"
import { CELL_SIZE } from "../canvas/shared/geometry"
import type { NodeInstance } from "../simulation/types"

/** Reactive flag controlling whether sound effects are played. */
export const soundEnabled = ref(true)

/** Maximum volume for a node at the exact center of the screen. */
const BASE_VOLUME = 0.2

/**
 * Returns a volume multiplier in [0, 1] for the completed node closest to the
 * screen center. Nodes at the center return 1.0; nodes outside the viewport return 0.
 * When multiple nodes complete simultaneously, the loudest (most visible) one wins.
 *
 * @param completedIds - IDs of nodes that finished a cycle this tick.
 * @param nodes - All active nodes (for position lookup).
 * @param camera - Current camera state (panX, panY, zoom).
 * @param viewportW - Viewport width in screen pixels.
 * @param viewportH - Viewport height in screen pixels.
 * @returns Volume multiplier in [0, 1].
 */
function proximityVolume(
    completedIds: string[],
    nodes: NodeInstance[],
    camera: { panX: number; panY: number; zoom: number },
    viewportW: number,
    viewportH: number,
): number {
    const halfW = viewportW / 2
    const halfH = viewportH / 2
    const halfDiag = Math.sqrt(halfW * halfW + halfH * halfH)
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    let best = 0
    for (const id of completedIds) {
        const node = nodeMap.get(id)
        if (node === undefined) continue
        const def = NODE_DEFS[node.type]
        if (def === undefined) continue
        const worldCX = (node.position.col + def.gridSize.width / 2) * CELL_SIZE
        const worldCY =
            (node.position.row + def.gridSize.height / 2) * CELL_SIZE
        const screenCX = worldCX * camera.zoom + camera.panX
        const screenCY = worldCY * camera.zoom + camera.panY
        const dist = Math.sqrt(
            (screenCX - halfW) ** 2 + (screenCY - halfH) ** 2,
        )
        const vol = Math.max(0, 1 - dist / halfDiag)
        if (vol > best) best = vol
    }
    return best
}

/**
 * Plays the production-ready sound effect, with volume scaled by how close the
 * completing node is to the screen center. Off-screen completions are silent.
 * Silently ignores browser autoplay restrictions.
 *
 * @param completedIds - IDs of nodes that finished a cycle this tick.
 * @param nodes - All active nodes.
 * @param camera - Current camera state.
 * @param viewportW - Viewport width in screen pixels.
 * @param viewportH - Viewport height in screen pixels.
 */
export function playProductionReady(
    completedIds: string[],
    nodes: NodeInstance[],
    camera: { panX: number; panY: number; zoom: number } | undefined,
    viewportW: number,
    viewportH: number,
): void {
    if (!soundEnabled.value) return
    if (camera === undefined || completedIds.length === 0) return
    const vol = proximityVolume(
        completedIds,
        nodes,
        camera,
        viewportW,
        viewportH,
    )
    if (vol <= 0) return
    const audio = new Audio(productionReadySfxUrl)
    audio.volume = BASE_VOLUME * vol
    audio.play().catch(() => {})
}
