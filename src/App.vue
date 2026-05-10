<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue'
import { CanvasRenderer } from './canvas/renderer'
import { CanvasInteraction } from './canvas/interaction'
import { NodeType } from './simulation/types'
import { gameState, placeNode, addConnection, moveNode, removeConnection, removeNode, reconnectConnection } from './simulation/useGameState'
import { tick, checkWin } from './simulation/simulator'
import { tickMarket } from './simulation/economy'
import { saveState, loadState, clearState } from './simulation/persistence'
import { initSequences } from './simulation/useGameState'
import PalettePanel from './components/PalettePanel.vue'
import HudBar from './components/HudBar.vue'
import DetailPanel from './components/DetailPanel.vue'
import WinScreen from './components/WinScreen.vue'

/** The node currently selected by clicking on the canvas; null when nothing is selected. */
const selectedNodeId = ref<string | null>(null)

/** Set to true when the win condition has been detected; shows the WinScreen overlay. */
const won = ref(false)

let renderer: CanvasRenderer | null = null
let interaction: CanvasInteraction | null = null
let simulationInterval: ReturnType<typeof setInterval> | null = null
let saveInterval: ReturnType<typeof setInterval> | null = null
let keyDownHandler: ((e: KeyboardEvent) => void) | null = null

/** Advances the simulation by one tick and runs market selling. Called 20×/sec. */
function simulationStep(): void {
  tick(gameState)
  tickMarket(gameState)

  // Spawn resource particles for goods transported this tick.
  if (renderer !== null && gameState.lastTransfers !== undefined && gameState.lastTransfers.length > 0) {
    renderer.spawnParticles(gameState.lastTransfers)
  }

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
    // Rebuild nodeTypeCounts from the loaded nodes in case the save predates this field.
    const counts: Partial<Record<string, number>> = {}
    for (const n of gameState.nodes) counts[n.type] = (counts[n.type] ?? 0) + 1
    gameState.nodeTypeCounts = counts
    initSequences(saved)
  }

  renderer = new CanvasRenderer('game-canvas')

  // Restore camera state from a previous session, or start at world origin.
  if (saved?.camera !== undefined) {
    renderer.setCamera(saved.camera.panX, saved.camera.panY, saved.camera.zoom)
  }

  renderer.render(gameState)

  const stage = renderer.getStage()
  const containerEl = document.getElementById('game-canvas') as HTMLElement

  // Delete selected node with Delete/Backspace; F = fit to view; 0 = reset zoom.
  keyDownHandler = (e: KeyboardEvent): void => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId.value !== null) {
      e.preventDefault()
      deleteSelectedNode()
    }
    if (e.key === 'f' || e.key === 'F') {
      renderer?.fitToView(gameState.nodes)
    }
    if (e.key === '0') {
      renderer?.resetZoom()
    }
  }
  window.addEventListener('keydown', keyDownHandler)

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
  }, renderer)

  interaction.rebuildDotHits(gameState)

  // Start the simulation loop at 20 ticks/second (section 8).
  simulationInterval = setInterval(simulationStep, 50)

  // Auto-save every 5 seconds, including current camera state.
  saveInterval = setInterval(() => {
    if (renderer !== null) gameState.camera = renderer.getCamera()
    saveState(gameState)
  }, 5000)
})

onUnmounted(() => {
  if (simulationInterval !== null) clearInterval(simulationInterval)
  if (saveInterval !== null) clearInterval(saveInterval)
  if (keyDownHandler !== null) window.removeEventListener('keydown', keyDownHandler)
  interaction?.destroy()
  renderer?.destroy()
})

// Re-render canvas visuals every tick (buffers, progress bars change).
watch(() => gameState.tick, () => {
  renderer?.render(gameState)
})

// Rebuild hit areas when nodes, connections, or input-dot counts change.
// The inputBuffers sum catches sales-point upgrades on Market nodes, which add a
// new input dot without changing nodes.length or connections.length.
watch(
  () =>
    gameState.nodes.length +
    gameState.connections.length +
    gameState.nodes.reduce((sum, n) => sum + n.inputBuffers.length, 0),
  () => {
    if (renderer === null || interaction === null) return
    renderer.render(gameState)
    interaction.rebuildDotHits(gameState)
  },
)

/**
 * Removes the currently selected node (and all its connections) without a refund.
 * Deselects the node after deletion.
 */
function deleteSelectedNode(): void {
  if (selectedNodeId.value === null) return
  removeNode(selectedNodeId.value)
  selectedNodeId.value = null
  refresh()
}

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

      <!-- Canvas container – Konva mounts inside this div, fills remaining space -->
      <div id="game-canvas" class="flex-1 min-w-0 overflow-hidden" />

      <!-- Right detail panel (only visible when a node is selected) -->
      <DetailPanel :node-id="selectedNodeId" @close="selectedNodeId = null" @delete-node="deleteSelectedNode" />
    </div>

    <!-- Win screen overlay (shown when a Rocket has been assembled) -->
    <WinScreen v-if="won" :ticks="gameState.tick" :total-earned="gameState.totalEarned" @restart="restart" />
  </div>
</template>
