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
        <button :title="soundEnabled ? 'Mute sound' : 'Unmute sound'"
            class="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-700 transition-colors cursor-pointer"
            @click="soundEnabled = !soundEnabled">
            <!-- Speaker on -->
            <svg v-if="soundEnabled" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-300"
                viewBox="0 0 24 24" fill="currentColor">
                <path
                    d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
            <!-- Speaker off -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-500" viewBox="0 0 24 24"
                fill="currentColor">
                <path
                    d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
            </svg>
        </button>
        <span class="w-px h-4 bg-gray-700" />
        <!-- GitHub -->
        <a href="https://github.com/meddiecap/" target="_blank" rel="noopener noreferrer" title="GitHub"
            class="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-300" viewBox="0 0 24 24"
                fill="currentColor">
                <path
                    d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
        </a>
        <!-- LinkedIn -->
        <a href="https://www.linkedin.com/in/mbronneberg/" target="_blank" rel="noopener noreferrer" title="LinkedIn"
            class="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-300" viewBox="0 0 24 24"
                fill="currentColor">
                <path
                    d="M19 3A2 2 0 0 1 21 5v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zm-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79zM6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68zm1.39 9.94v-8.37H5.5v8.37h2.77z" />
            </svg>
        </a>
    </header>
</template>
