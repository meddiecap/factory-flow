<script setup lang="ts">
import { computed } from 'vue'
import { NodeType } from '../simulation/types'
import type { NodeInstance } from '../simulation/types'
import { NODE_DEFS } from '../simulation/recipes'
import { upgradeCost } from '../simulation/economy'
import { applyUpgrade } from '../simulation/upgrades'
import type { UpgradeType } from '../simulation/upgrades'
import { gameState } from '../simulation/useGameState'
import { calcNodeSpeedFactors } from '../simulation/energy'
import { calcMarketSlotRevenues } from '../simulation/throughput'

/** Props: pass the id of the currently selected node, or null to hide the panel. */
const props = defineProps<{ nodeId: string | null }>()

/** Emitted when the user explicitly closes the panel. */
const emit = defineEmits<{ close: [] }>()

// ── Derived data from selected node ─────────────────────────────────────────

/** The selected NodeInstance, or null when nothing is selected. */
const node = computed<NodeInstance | null>(() =>
    props.nodeId ? (gameState.nodes.find((n) => n.id === props.nodeId) ?? null) : null,
)

/** Static definition for the selected node. */
const def = computed(() => (node.value ? NODE_DEFS[node.value.type] : null))

/** Progress fraction [0, 1] for the cycle progress bar. */
const progressFraction = computed(() => {
    if (!node.value || !def.value || def.value.cycleDuration === 0) return 0
    return Math.min(node.value.progress / def.value.cycleDuration, 1)
})

/** Status badge colour class. */
const statusClass = computed(() => {
    switch (node.value?.status) {
        case 'active':
            return 'bg-green-600'
        case 'waiting':
            return 'bg-yellow-600'
        case 'output-blocked':
            return 'bg-red-600'
        default:
            return 'bg-gray-600'
    }
})

// ── Upgrade availability ─────────────────────────────────────────────────────

/** Whether this node type can use the Speed upgrade (non-utility production nodes, not EnergySupply). */
const hasSpeedUpgrade = computed(() => {
    if (!node.value) return false
    const noSpeed: NodeType[] = [NodeType.Splitter, NodeType.Warehouse, NodeType.Market, NodeType.EnergySupply]
    return !noSpeed.includes(node.value.type)
})

/** Whether this node type can use the Efficiency upgrade (production nodes with inputs and a cycle). */
const hasEfficiencyUpgrade = computed(() => {
    if (!node.value) return false
    const noEfficiency: NodeType[] = [NodeType.Splitter, NodeType.Warehouse, NodeType.Market, NodeType.EnergySupply]
    return !noEfficiency.includes(node.value.type) && (def.value?.inputs.length ?? 0) > 0
})

/** Whether this node type consumes fuel (energy efficiency upgrade applicable). */
const hasEnergyEfficiencyUpgrade = computed(
    () => node.value != null && (def.value?.fuelPerTick ?? 0) > 0,
)

/** Whether this is a Market node (sales-points upgrade). */
const isMarket = computed(() => node.value?.type === NodeType.Market)

/** Whether this is an Energy Supply node (energy output upgrade). */
const isEnergySupply = computed(() => node.value?.type === NodeType.EnergySupply)

/** Cost of the next Energy Output upgrade (EnergySupply only): €150 × 2^level. */
const energyOutputUpgradeCost = computed(() =>
    node.value && def.value
        ? upgradeCost(def.value.buildCost, node.value.energyOutputUpgradeLevel ?? 0)
        : 0,
)

/** Cost of the next speed upgrade level for the selected node. */
const speedUpgradeCost = computed(() =>
    node.value && def.value
        ? upgradeCost(def.value.buildCost, node.value.speedUpgradeLevel)
        : 0,
)

/** Cost of the next buffer upgrade level. */
const bufferUpgradeCost = computed(() =>
    node.value && def.value
        ? upgradeCost(def.value.buildCost, node.value.bufferUpgradeLevel)
        : 0,
)

/** Cost of the next efficiency upgrade level. */
const efficiencyUpgradeCost = computed(() =>
    node.value && def.value
        ? upgradeCost(def.value.buildCost, node.value.efficiencyUpgradeLevel)
        : 0,
)

/** Cost of the next energy-efficiency upgrade level. */
const energyEfficiencyUpgradeCost = computed(() =>
    node.value && def.value
        ? upgradeCost(def.value.buildCost, node.value.energyEfficiencyUpgradeLevel)
        : 0,
)

/** Cost of the next Market sales-point upgrade: €200 × 2^(currentSalesPoints - 1). */
const salesPointCost = computed(() => {
    const pts = node.value?.salesPoints ?? 1
    return Math.ceil(200 * 2 ** (pts - 1))
})

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true when the player can afford the given cost. */
function canAfford(cost: number): boolean {
    return gameState.money >= cost
}

/**
 * Applies an upgrade to the currently selected node and deducts the cost.
 * No-ops when no node is selected or the upgrade is rejected.
 */
