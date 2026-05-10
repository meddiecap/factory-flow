import Konva from "konva"
import type {
    GameState,
    NodeInstance,
    Connection,
} from "../../simulation/types"
import { NodeType } from "../../simulation/types"
import type { TransferEvent } from "../../simulation/connections"
import { buildEnergyOutputCounts } from "../../simulation/connections"
import { calcNodeSpeedFactors } from "../../simulation/energy"
import { lastSpeedFactors } from "../../simulation/simulator"
import { calcMarketSlotRevenues } from "../../simulation/throughput"
import { NODE_DEFS } from "../../simulation/recipes"
import { CELL_SIZE } from "../shared/geometry"
import { drawNode } from "./nodes"
import { drawConnections } from "./connections"
import { Camera } from "./camera"
import { ParticleManager } from "./particles"

export { CELL_SIZE }
export { inputDotX } from "../shared/geometry"

/**
 * Manages a Konva Stage and renders a static snapshot of GameState onto it.
 * Delegates camera control to Camera and particle animation to ParticleManager.
 * Separates canvas rendering concerns from Vue reactivity and simulation logic.
 */
export class CanvasRenderer {
    private stage: Konva.Stage
    private connectionLayer: Konva.Layer
    private nodeLayer: Konva.Layer
    private _camera: Camera
    private _particleMgr: ParticleManager
    private _nodeMap = new Map<string, NodeInstance>()
    private _connMap = new Map<string, Connection>()
    private _containerId: string
    private _resizeHandler: () => void

    /**
     * Creates a new CanvasRenderer attached to the given container element.
     * The stage fills the container; a resize listener keeps it in sync with the viewport.
     *
     * @param containerId - The `id` of the HTML element to mount the Konva stage inside.
     */
    constructor(containerId: string) {
        this._containerId = containerId
        const container = document.getElementById(containerId)!
        const w = container.offsetWidth || window.innerWidth
        const h = container.offsetHeight || window.innerHeight

        this.stage = new Konva.Stage({
            container: containerId,
            width: w,
            height: h,
        })

        const gridLayer = new Konva.Layer()
        this.connectionLayer = new Konva.Layer()
        this.nodeLayer = new Konva.Layer()
        const particleLayer = new Konva.Layer()

        this.stage.add(gridLayer)
        this.stage.add(this.connectionLayer)
        this.stage.add(this.nodeLayer)
        this.stage.add(particleLayer)

        this._camera = new Camera(this.stage, gridLayer)
        this._particleMgr = new ParticleManager(particleLayer)

        this._resizeHandler = () => {
            const el = document.getElementById(this._containerId)
            if (el === null) return
            this.stage.width(el.offsetWidth)
            this.stage.height(el.offsetHeight)
            this._camera.update()
        }
        window.addEventListener("resize", this._resizeHandler)
        this._camera.update()
    }

    // Camera delegation — implements the CameraController interface used by the interaction layer.
    screenToWorld(pos: { x: number; y: number }) {
        return this._camera.screenToWorld(pos)
    }
    panBy(dx: number, dy: number) {
        this._camera.panBy(dx, dy)
    }
    zoomAt(factor: number, screenX: number, screenY: number) {
        this._camera.zoomAt(factor, screenX, screenY)
    }
    resetZoom() {
        this._camera.resetZoom()
    }
    fitToView(nodes: NodeInstance[]) {
        this._camera.fitToView(nodes)
    }
    getCamera() {
        return this._camera.getCamera()
    }
    setCamera(panX: number, panY: number, zoom: number) {
        this._camera.setCamera(panX, panY, zoom)
    }

    /**
     * Re-renders the connection and node layers from the current game state.
     * Clears and redraws both layers on every call; active particles are NOT destroyed.
     *
     * @param state - The game state snapshot to render.
     */
    render(state: GameState): void {
        this.connectionLayer.destroyChildren()
        this.nodeLayer.destroyChildren()

        const nodeMap = new Map<string, NodeInstance>()
        for (const node of state.nodes) nodeMap.set(node.id, node)
        this._nodeMap = nodeMap

        const connMap = new Map<string, Connection>()
        for (const conn of state.connections) connMap.set(conn.id, conn)
        this._connMap = connMap

        // Pre-build energyOutputCounts once so neither drawConnections nor the
        // node loop has to filter all connections per node (O(n) instead of O(n²)).
        const energyOutputCounts = buildEnergyOutputCounts(state.connections)

        drawConnections(
            this.connectionLayer,
            state.connections,
            nodeMap,
            energyOutputCounts,
        )

        // Reuse the speed factors computed by the last tick; fall back to recalculating
        // only on the very first render before tick() has run.
        const speedFactors =
            lastSpeedFactors.size > 0
                ? lastSpeedFactors
                : calcNodeSpeedFactors(
                      state.nodes,
                      state.connections,
                      NODE_DEFS,
                  )

        for (const node of state.nodes) {
            const energyOutputCount =
                node.type === NodeType.EnergySupply
                    ? (energyOutputCounts.get(node.id) ?? 0)
                    : 0
            const slotRevenues =
                node.type === NodeType.Market
                    ? calcMarketSlotRevenues(
                          // TODO: pass nodeMap + connsByTarget as optional params to avoid
                          // rebuilding them per Market node when multiple Markets are on the canvas.
                          node,
                          state.nodes,
                          state.connections,
                          speedFactors,
                      )
                    : undefined
            drawNode(
                this.nodeLayer,
                node,
                energyOutputCount,
                speedFactors.get(node.id) ?? 1.0,
                slotRevenues,
            )
        }

        const liveIds = new Set(state.connections.map((c) => c.id))
        this._particleMgr.pruneStale(liveIds)

        this.connectionLayer.batchDraw()
        this.nodeLayer.batchDraw()
    }

    /**
     * Spawns animated resource particles for each transfer event from the last tick.
     * Relies on the nodeMap and connMap cached by the preceding render() call.
     *
     * @param events - Transfer events returned by tickConnections.
     */
    spawnParticles(events: TransferEvent[]): void {
        this._particleMgr.spawnParticles(events, this._nodeMap, this._connMap)
    }

    /**
     * Returns the underlying Konva Stage for advanced access (e.g. event listeners).
     *
     * @returns The Konva Stage instance.
     */
    getStage(): Konva.Stage {
        return this.stage
    }

    /**
     * Destroys the Konva Stage and frees all canvas resources.
     * Removes the resize listener registered in the constructor.
     * Should be called when the Vue component is unmounted.
     */
    destroy(): void {
        window.removeEventListener("resize", this._resizeHandler)
        this.stage.destroy()
    }
}
