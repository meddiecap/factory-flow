import { NODE_DEFS } from "../../simulation/recipes"
import type { NodeInstance } from "../../simulation/types"
import { colToPx, dotY } from "../shared/geometry"

export {
    colToPx,
    rowToPx,
    dotY,
    outputDotPos,
    energyOutputDotPos,
    inputDotPos,
} from "../shared/geometry"

/**
 * Returns the pixel [x, y] of the energy input dot on a production factory.
 * The energy dot is placed after all recipe input dots in the vertical spacing.
 *
 * @param node - The production node with hasEnergyInput = true.
 * @returns [x, y] pixel coordinates.
 */
export function energyInputDotPos(node: NodeInstance): [number, number] {
    const def = NODE_DEFS[node.type]
    const total = node.inputBuffers.length + 1 // recipe inputs + energy
    return [
        colToPx(node.position.col),
        dotY(
            node.position.row,
            node.inputBuffers.length,
            total,
            def.gridSize.height,
        ),
    ]
}
