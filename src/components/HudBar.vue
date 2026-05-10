<script setup lang="ts">
import { gameState } from '../simulation/useGameState'

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
    </header>
</template>
