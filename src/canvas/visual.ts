/**
 * Visual constants and helpers for canvas rendering.
 * Defines colours for resources, factory categories, and connection states.
 */

import type { ResourceId, FactoryType } from "../simulation/types"

// ---------------------------------------------------------------------------
// Resource colours (used for dots and connection lines)
// ---------------------------------------------------------------------------

export const RESOURCE_COLORS: Record<ResourceId, string> = {
    "iron-ore": "#b0784a",
    coal: "#555566",
    copper: "#d4733a",
    silicon: "#a0c0e0",
    fuel: "#f5c842",
    steel: "#8899aa",
    cables: "#e07030",
    "hull-parts": "#607090",
    "fuel-tanks": "#5090a0",
    circuits: "#50c060",
    "control-system": "#8060d0",
    thrusters: "#d04040",
    rocket: "#ffffff",
}

// ---------------------------------------------------------------------------
// Factory category colours (node fill)
// ---------------------------------------------------------------------------

export const FACTORY_COLORS: Record<FactoryType, string> = {
    "iron-mine": "#7a5c3a",
    "coal-mine": "#3a3a4a",
    "copper-mine": "#8a4a22",
    "silicon-mine": "#3a5a7a",
    "energy-supply": "#7a6a20",
    smelter: "#4a3a2a",
    "cable-factory": "#6a3a1a",
    foundry: "#3a4a5a",
    "chip-factory": "#2a4a3a",
    electronics: "#3a2a5a",
    "engine-factory": "#5a2a2a",
    assembly: "#2a2a4a",
    splitter: "#3a3a3a",
    warehouse: "#2a3a2a",
    market: "#2a4a2a",
}

/** Human-readable display names for factory types. */
export const FACTORY_LABELS: Record<FactoryType, string> = {
    "iron-mine": "Iron Mine",
    "coal-mine": "Coal Mine",
    "copper-mine": "Copper Mine",
    "silicon-mine": "Silicon Mine",
    "energy-supply": "Energy Supply",
    smelter: "Smelter",
    "cable-factory": "Cable Factory",
    foundry: "Foundry",
    "chip-factory": "Chip Factory",
    electronics: "Electronics",
    "engine-factory": "Engine Factory",
    assembly: "Assembly",
    splitter: "Splitter",
    warehouse: "Warehouse",
    market: "Market",
}

/** Human-readable display names for resources. */
export const RESOURCE_LABELS: Record<ResourceId, string> = {
    "iron-ore": "Iron Ore",
    coal: "Coal",
    copper: "Copper",
    silicon: "Silicon",
    fuel: "Fuel",
    steel: "Steel",
    cables: "Cables",
    "hull-parts": "Hull Parts",
    "fuel-tanks": "Fuel Tanks",
    circuits: "Circuits",
    "control-system": "Control System",
    thrusters: "Thrusters",
    rocket: "Rocket",
}

// ---------------------------------------------------------------------------
// Connection line colours based on fill ratio
// ---------------------------------------------------------------------------

/**
 * Returns the appropriate line colour based on how full the connection is.
 * Green = optimal, Orange = partial, Red = full / stalled.
 *
 * @param fillRatio - Current flow / capacity (0–1)
 * @returns Hex colour string
 */
export function connectionColor(fillRatio: number): string {
    if (fillRatio >= 0.9) return "#44dd44" // Green: near full utilisation
    if (fillRatio >= 0.4) return "#ddaa22" // Orange: partial
    return "#dd4444" // Red: low or stalled
}

// ---------------------------------------------------------------------------
// UI constants
// ---------------------------------------------------------------------------

export const COLORS = {
    gridLine: "#1e2030",
    gridLineAccent: "#2a2d42",
    nodeStroke: "#404060",
    nodeStrokeSelected: "#88aaff",
    nodeFillOverlay: "rgba(255,255,255,0.04)",
    textPrimary: "#e0e4f0",
    textSecondary: "#8090a0",
    bufferBg: "rgba(0,0,0,0.3)",
    bufferFill: "#4488cc",
    hudBg: "rgba(10,12,24,0.92)",
    panelBg: "rgba(16,18,32,0.96)",
}
