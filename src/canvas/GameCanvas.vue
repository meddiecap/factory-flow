/**
* GameCanvas Vue component.
* Mounts a Konva Stage and renders the full game canvas:
* - Background grid
* - Node boxes with dots and buffer bars
* - Connection lines
* - Interactive drag, click, and connection drawing
*/
<template>
    <div ref="containerRef" class="game-canvas-container" :class="{ 'placement-mode': placementType }"
        @contextmenu.prevent />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import Konva from 'konva';
import { useGameStore } from '../stores/game';
import { CELL_SIZE, gridToPixel, pixelToGrid, inputDotPosition, outputDotPosition } from './grid';
import { FACTORY_COLORS, FACTORY_LABELS, RESOURCE_COLORS, COLORS } from './visual';
import { RECIPES } from '../simulation/recipes';
import type { GameNode, ResourceId, FactoryType } from '../simulation/types';

// ---------------------------------------------------------------------------
// Props / emits
// ---------------------------------------------------------------------------

const props = defineProps<{
    /** When set, the next background click places a node of this type. */
    placementType: FactoryType | null;
}>();

const emit = defineEmits<{
    /** Emitted when the user right-clicks a node (for context menu). */
    nodeContextMenu: [nodeId: string, x: number, y: number];
    /** Emitted when user clicks the canvas background in normal mode. */
    backgroundClick: [];
    /** Emitted when user clicks the canvas background and a placement type is active. */
    placeAt: [col: number, row: number];
}>();

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const store = useGameStore();

// ---------------------------------------------------------------------------
// Konva setup
// ---------------------------------------------------------------------------

const containerRef = ref<HTMLDivElement | null>(null);
let stage: Konva.Stage | null = null;
let gridLayer: Konva.Layer | null = null;
let connectionLayer: Konva.Layer | null = null;
let nodeLayer: Konva.Layer | null = null;
let uiLayer: Konva.Layer | null = null;

/** Map from nodeId → Konva.Group for fast lookup on updates. */
const nodeGroups = new Map<string, Konva.Group>();
/** Map from connectionId → Konva.Line for fast lookup. */
const connLines = new Map<string, Konva.Arrow>();

// Drag-to-connect state
let connectingFrom: { nodeId: string; resource: ResourceId; isOutput: boolean } | null = null;
let tempLine: Konva.Line | null = null;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(() => {
    if (!containerRef.value) return;

    const w = store.canvasCols * CELL_SIZE;
    const h = store.canvasRows * CELL_SIZE;

    stage = new Konva.Stage({
        container: containerRef.value,
        width: w,
        height: h,
        draggable: false,
    });

    // Enable zoom via wheel
    stage.on('wheel', (e) => {
        e.evt.preventDefault();
        const scaleBy = 1.08;
        const oldScale = stage!.scaleX();
        const pointer = stage!.getPointerPosition()!;
        const mousePointTo = {
            x: (pointer.x - stage!.x()) / oldScale,
            y: (pointer.y - stage!.y()) / oldScale,
        };
        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
        const clampedScale = Math.max(0.3, Math.min(3, newScale));
        stage!.scale({ x: clampedScale, y: clampedScale });
        stage!.position({
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
        });
    });

    // Pan via middle mouse
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    stage.on('mousedown', (e) => {
        if (e.evt.button === 1) {
            isPanning = true;
            panStart = { x: e.evt.clientX - stage!.x(), y: e.evt.clientY - stage!.y() };
            e.evt.preventDefault();
        }
    });
    stage.on('mousemove', (e) => {
        if (isPanning) {
            stage!.position({ x: e.evt.clientX - panStart.x, y: e.evt.clientY - panStart.y });
        }
        if (tempLine) {
            const pos = stage!.getRelativePointerPosition()!;
            const pts = tempLine.points();
            tempLine.points([pts[0], pts[1], pos.x, pos.y]);
            uiLayer!.batchDraw();
        }
    });
    stage.on('mouseup', (e) => {
        if (e.evt.button === 1) isPanning = false;
        if (connectingFrom && e.target === stage) {
            // Released on background: cancel connection
            cancelConnect();
        }
    });

    // Click background → place node or deselect
    stage.on('click', (e) => {
        if (e.target === stage) {
            const relPos = stage!.getRelativePointerPosition()!;
            const grid = pixelToGrid(relPos.x, relPos.y, store.canvasCols, store.canvasRows);
            if (props.placementType) {
                emit('placeAt', grid.col, grid.row);
            } else {
                store.selectNode(null);
                emit('backgroundClick');
            }
        }
    });

    gridLayer = new Konva.Layer();
    connectionLayer = new Konva.Layer();
    nodeLayer = new Konva.Layer();
    uiLayer = new Konva.Layer();

    stage.add(gridLayer);
    stage.add(connectionLayer);
    stage.add(nodeLayer);
    stage.add(uiLayer);

    drawGrid();
    renderAll();
});

