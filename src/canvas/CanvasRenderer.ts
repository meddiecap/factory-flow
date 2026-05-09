import Konva from "konva"
import { NODE_DEFS } from "../simulation/recipes"
import { NodeType, ResourceType } from "../simulation/types"
import type { GameState, NodeInstance, Connection } from "../simulation/types"
import type { TransferEvent } from "../simulation/connections"
import { effectiveFuelPerTick } from "../simulation/tick"
import { calcNodeSpeedFactors } from "../simulation/energy"

/** Width and height of one grid cell in pixels. */
const CELL_SIZE = 32

/** Number of grid columns and rows in the initial canvas. */
const GRID_COLS = 40
const GRID_ROWS = 24

/** Radius of input/output dots on nodes. */
const DOT_RADIUS = 6

/** Colour of input dots (left side of a node). */
const DOT_INPUT_COLOR = "#60a5fa" // Tailwind blue-400

/** Colour of output dots (right side of a node). */
const DOT_OUTPUT_COLOR = "#4ade80" // Tailwind green-400

/** Colour of energy dots and energy connection lines. */
const ENERGY_DOT_COLOR = "#facc15" // Tailwind yellow-400

/** Background colour of the grid canvas. */
const BACKGROUND_COLOR = "#111827" // Tailwind gray-900

/** Grid line colour. */
const GRID_LINE_COLOR = "#1f2937" // Tailwind gray-800

/** Node fill colour. */
const NODE_FILL_COLOR = "#1e3a5f"

/** Node stroke colour. */
const NODE_STROKE_COLOR = "#3b82f6" // Tailwind blue-500

/** Connection line colour. */
const CONNECTION_COLOR = "#6b7280" // Tailwind gray-500

/**
 * Converts a grid column index to the corresponding pixel x-coordinate (left edge).
 *
 * @param col - Zero-based column index.
 * @returns Pixel x-coordinate of the left edge of the cell.
 */
function colToPx(col: number): number {
    return col * CELL_SIZE
}

/**
 * Converts a grid row index to the corresponding pixel y-coordinate (top edge).
 *
 * @param row - Zero-based row index.
 * @returns Pixel y-coordinate of the top edge of the cell.
 */
function rowToPx(row: number): number {
    return row * CELL_SIZE
}

/**
 * Returns the pixel centre-x of the input dot for a given dot index on a node.
 * Input dots are placed on the left edge of the node, evenly spaced vertically.
 *
 * @param node - The node instance.
 * @param dotIndex - Zero-based index of the input dot.
 * @param heightPx - Total pixel height of the node.
 * @returns x pixel coordinate of the dot centre (left edge of node).
 */
function inputDotX(node: NodeInstance): number {
    return colToPx(node.position.col)
}

/**
 * Returns the pixel y-coordinate of a dot, evenly distributed within the node's height.
 *
 * @param nodeRow - Top row of the node.
 * @param dotIndex - Zero-based dot index.
 * @param total - Total number of dots on that side.
 * @param heightCells - Height of the node in grid cells.
 * @returns Pixel y of the dot centre.
 */
function dotY(
    nodeRow: number,
    dotIndex: number,
    total: number,
    heightCells: number,
): number {
    const nodePxHeight = heightCells * CELL_SIZE
    const step = nodePxHeight / (total + 1)
    return rowToPx(nodeRow) + step * (dotIndex + 1)
}

/**
 * Draws the background and grid lines on the grid layer.
 * Renders a dark background and a regular line grid for cell alignment.
 *
 * @param layer - The Konva layer that holds the grid.
 */
