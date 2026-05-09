<script setup lang="ts">
/** Props describing the completed run. */
const props = defineProps<{
    /** Total ticks elapsed when the rocket was assembled. */
    ticks: number
    /** Total money earned during the run. */
    totalEarned: number
}>()

/** Emitted when the player wants to start a new run. */
defineEmits<{ restart: [] }>()

/** Converts a tick count to a human-readable duration string (mm:ss). */
function ticksToTime(ticks: number): string {
    const seconds = Math.floor(ticks / 20)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
</script>

<template>
    <!-- Fullscreen overlay — matches section 9.2 of the design doc -->
    <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 text-center" role="dialog"
        aria-modal="true" aria-label="You built a rocket!">
        <div
            class="flex flex-col items-center gap-6 rounded-2xl bg-gray-900 px-16 py-12 shadow-2xl ring-1 ring-gray-700">
            <!-- Trophy / headline -->
            <div class="text-7xl select-none">🚀</div>
            <h1 class="text-4xl font-bold text-white">Rocket Assembled!</h1>
            <p class="text-gray-400">You completed the run. Here are your stats:</p>

            <!-- Stats -->
            <div class="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
                <span class="text-right text-gray-400">Time</span>
                <span class="font-mono text-white">{{ ticksToTime(ticks) }}</span>

                <span class="text-right text-gray-400">Total ticks</span>
                <span class="font-mono text-white">{{ ticks.toLocaleString() }}</span>

                <span class="text-right text-gray-400">Total earned</span>
                <span class="font-mono text-green-400">€{{ totalEarned.toLocaleString() }}</span>
            </div>

            <!-- Action button -->
            <button
                class="mt-4 rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                @click="$emit('restart')">
                Play Again
            </button>
        </div>
    </div>
</template>
