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
import { outputDotPos, inputDotPos, CELL_SIZE } from "../shared/geometry"
import {
    RESOURCE_COLORS,
    MAX_PARTICLES_PER_TICK,
    PARTICLE_DURATION_MS,
    PARTICLE_RADIUS,
} from "./constants"
import { drawGrid } from "./grid"
import { drawNode } from "./nodes"
import { drawConnections, routeWaypoints } from "./connections"

export { CELL_SIZE }
export { inputDotX } from "../shared/geometry"

/** Minimum allowed zoom factor. */
const ZOOM_MIN = 0.25
/** Maximum allowed zoom factor. */
const ZOOM_MAX = 3.0

/**
 * Manages a Konva Stage and renders a static snapshot of GameState onto it.
 * Owns the camera state (pan + zoom) and exposes methods for pan/zoom manipulation.
 * Separates canvas rendering concerns from Vue reactivity and simulation logic.
 */
export class CanvasRenderer {
    private stage: Konva.Stage
    private gridLayer: Konva.Layer
    private connectionLayer: Konva.Layer
    private nodeLayer: Konva.Layer
    private particleLayer: Konva.Layer

    private _particles = new Map<string, Konva.Circle[]>()
    private _nodeMap = new Map<string, NodeInstance>()
    private _connMap = new Map<string, Connection>()

    /** Camera pan offset in screen pixels (= stage.position()). */
    private _panX = 0
    private _panY = 0
    /** Current zoom factor (= stage.scaleX()). */
    private _zoom = 1.0

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

        this.gridLayer = new Konva.Layer()
        this.connectionLayer = new Konva.Layer()
        this.nodeLayer = new Konva.Layer()
        this.particleLayer = new Konva.Layer()

        this.stage.add(this.gridLayer)
        this.stage.add(this.connectionLayer)
        this.stage.add(this.nodeLayer)
        this.stage.add(this.particleLayer)