function drawGrid(layer: Konva.Layer): void {
    // Background
    layer.add(
        new Konva.Rect({
            x: 0,
            y: 0,
            width: GRID_COLS * CELL_SIZE,
            height: GRID_ROWS * CELL_SIZE,
            fill: BACKGROUND_COLOR,
        }),
    )

    // Vertical lines
    for (let col = 0; col <= GRID_COLS; col++) {
        layer.add(
            new Konva.Line({
                points: [
                    col * CELL_SIZE,
                    0,
                    col * CELL_SIZE,
                    GRID_ROWS * CELL_SIZE,
                ],
                stroke: GRID_LINE_COLOR,
                strokeWidth: 1,
            }),
        )
    }

    // Horizontal lines
    for (let row = 0; row <= GRID_ROWS; row++) {
        layer.add(
            new Konva.Line({
                points: [
                    0,
                    row * CELL_SIZE,
                    GRID_COLS * CELL_SIZE,
                    row * CELL_SIZE,
                ],
                stroke: GRID_LINE_COLOR,
                strokeWidth: 1,
            }),
        )
    }
}

/** Bar height in pixels for the cycle-progress bar rendered on production nodes. */
const PROGRESS_BAR_HEIGHT = 4

/** Status-to-colour mapping for the progress bar. */
const STATUS_COLORS: Record<string, string> = {
    active: "#22c55e", // green-500
    waiting: "#f97316", // orange-500
    "output-blocked": "#ef4444", // red-500
    idle: "#6b7280", // gray-500
    "no-energy": "#4b5563", // gray-600 – darker grey, no energy
}

/** Visual colours for each resource type, used for particle animations. */
const RESOURCE_COLORS: Record<ResourceType, string> = {
    [ResourceType.IronOre]: "#9ca3af", // gray-400
    [ResourceType.Coal]: "#6b7280", // gray-500
    [ResourceType.Copper]: "#f97316", // orange-500
    [ResourceType.Silicon]: "#a78bfa", // violet-400
    [ResourceType.Fuel]: "#facc15", // yellow-400
    [ResourceType.Steel]: "#64748b", // slate-500
    [ResourceType.Cables]: "#f59e0b", // amber-500
    [ResourceType.HullParts]: "#60a5fa", // blue-400
    [ResourceType.FuelTanks]: "#4ade80", // green-400
    [ResourceType.Circuits]: "#34d399", // emerald-400
    [ResourceType.ControlSystem]: "#818cf8", // indigo-400
    [ResourceType.Thrusters]: "#fb923c", // orange-400
    [ResourceType.Rocket]: "#f43f5e", // rose-500
}

/** Maximum particles spawned per connection per tick (caps visual load). */
const MAX_PARTICLES_PER_TICK = 5

/** Particle animation duration in milliseconds. */
const PARTICLE_DURATION_MS = 500

/** Radius of animated resource particles in pixels. */
const PARTICLE_RADIUS = 4

/**
 * Returns a compact upgrade-level string for a node, or null when no upgrades
 * are relevant for this node type (Splitter).
 * Format matches the table in improvement 4 of improvements-v1.md.
 *
 * @param node - The node instance to summarize.
 */
function _upgradeText(node: NodeInstance): string | null {
    const s = node.speedUpgradeLevel
    const b = node.bufferUpgradeLevel
    const e = node.energyEfficiencyUpgradeLevel

    switch (node.type) {
        case NodeType.Splitter:
            return null
        case NodeType.Warehouse:
            return `— / ${b} / —`
        case NodeType.Market:
            return `${node.salesPoints ?? 1} / — / —`
        case NodeType.EnergySupply:
            return `⚡ Lv${node.energyOutputUpgradeLevel}`
        default:
            return `${s} / ${b} / ${e}`
    }
}
/**
 * Draws a single node as a rectangle with label, input/output dots and a status bar.
 * Production nodes show a cycle-progress bar; Splitter shows its ratio; Warehouse
 * shows its buffer fill fraction. EnergySupply receives a dynamic output dot count.
 *
 * @param layer - The Konva layer to draw onto.
 * @param node - Runtime node instance with position data.
 * @param energyOutputCount - For EnergySupply: number of existing energy connections
 *   (the total dots rendered = energyOutputCount + 1 free). Ignored for other types.
 */
