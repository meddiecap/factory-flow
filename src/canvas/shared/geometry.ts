import { NODE_DEFS } from "../../simulation/recipes"
import { NodeType } from "../../simulation/types"
import type { NodeInstance } from "../../simulation/types"

/** Minimum pixel height per input slot when a Market node shows per-slot revenue labels. */
export const MARKET_SLOT_ROW_HEIGHT = 20

/**
 * Returns the actual rendered pixel height for a node.
 * Market nodes grow vertically to fit per-slot revenue labels when they have multiple sales points.
 * All other node types return their static grid height.
 *
 * @param node - Node instance to measure.
 * @returns Rendered pixel height.
 */
export function nodeRenderedHeight(node: NodeInstance): number {
    const def = NODE_DEFS[node.type]
    const base = def.gridSize.height * CELL_SIZE
    if (node.type !== NodeType.Market) return base
    return Math.max(
        base,
        40 + node.inputBuffers.length * MARKET_SLOT_ROW_HEIGHT,
    )
}

/** Width and height of one grid cell in pixels. Shared by renderer and interaction. */
export const CELL_SIZE = 32

/**
 * Converts a grid column index to the left-edge pixel x-coordinate.
 * @param col - Zero-based column index.
 * @returns Pixel x-coordinate.
 */
export function colToPx(col: number): number {
    return col * CELL_SIZE
}

/**
 * Converts a grid row index to the top-edge pixel y-coordinate.
 * @param row - Zero-based row index.
 * @returns Pixel y-coordinate.
 */
export function rowToPx(row: number): number {
    return row * CELL_SIZE
}

/**
 * Returns the pixel y-coordinate of a dot, evenly distributed within the node's height.
 * @param nodeRow - Top row of the node.
 * @param dotIndex - Zero-based dot index.
 * @param total - Total number of dots on that side.
 * @param heightCells - Height of the node in grid cells.
 * @returns Pixel y of the dot centre.
 */
export function dotY(
    nodeRow: number,
    dotIndex: number,
    total: number,
    heightCells: number,
): number {
    const h = heightCells * CELL_SIZE
    return rowToPx(nodeRow) + (h / (total + 1)) * (dotIndex + 1)
}

/**
 * Returns the pixel [x, y] of an output dot for a given node and dot index.
 * @param node - Source node instance.
 * @param dotIndex - Zero-based output dot index.
 * @returns [x, y] pixel coordinates.
 */
export function outputDotPos(
    node: NodeInstance,
    dotIndex: number,
): [number, number] {
    const def = NODE_DEFS[node.type]
    return [
        colToPx(node.position.col) + def.gridSize.width * CELL_SIZE,
        dotY(
            node.position.row,
            dotIndex,
            def.outputs.length,
            def.gridSize.height,
        ),
    ]
}

/**
 * Returns the pixel [x, y] of an energy output dot on an EnergySupply.
 * @param node - The EnergySupply node.
 * @param dotIndex - Zero-based energy output dot index.
 * @param totalDots - Total number of energy dots rendered (connected + 1 free).
 * @returns [x, y] pixel coordinates.
 */
export function energyOutputDotPos(
    node: NodeInstance,
    dotIndex: number,
    totalDots: number,
): [number, number] {
    const def = NODE_DEFS[node.type]
    return [
        colToPx(node.position.col) + def.gridSize.width * CELL_SIZE,
        dotY(node.position.row, dotIndex, totalDots, def.gridSize.height),
    ]
}

/**
 * Returns the pixel [x, y] of an input dot for a given node and dot index.
 * When the node has an energy input dot, total is increased by 1 for even spacing.
 * @param node - Target node instance.
 * @param dotIndex - Zero-based input dot index.
 * @returns [x, y] pixel coordinates.
 */
export function inputDotPos(
    node: NodeInstance,
    dotIndex: number,
): [number, number] {
    const def = NODE_DEFS[node.type]
    const total = def.hasEnergyInput
        ? node.inputBuffers.length + 1
        : node.inputBuffers.length
    const hPx = nodeRenderedHeight(node)
    return [
        colToPx(node.position.col),
        rowToPx(node.position.row) + (hPx / (total + 1)) * (dotIndex + 1),
    ]
}

/**
 * Returns the pixel x-coordinate of the left edge (input side) of a node.
 * @param node - The node instance.
 * @returns Pixel x of the left edge.
 */
export function inputDotX(node: NodeInstance): number {
    return colToPx(node.position.col)
}

/** Pixel offset used when routing a backwards connection around node bodies. */
const ROUTE_OFFSET = CELL_SIZE

/**
 * Computes the ordered waypoints for a Manhattan-routed connection between two pixel positions.
 * Forward connections (x2 >= x1) use a 3-segment route through the horizontal midpoint.
 * Backward connections (x2 < x1) use a 6-segment S-route: exit right, bend at vertical midpoint,
 * enter the input dot from the left.
 * Used by both the line renderer and the particle animation system.
 *
 * @param x1 - Start x (output dot).
 * @param y1 - Start y.
 * @param x2 - End x (input dot).
 * @param y2 - End y.
 * @returns Ordered [x, y] waypoints the route passes through.
 */
export function routeWaypoints(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
): [number, number][] {
    if (x2 >= x1) {
        const midX = x1 + (x2 - x1) / 2
        return [
            [x1, y1],
            [midX, y1],
            [midX, y2],
            [x2, y2],
        ]
    } else {
        const exitX = x1 + ROUTE_OFFSET
        const entryX = x2 - ROUTE_OFFSET
        const midY = (y1 + y2) / 2
        return [
            [x1, y1],
            [exitX, y1],
            [exitX, midY],
            [entryX, midY],
            [entryX, y2],
            [x2, y2],
        ]
    }
}
