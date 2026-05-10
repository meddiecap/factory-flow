import Konva from "konva"
import type { NodeInstance, Connection } from "../../simulation/types"
import type { TransferEvent } from "../../simulation/connections"
import { outputDotPos, inputDotPos, routeWaypoints } from "../shared/geometry"
import {
    RESOURCE_COLORS,
    MAX_PARTICLES_PER_TICK,
    PARTICLE_DURATION_MS,
    PARTICLE_RADIUS,
} from "./constants"

/**
 * Manages animated resource particles on the particle layer.
 * Spawns, animates and cleans up particles driven by tick transfer events.
 */
export class ParticleManager {
    private _layer: Konva.Layer
    private _particles = new Map<string, Konva.Circle[]>()

    /**
     * Creates a ParticleManager that renders onto the given Konva layer.
     *
     * @param layer - Konva Layer dedicated to particle rendering.
     */
    constructor(layer: Konva.Layer) {
        this._layer = layer
    }

    /**
     * Destroys particles for connections that no longer exist.
     * Called from render() after the live connection set is refreshed.
     *
     * @param liveIds - Set of connection IDs that are still active.
     */
    pruneStale(liveIds: Set<string>): void {
        for (const [id, circles] of this._particles) {
            if (!liveIds.has(id)) {
                for (const c of circles) c.destroy()
                this._particles.delete(id)
            }
        }
    }

    /**
     * Spawns animated resource particles for each transfer event from the last tick.
     * Particles travel from the output dot of the source to the input dot of the target.
     *
     * @param events - Transfer events returned by tickConnections.
     * @param nodeMap - Map from node ID to NodeInstance for fast lookup.
     * @param connMap - Map from connection ID to Connection for fast lookup.
     */
    spawnParticles(
        events: TransferEvent[],
        nodeMap: Map<string, NodeInstance>,
        connMap: Map<string, Connection>,
    ): void {
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
                this._spawnOne(ev.connectionId, waypoints, color, delay)
            }
        }
    }

    /**
     * Animates a single particle along a sequence of waypoints.
     * Destroys the particle and removes it from the registry when the animation ends.
     *
     * @param connectionId - Used to register the particle for cleanup on connection removal.
     * @param waypoints - Ordered [x, y] positions the particle traverses.
     * @param color - Fill colour of the particle circle.
     * @param delayMs - Milliseconds to wait before starting.
     */
    private _spawnOne(
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
        this._layer.add(circle)

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
                this._layer.batchDraw()
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
                this._layer.batchDraw()
            }, delayMs)
        } else {
            startSegment(0)
        }

        this._layer.batchDraw()
    }
}