function drawNode(
    layer: Konva.Layer,
    node: NodeInstance,
    energyOutputCount = 0,
    speedFactor = 1.0,
): void {
    const def = NODE_DEFS[node.type]
    const x = colToPx(node.position.col)
    const y = rowToPx(node.position.row)
    const w = def.gridSize.width * CELL_SIZE
    const h = def.gridSize.height * CELL_SIZE

    // Node body
    layer.add(
        new Konva.Rect({
            x,
            y,
            width: w,
            height: h,
            fill: NODE_FILL_COLOR,
            stroke: NODE_STROKE_COLOR,
            strokeWidth: 2,
            cornerRadius: 4,
        }),
    )

    // Node label
    layer.add(
        new Konva.Text({
            x: x + 4,
            y: y + 4,
            width: w - 8,
            text: def.displayName,
            fontSize: 11,
            fontFamily: "monospace",
            fill: "#e5e7eb",
            align: "center",
        }),
    )

    // Energy Supply stats – output rate and connected factory count.
    if (node.type === NodeType.EnergySupply) {
        const effectiveOutput =
            (def.energyOutputPerTick ?? 1) + node.energyOutputUpgradeLevel
        layer.add(
            new Konva.Text({
                x: x + 4,
                y: y + 19,
                width: w - 8,
                text: `⚡ ${effectiveOutput.toFixed(1)} /tick`,
                fontSize: 9,
                fontFamily: "monospace",
                fill: ENERGY_DOT_COLOR,
                align: "center",
            }),
        )
        layer.add(
            new Konva.Text({
                x: x + 4,
                y: y + 30,
                width: w - 8,
                text: `→ ${energyOutputCount} connected`,
                fontSize: 9,
                fontFamily: "monospace",
                fill: "#9ca3af",
                align: "center",
            }),
        )
    }

    // Energy consumption label (below node title, yellow) – production factories only.
    if (def.hasEnergyInput) {
        const fuelVal = effectiveFuelPerTick(
            def.fuelPerTick,
            node.energyEfficiencyUpgradeLevel,
        )
        layer.add(
            new Konva.Text({
                x: x + 4,
                y: y + 19,
                width: w - 8,
                text: `⚡ ${fuelVal.toFixed(2)} /tick`,
                fontSize: 9,
                fontFamily: "monospace",
                fill: ENERGY_DOT_COLOR,
                align: "center",
            }),
        )

        // Speed percentage and production rate.
        const speedPct = Math.round(speedFactor * 100)
        const speedMultiplier = 1.5 ** node.speedUpgradeLevel
        const primaryOutput = def.outputs[0]
        const ratePerSec = primaryOutput
            ? ((primaryOutput.amount * speedFactor * speedMultiplier) /
                  def.cycleDuration) *
              20
            : 0
        const statsColor =
            speedFactor === 0
                ? "#f87171"
                : speedFactor < 1
                  ? "#fbbf24"
                  : "#9ca3af"
        layer.add(
            new Konva.Text({
                x: x + 4,
                y: y + 30,
                width: w - 8,
                text: `${speedPct}% · ${ratePerSec.toFixed(2)}/s`,
                fontSize: 9,
                fontFamily: "monospace",
                fill: statsColor,
                align: "center",
            }),
        )
    }

    // Upgrade level display (bottom-left, small monospace text)
    const upgradeText = _upgradeText(node)
    if (upgradeText !== null) {
        layer.add(
            new Konva.Text({
                x: x + 4,
                y: y + h - 16,
                width: w - 8,
                text: upgradeText,
                fontSize: 9,
                fontFamily: "monospace",
                fill: "#9ca3af",
                align: "center",
            }),
        )
    }

    // Input dots (left edge)
    // Use node.inputBuffers.length (not def.inputs.length) so that dynamic inputs
    // such as Market sales-point upgrades are reflected in the rendered dot count.
    const inputCount = node.inputBuffers.length
    // When the node has an energy input dot, include it in the spacing calculation
    // so all dots (recipe + energy) are evenly distributed in the node height.
    const totalInputDots = def.hasEnergyInput ? inputCount + 1 : inputCount

    for (let i = 0; i < inputCount; i++) {
        layer.add(
            new Konva.Circle({
                x: x,
                y: dotY(
                    node.position.row,
                    i,
                    totalInputDots,
                    def.gridSize.height,
                ),
                radius: DOT_RADIUS,
                fill: DOT_INPUT_COLOR,
                stroke: "#1e40af",
                strokeWidth: 1,
            }),
        )
    }

    // Energy input dot (left edge, yellow) – production factories only.
    if (def.hasEnergyInput) {
        layer.add(
            new Konva.Circle({
                x: x,
                y: dotY(
                    node.position.row,
                    inputCount,
                    totalInputDots,
                    def.gridSize.height,
                ),
                radius: DOT_RADIUS,
                fill: ENERGY_DOT_COLOR,
                stroke: "#b45309",
                strokeWidth: 1,
            }),
        )
    }

    // Output dots (right edge)
    if (node.type === NodeType.EnergySupply) {
        // EnergySupply: dynamic output dots (yellow). Always show N connected + 1 free.
        const totalEnergyDots = energyOutputCount + 1
        for (let i = 0; i < totalEnergyDots; i++) {
            layer.add(
                new Konva.Circle({
                    x: x + w,
                    y: dotY(
                        node.position.row,
                        i,
                        totalEnergyDots,
                        def.gridSize.height,
                    ),
                    radius: DOT_RADIUS,
                    fill: ENERGY_DOT_COLOR,
                    stroke: "#b45309",
                    strokeWidth: 1,
                }),
            )
        }
    } else {
        const outputCount = def.outputs.length
        for (let i = 0; i < outputCount; i++) {
            layer.add(
                new Konva.Circle({
                    x: x + w,
                    y: dotY(
                        node.position.row,
                        i,
                        outputCount,
                        def.gridSize.height,
                    ),
                    radius: DOT_RADIUS,
                    fill: DOT_OUTPUT_COLOR,
                    stroke: "#166534",
                    strokeWidth: 1,
                }),
            )
        }
    }

    // ---- Status indicator (bottom of node body) ----
    const MARGIN = 4
    const barW = w - MARGIN * 2
    const barX = x + MARGIN
    const barY = y + h - MARGIN - PROGRESS_BAR_HEIGHT

    if (node.type === NodeType.Splitter) {
        // Show split ratio as "XX / YY" text
        const ratioA = node.splitterRatioA ?? 0.5
        const pctA = Math.round(ratioA * 100)
        const pctB = 100 - pctA
        layer.add(
            new Konva.Text({
                x: barX,
                y: barY - 2,
                width: barW,
                text: `${pctA} / ${pctB}`,
                fontSize: 9,
                fontFamily: "monospace",
                fill: "#9ca3af",
                align: "center",
            }),
        )
    } else if (node.type === NodeType.Warehouse) {
        // Show buffer fill bar
        const buf = node.inputBuffers[0]
        if (buf !== undefined && buf.capacity > 0) {
            const fill = Math.min(buf.amount / buf.capacity, 1)
            // Background track
            layer.add(
                new Konva.Rect({
                    x: barX,
                    y: barY,
                    width: barW,
                    height: PROGRESS_BAR_HEIGHT,
                    fill: "#374151",
                    cornerRadius: 2,
                }),
            )
            // Fill
            if (fill > 0) {
                layer.add(
                    new Konva.Rect({
                        x: barX,
                        y: barY,
                        width: Math.round(barW * fill),
                        height: PROGRESS_BAR_HEIGHT,
                        fill: "#60a5fa",
                        cornerRadius: 2,
                    }),
                )
            }
        }
    } else if (def.cycleDuration > 0) {
        // Show cycle progress bar
        const fill = Math.min(node.progress / def.cycleDuration, 1)
        const color = STATUS_COLORS[node.status] ?? STATUS_COLORS["idle"]!
        // Background track
        layer.add(
            new Konva.Rect({
                x: barX,
                y: barY,
                width: barW,
                height: PROGRESS_BAR_HEIGHT,
                fill: "#374151",
                cornerRadius: 2,
            }),
        )
        // Fill
        if (fill > 0) {
            layer.add(
                new Konva.Rect({
                    x: barX,
                    y: barY,
                    width: Math.round(barW * fill),
                    height: PROGRESS_BAR_HEIGHT,
                    fill: color,
                    cornerRadius: 2,
                }),
            )
        }
    }
}