function buyUpgrade(type: UpgradeType): void {
    if (node.value === null) return
    applyUpgrade(node.value, type, gameState)
}

/** Applies the Market sales-point upgrade independently (custom cost formula). */
function buySalesPoint(): void {
    if (node.value === null) return
    applyUpgrade(node.value, 'salesPoint', gameState)
}

/** Formats a buffer fill fraction as a percentage string. */
function fillPct(amount: number, capacity: number): string {
    if (capacity === 0) return '0%'
    return Math.round((amount / capacity) * 100) + '%'
}

/**
 * For each Market input slot, returns the steady-state €/s based on what the
 * connected factory structurally produces, tracing back through Splitters and
 * Warehouses to the original producer. Returns null for unconnected slots.
 */
const marketSlotRevenues = computed<Array<number | null>>(() => {
    if (!node.value || node.value.type !== NodeType.Market) return []
    const speedFactors = calcNodeSpeedFactors(gameState.nodes, gameState.connections, NODE_DEFS)
    return calcMarketSlotRevenues(node.value, gameState.nodes, gameState.connections, speedFactors)
})

/** Colour class for a buffer bar based on fill level. */
function bufferColour(amount: number, capacity: number): string {
    const r = capacity > 0 ? amount / capacity : 0
    if (r >= 1) return 'bg-red-500'
    if (r >= 0.5) return 'bg-yellow-500'
    return 'bg-green-500'
}
</script>

