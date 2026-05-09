import { NODE_DEFS } from "../../simulation/recipes"
import type { NodeInstance } from "../../simulation/types"

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
    return [
        colToPx(node.position.col),
        dotY(node.position.row, dotIndex, total, def.gridSize.height),
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
