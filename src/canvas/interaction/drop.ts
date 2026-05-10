import type { CameraController } from "./types"
import { CELL_SIZE } from "../shared/geometry"

/**
 * Binds HTML drag-and-drop events on the canvas container element.
 * Converts the drop screen position to grid coordinates and delegates to the callback.
 *
 * @param containerEl - The canvas container element to attach drop events to.
 * @param camera - Camera controller used to convert screen to world coordinates.
 * @param onDropNode - Callback invoked with node type and grid position on drop.
 */
export function bindDropHandler(
    containerEl: HTMLElement,
    camera: CameraController,
    onDropNode: (type: string, col: number, row: number) => void,
): void {
    containerEl.addEventListener("dragover", (e) => e.preventDefault())
    containerEl.addEventListener("drop", (e) => {
        e.preventDefault()
        const type = e.dataTransfer?.getData("text/x-node-type")
        if (!type) return
        const rect = containerEl.getBoundingClientRect()
        const screenPos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        }
        const worldPos = camera.screenToWorld(screenPos)
        const col = Math.floor(worldPos.x / CELL_SIZE)
        const row = Math.floor(worldPos.y / CELL_SIZE)
        onDropNode(type, col, row)
    })
}
