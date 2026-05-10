import { ResourceType } from "../../simulation/types"

/** Radius of input/output dots on nodes in pixels. */
export const DOT_RADIUS = 6

/** Colour of input dots (left side of a node). */
export const DOT_INPUT_COLOR = "#60a5fa" // Tailwind blue-400

/** Colour of output dots (right side of a node). */
export const DOT_OUTPUT_COLOR = "#4ade80" // Tailwind green-400

/** Colour of energy dots and energy connection lines. */
export const ENERGY_DOT_COLOR = "#facc15" // Tailwind yellow-400

/** Background colour of the grid canvas. */
export const BACKGROUND_COLOR = "#111827" // Tailwind gray-900

/** Grid line colour. */
export const GRID_LINE_COLOR = "#1f2937" // Tailwind gray-800

/** Node fill colour. */
export const NODE_FILL_COLOR = "#1e3a5f"

/** Node stroke colour. */
export const NODE_STROKE_COLOR = "#3b82f6" // Tailwind blue-500

/** Connection line colour. */
export const CONNECTION_COLOR = "#6b7280" // Tailwind gray-500

/** Bar height in pixels for cycle-progress bars on production nodes. */
export const PROGRESS_BAR_HEIGHT = 4

/** Status-to-colour mapping for the progress bar fill. */
export const STATUS_COLORS: Record<string, string> = {
    active: "#22c55e", // green-500
    waiting: "#f97316", // orange-500
    "output-blocked": "#ef4444", // red-500
    idle: "#6b7280", // gray-500
    "no-energy": "#4b5563", // gray-600
}

/** Maximum particles spawned per connection per tick (caps visual load). */
export const MAX_PARTICLES_PER_TICK = 5

/** Particle animation duration in milliseconds. */
export const PARTICLE_DURATION_MS = 500

/** Radius of animated resource particles in pixels. */
export const PARTICLE_RADIUS = 4

/** Visual colours for each resource type, used for particle animations. */
export const RESOURCE_COLORS: Record<ResourceType, string> = {
    [ResourceType.IronOre]: "#9ca3af",
    [ResourceType.Coal]: "#6b7280",
    [ResourceType.Copper]: "#f97316",
    [ResourceType.Silicon]: "#a78bfa",
    [ResourceType.Fuel]: "#facc15",
    [ResourceType.Steel]: "#64748b",
    [ResourceType.Cables]: "#f59e0b",
    [ResourceType.HullParts]: "#60a5fa",
    [ResourceType.FuelTanks]: "#4ade80",
    [ResourceType.Circuits]: "#34d399",
    [ResourceType.ControlSystem]: "#818cf8",
    [ResourceType.Thrusters]: "#fb923c",
    [ResourceType.Rocket]: "#f43f5e",
}
