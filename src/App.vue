<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue'
import { CanvasRenderer, GRID_COLS, GRID_ROWS, CELL_SIZE } from './canvas/CanvasRenderer'
import { CanvasInteraction } from './canvas/CanvasInteraction'
import { NodeType } from './simulation/types'
import { gameState, placeNode, addConnection } from './simulation/useGameState'
import PalettePanel from './ui/PalettePanel.vue'
import HudBar from './ui/HudBar.vue'
import DetailPanel from './ui/DetailPanel.vue'

const canvasWidth = GRID_COLS * CELL_SIZE
const canvasHeight = GRID_ROWS * CELL_SIZE

/** The node currently selected by clicking on the canvas; null when nothing is selected. */
const selectedNodeId = ref<string | null>(null)

let renderer: CanvasRenderer | null = null
let interaction: CanvasInteraction | null = null

/** Re-renders the canvas and rebuilds dot hit areas after any state change. */
function refresh(): void {
  if (renderer === null || interaction === null) return
  renderer.render(gameState)
  interaction.rebuildDotHits(gameState)
}

onMounted(() => {
  renderer = new CanvasRenderer('game-canvas')
  renderer.render(gameState)

  const stage = renderer.getStage()
  const containerEl = document.getElementById('game-canvas') as HTMLElement

  interaction = new CanvasInteraction(stage, containerEl, {
    onConnect(fromNodeId, fromDotIndex, toNodeId, toDotIndex) {
      addConnection(fromNodeId, fromDotIndex, toNodeId, toDotIndex)
      refresh()
    },
    onSelectNode(nodeId) {
      selectedNodeId.value = nodeId
    },
    onDropNode(type, col, row) {
      placeNode(type as NodeType, col, row)
      refresh()
    },
  })

  interaction.rebuildDotHits(gameState)
})

onUnmounted(() => {
  renderer?.destroy()
})

// Re-render whenever reactive state changes programmatically (e.g. future tick loop).
watch(() => gameState.tick, refresh)
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-gray-900">
    <!-- Top HUD bar -->
    <HudBar />

    <!-- Main area: palette | canvas | detail panel -->
    <div class="flex min-h-0 flex-1 overflow-hidden">
      <!-- Left palette sidebar -->
      <PalettePanel />

      <!-- Canvas container – Konva mounts inside this div -->
      <div id="game-canvas" :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }" class="shrink-0" />

      <!-- Right detail panel (only visible when a node is selected) -->
      <DetailPanel :node-id="selectedNodeId" @close="selectedNodeId = null" />
    </div>
  </div>
</template>
