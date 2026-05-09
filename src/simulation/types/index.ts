/**
 * Barrel re-export for all simulation types.
 * Existing imports of `./types` or `../simulation/types` resolve here automatically.
 */
export { ResourceType } from "./resources"
export type { RecipeInput, RecipeOutput } from "./resources"

export { NodeType } from "./nodes"
export type {
    NodeStatus,
    Buffer,
    GridSize,
    NodeDef,
    NodeInstance,
} from "./nodes"

export type { Connection, GameState } from "./state"
