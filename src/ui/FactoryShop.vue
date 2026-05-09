/**
* FactoryShop panel.
* Lists all unlocked factory types with build costs and lets the player
* select a factory to place on the canvas.
*/
<template>
    <div class="shop-panel">
        <h3 class="panel-title">Factory Shop</h3>
        <div class="factory-list">
            <div v-for="type in allTypes" :key="type" class="factory-item" :class="{
                locked: !store.unlockedFactories.has(type),
                selected: selectedType === type,
                affordable: store.canBuild(type),
            }" @click="selectType(type)">
                <div class="factory-name">{{ FACTORY_LABELS[type] }}</div>
                <div class="factory-cost">
                    <template v-if="store.unlockedFactories.has(type)">
                        €{{ formatInt(store.buildCostFor(type)) }}
                    </template>
                    <template v-else>
                        🔒 €{{ formatInt(unlockThreshold(type)) }}
                    </template>
                </div>
                <div class="factory-size">{{ gridSize(type) }}</div>
            </div>
        </div>
        <div v-if="selectedType" class="placement-hint">
            Click on the canvas to place
            <span class="factory-name-inline">{{ FACTORY_LABELS[selectedType] }}</span>
            — or press <kbd>Esc</kbd> to cancel
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useGameStore } from '../stores/game';
import { RECIPES, TECH_UNLOCKS } from '../simulation/recipes';
import { FACTORY_LABELS } from '../canvas/visual';
import type { FactoryType } from '../simulation/types';

const props = defineProps<{
    /** Currently active placement type, or null if no placement is in progress. */
    selectedPlacement: FactoryType | null;
}>();

const store = useGameStore();

// All factory types in build order
const allTypes: FactoryType[] = [
    'iron-mine', 'coal-mine', 'copper-mine', 'silicon-mine',
    'energy-supply', 'smelter', 'cable-factory', 'foundry',
    'chip-factory', 'electronics', 'engine-factory', 'assembly',
    'splitter', 'warehouse', 'market',
];

const emit = defineEmits<{
    /** Emitted when the user wants to place a factory type. */
    selectForPlacement: [type: FactoryType | null];
}>();

const selectedType = ref<FactoryType | null>(props.selectedPlacement);

// Sync internal selection when parent cancels placement (e.g. Esc key).
watch(
    () => props.selectedPlacement,
    (val) => { selectedType.value = val; },
);

function selectType(type: FactoryType): void {
    if (!store.unlockedFactories.has(type)) return;
    if (!store.canBuild(type)) return;
    selectedType.value = type === selectedType.value ? null : type;
    emit('selectForPlacement', selectedType.value);
}

function clearSelection(): void {
    selectedType.value = null;
    emit('selectForPlacement', null);
}

function formatInt(n: number): string {
    return Math.floor(n).toLocaleString('nl-NL');
}

function gridSize(type: FactoryType): string {
    const [w, h] = RECIPES[type].gridSize;
    return `${w}×${h}`;
}

function unlockThreshold(type: FactoryType): number {
    for (const tier of TECH_UNLOCKS) {
        if (tier.factories.includes(type)) return tier.requiredEarned;
    }
    return 0;
}

// Expose method so parent can cancel placement on Esc
defineExpose({ clearSelection });
</script>

<style scoped>
.shop-panel {
    width: 200px;
    background: rgba(16, 18, 32, 0.97);
    border-right: 1px solid #2a2d42;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex-shrink: 0;
}

.panel-title {
    font-family: monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6070a0;
    padding: 10px 12px 6px;
    margin: 0;
    border-bottom: 1px solid #1e2030;
}

.factory-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px;
}

.factory-item {
    padding: 6px 8px;
    border-radius: 3px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background 0.1s;
    font-family: monospace;
}

.factory-item.locked {
    opacity: 0.4;
    cursor: not-allowed;
}

.factory-item:not(.locked):hover {
    background: rgba(60, 80, 140, 0.3);
}

.factory-item.selected {
    background: rgba(60, 100, 200, 0.35);
    border-color: #4060c0;
}

.factory-item:not(.locked):not(.affordable) {
    opacity: 0.55;
}

.factory-name {
    font-size: 11px;
    color: #c0d0e8;
    font-weight: bold;
}

.factory-name-inline {
    color: #88aaff;
}

.factory-cost {
    font-size: 10px;
    color: #f5c842;
    margin-top: 1px;
}

.factory-size {
    font-size: 9px;
    color: #5060a0;
    margin-top: 1px;
}

.placement-hint {
    padding: 8px 12px;
    font-size: 11px;
    color: #8090b0;
    font-family: monospace;
    border-top: 1px solid #1e2030;
    margin-top: auto;
}

kbd {
    background: #2a3060;
    border: 1px solid #404888;
    padding: 1px 4px;
    border-radius: 2px;
    font-size: 10px;
}
</style>