<template>
    <!-- Hidden when no node is selected -->
    <aside v-if="node && def" class="flex w-56 flex-col gap-3 overflow-y-auto bg-gray-800 p-3 text-xs text-gray-200">
        <!-- Header: name + close button -->
        <div class="flex items-center justify-between">
            <div>
                <p class="font-bold text-white">{{ def.displayName }}</p>
                <span class="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                    :class="statusClass">
                    {{ node.status }}
                </span>
            </div>
            <button class="ml-2 rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white" title="Close"
                @click="emit('close')">
                ✕
            </button>
        </div>

        <!-- Cycle progress bar (only for nodes with a cycle) -->
        <div v-if="def.cycleDuration > 0">
            <p class="mb-1 text-gray-400">Cycle progress</p>
            <div class="h-2 w-full overflow-hidden rounded bg-gray-700">
                <div class="h-full bg-blue-500 transition-all"
                    :style="{ width: (progressFraction * 100).toFixed(1) + '%' }" />
            </div>
            <p class="mt-0.5 text-right text-gray-500">
                {{ node.progress.toFixed(1) }} / {{ def.cycleDuration }}
            </p>
        </div>

        <!-- Input buffers -->
        <div v-if="node.inputBuffers.length > 0">
            <p class="mb-1 text-gray-400">Input buffers</p>
            <div v-for="(buf, i) in node.inputBuffers" :key="i" class="mb-1.5">
                <div class="flex justify-between">
                    <span>{{ buf.resource }}</span>
                    <span class="tabular-nums text-gray-400">{{ buf.amount }}/{{ buf.capacity }}</span>
                </div>
                <div class="mt-0.5 h-1.5 w-full overflow-hidden rounded bg-gray-700">
                    <div class="h-full transition-all" :class="bufferColour(buf.amount, buf.capacity)"
                        :style="{ width: fillPct(buf.amount, buf.capacity) }" />
                </div>
                <!-- Market: show actual revenue per second for this slot -->
                <div v-if="isMarket" class="mt-0.5 flex justify-between text-[10px]">
                    <span class="text-gray-500">Revenue</span>
                    <span v-if="marketSlotRevenues[i] !== null && marketSlotRevenues[i]! > 0"
                        class="text-yellow-400 tabular-nums">
                        €{{ marketSlotRevenues[i]?.toLocaleString() }} /s
                    </span>
                    <span v-else-if="marketSlotRevenues[i] !== null" class="text-gray-600">€0 /s</span>
                    <span v-else class="text-gray-600">—</span>
                </div>
            </div>
        </div>

        <!-- Output buffers -->
        <div v-if="node.outputBuffers.length > 0">
            <p class="mb-1 text-gray-400">Output buffers</p>
            <div v-for="(buf, i) in node.outputBuffers" :key="i" class="mb-1.5">
                <div class="flex justify-between">
                    <span>{{ buf.resource }}</span>
                    <span class="tabular-nums text-gray-400">{{ buf.amount }}/{{ buf.capacity }}</span>
                </div>
                <div class="mt-0.5 h-1.5 w-full overflow-hidden rounded bg-gray-700">
                    <div class="h-full transition-all" :class="bufferColour(buf.amount, buf.capacity)"
                        :style="{ width: fillPct(buf.amount, buf.capacity) }" />
                </div>
            </div>
        </div>

        <!-- Upgrades section -->
        <div class="border-t border-gray-700 pt-2">
            <p class="mb-2 font-medium text-gray-400">Upgrades</p>

            <!-- Speed upgrade -->
            <div v-if="hasSpeedUpgrade" class="mb-1.5 flex items-center justify-between gap-2">
                <div>
                    <span>Speed</span>
                    <span class="ml-1 text-gray-500">Lv{{ node.speedUpgradeLevel }}</span>
                </div>
                <button class="rounded px-2 py-0.5 font-medium transition-colors" :class="canAfford(speedUpgradeCost)
                    ? 'bg-blue-700 hover:bg-blue-600 text-white cursor-pointer'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                    " :disabled="!canAfford(speedUpgradeCost)" title="Upgrade production speed (×1.5 per level)"
                    @click="buyUpgrade('speed')">
                    €{{ speedUpgradeCost }}
                </button>
            </div>

            <!-- Buffer upgrade (not for EnergySupply: it has no buffers) -->
            <div v-if="!isEnergySupply" class="mb-1.5 flex items-center justify-between gap-2">
                <div>
                    <span>Buffer</span>
                    <span class="ml-1 text-gray-500">Lv{{ node.bufferUpgradeLevel }}</span>
                </div>
                <button class="rounded px-2 py-0.5 font-medium transition-colors" :class="canAfford(bufferUpgradeCost)
                    ? 'bg-blue-700 hover:bg-blue-600 text-white cursor-pointer'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                    " :disabled="!canAfford(bufferUpgradeCost)"
                    title="Increase input and output buffer capacity (+10 per level)" @click="buyUpgrade('buffer')">
                    €{{ bufferUpgradeCost }}
                </button>
            </div>

            <!-- Efficiency upgrade (nodes with inputs only) -->
            <div v-if="hasEfficiencyUpgrade" class="mb-1.5 flex items-center justify-between gap-2">
                <div>
                    <span>Efficiency</span>
                    <span class="ml-1 text-gray-500">Lv{{ node.efficiencyUpgradeLevel }}</span>
                </div>
                <button class="rounded px-2 py-0.5 font-medium transition-colors" :class="canAfford(efficiencyUpgradeCost)
                    ? 'bg-blue-700 hover:bg-blue-600 text-white cursor-pointer'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                    " :disabled="!canAfford(efficiencyUpgradeCost)"
                    title="Reduce input resource consumption (−10% per level, min 50%)"
                    @click="buyUpgrade('efficiency')">
                    €{{ efficiencyUpgradeCost }}
                </button>
            </div>

            <!-- Energy efficiency upgrade (fuel-consuming nodes only) -->
            <div v-if="hasEnergyEfficiencyUpgrade" class="mb-1.5 flex items-center justify-between gap-2">
                <div>
                    <span>Energy Eff.</span>
                    <span class="ml-1 text-gray-500">Lv{{ node.energyEfficiencyUpgradeLevel }}</span>
                </div>
                <button class="rounded px-2 py-0.5 font-medium transition-colors" :class="canAfford(energyEfficiencyUpgradeCost)
                    ? 'bg-blue-700 hover:bg-blue-600 text-white cursor-pointer'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                    " :disabled="!canAfford(energyEfficiencyUpgradeCost)"
                    title="Reduce fuel consumption (−10% per level, min 50%)" @click="buyUpgrade('energyEfficiency')">
                    €{{ energyEfficiencyUpgradeCost }}
                </button>
            </div>

            <!-- Energy Supply: energy output upgrade -->
            <div v-if="isEnergySupply" class="mb-1.5 flex items-center justify-between gap-2">
                <div>
                    <span>Energy Output</span>
                    <span class="ml-1 text-gray-500">+{{ node.energyOutputUpgradeLevel ?? 0 }} ⚡/tick</span>
                </div>
                <button class="rounded px-2 py-0.5 font-medium transition-colors" :class="canAfford(energyOutputUpgradeCost)
                    ? 'bg-yellow-600 hover:bg-yellow-500 text-white cursor-pointer'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                    " :disabled="!canAfford(energyOutputUpgradeCost)" title="Increase energy output by +1.0 per tick"
                    @click="buyUpgrade('energyOutput')">
                    €{{ energyOutputUpgradeCost }}
                </button>
            </div>

            <!-- Market: sales-point upgrade -->
            <div v-if="isMarket" class="mb-1.5 flex items-center justify-between gap-2">
                <div>
                    <span>Sales Points</span>
                    <span class="ml-1 text-gray-500">×{{ node.salesPoints ?? 1 }}</span>
                </div>
                <button class="rounded px-2 py-0.5 font-medium transition-colors" :class="canAfford(salesPointCost)
                    ? 'bg-blue-700 hover:bg-blue-600 text-white cursor-pointer'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                    " :disabled="!canAfford(salesPointCost)"
                    title="Add an extra sales point (+20 units/tick sell capacity)" @click="buySalesPoint()">
                    €{{ salesPointCost }}
                </button>
            </div>
        </div>
    </aside>
</template>
