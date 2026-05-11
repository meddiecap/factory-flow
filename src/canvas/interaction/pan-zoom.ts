import Konva from "konva"
import type { CameraController } from "./types"

/** Zoom step per scroll-wheel tick (12 % in/out). */
const ZOOM_FACTOR = 1.12

/**
 * Manages pan and zoom input bindings for the canvas.
 * Handles: scroll-wheel zoom, middle-mouse pan, spacebar+LMB pan.
 * Keeps keyboard/pointer state separate from the main interaction orchestrator.
 */
export class PanController {
    private _spacebarHeld = false
    private _isPanning = false
    private _keyDown: (e: KeyboardEvent) => void
    private _keyUp: (e: KeyboardEvent) => void
    private _winMouseMove: (e: MouseEvent) => void
    private _winMouseUp: (e: MouseEvent) => void

    /**
     * Registers all pan/zoom event listeners on the stage and window.
     *
     * @param stage - The Konva Stage to attach wheel and mousedown events to.
     * @param containerEl - The canvas container element for cursor management.
     * @param camera - Camera controller to delegate pan/zoom operations to.
     */
    constructor(
        stage: Konva.Stage,
        containerEl: HTMLElement,
        camera: CameraController,
    ) {
        this._keyDown = (e) => {
            if (e.code === "Space" && !e.repeat) {
                this._spacebarHeld = true
                containerEl.style.cursor = "grab"
                e.preventDefault()
            }
        }
        this._keyUp = (e) => {
            if (e.code === "Space") {
                this._spacebarHeld = false
                this._isPanning = false
                containerEl.style.cursor = ""
            }
        }
        this._winMouseMove = (e) => {
            if (!this._isPanning) return
            camera.panBy(e.movementX, e.movementY)
        }
        this._winMouseUp = (e) => {
            if (!this._isPanning) return
            if (e.button === 1 || e.button === 0) {
                this._isPanning = false
                containerEl.style.cursor = this._spacebarHeld ? "grab" : ""
            }
        }

        window.addEventListener("keydown", this._keyDown)
        window.addEventListener("keyup", this._keyUp)
        window.addEventListener("mousemove", this._winMouseMove)
        window.addEventListener("mouseup", this._winMouseUp)

        stage.on("wheel", (e) => {
            e.evt.preventDefault()
            const pos = stage.getPointerPosition()
            if (pos === null) return
            const factor = e.evt.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
            camera.zoomAt(factor, pos.x, pos.y)
        })

        stage.on("mousedown", (e) => {
            if (e.evt.button === 1) {
                e.evt.preventDefault()
                this._isPanning = true
                containerEl.style.cursor = "grabbing"
            }
            // Spacebar + LMB also starts panning.
            if (e.evt.button === 0 && this._spacebarHeld) {
                this._isPanning = true
                containerEl.style.cursor = "grabbing"
            }
            // LMB on anything that is not a node body or dot starts panning.
            // All interactive hit shapes carry the name "dot-hit"; everything else
            // (grid rects/lines, layer background) is fair game for pan.
            if (
                e.evt.button === 0 &&
                !this._spacebarHeld &&
                (e.target as Konva.Node).name() !== "dot-hit"
            ) {
                this._isPanning = true
                containerEl.style.cursor = "grabbing"
            }
        })
    }

    /** Returns true when spacebar is currently held, enabling LMB-drag panning. */
    get isSpaceHeld(): boolean {
        return this._spacebarHeld
    }

    /**
     * Removes all window-level event listeners registered by this controller.
     * Call when the parent interaction system is destroyed.
     */
    destroy(): void {
        window.removeEventListener("keydown", this._keyDown)
        window.removeEventListener("keyup", this._keyUp)
        window.removeEventListener("mousemove", this._winMouseMove)
        window.removeEventListener("mouseup", this._winMouseUp)
    }
}
