<script setup lang="ts">
import { computed } from 'vue'
import { NodeType } from '../simulation/types'
import { NODE_DEFS } from '../simulation/recipes'
import { canUnlock, buildCost } from '../simulation/economy'
import { gameState, countNodes } from '../simulation/useGameState'

/**
 * Ordered list of node types shown in the palette, grouped by layer.
 * Mirrors the tech tree order from section 7.1.
 */
const PALETTE_GROUPS: { label: string; types: NodeType[] }[] = [
    { label: 'Layer 0 – Sources', types: [NodeType.IronMine, NodeType.CoalMine, NodeType.CopperMine, NodeType.SiliconMine] },
    { label: 'Energy', types: [NodeType.EnergySupply] },
    { label: 'Layer 2 – Processing', types: [NodeType.Smelter, NodeType.CableFactory] },
    { label: 'Layer 3 – Components', types: [NodeType.Foundry, NodeType.ChipFactory, NodeType.Electronics, NodeType.EngineFactory] },
    { label: 'Layer 4/5 – Assembly', types: [NodeType.Assembly] },
    { label: 'Utility', types: [NodeType.Splitter, NodeType.Warehouse, NodeType.Market] },
]

/**
 * Computes display metadata for a single palette entry.
 * Returns the cost for the next instance and whether the node is unlocked.
 */
function entryFor(type: NodeType) {
    const def = NODE_DEFS[type]
    const existing = countNodes(type)
    const cost = buildCost(def.buildCost, existing)
    const unlocked = canUnlock(type, gameState)
    const affordable = gameState.money >= cost
    return { def, cost, unlocked, affordable }
}

/** Computed list of all palette groups with per-type metadata. */
const groups = computed(() =>
    PALETTE_GROUPS.map(g => ({
        label: g.label,
        entries: g.types.map(type => ({ type, ...entryFor(type) })),
    }))
)

/** Starts a native HTML drag carrying the node type string. */
function onDragStart(event: DragEvent, type: NodeType): void {
    event.dataTransfer?.setData('text/x-node-type', type)
}
</script>

<template>
    <aside class="flex w-48 flex-col gap-2 overflow-y-auto bg-gray-800 p-2 text-xs text-gray-200">
        <p class="font-bold text-gray-400">Palette</p>
        <p class="text-gray-500">€{{ gameState.money }}</p>

        <div v-for="group in groups" :key="group.label" class="flex flex-col gap-1">
            <p class="mt-1 text-gray-500">{{ group.label }}</p>

            <div v-for="entry in group.entries" :key="entry.type" class="rounded border px-2 py-1 transition-colors"
                :class="{
                    'cursor-grab border-blue-700 bg-gray-700 hover:bg-gray-600': entry.unlocked && entry.affordable,
                    'cursor-not-allowed border-gray-700 bg-gray-800 opacity-50': !entry.unlocked,
                    'cursor-not-allowed border-yellow-800 bg-gray-800 opacity-70': entry.unlocked && !entry.affordable,
                }" :draggable="entry.unlocked && entry.affordable"
                @dragstart="entry.unlocked && entry.affordable ? onDragStart($event, entry.type) : $event.preventDefault()">
                <span class="block truncate font-medium">{{ entry.def.displayName }}</span>
                <span v-if="entry.unlocked" class="text-gray-400">€{{ entry.cost }}</span>
                <span v-else class="text-red-400">Locked</span>
            </div>
        </div>
    </aside>
</template>
