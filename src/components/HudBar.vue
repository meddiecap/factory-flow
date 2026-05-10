<script setup lang="ts">
import { gameState } from '../simulation/useGameState'

/** Formats a number as a whole-euro string without decimals. */
function fmt(n: number): string {
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
</script>

<template>
    <header
        class="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-6 rounded-2xl border border-gray-700 bg-gray-900 bg-opacity-95 px-5 py-2 text-sm text-gray-200 shadow-2xl backdrop-blur-sm pointer-events-none">
        <!-- Current balance -->
        <span class="flex items-center gap-1.5">
            <span class="text-gray-400 text-xs">Balance</span>
            <strong class="text-green-400 tabular-nums">€{{ fmt(gameState.money) }}</strong>
        </span>
        <span class="w-px h-4 bg-gray-700" />
        <!-- Total earned -->
        <span class="flex items-center gap-1.5">
            <span class="text-gray-400 text-xs">Earned</span>
            <strong class="tabular-nums">€{{ fmt(gameState.totalEarned) }}</strong>
        </span>
        <span class="w-px h-4 bg-gray-700" />
        <!-- Simulation tick counter -->
        <span class="flex items-center gap-1.5">
            <span class="text-gray-400 text-xs">Tick</span>
            <strong class="tabular-nums">{{ gameState.tick }}</strong>
        </span>
    </header>
</template>
