<script setup lang="ts">
import { computed, ref } from 'vue'
import { NodeType } from '../simulation/types'
import { NODE_DEFS } from '../simulation/recipes'
import { canUnlock, buildCost } from '../simulation/economy'
import { gameState, countNodes } from '../simulation/useGameState'

/**
 * Ordered list of node types shown in the palette, grouped by layer.
 * Mirrors the tech tree order from section 7.1.
 */
const PALETTE_GROUPS: { label: string; types: NodeType[] }[] = [
    { label: 'Sources', types: [NodeType.IronMine, NodeType.CoalMine, NodeType.CopperMine, NodeType.SiliconMine] },
    { label: 'Energy', types: [NodeType.EnergySupply] },
    { label: 'Processing', types: [NodeType.Smelter, NodeType.CableFactory] },
    { label: 'Components', types: [NodeType.Foundry, NodeType.ChipFactory, NodeType.Electronics, NodeType.EngineFactory] },
    { label: 'Assembly', types: [NodeType.Assembly] },
    { label: 'Utility', types: [NodeType.Splitter, NodeType.Warehouse, NodeType.Market] },
]

/** Index of the currently open category, or null when the tray is closed. */
const activeGroupIndex = ref<number | null>(null)

/**
 * Computes display metadata for a single palette entry.
 * Returns the cost for the next instance and whether the node is unlocked.
 */
function entryFor(type: NodeType) {
    const def = NODE_DEFS[type]
    const existing = countNodes(type)
    const cost = buildCost(type, existing)
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

/** Toggles the building tray for a category; closes it when clicking the active one. */
function toggleGroup(index: number): void {
    activeGroupIndex.value = activeGroupIndex.value === index ? null : index
}

/** Starts a native HTML drag carrying the node type string. */
function onDragStart(event: DragEvent, type: NodeType): void {
    event.dataTransfer?.setData('text/x-node-type', type)
}
</script>

<template>
    <!-- Building tray: horizontal row of buildings for the active category -->
    <Transition name="tray">
        <div v-if="activeGroupIndex !== null"
            class="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-2 rounded-t-lg bg-gray-800 bg-opacity-95 px-4 py-2 shadow-lg">
            <div v-for="entry in groups[activeGroupIndex].entries" :key="entry.type"
                class="flex w-24 flex-col items-center rounded border px-2 py-1 text-xs text-gray-200 transition-colors"
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
    </Transition>

    <!-- Category buttons bar -->
    <div
        class="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1 rounded-t-lg bg-gray-800 bg-opacity-95 px-3 py-2 shadow-lg">
        <button v-for="(group, index) in groups" :key="group.label"
            class="rounded px-3 py-1 text-xs font-medium transition-colors" :class="activeGroupIndex === index
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'" @click="toggleGroup(index)">
            {{ group.label }}
        </button>
    </div>
</template>

<style scoped>
.tray-enter-active,
.tray-leave-active {
    transition: opacity 0.15s ease, transform 0.15s ease;
}

.tray-enter-from,
.tray-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
}
</style>
