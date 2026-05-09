/**
* App root component.
* Wires together the HUD, factory shop, main canvas, and node detail panel.
* Manages placement mode: user selects a factory in the shop, then clicks
* the canvas to place it at the clicked grid cell.
*/
<template>
  <div class="app-root">
    <HudBar />

    <div class="main-area">
      <!-- Left: factory shop -->
      <FactoryShop :selected-placement="placementType" @select-for-placement="setPlacementType" />

      <!-- Center: scrollable canvas wrapper -->
      <div class="canvas-wrapper">
        <GameCanvas :placement-type="placementType" @place-at="handlePlaceAt" @node-context-menu="handleContextMenu" />
      </div>

      <!-- Right: node detail panel (only when a node is selected) -->
      <NodeDetail v-if="store.selectedNode" />
    </div>

    <!-- Context menu overlay -->
    <div v-if="contextMenu" class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @mouseleave="contextMenu = null">
      <button class="ctx-item" @click="deleteContextNode">Delete node</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from './stores/game';
import HudBar from './ui/HudBar.vue';
import FactoryShop from './ui/FactoryShop.vue';
import NodeDetail from './ui/NodeDetail.vue';
import GameCanvas from './canvas/GameCanvas.vue';
import type { FactoryType } from './simulation/types';

const store = useGameStore();

// ---------------------------------------------------------------------------
// Placement mode
// ---------------------------------------------------------------------------

const placementType = ref<FactoryType | null>(null);

function setPlacementType(type: FactoryType | null): void {
  placementType.value = type;
}

function handlePlaceAt(col: number, row: number): void {
  if (!placementType.value) return;
  store.placeNode(placementType.value, col, row);
  // Keep placement type active so the user can place multiple nodes in a row.
  // Press Esc to cancel.
}

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

interface ContextMenu { nodeId: string; x: number; y: number; }
const contextMenu = ref<ContextMenu | null>(null);

function handleContextMenu(nodeId: string, x: number, y: number): void {
  contextMenu.value = { nodeId, x, y };
}

function deleteContextNode(): void {
  if (!contextMenu.value) return;
  store.removeNode(contextMenu.value.nodeId);
  contextMenu.value = null;
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    placementType.value = null;
    contextMenu.value = null;
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  store.startLoop();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  store.stopLoop();
});
</script>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #0d0f1a;
  color: #c0c8e0;
}

.main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.canvas-wrapper {
  flex: 1;
  overflow: auto;
  min-width: 0;
}

/* Context overlay */
.context-menu {
  position: fixed;
  z-index: 100;
  background: rgba(16, 18, 32, 0.97);
  border: 1px solid #2a2d42;
  border-radius: 4px;
  padding: 4px 0;
  min-width: 140px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.ctx-item {
  display: block;
  width: 100%;
  padding: 6px 14px;
  background: none;
  border: none;
  color: #c0c8e0;
  font-family: monospace;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.ctx-item:hover {
  background: rgba(60, 80, 180, 0.3);
}
</style>