onUnmounted(() => {
    stage?.destroy();
});

// ---------------------------------------------------------------------------
// Watchers: re-render when store state changes
// ---------------------------------------------------------------------------

// Re-render nodes on each tick (buffer levels change frequently)
watch(
    () => store.tickCount,
    () => {
        updateNodeBuffers();
        updateConnections();
    },
);

// Full re-render when nodes or connections are added/removed
watch(
    () => [store.nodes.length, store.connections.length],
    () => renderAll(),
);

// Highlight selected node
watch(
    () => store.selectedNodeId,
    () => updateNodeSelection(),
);

// Resize stage if canvas dimensions change
watch(
    [() => store.canvasCols, () => store.canvasRows],
    () => {
        stage?.width(store.canvasCols * CELL_SIZE);
        stage?.height(store.canvasRows * CELL_SIZE);
        drawGrid();
    },
);

// ---------------------------------------------------------------------------
// Grid drawing
// ---------------------------------------------------------------------------

function drawGrid(): void {
    gridLayer!.destroyChildren();
    const w = store.canvasCols * CELL_SIZE;
    const h = store.canvasRows * CELL_SIZE;

    // Background
    gridLayer!.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, fill: '#0d0f1a' }));

    // Grid lines
    for (let col = 0; col <= store.canvasCols; col++) {
        gridLayer!.add(
            new Konva.Line({
                points: [col * CELL_SIZE, 0, col * CELL_SIZE, h],
                stroke: COLORS.gridLine,
                strokeWidth: 1,
            }),
        );
    }
    for (let row = 0; row <= store.canvasRows; row++) {
        gridLayer!.add(
            new Konva.Line({
                points: [0, row * CELL_SIZE, w, row * CELL_SIZE],
                stroke: COLORS.gridLine,
                strokeWidth: 1,
            }),
        );
    }
    gridLayer!.batchDraw();
}

// ---------------------------------------------------------------------------
// Full render
// ---------------------------------------------------------------------------

function renderAll(): void {
    nodeLayer!.destroyChildren();
    nodeGroups.clear();
    for (const node of store.nodes) {
        nodeGroups.set(node.id, buildNodeGroup(node));
        nodeLayer!.add(nodeGroups.get(node.id)!);
    }
    nodeLayer!.batchDraw();

    connectionLayer!.destroyChildren();
    connLines.clear();
    for (const conn of store.connections) {
        const line = buildConnectionLine(conn.id);
        if (line) {
            connLines.set(conn.id, line);
            connectionLayer!.add(line);
        }
    }
    connectionLayer!.batchDraw();
}

// ---------------------------------------------------------------------------
// Node group builder
// ---------------------------------------------------------------------------

