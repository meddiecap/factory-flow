<script setup lang="ts">
import { gameState } from '../simulation/useGameState'
import { soundEnabled } from '../audio/sound'

/** Formats a number as a whole-euro string without decimals. */
function fmt(n: number): string {
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
</script>

<template>
    <header
        class="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-6 rounded-2xl border border-gray-700 bg-gray-900 bg-opacity-95 px-5 py-2 text-sm text-gray-200 shadow-2xl backdrop-blur-sm">
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
        <span class="w-px h-4 bg-gray-700" />
        <!-- Sound toggle -->
        <button
            :title="soundEnabled ? 'Mute sound' : 'Unmute sound'"
            class="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-700 transition-colors cursor-pointer"
            @click="soundEnabled = !soundEnabled">
            <!-- Speaker on -->
            <svg v-if="soundEnabled" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <!-- Speaker off -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/>
            </svg>
        </button>
    </header>
</template>