/**
 * Returns the pixel [x, y] of an output dot for a given node and dot index.
 * Used to compute connection start points.
 *
 * @param node - Source node instance.
 * @param dotIndex - Zero-based output dot index.
 * @returns [x, y] pixel coordinates.
 */
function outputDotPos(node: NodeInstance, dotIndex: number): [number, number] {
    const def = NODE_DEFS[node.type]
    const x = colToPx(node.position.col) + def.gridSize.width * CELL_SIZE
    const total = def.outputs.length
    const y = dotY(node.position.row, dotIndex, total, def.gridSize.height)
    return [x, y]
}

/**
 * Returns the pixel [x, y] of an energy output dot on an EnergySupply for a
 * specific connection, given the total number of energy output dots shown.
 *
 * @param node - The EnergySupply node.
 * @param dotIndex - Zero-based energy output dot index.
 * @param totalEnergyDots - Total number of energy dots rendered (connected + 1 free).
 * @returns [x, y] pixel coordinates.
 */
function energyOutputDotPos(
    node: NodeInstance,
    dotIndex: number,
    totalEnergyDots: number,
): [number, number] {
    const def = NODE_DEFS[node.type]
    const x = colToPx(node.position.col) + def.gridSize.width * CELL_SIZE
    const y = dotY(
        node.position.row,
        dotIndex,
        totalEnergyDots,
        def.gridSize.height,
    )
    return [x, y]
}