function buildNodeGroup(node: GameNode): Konva.Group {
    const recipe = RECIPES[node.type];
    const [wCells, hCells] = recipe.gridSize;
    const px = gridToPixel(node.col, node.row);
    const w = wCells * CELL_SIZE;
    const h = hCells * CELL_SIZE;

    const group = new Konva.Group({ x: px.x, y: px.y, draggable: true });

    // Node body
    const rect = new Konva.Rect({
        width: w,
        height: h,
        fill: FACTORY_COLORS[node.type],
        stroke: COLORS.nodeStroke,
        strokeWidth: 1.5,
        cornerRadius: 4,
        name: 'body',
    });
    group.add(rect);

    // Label
    group.add(
        new Konva.Text({
            x: 6,
            y: 6,
            width: w - 12,
            text: FACTORY_LABELS[node.type],
            fontSize: 10,
            fill: COLORS.textPrimary,
            fontFamily: 'monospace',
            ellipsis: true,
            wrap: 'none',
        }),
    );

    // Buffer bar (output)
    const barY = h - 10;
    group.add(
        new Konva.Rect({
            x: 6, y: barY, width: w - 12, height: 6,
            fill: COLORS.bufferBg, cornerRadius: 2, name: 'bufferBg',
        }),
    );
    const bufferFill = new Konva.Rect({
        x: 6, y: barY, width: 0, height: 6,
        fill: COLORS.bufferFill, cornerRadius: 2, name: 'bufferFill',
    });
    group.add(bufferFill);
    updateBufferBar(node, group, w);

    // Input dots (left edge)
    const inputDots = recipe.inputs;
    inputDots.forEach((inp, i) => {
        const dotPos = inputDotPosition(0, 0, i, inputDots.length, hCells);
        const dot = new Konva.Circle({
            x: dotPos.x,
            y: dotPos.y,
            radius: 7,
            fill: RESOURCE_COLORS[inp.resource],
            stroke: '#ffffff33',
            strokeWidth: 1,
            name: `input-dot-${inp.resource}`,
        });
        dot.on('mousedown', (e) => {
            e.cancelBubble = true;
            startConnect(node.id, inp.resource, false, dotPos.x + px.x, dotPos.y + px.y);
        });
        dot.on('mouseup', () => {
            if (connectingFrom && connectingFrom.isOutput) {
                store.addConnection(connectingFrom.nodeId, connectingFrom.resource, node.id, inp.resource);
                cancelConnect();
                renderAll();
            }
        });
        group.add(dot);
    });

    // Output dots (right edge)
    const outputDots = recipe.outputs;
    outputDots.forEach((out, i) => {
        const dotPos = outputDotPosition(0, 0, wCells, hCells, i, outputDots.length);
        const dot = new Konva.Circle({
            x: dotPos.x,
            y: dotPos.y,
            radius: 7,
            fill: RESOURCE_COLORS[out.resource],
            stroke: '#ffffff33',
            strokeWidth: 1,
            name: `output-dot-${out.resource}`,
        });
        dot.on('mousedown', (e) => {
            e.cancelBubble = true;
            startConnect(node.id, out.resource, true, dotPos.x + px.x, dotPos.y + px.y);
        });
        dot.on('mouseup', () => {
            if (connectingFrom && !connectingFrom.isOutput) {
                store.addConnection(node.id, out.resource, connectingFrom.nodeId, connectingFrom.resource);
                cancelConnect();
                renderAll();
            }
        });
        group.add(dot);
    });

    // Drag to reposition
    group.on('dragend', () => {
        const newPos = group.position();
        const grid = pixelToGrid(newPos.x, newPos.y, store.canvasCols, store.canvasRows);
        // Snap to grid
        group.position(gridToPixel(grid.col, grid.row));
        store.moveNode(node.id, grid.col, grid.row);
        renderAll();
    });

    // Click to select
    group.on('click', (e) => {
        e.cancelBubble = true;
        store.selectNode(node.id);
    });

    // Right-click context menu
    group.on('contextmenu', (e) => {
        e.evt.preventDefault();
        e.cancelBubble = true;
        const pos = stage!.getPointerPosition()!;
        emit('nodeContextMenu', node.id, pos.x, pos.y);
    });

    return group;
}

// ---------------------------------------------------------------------------
// Buffer bar update (called every tick)
// ---------------------------------------------------------------------------

function updateBufferBar(node: GameNode, group: Konva.Group, nodeWidthPx: number): void {
    const recipe = RECIPES[node.type];
    const totalOutput = Object.values(node.outputBuffer).reduce((a, b) => a + b, 0);
    const ratio = node.outputBufferMax > 0 ? Math.min(1, totalOutput / node.outputBufferMax) : 0;
    const barFill = group.findOne('.bufferFill') as Konva.Rect | undefined;
    if (barFill) barFill.width(Math.max(0, (nodeWidthPx - 12) * ratio));
}

