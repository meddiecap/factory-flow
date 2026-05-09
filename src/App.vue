<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue'
import { CanvasRenderer, GRID_COLS, GRID_ROWS, CELL_SIZE } from './canvas/CanvasRenderer'
import { CanvasInteraction } from './canvas/CanvasInteraction'
import { NodeType } from './simulation/types'
import { gameState, placeNode, addConnection, moveNode, removeConnection, reconnectConnection } from './simulation/useGameState'
import { tick, checkWin } from './simulation/simulator'
import { tickMarket } from './simulation/economy'
import { saveState, loadState, clearState } from './simulation/persistence'
import PalettePanel from './ui/PalettePanel.vue'
import HudBar from './ui/HudBar.vue'
import DetailPanel from './ui/DetailPanel.vue'
import WinScreen from './ui/WinScreen.vue'

const canvasWidth = GRID_COLS * CELL_SIZE
const canvasHeight = GRID_ROWS * CELL_SIZE

/** The node currently selected by clicking on the canvas; null when nothing is selected. */
const selectedNodeId = ref<string | null>(null)

/** Set to true when the win condition has been detected; shows the WinScreen overlay. */
const won = ref(false)

let renderer: CanvasRenderer | null = null
let interaction: CanvasInteraction | null = null
let simulationInterval: ReturnType<typeof setInterval> | null = null
let saveInterval: ReturnType<typeof setInterval> | null = null

/** Advances the simulation by one tick and runs market selling. Called 20×/sec. */
function simulationStep(): void {
  tick(gameState)
  tickMarket(gameState)

  // Check win condition after every tick.
  if (!won.value && checkWin(gameState)) {
    won.value = true
    if (simulationInterval !== null) {
      clearInterval(simulationInterval)
      simulationInterval = null
    }
  }
}

/** Re-renders the canvas and rebuilds dot hit areas after any state change. */
function refresh(): void {
  if (renderer === null || interaction === null) return
  renderer.render(gameState)
  interaction.rebuildDotHits(gameState)
}

onMounted(() => {
  // Restore a previously saved run, if one exists.
  const saved = loadState()
  if (saved !== null) {
    Object.assign(gameState, saved)
  }

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
    onMoveNode(nodeId, col, row) {
      moveNode(nodeId, col, row)
      refresh()
    },
    onClickOccupiedDot(connectionId) {
      if (confirm('Remove this connection?')) {
        removeConnection(connectionId)
        refresh()
      }
    },
    onReconnect(connectionId, fromNodeId, fromDotIndex, toNodeId, toDotIndex) {
      reconnectConnection(connectionId, fromNodeId, fromDotIndex, toNodeId, toDotIndex)
      refresh()
    },
  })

  interaction.rebuildDotHits(gameState)

  // Start the simulation loop at 20 ticks/second (section 8).
  simulationInterval = setInterval(simulationStep, 50)

  // Auto-save every 5 seconds (section 9).
  saveInterval = setInterval(() => saveState(gameState), 5000)
})

onUnmounted(() => {
  if (simulationInterval !== null) clearInterval(simulationInterval)
  if (saveInterval !== null) clearInterval(saveInterval)
  renderer?.destroy()
})

// Re-render canvas visuals every tick (buffers, progress bars change).
watch(() => gameState.tick, () => {
  renderer?.render(gameState)
})

// Rebuild hit areas only when nodes or connections are added/removed.
// This prevents click events being dropped because hit shapes were destroyed mid-click.
watch(
  () => gameState.nodes.length + gameState.connections.length,
  () => {
    if (renderer === null || interaction === null) return
    renderer.render(gameState)
    interaction.rebuildDotHits(gameState)
  },
)

/**
 * Clears the saved state and reloads the page to start a fresh run.
 */
function restart(): void {
  clearState()
  window.location.reload()
}
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

    <!-- Win screen overlay (shown when a Rocket has been assembled) -->
    <WinScreen v-if="won" :ticks="gameState.tick" :total-earned="gameState.totalEarned" @restart="restart" />
  </div>
</template>
