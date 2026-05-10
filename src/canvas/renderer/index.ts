import Konva from "konva"
import type {
    GameState,
    NodeInstance,
    Connection,
} from "../../simulation/types"
import { NodeType } from "../../simulation/types"
import type { TransferEvent } from "../../simulation/connections"
import { calcNodeSpeedFactors } from "../../simulation/energy"
import { calcMarketSlotRevenues } from "../../simulation/throughput"
import { NODE_DEFS } from "../../simulation/recipes"
import { outputDotPos, inputDotPos, CELL_SIZE } from "../shared/geometry"
import {
    GRID_COLS,
    GRID_ROWS,
    RESOURCE_COLORS,
    MAX_PARTICLES_PER_TICK,
    PARTICLE_DURATION_MS,
    PARTICLE_RADIUS,
} from "./constants"
import { drawGrid } from "./grid"
import { drawNode } from "./nodes"
import { drawConnections } from "./connections"

export { GRID_COLS, GRID_ROWS, CELL_SIZE }
export { inputDotX } from "../shared/geometry"

/**
 * Manages a Konva Stage and renders a static snapshot of GameState onto it.
 * Designed to be called after any state change to refresh the visual representation.
 * Separates canvas rendering concerns from Vue reactivity and simulation logic.
 */
export class CanvasRenderer {
    private stage: Konva.Stage
    private gridLayer: Konva.Layer
    private connectionLayer: Konva.Layer
    private nodeLayer: Konva.Layer
    private particleLayer: Konva.Layer

    /**
     * Map from connectionId → array of active Konva.Circle particles.
     * Used to destroy particles immediately when their connection is removed.
     */
    private _particles = new Map<string, Konva.Circle[]>()

    /**
     * Creates a new CanvasRenderer and attaches a Konva Stage to the given container.
     * Sets up four rendering layers: grid, connections, nodes, and particles.
     *
     * @param containerId - The `id` of the HTML element to mount the Konva stage inside.
     */
    constructor(containerId: string) {
        this.stage = new Konva.Stage({
            container: containerId,
            width: GRID_COLS * CELL_SIZE,
            height: GRID_ROWS * CELL_SIZE,
        })

        this.gridLayer = new Konva.Layer()
        this.connectionLayer = new Konva.Layer()
        this.nodeLayer = new Konva.Layer()
        this.particleLayer = new Konva.Layer()

        this.stage.add(this.gridLayer)
        this.stage.add(this.connectionLayer)
        this.stage.add(this.nodeLayer)
        this.stage.add(this.particleLayer)

        drawGrid(this.gridLayer)
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

        // Pre-build energyOutputCounts once so neither drawConnections nor the
        // node loop has to filter all connections per node (O(n) instead of O(n²)).
        const energyOutputCounts = new Map<string, number>()
        for (const c of state.connections) {
            if (!c.isEnergy) continue
            energyOutputCounts.set(
                c.fromNodeId,
                (energyOutputCounts.get(c.fromNodeId) ?? 0) + 1,
            )
        }

        drawConnections(
            this.connectionLayer,
            state.connections,
            nodeMap,
            energyOutputCounts,
        )

        const speedFactors = calcNodeSpeedFactors(
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
     *
     * @param events - Transfer events returned by tickConnections.
     * @param state - Current game state (used for node/connection lookup).
     */
    spawnParticles(events: TransferEvent[], state: GameState): void {
        const nodeMap = new Map<string, NodeInstance>()
        for (const node of state.nodes) nodeMap.set(node.id, node)

        const connMap = new Map<string, Connection>()
        for (const conn of state.connections) connMap.set(conn.id, conn)

        for (const ev of events) {
            const conn = connMap.get(ev.connectionId)
            if (conn === undefined) continue

            const src = nodeMap.get(conn.fromNodeId)
            const tgt = nodeMap.get(conn.toNodeId)
            if (src === undefined || tgt === undefined) continue

            const [x1, y1] = outputDotPos(src, conn.fromDotIndex)
            const [x2, y2] = inputDotPos(tgt, conn.toDotIndex)
            const midX = x1 + (x2 - x1) / 2

            const waypoints: [number, number][] = [
                [x1, y1],
                [midX, y1],
                [midX, y2],
                [x2, y2],
            ]

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
     * Should be called when the Vue component is unmounted.
     */
    destroy(): void {
        this.stage.destroy()
    }
}
