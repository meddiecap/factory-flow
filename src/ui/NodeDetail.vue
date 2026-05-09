/**
 * NodeDetail panel.
 * Shows stats, buffer levels, and upgrade options for the selected node.
 */
<template>
  <div v-if="node" class="detail-panel">
    <div class="detail-header">
      <span class="detail-title">{{ FACTORY_LABELS[node.type] }}</span>
      <button class="close-btn" @click="store.selectNode(null)">✕</button>
    </div>

    <!-- Buffer levels -->
    <section class="section">
      <div class="section-title">Buffers</div>
      <div v-if="inputResources.length" class="buffer-row">
        <span class="buf-label">In</span>
        <div v-for="r in inputResources" :key="r" class="buf-item">
          <span class="res-dot" :style="{ background: RESOURCE_COLORS[r] }" />
          <span class="buf-value">{{ node.inputBuffer[r] ?? 0 }}/{{ node.inputBufferMax }}</span>
        </div>
      </div>
      <div v-if="outputResources.length" class="buffer-row">
        <span class="buf-label">Out</span>
        <div v-for="r in outputResources" :key="r" class="buf-item">
          <span class="res-dot" :style="{ background: RESOURCE_COLORS[r] }" />
          <span class="buf-value">{{ node.outputBuffer[r] ?? 0 }}/{{ node.outputBufferMax }}</span>
        </div>
      </div>
      <div class="progress-bar-row">
        <span class="buf-label">Progress</span>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: progressPct + '%' }" />
        </div>
        <span class="progress-text">{{ node.progress.toFixed(1) }}/{{ recipe.ticksPerCycle }}</span>
      </div>
    </section>

    <!-- Upgrades -->
    <section class="section">
      <div class="section-title">Upgrades</div>
      <div
        v-for="upg in upgrades"
        :key="upg.type"
        class="upgrade-row"
        :class="{ disabled: store.money < upg.cost }"
        @click="applyUpgrade(upg.type)"
      >
        <div class="upg-info">
          <span class="upg-name">{{ upg.label }}</span>
          <span class="upg-level">Lv {{ upg.level }}</span>
        </div>
        <span class="upg-cost">€{{ formatInt(upg.cost) }}</span>
      </div>
    </section>

    <!-- Delete -->
    <div class="action-row">
      <button class="btn btn-danger" @click="removeNode">Remove</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/game';
import { RECIPES } from '../simulation/recipes';
import { FACTORY_LABELS, RESOURCE_COLORS } from '../canvas/visual';
import type { UpgradeType, ResourceId } from '../simulation/types';

const store = useGameStore();

const node = computed(() => store.selectedNode);
const recipe = computed(() => node.value ? RECIPES[node.value.type] : null);

const inputResources = computed((): ResourceId[] =>
  recipe.value?.inputs.map((i) => i.resource) ?? [],
);
const outputResources = computed((): ResourceId[] =>
  recipe.value?.outputs.map((o) => o.resource) ?? [],
);

const progressPct = computed(() => {
  if (!node.value || !recipe.value) return 0;
  return Math.min(100, (node.value.progress / recipe.value.ticksPerCycle) * 100);
});

interface UpgradeInfo { type: UpgradeType; label: string; level: number; cost: number; }

const upgrades = computed((): UpgradeInfo[] => {
  if (!node.value) return [];
  const n = node.value;
  return [
    { type: 'speed',             label: 'Speed',          level: n.upgrades.speed,             cost: store.getUpgradeCost(n.id, 'speed') },
    { type: 'buffer',            label: 'Buffer',         level: n.upgrades.buffer,            cost: store.getUpgradeCost(n.id, 'buffer') },
    { type: 'efficiency',        label: 'Efficiency',     level: n.upgrades.efficiency,        cost: store.getUpgradeCost(n.id, 'efficiency') },
    { type: 'energy-efficiency', label: 'Energy Eff.',    level: n.upgrades.energyEfficiency,  cost: store.getUpgradeCost(n.id, 'energy-efficiency') },
  ];
});

function applyUpgrade(type: UpgradeType): void {
  if (!node.value) return;
  store.upgradeNode(node.value.id, type);
}

function removeNode(): void {
  if (!node.value) return;
  store.removeNode(node.value.id);
}

function formatInt(n: number): string {
  return Math.floor(n).toLocaleString('nl-NL');
}
</script>

<style scoped>
.detail-panel {
  width: 220px;
  background: rgba(16, 18, 32, 0.97);
  border-left: 1px solid #2a2d42;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
  font-family: monospace;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 6px;
  border-bottom: 1px solid #1e2030;
}

.detail-title {
  font-size: 12px;
  color: #c0d0ff;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: #6070a0;
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
}

.section {
  padding: 8px 12px;
  border-bottom: 1px solid #1a1d2e;
}

.section-title {
  font-size: 10px;
  color: #5060a0;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 6px;
}

.buffer-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.buf-label {
  font-size: 10px;
  color: #6070a0;
  width: 20px;
  flex-shrink: 0;
}

.buf-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.res-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.buf-value {
  font-size: 10px;
  color: #a0b0c8;
}

.progress-bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.progress-bar-bg {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #4488cc;
  border-radius: 3px;
  transition: width 0.05s linear;
}

.progress-text {
  font-size: 9px;
  color: #5060a0;
  width: 36px;
  text-align: right;
}

.upgrade-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
  cursor: pointer;
  border-radius: 3px;
  padding: 5px 4px;
  transition: background 0.1s;
}

.upgrade-row:hover:not(.disabled) {
  background: rgba(60, 80, 180, 0.25);
}

.upgrade-row.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.upg-info {
  display: flex;
  flex-direction: column;
}

.upg-name {
  font-size: 11px;
  color: #c0c8e0;
}

.upg-level {
  font-size: 9px;
  color: #5060a0;
}

.upg-cost {
  font-size: 11px;
  color: #f5c842;
}

.action-row {
  padding: 8px 12px;
  margin-top: auto;
}

.btn {
  padding: 5px 12px;
  font-family: monospace;
  font-size: 11px;
  cursor: pointer;
  border-radius: 3px;
  border: 1px solid;
  width: 100%;
}

.btn-danger {
  background: rgba(80, 20, 20, 0.6);
  border-color: #804040;
  color: #ff8888;
}

.btn-danger:hover {
  background: rgba(120, 30, 30, 0.7);
}
</style>