/**
 * Returns the pixel [x, y] of an input dot for a given node and dot index.
 * When the node has an energy input dot, the total is increased by 1 so recipe
 * input dots and the energy dot are evenly spaced within the node height.
 *
 * @param node - Target node instance.
 * @param dotIndex - Zero-based input dot index.
 * @returns [x, y] pixel coordinates.
 */
function inputDotPos(node: NodeInstance, dotIndex: number): [number, number] {
    const def = NODE_DEFS[node.type]
    const total = def.hasEnergyInput
        ? node.inputBuffers.length + 1
        : node.inputBuffers.length
    const x = colToPx(node.position.col)
    const y = dotY(node.position.row, dotIndex, total, def.gridSize.height)
    return [x, y]
}

/**
 * Draws a Manhattan-routed polyline between two pixel positions.
 * The route goes: source → midpoint-x column → target. No diagonals.
 *
 * @param layer - The Konva layer to draw onto.
 * @param x1 - Start x.
 * @param y1 - Start y.
 * @param x2 - End x.
 * @param y2 - End y.
 * @param color - Stroke colour (defaults to the standard connection grey).
 */
function drawManhattanLine(
    layer: Konva.Layer,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string = CONNECTION_COLOR,
): void {
    const midX = x1 + (x2 - x1) / 2
    layer.add(
        new Konva.Line({
            points: [x1, y1, midX, y1, midX, y2, x2, y2],
            stroke: color,
            strokeWidth: 2,
            lineJoin: "round",
        }),
    )
}

/**
 * Draws all connections between nodes as Manhattan-routed polylines.
 * Energy connections are drawn in yellow; resource connections in grey.
 *
 * @param layer - The Konva layer to draw onto.
 * @param connections - All active connections in the game state.
 * @param nodeMap - Map of node id → NodeInstance for fast lookup.
 */