function updateNodeBuffers(): void {
    for (const node of store.nodes) {
        const group = nodeGroups.get(node.id);
        if (!group) continue;
        const recipe = RECIPES[node.type];
        const [wCells] = recipe.gridSize;
        updateBufferBar(node, group, wCells * CELL_SIZE);
    }
    nodeLayer!.batchDraw();
}

// ---------------------------------------------------------------------------
// Node selection highlight
// ---------------------------------------------------------------------------

function updateNodeSelection(): void {
    for (const [id, group] of nodeGroups) {
        const body = group.findOne('.body') as Konva.Rect | undefined;
        if (body) {
            body.stroke(id === store.selectedNodeId ? COLORS.nodeStrokeSelected : COLORS.nodeStroke);
            body.strokeWidth(id === store.selectedNodeId ? 2.5 : 1.5);
        }
    }
    nodeLayer!.batchDraw();
}

// ---------------------------------------------------------------------------
// Connection lines
// ---------------------------------------------------------------------------

function buildConnectionLine(connId: string): Konva.Arrow | null {
    const conn = store.connections.find((c) => c.id === connId);
    if (!conn) return null;

    const fromNode = store.nodes.find((n) => n.id === conn.fromNodeId);
    const toNode = store.nodes.find((n) => n.id === conn.toNodeId);
    if (!fromNode || !toNode) return null;

    const fromRecipe = RECIPES[fromNode.type];
    const toRecipe = RECIPES[toNode.type];
    const [fromW, fromH] = fromRecipe.gridSize;
    const [, toH] = toRecipe.gridSize;

    const fromOutputs = fromRecipe.outputs;
    const fromSlot = fromOutputs.findIndex((o) => o.resource === conn.fromResource);
    const fromPos = outputDotPosition(fromNode.col, fromNode.row, fromW, fromH, fromSlot, fromOutputs.length);

    const toInputs = toRecipe.inputs;
    const toSlot = toInputs.findIndex((i) => i.resource === conn.toResource);
    const toPos = inputDotPosition(toNode.col, toNode.row, toSlot, toInputs.length, toH);

    const color = RESOURCE_COLORS[conn.fromResource] ?? '#ffffff';

    const line = new Konva.Arrow({
        points: [fromPos.x, fromPos.y, toPos.x, toPos.y],
        stroke: color,
        strokeWidth: 2,
        fill: color,
        pointerLength: 8,
        pointerWidth: 6,
        opacity: 0.8,
        listening: true,
        name: connId,
    });

    line.on('click', (e) => {
        e.cancelBubble = true;
        // TODO: open connection upgrade panel
    });

    return line;
}

function updateConnections(): void {
    // Full redraw of connection layer each tick (positions may change after moves)
    connectionLayer!.destroyChildren();
    connLines.clear();
    for (const conn of store.connections) {
        const line = buildConnectionLine(conn.id);
        if (line) {
            connLines.set(conn.id, line);
            connectionLayer!.add(line);
        }
    }
    connectionLayer!.batchDraw();
}

// ---------------------------------------------------------------------------
// Drag-to-connect
// ---------------------------------------------------------------------------

function startConnect(
    nodeId: string,
    resource: ResourceId,
    isOutput: boolean,
    startX: number,
    startY: number,
): void {
    connectingFrom = { nodeId, resource, isOutput };
    tempLine = new Konva.Line({
        points: [startX, startY, startX, startY],
        stroke: RESOURCE_COLORS[resource],
        strokeWidth: 2,
        dash: [6, 3],
        opacity: 0.7,
    });
    uiLayer!.add(tempLine);
}

function cancelConnect(): void {
    tempLine?.destroy();
    tempLine = null;
    connectingFrom = null;
    uiLayer!.batchDraw();
}
</script>

<style scoped>
.game-canvas-container {
    cursor: crosshair;
    overflow: hidden;
    background: #0d0f1a;
}

.game-canvas-container.placement-mode {
    cursor: cell;
}
</style>
