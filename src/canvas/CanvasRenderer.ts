import Konva from "konva"
import { NODE_DEFS } from "../simulation/recipes"
import { NodeType } from "../simulation/types"
import type { GameState, NodeInstance, Connection } from "../simulation/types"

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
    active: "#22c55e",       // green-500
    waiting: "#f97316",      // orange-500
    "output-blocked": "#ef4444", // red-500
    idle: "#6b7280",         // gray-500
}

/**
 * Draws a single node as a rectangle with label, input/output dots and a status bar.
 * Production nodes show a cycle-progress bar; Splitter shows its ratio; Warehouse
 * shows its buffer fill fraction.
 *
 * @param layer - The Konva layer to draw onto.
 * @param node - Runtime node instance with position data.
 */
function drawNode(layer: Konva.Layer, node: NodeInstance): void {
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

    // Input dots (left edge, blue)
    const inputCount = def.inputs.length
    for (let i = 0; i < inputCount; i++) {
        layer.add(
            new Konva.Circle({
                x: x,
                y: dotY(node.position.row, i, inputCount, def.gridSize.height),
                radius: DOT_RADIUS,
                fill: DOT_INPUT_COLOR,
                stroke: "#1e40af",
                strokeWidth: 1,
            }),
        )
    }

    // Output dots (right edge, green)
    const outputCount = def.outputs.length
    for (let i = 0; i < outputCount; i++) {
        layer.add(
            new Konva.Circle({
                x: x + w,
                y: dotY(node.position.row, i, outputCount, def.gridSize.height),
                radius: DOT_RADIUS,
                fill: DOT_OUTPUT_COLOR,
                stroke: "#166534",
                strokeWidth: 1,
            }),
        )
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
 * Returns the pixel [x, y] of an input dot for a given node and dot index.
 * Used to compute connection end points.
 *
 * @param node - Target node instance.
 * @param dotIndex - Zero-based input dot index.
 * @returns [x, y] pixel coordinates.
 */
function inputDotPos(node: NodeInstance, dotIndex: number): [number, number] {
    const def = NODE_DEFS[node.type]
    const x = colToPx(node.position.col)
    const total = def.inputs.length
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
 */
function drawManhattanLine(
    layer: Konva.Layer,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
): void {
    const midX = x1 + (x2 - x1) / 2
    layer.add(
        new Konva.Line({
            points: [x1, y1, midX, y1, midX, y2, x2, y2],
            stroke: CONNECTION_COLOR,
            strokeWidth: 2,
            lineJoin: "round",
        }),
    )
}

/**
 * Draws all connections between nodes as Manhattan-routed polylines.
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

        const [x1, y1] = outputDotPos(src, conn.fromDotIndex)
        const [x2, y2] = inputDotPos(tgt, conn.toDotIndex)
        drawManhattanLine(layer, x1, y1, x2, y2)
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

    /**
     * Creates a new CanvasRenderer and attaches a Konva Stage to the given container.
     * Sets up three rendering layers: grid, connections and nodes.
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

        this.stage.add(this.gridLayer)
        this.stage.add(this.connectionLayer)
        this.stage.add(this.nodeLayer)

        drawGrid(this.gridLayer)
    }

    /**
     * Re-renders the connection and node layers from the current game state.
     * Clears and redraws both layers on every call; suitable for the current phase
     * where the state is small and full redraws are cheap.
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

        for (const node of state.nodes) {
            drawNode(this.nodeLayer, node)
        }

        this.connectionLayer.batchDraw()
        this.nodeLayer.batchDraw()
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