        this._resizeHandler = () => {
            const el = document.getElementById(this._containerId)
            if (el === null) return
            this.stage.width(el.offsetWidth)
            this.stage.height(el.offsetHeight)
            this._updateStage()
        }
        window.addEventListener("resize", this._resizeHandler)
        this._updateStage()
    }

    /** Applies camera pan/zoom to the stage and redraws the grid for the new viewport. */
    private _updateStage(): void {
        this.stage.scale({ x: this._zoom, y: this._zoom })
        this.stage.position({ x: this._panX, y: this._panY })
        drawGrid(
            this.gridLayer,
            this._panX,
            this._panY,
            this._zoom,
            this.stage.width(),
            this.stage.height(),
        )
        this.gridLayer.batchDraw()
    }

    /**
     * Converts a screen-space position to world-pixel coordinates.
     * Used by the interaction layer to translate pointer events.
     *
     * @param pos - Position in screen pixels.
     * @returns Position in world pixels.
     */
    screenToWorld(pos: { x: number; y: number }): { x: number; y: number } {
        return {
            x: (pos.x - this._panX) / this._zoom,
            y: (pos.y - this._panY) / this._zoom,
        }
    }

    /**
     * Pans the camera by a screen-pixel delta (e.g. from a mouse drag).
     *
     * @param dx - Horizontal delta in screen pixels.
     * @param dy - Vertical delta in screen pixels.
     */
    panBy(dx: number, dy: number): void {
        this._panX += dx
        this._panY += dy
        this._updateStage()
    }

    /**
     * Zooms in or out at a fixed screen-space cursor position.
     * Adjusts pan so the point under the cursor stays fixed on screen.
     *
     * @param factor - Multiplicative scale change (> 1 = zoom in, < 1 = zoom out).
     * @param screenX - Cursor x in screen pixels.
     * @param screenY - Cursor y in screen pixels.
     */
    zoomAt(factor: number, screenX: number, screenY: number): void {
        const newZoom = Math.max(
            ZOOM_MIN,
            Math.min(ZOOM_MAX, this._zoom * factor),
        )
        if (newZoom === this._zoom) return
        const worldX = (screenX - this._panX) / this._zoom
        const worldY = (screenY - this._panY) / this._zoom
        this._zoom = newZoom
        this._panX = screenX - worldX * this._zoom
        this._panY = screenY - worldY * this._zoom
        this._updateStage()
    }

    /**
     * Resets zoom to 1.0×, keeping the screen centre fixed.
     * Triggered by the `0` keyboard shortcut.
     */
    resetZoom(): void {
        const cx = this.stage.width() / 2
        const cy = this.stage.height() / 2
        this.zoomAt(1.0 / this._zoom, cx, cy)
    }

    /**
     * Zooms and pans so that all placed nodes are visible with a 2-cell margin.
     * Triggered by the `F` keyboard shortcut and after loading a schematic.
     *
     * @param nodes - All active nodes on the canvas.
     */
    fitToView(nodes: NodeInstance[]): void {
        if (nodes.length === 0) return
        const MARGIN = 2
        let minCol = Infinity,
            minRow = Infinity
        let maxCol = -Infinity,
            maxRow = -Infinity
        for (const n of nodes) {
            const def = NODE_DEFS[n.type]
            minCol = Math.min(minCol, n.position.col)
            minRow = Math.min(minRow, n.position.row)
            maxCol = Math.max(maxCol, n.position.col + def.gridSize.width)
            maxRow = Math.max(maxRow, n.position.row + def.gridSize.height)
        }
        minCol -= MARGIN
        minRow -= MARGIN
        maxCol += MARGIN
        maxRow += MARGIN
        const bbW = (maxCol - minCol) * CELL_SIZE
        const bbH = (maxRow - minRow) * CELL_SIZE
        const zoom = Math.max(
            ZOOM_MIN,
            Math.min(
                ZOOM_MAX,
                Math.min(this.stage.width() / bbW, this.stage.height() / bbH),
            ),
        )
        const centerWorldX = ((minCol + maxCol) / 2) * CELL_SIZE
        const centerWorldY = ((minRow + maxRow) / 2) * CELL_SIZE
        this._zoom = zoom
        this._panX = this.stage.width() / 2 - centerWorldX * zoom
        this._panY = this.stage.height() / 2 - centerWorldY * zoom
        this._updateStage()
    }

    /**
     * Returns current camera state for persistence.
     *
     * @returns Pan offsets in screen pixels and zoom factor.
     */
    getCamera(): { panX: number; panY: number; zoom: number } {
        return { panX: this._panX, panY: this._panY, zoom: this._zoom }
    }

    /**
     * Restores a previously persisted camera state.
     *
     * @param panX - Horizontal pan offset in screen pixels.
     * @param panY - Vertical pan offset in screen pixels.
     * @param zoom - Zoom factor, clamped to [ZOOM_MIN, ZOOM_MAX].
     */
    setCamera(panX: number, panY: number, zoom: number): void {
        this._panX = panX
        this._panY = panY
        this._zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom))
        this._updateStage()
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

        // Kill particles for connections that no longer exist.
        const liveIds = new Set(state.connections.map((c) => c.id))
        for (const [id, circles] of this._particles) {
            if (!liveIds.has(id)) {
                for (const c of circles) c.destroy()
                this._particles.delete(id)
            }
        }

        this.connectionLayer.batchDraw()
        this.nodeLayer.batchDraw()
    }

    /**
     * Spawns animated resource particles for each transfer event from the last tick.
     * Particles travel from the output dot of the source node to the input dot of the
     * target node along the Manhattan route of the connection.
     * Relies on the nodeMap and connMap cached by the preceding render() call.
     *
     * @param events - Transfer events returned by tickConnections.
     */
    spawnParticles(events: TransferEvent[]): void {
        // Reuse the maps built by the preceding render() call on this tick.
        const nodeMap = this._nodeMap
        const connMap = this._connMap

        for (const ev of events) {
            const conn = connMap.get(ev.connectionId)
            if (conn === undefined) continue

            const src = nodeMap.get(conn.fromNodeId)
            const tgt = nodeMap.get(conn.toNodeId)
            if (src === undefined || tgt === undefined) continue

            const [x1, y1] = outputDotPos(src, conn.fromDotIndex)
            const [x2, y2] = inputDotPos(tgt, conn.toDotIndex)
            const waypoints = routeWaypoints(x1, y1, x2, y2)

            const color = RESOURCE_COLORS[ev.resource] ?? "#ffffff"
            const count = Math.min(ev.amount, MAX_PARTICLES_PER_TICK)

            for (let i = 0; i < count; i++) {
                const delay = (i / count) * PARTICLE_DURATION_MS * 0.4
                this._spawnOneParticle(ev.connectionId, waypoints, color, delay)
            }
        }
    }

    /**
     * Animates a single particle along a sequence of waypoints.
     * The particle is destroyed when the animation completes.
     *
     * @param connectionId - Used to register the particle for connection-removal cleanup.
     * @param waypoints - Ordered [x, y] positions the particle traverses.
     * @param color - Fill colour of the particle circle.
     * @param delayMs - Milliseconds to wait before starting.
     */
    private _spawnOneParticle(
        connectionId: string,
        waypoints: [number, number][],
        color: string,
        delayMs: number,
    ): void {
        const [sx, sy] = waypoints[0]!
        const circle = new Konva.Circle({
            x: sx,
            y: sy,
            radius: PARTICLE_RADIUS,
            fill: color,
            opacity: 0.9,
        })
        this.particleLayer.add(circle)

        const list = this._particles.get(connectionId) ?? []
        list.push(circle)
        this._particles.set(connectionId, list)

        const segLengths: number[] = []
        let totalLength = 0
        for (let i = 1; i < waypoints.length; i++) {
            const [ax, ay] = waypoints[i - 1]!
            const [bx, by] = waypoints[i]!
            const len = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)
            segLengths.push(len)
            totalLength += len
        }
        if (totalLength === 0) {
            circle.destroy()
            return
        }

        const segDurations = segLengths.map(
            (l) => (l / totalLength) * (PARTICLE_DURATION_MS / 1000),
        )

        const startSegment = (segIdx: number): void => {
            if (segIdx >= waypoints.length - 1) {
                const arr = this._particles.get(connectionId)
                if (arr !== undefined) {
                    const idx = arr.indexOf(circle)
                    if (idx !== -1) arr.splice(idx, 1)
                }
                circle.destroy()
                this.particleLayer.batchDraw()
                return
            }

            const [ex, ey] = waypoints[segIdx + 1]!
            const dur = segDurations[segIdx] ?? 0.05

            new Konva.Tween({
                node: circle,
                x: ex,
                y: ey,
                duration: Math.max(dur, 0.01),
                easing: Konva.Easings.Linear,
                onFinish: () => startSegment(segIdx + 1),
            }).play()
        }

        if (delayMs > 0) {
            setTimeout(() => {
                if (!circle.isVisible()) return
                startSegment(0)
                this.particleLayer.batchDraw()
            }, delayMs)
        } else {
            startSegment(0)
        }

        this.particleLayer.batchDraw()
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
