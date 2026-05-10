<script setup lang="ts">
import { computed, ref } from 'vue'
import { NodeType } from '../simulation/types'
import { NODE_DEFS } from '../simulation/recipes'
import { canUnlock, buildCost } from '../simulation/economy'
import { gameState, countNodes } from '../simulation/useGameState'

/**
 * Ordered list of node types shown in the palette, grouped by layer.
 * Each group carries a Heroicons v2 outline SVG path for its category button.
 * Mirrors the tech tree order from section 7.1.
 */
const PALETTE_GROUPS: { label: string; icon: string; accent: string; types: NodeType[] }[] = [
    {
        label: 'Sources',
        accent: '#f59e0b',
        // cube outline – represents raw material blocks
        icon: 'M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9',
        types: [NodeType.IronMine, NodeType.CoalMine, NodeType.CopperMine, NodeType.SiliconMine],
    },
    {
        label: 'Energy',
        accent: '#facc15',
        // bolt / lightning outline
        icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
        types: [NodeType.EnergySupply],
    },
    {
        label: 'Processing',
        accent: '#3b82f6',
        // cog-6-tooth outline – gears / processing
        icon: 'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.094c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
        types: [NodeType.Smelter, NodeType.CableFactory],
    },
    {
        label: 'Components',
        accent: '#22d3ee',
        // cpu-chip outline – electronics / chips
        icon: 'M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z',
        types: [NodeType.Foundry, NodeType.ChipFactory, NodeType.Electronics, NodeType.EngineFactory],
    },
    {
        label: 'Assembly',
        accent: '#a855f7',
        // rocket-launch outline
        icon: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z',
        types: [NodeType.Assembly],
    },
    {
        label: 'Utility',
        accent: '#94a3b8',
        // wrench-screwdriver outline – tools
        icon: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L3 3.75l1.5-1.5L8.25 3v1.5l2.775 2.775',
        types: [NodeType.Splitter, NodeType.Warehouse, NodeType.Market],
    },
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
        icon: g.icon,
        accent: g.accent,
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
    <!-- Anchored to bottom-center; tray grows upward naturally above the bar -->
    <!-- pointer-events-none on the wrapper so the transparent area never blocks canvas clicks -->
    <div class="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">

        <!-- Building tray: horizontal row of buildings for the active category -->
        <Transition name="tray">
            <div v-if="activeGroupIndex !== null"
                class="pointer-events-auto flex gap-3 rounded-t-xl px-5 py-4 shadow-2xl"
                style="background: #0f172a; border: 1px solid #1e293b; border-bottom: none">
                <div v-for="entry in groups[activeGroupIndex].entries" :key="entry.type"
                    class="relative flex w-32 flex-col overflow-hidden rounded-xl border transition-all duration-200"
                    :class="{
                        'cursor-grab hover:-translate-y-1 hover:shadow-lg': entry.unlocked && entry.affordable,
                        'cursor-not-allowed opacity-40': !entry.unlocked,
                        'cursor-not-allowed opacity-60': entry.unlocked && !entry.affordable,
                    }" :style="entry.unlocked && entry.affordable
                        ? { borderColor: `${groups[activeGroupIndex].accent}66`, background: '#1e293b', boxShadow: `0 0 12px ${groups[activeGroupIndex].accent}22` }
                        : { borderColor: '#374151', background: '#1e293b' }"
                    :draggable="entry.unlocked && entry.affordable"
                    @dragstart="entry.unlocked && entry.affordable ? onDragStart($event, entry.type) : $event.preventDefault()">

                    <!-- Accent bar top -->
                    <span class="block h-1 w-full"
                        :style="{ background: entry.unlocked ? groups[activeGroupIndex].accent : '#374151' }" />

                    <!-- Card body -->
                    <div class="flex flex-1 flex-col gap-1 px-3 py-2">
                        <span class="block text-xs font-bold leading-tight text-gray-100">{{ entry.def.displayName
                        }}</span>

                        <!-- Status row -->
                        <div class="mt-1">
                            <span v-if="!entry.unlocked"
                                class="inline-flex items-center gap-1 rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-medium text-red-400">
                                <svg class="h-2.5 w-2.5" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 1a4 4 0 100 8A4 4 0 008 1zM6 8V6h4v2H6zm0 1h4v4H6V9z" />
                                </svg>
                                Locked
                            </span>
                            <span v-else-if="!entry.affordable"
                                class="inline-flex items-center gap-1 rounded-full bg-yellow-950 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
                                <svg class="h-2.5 w-2.5" viewBox="0 0 16 16" fill="currentColor">
                                    <path
                                        d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 4v4.5h-1.5V5h1.5zm0 5.5v1.5h-1.5v-1.5h1.5z" />
                                </svg>
                                €{{ entry.cost }}
                            </span>
                            <span v-else
                                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                :style="{ background: `${groups[activeGroupIndex].accent}22`, color: groups[activeGroupIndex].accent }">
                                €{{ entry.cost }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- Category buttons bar -->
        <div class="pointer-events-auto flex gap-2 rounded-t-lg px-4 py-2 shadow-xl" style="background:#0f172a">
            <button v-for="(group, index) in groups" :key="group.label"
                class="relative flex w-20 flex-col items-center gap-1.5 overflow-hidden rounded-xl border px-3 py-3 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                :class="activeGroupIndex === index ? 'text-white' : 'text-gray-400 hover:text-gray-100'" :style="activeGroupIndex === index
                    ? {
                        background: `linear-gradient(160deg, ${group.accent}30 0%, #1e293b 100%)`,
                        borderColor: group.accent,
                        boxShadow: `0 0 18px ${group.accent}55, inset 0 1px 0 ${group.accent}33`,
                    }
                    : { borderColor: '#374151', background: '#1e293b' }" @click="toggleGroup(index)">
                <!-- Colored accent bar along the top edge -->
                <span class="absolute left-0 right-0 top-0 h-0.5 transition-opacity duration-200"
                    :style="{ background: group.accent, opacity: activeGroupIndex === index ? 1 : 0.35 }" />
                <svg viewBox="0 0 24 24" class="h-7 w-7 shrink-0 transition-colors duration-200" fill="none"
                    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                    :style="{ color: activeGroupIndex === index ? group.accent : `${group.accent}99` }">
                    <path :d="group.icon" />
                </svg>
                <span>{{ group.label }}</span>
            </button>
        </div>

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
    transform: translateY(4px);
}
</style>