function drawConnections(
    layer: Konva.Layer,
    connections: Connection[],
    nodeMap: Map<string, NodeInstance>,
): void {
    for (const conn of connections) {
        const src = nodeMap.get(conn.fromNodeId)
        const tgt = nodeMap.get(conn.toNodeId)
        if (src === undefined || tgt === undefined) continue

        let x1: number, y1: number, x2: number, y2: number

        if (conn.isEnergy) {
            // EnergySupply output: dynamic dot count = connected energy outputs + 1 free.
            const energyCount = connections.filter(
                (c) => c.isEnergy && c.fromNodeId === src.id,
            ).length
            const totalDots = energyCount + 1
            ;[x1, y1] = energyOutputDotPos(src, conn.fromDotIndex, totalDots)
            ;[x2, y2] = inputDotPos(tgt, NODE_DEFS[tgt.type].inputs.length)
        } else {
            ;[x1, y1] = outputDotPos(src, conn.fromDotIndex)
            ;[x2, y2] = inputDotPos(tgt, conn.toDotIndex)
        }

        const color = conn.isEnergy ? ENERGY_DOT_COLOR : CONNECTION_COLOR
        drawManhattanLine(layer, x1, y1, x2, y2, color)
    }
}

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
     * Clears and redraws both layers on every call; suitable for the current phase
     * where the state is small and full redraws are cheap.
     * Active particles are NOT destroyed on re-render; they finish their animation.
     *
     * @param state - The game state snapshot to render.
     */
    render(state: GameState): void {
        this.connectionLayer.destroyChildren()
        this.nodeLayer.destroyChildren()

        const nodeMap = new Map<string, NodeInstance>()
        for (const node of state.nodes) {
            nodeMap.set(node.id, node)
        }

        drawConnections(this.connectionLayer, state.connections, nodeMap)

        const speedFactors = calcNodeSpeedFactors(
            state.nodes,
            state.connections,
            NODE_DEFS,
        )

        for (const node of state.nodes) {
            // For EnergySupply: count how many energy connections it currently has.
            const energyOutputCount =
                node.type === NodeType.EnergySupply
                    ? state.connections.filter(
                          (c) => c.isEnergy && c.fromNodeId === node.id,
                      ).length
                    : 0
            const speedFactor = speedFactors.get(node.id) ?? 1.0
            drawNode(this.nodeLayer, node, energyOutputCount, speedFactor)
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
     * Called once per tick after the simulation step.
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

            // Manhattan waypoints: start → mid-x at start-y → mid-x at end-y → end
            const waypoints: [number, number][] = [
                [x1, y1],
                [midX, y1],
                [midX, y2],
                [x2, y2],
            ]

            const color = RESOURCE_COLORS[ev.resource] ?? "#ffffff"
            const count = Math.min(ev.amount, MAX_PARTICLES_PER_TICK)

            for (let i = 0; i < count; i++) {
                // Stagger start slightly so multiple particles don't overlap.
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
     * @param delayMs - Milliseconds to wait before starting. Zero or positive.
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

        // Register for cleanup on connection removal.
        const list = this._particles.get(connectionId) ?? []
        list.push(circle)
        this._particles.set(connectionId, list)

        // Compute segment lengths to distribute time proportionally.
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

        // Build a tween per segment, chained via onFinish.
        const segDurations = segLengths.map(
            (l) => (l / totalLength) * (PARTICLE_DURATION_MS / 1000),
        )

        const startSegment = (segIdx: number): void => {
            if (segIdx >= waypoints.length - 1) {
                // Animation complete — remove from tracking and destroy.
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
                // Guard against the circle already being destroyed (connection removed).
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

// Re-export constants so Vue components can size the canvas container.
export { GRID_COLS, GRID_ROWS, CELL_SIZE, inputDotX }
