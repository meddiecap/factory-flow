/**
 * HUD (Heads-Up Display) component.
 * Shows money, total earned, speed multiplier, game status, and play/pause.
 */
<template>
  <div class="hud">
    <div class="hud-section">
      <span class="hud-label">Money</span>
      <span class="hud-value money">€{{ formatInt(store.money) }}</span>
    </div>
    <div class="hud-section">
      <span class="hud-label">Earned</span>
      <span class="hud-value">€{{ formatInt(store.totalEarned) }}</span>
    </div>
    <div class="hud-section">
      <span class="hud-label">Speed</span>
      <span class="hud-value" :class="speedClass">×{{ store.lastSpeedMultiplier.toFixed(2) }}</span>
    </div>
    <div class="hud-section">
      <span class="hud-label">Next unlock</span>
      <span class="hud-value small">
        <template v-if="nextUnlock !== null">€{{ formatInt(nextUnlock) }}</template>
        <template v-else>All unlocked</template>
      </span>
    </div>
    <div class="hud-controls">
      <button class="btn" @click="toggleLoop">
        {{ store.isRunning ? '⏸ Pause' : '▶ Play' }}
      </button>
    </div>
    <div v-if="store.won" class="hud-win">🚀 Rocket launched! You win!</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/game';
import { nextUnlockThreshold } from '../simulation/tech-tree';

const store = useGameStore();

const nextUnlock = computed(() => nextUnlockThreshold(store.gameState));

const speedClass = computed(() => {
  if (store.lastSpeedMultiplier >= 1.5) return 'green';
  if (store.lastSpeedMultiplier >= 1.0) return 'normal';
  return 'red';
});

function formatInt(n: number): string {
  return Math.floor(n).toLocaleString('nl-NL');
}

function toggleLoop(): void {
  if (store.isRunning) store.stopLoop();
  else store.startLoop();
}
</script>

<style scoped>
.hud {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 6px 16px;
  background: rgba(10, 12, 24, 0.95);
  border-bottom: 1px solid #2a2d42;
  font-family: monospace;
  font-size: 13px;
  color: #e0e4f0;
  flex-shrink: 0;
}

.hud-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 80px;
}

.hud-label {
  font-size: 10px;
  color: #6070a0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.hud-value {
  font-size: 14px;
  font-weight: bold;
}

.hud-value.small {
  font-size: 12px;
}

.hud-value.money {
  color: #f5c842;
}

.hud-value.green { color: #44dd44; }
.hud-value.normal { color: #e0e4f0; }
.hud-value.red { color: #dd4444; }

.hud-controls {
  margin-left: auto;
}

.btn {
  padding: 4px 12px;
  background: #2a3060;
  border: 1px solid #404888;
  color: #c0d0ff;
  font-family: monospace;
  font-size: 12px;
  cursor: pointer;
  border-radius: 3px;
  transition: background 0.15s;
}

.btn:hover {
  background: #3a4080;
}

.hud-win {
  font-size: 15px;
  color: #f5c842;
  font-weight: bold;
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.7; }
  to { opacity: 1; }
}
</style>
