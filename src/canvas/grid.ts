/**
 * Grid utilities for the canvas layer.
 * Converts between grid coordinates (col, row) and pixel positions.
 * All canvas rendering uses these helpers to stay grid-aligned.
 */

/** Pixel size of one grid cell. */
export const CELL_SIZE = 64

/** Padding inside a node rectangle. */
export const NODE_PADDING = 6

/** Radius of input/output dots. */
export const DOT_RADIUS = 7

/**
 * Converts a grid coordinate to the pixel position of the cell's top-left corner.
 *
 * @param col - Grid column (0-based)
 * @param row - Grid row (0-based)
 * @returns Pixel { x, y } of the top-left corner
 */
export function gridToPixel(
    col: number,
    row: number,
): { x: number; y: number } {
    return { x: col * CELL_SIZE, y: row * CELL_SIZE }
}

/**
 * Converts a pixel position to the nearest grid cell.
 * Snaps to whole cell, clamped to the valid grid range.
 *
 * @param x - Pixel x
 * @param y - Pixel y
 * @param maxCols - Canvas column count
 * @param maxRows - Canvas row count
 * @returns Grid { col, row }
 */
export function pixelToGrid(
    x: number,
    y: number,
    maxCols: number,
    maxRows: number,
): { col: number; row: number } {
    const col = Math.max(0, Math.min(maxCols - 1, Math.floor(x / CELL_SIZE)))
    const row = Math.max(0, Math.min(maxRows - 1, Math.floor(y / CELL_SIZE)))
    return { col, row }
}

/**
 * Returns the pixel center of a grid cell.
 *
 * @param col - Grid column
 * @param row - Grid row
 * @returns Pixel { x, y } of the cell center
 */
export function cellCenter(col: number, row: number): { x: number; y: number } {
    return {
        x: col * CELL_SIZE + CELL_SIZE / 2,
        y: row * CELL_SIZE + CELL_SIZE / 2,
    }
}

/**
 * Returns the pixel position of an input dot for a given resource slot.
 * Input dots are on the left edge of the node.
 *
 * @param nodeCol - Node top-left column
 * @param nodeRow - Node top-left row
 * @param slotIndex - Dot index (0-based, top to bottom)
 * @param totalSlots - Total number of input dots on this node
 * @param nodeHeightCells - Height of the node in grid cells
 * @returns Pixel { x, y } of the dot center
 */
export function inputDotPosition(
    nodeCol: number,
    nodeRow: number,
    slotIndex: number,
    totalSlots: number,
    nodeHeightCells: number,
): { x: number; y: number } {
    const nodeHeightPx = nodeHeightCells * CELL_SIZE
    const spacing = nodeHeightPx / (totalSlots + 1)
    return {
        x: nodeCol * CELL_SIZE,
        y: nodeRow * CELL_SIZE + spacing * (slotIndex + 1),
    }
}

/**
 * Returns the pixel position of an output dot for a given resource slot.
 * Output dots are on the right edge of the node.
 *
 * @param nodeCol - Node top-left column
 * @param nodeRow - Node top-left row
 * @param nodeWidthCells - Width of the node in grid cells
 * @param nodeHeightCells - Height of the node in grid cells
 * @param slotIndex - Dot index (0-based, top to bottom)
 * @param totalSlots - Total number of output dots on this node
 * @returns Pixel { x, y } of the dot center
 */
export function outputDotPosition(
    nodeCol: number,
    nodeRow: number,
    nodeWidthCells: number,
    nodeHeightCells: number,
    slotIndex: number,
    totalSlots: number,
): { x: number; y: number } {
    const nodeHeightPx = nodeHeightCells * CELL_SIZE
    const spacing = nodeHeightPx / (totalSlots + 1)
    return {
        x: (nodeCol + nodeWidthCells) * CELL_SIZE,
        y: nodeRow * CELL_SIZE + spacing * (slotIndex + 1),
    }
}
