<script setup lang="ts">
import { computed } from 'vue'
import { gameState } from '../simulation/useGameState'

/** Cost of the first canvas expansion (section 3.3): €200 × 1.5^0 = €200. */
const expandCost = computed(() => Math.ceil(200 * 1.5 ** 0))

/** Whether the player can currently afford to expand the canvas. */
const canAffordExpand = computed(() => gameState.money >= expandCost.value)

/** Formats a number as a whole-euro string without decimals. */
function fmt(n: number): string {
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
</script>

<template>
    <header class="flex shrink-0 items-center justify-between bg-gray-800 px-4 py-2 text-sm text-gray-200 shadow">
        <div class="flex gap-8">
            <!-- Current balance -->
            <span>
                <span class="text-gray-400">Balance</span>
                <strong class="ml-1 text-green-400">€{{ fmt(gameState.money) }}</strong>
            </span>
            <!-- Total earned (used for tech tree unlock thresholds) -->
            <span>
                <span class="text-gray-400">Earned</span>
                <strong class="ml-1">€{{ fmt(gameState.totalEarned) }}</strong>
            </span>
            <!-- Simulation tick counter -->
            <span>
                <span class="text-gray-400">Tick</span>
                <strong class="ml-1 tabular-nums">{{ gameState.tick }}</strong>
            </span>
        </div>

        <button class="rounded px-3 py-1 text-xs font-medium transition-colors" :class="canAffordExpand
                ? 'bg-blue-700 hover:bg-blue-600 text-white cursor-pointer'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
            " :disabled="!canAffordExpand" title="Expand the canvas by one row or column">
            Expand Canvas (€{{ fmt(expandCost) }})
        </button>
    </header>
</template>
