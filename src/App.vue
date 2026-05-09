<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { CanvasRenderer, GRID_COLS, GRID_ROWS, CELL_SIZE } from './canvas/CanvasRenderer'
import { NodeType, ResourceType } from './simulation/types'
import type { GameState } from './simulation/types'

// Hardcoded GameState for visual testing (Fase 4).
// Shows an Iron Mine and an Energy Supply connected on the canvas.
const state: GameState = {
  nodes: [
    {
      id: 'iron-mine-1',
      type: NodeType.IronMine,
      position: { col: 1, row: 1 },
      progress: 0,
      status: 'active',
      inputBuffers: [],
      outputBuffers: [{ resource: ResourceType.IronOre, amount: 5, capacity: 20 }],
      speedUpgradeLevel: 0,
      bufferUpgradeLevel: 0,
      efficiencyUpgradeLevel: 0,
      energyEfficiencyUpgradeLevel: 0,
    },
    {
      id: 'energy-supply-1',
      type: NodeType.EnergySupply,
      position: { col: 1, row: 3 },
      progress: 0,
      status: 'active',
      inputBuffers: [],
      outputBuffers: [{ resource: ResourceType.Fuel, amount: 10, capacity: 20 }],
      speedUpgradeLevel: 0,
      bufferUpgradeLevel: 0,
      efficiencyUpgradeLevel: 0,
      energyEfficiencyUpgradeLevel: 0,
    },
    {
      id: 'smelter-1',
      type: NodeType.Smelter,
      position: { col: 5, row: 1 },
      progress: 0,
      status: 'waiting',
      inputBuffers: [
        { resource: ResourceType.IronOre, amount: 2, capacity: 20 },
        { resource: ResourceType.Coal, amount: 0, capacity: 20 },
      ],
      outputBuffers: [{ resource: ResourceType.Steel, amount: 0, capacity: 10 }],
      speedUpgradeLevel: 0,
      bufferUpgradeLevel: 0,
      efficiencyUpgradeLevel: 0,
      energyEfficiencyUpgradeLevel: 0,
    },
  ],
  connections: [
    {
      id: 'c1',
      fromNodeId: 'iron-mine-1',
      fromDotIndex: 0,
      toNodeId: 'smelter-1',
      toDotIndex: 0,
      capacity: 10,
      capacityUpgradeLevel: 0,
    },
  ],
  money: 0,
  totalEarned: 0,
  tick: 0,
}

const canvasWidth = GRID_COLS * CELL_SIZE
const canvasHeight = GRID_ROWS * CELL_SIZE

let renderer: CanvasRenderer | null = null

onMounted(() => {
  renderer = new CanvasRenderer('game-canvas')
  renderer.render(state)
})

onUnmounted(() => {
  renderer?.destroy()
})
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-gray-900">
    <!-- Canvas container – Konva mounts inside this div -->
    <div id="game-canvas" :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }" class="m-auto" />
  </div>
</template>
