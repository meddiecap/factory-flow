/**
 * Pinia store for the Factory Flow game state.
 * Bridges the pure simulation engine with the Vue UI layer.
 * Manages the game loop, node placement, connection management, and upgrades.
 */

import { defineStore } from "pinia"
import { ref, computed } from "vue"
import type {
    GameState,
    GameNode,
    Connection,
    FactoryType,
    UpgradeType,
    ResourceId,
} from "../simulation/types"
import { tick, createNode, buildCost } from "../simulation/engine"
import {
    applyNodeUpgrade,
    applyLineUpgrade,
    upgradeNodeCost,
    upgradeLineCost,
} from "../simulation/upgrades"
import {
    RECIPES,
    DEFAULT_LINE_CAPACITY,
    EXPANSION_BASE_COST,
    EXPANSION_COST_SCALING,
    CANVAS_START_COLS,
    CANVAS_START_ROWS,
} from "../simulation/recipes"
import { TECH_UNLOCKS } from "../simulation/recipes"
import { applyTechUnlocks } from "../simulation/tech-tree"

const TICK_INTERVAL_MS = 50 // 20 ticks/sec

let nodeIdCounter = 1
let connIdCounter = 1

function nextNodeId(): string {
    return `node-${nodeIdCounter++}`
}

function nextConnId(): string {
    return `conn-${connIdCounter++}`
}

/** Creates the initial game state for a new run. */
function createInitialState(): GameState {
    const ironMine = createNode(nextNodeId(), "iron-mine", 1, 1)
    const state: GameState = {
        nodes: [ironMine],
        connections: [],
        money: 0,
        totalEarned: 0,
        unlockedFactories: new Set<FactoryType>(),
        builtCount: { "iron-mine": 1 },
        expansionsPurchased: 0,
        won: false,
    }
    applyTechUnlocks(state)
    return state
}

export const useGameStore = defineStore("game", () => {
    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------

    const gameState = ref<GameState>(createInitialState())
    const isRunning = ref(false)
    const tickCount = ref(0)
    const lastSpeedMultiplier = ref(1.0)
    const lastMoneyEarned = ref(0)
    /** ID of the currently selected node, or null. */
    const selectedNodeId = ref<string | null>(null)
    /** Canvas dimensions in grid cells. */
    const canvasCols = ref(CANVAS_START_COLS)
    const canvasRows = ref(CANVAS_START_ROWS)

    let loopHandle: ReturnType<typeof setInterval> | null = null

    // ---------------------------------------------------------------------------
    // Computed
    // ---------------------------------------------------------------------------

    const nodes = computed(() => gameState.value.nodes)
    const connections = computed(() => gameState.value.connections)
    const money = computed(() => gameState.value.money)
    const totalEarned = computed(() => gameState.value.totalEarned)
    const unlockedFactories = computed(() => gameState.value.unlockedFactories)
    const won = computed(() => gameState.value.won)

    const selectedNode = computed(() =>
        selectedNodeId.value
            ? (gameState.value.nodes.find(
                  (n) => n.id === selectedNodeId.value,
              ) ?? null)
            : null,
    )

    /** Build cost for a factory type given how many the player already has. */
    const buildCostFor = computed(() => (type: FactoryType) => {
        const already = gameState.value.builtCount[type] ?? 0
        return buildCost(type, already)
    })

    /** Whether the player can afford and has unlocked a factory type. */
    const canBuild = computed(() => (type: FactoryType) => {
        return (
            gameState.value.unlockedFactories.has(type) &&
            gameState.value.money >= buildCostFor.value(type)
        )
    })

    /** Canvas expansion cost based on purchases so far. */
    const expansionCost = computed(() =>
        Math.round(
            EXPANSION_BASE_COST *
                Math.pow(
                    EXPANSION_COST_SCALING,
                    gameState.value.expansionsPurchased,
                ),
        ),
    )

    // ---------------------------------------------------------------------------
    // Game loop
    // ---------------------------------------------------------------------------

    /**
     * Starts the simulation game loop at 20 ticks per second.
     * Safe to call multiple times; does nothing if already running.
     */
    function startLoop(): void {
        if (isRunning.value) return
        isRunning.value = true
        loopHandle = setInterval(() => {
            const result = tick(gameState.value)
            tickCount.value += 1
            lastSpeedMultiplier.value = result.speedMultiplier
            lastMoneyEarned.value = result.moneyEarned
        }, TICK_INTERVAL_MS)
    }

    /**
     * Pauses the simulation game loop.
     */
    function stopLoop(): void {
        if (loopHandle !== null) {
            clearInterval(loopHandle)
            loopHandle = null
        }
        isRunning.value = false
    }

    // ---------------------------------------------------------------------------
    // Node actions
    // ---------------------------------------------------------------------------

    /**
     * Places a new factory node on the canvas if the player can afford it.
     * Deducts the build cost and increments builtCount for scaling.
     *
     * @param type - Factory type to place
     * @param col - Grid column for the top-left cell
     * @param row - Grid row for the top-left cell
     * @returns The created node, or null if the player cannot afford it
     */
    function placeNode(
        type: FactoryType,
        col: number,
        row: number,
    ): GameNode | null {
        const cost = buildCostFor.value(type)
        if (gameState.value.money < cost) return null
        if (!gameState.value.unlockedFactories.has(type)) return null

        gameState.value.money -= cost
        gameState.value.builtCount[type] =
            (gameState.value.builtCount[type] ?? 0) + 1

        const node = createNode(nextNodeId(), type, col, row)
        gameState.value.nodes.push(node)
        return node
    }

    /**
     * Removes a node from the canvas and deletes all connected connections.
     *
     * @param nodeId - ID of the node to remove
     */
    function removeNode(nodeId: string): void {
        gameState.value.nodes = gameState.value.nodes.filter(
            (n) => n.id !== nodeId,
        )
        gameState.value.connections = gameState.value.connections.filter(
            (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId,
        )
        if (selectedNodeId.value === nodeId) selectedNodeId.value = null
    }

    /**
     * Moves a node to a new grid position.
     *
     * @param nodeId - ID of the node to move
     * @param col - New column
     * @param row - New row
     */
    function moveNode(nodeId: string, col: number, row: number): void {
        const node = gameState.value.nodes.find((n) => n.id === nodeId)
        if (node) {
            node.col = col
            node.row = row
        }
    }

    // ---------------------------------------------------------------------------
    // Connection actions
    // ---------------------------------------------------------------------------

    /**
     * Creates a connection between an output dot and an input dot.
     * Enforces the one-connection-per-dot rule: if either dot is already used,
     * the existing connection is replaced.
     *
     * @param fromNodeId - Source node ID
     * @param fromResource - Resource coming from the output dot
     * @param toNodeId - Destination node ID
     * @param toResource - Resource entering the input dot
     * @returns The created Connection
     */
    function addConnection(
        fromNodeId: string,
        fromResource: ResourceId,
        toNodeId: string,
        toResource: ResourceId,
    ): Connection {
        // Remove any existing connection using the same dots
        gameState.value.connections = gameState.value.connections.filter(
            (c) =>
                !(
                    c.fromNodeId === fromNodeId &&
                    c.fromResource === fromResource
                ) && !(c.toNodeId === toNodeId && c.toResource === toResource),
        )

        const conn: Connection = {
            id: nextConnId(),
            fromNodeId,
            fromResource,
            toNodeId,
            toResource,
            capacityPerTick: DEFAULT_LINE_CAPACITY,
            capacityUpgradeLevel: 0,
        }
        gameState.value.connections.push(conn)
        return conn
    }

    /**
     * Removes a connection by ID.
     *
     * @param connectionId - ID of the connection to remove
     */
    function removeConnection(connectionId: string): void {
        gameState.value.connections = gameState.value.connections.filter(
            (c) => c.id !== connectionId,
        )
    }

    // ---------------------------------------------------------------------------
    // Upgrade actions
    // ---------------------------------------------------------------------------

    /**
     * Applies an upgrade to a node if the player can afford it.
     *
     * @param nodeId - ID of the node to upgrade
     * @param upgradeType - Which upgrade to apply
     * @returns true if the upgrade was applied
     */
    function upgradeNode(nodeId: string, upgradeType: UpgradeType): boolean {
        return applyNodeUpgrade(gameState.value, nodeId, upgradeType)
    }

    /**
     * Applies a line capacity upgrade to a connection if the player can afford it.
     *
     * @param connectionId - ID of the connection to upgrade
     * @returns true if the upgrade was applied
     */
    function upgradeLine(connectionId: string): boolean {
        return applyLineUpgrade(gameState.value, connectionId)
    }

    // ---------------------------------------------------------------------------
    // Canvas expansion
    // ---------------------------------------------------------------------------

    /**
     * Purchases a canvas expansion (one row or column) if the player can afford it.
     *
     * @param direction - 'row' or 'col'
     * @returns true if the expansion was purchased
     */
    function expandCanvas(direction: "row" | "col"): boolean {
        const cost = expansionCost.value
        if (gameState.value.money < cost) return false

        gameState.value.money -= cost
        gameState.value.expansionsPurchased += 1

        if (direction === "row") canvasRows.value += 1
        else canvasCols.value += 1

        return true
    }

    // ---------------------------------------------------------------------------
    // Helpers for UI
    // ---------------------------------------------------------------------------

    function selectNode(nodeId: string | null): void {
        selectedNodeId.value = nodeId
    }

    function getUpgradeCost(nodeId: string, upgradeType: UpgradeType): number {
        const node = gameState.value.nodes.find((n) => n.id === nodeId)
        if (!node) return Infinity
        return upgradeNodeCost(node, upgradeType)
    }

    function getLineCost(connectionId: string): number {
        const conn = gameState.value.connections.find(
            (c) => c.id === connectionId,
        )
        if (!conn) return Infinity
        return upgradeLineCost(conn)
    }

    return {
        // State (read-only refs for UI)
        gameState,
        isRunning,
        tickCount,
        lastSpeedMultiplier,
        lastMoneyEarned,
        selectedNodeId,
        canvasCols,
        canvasRows,
        // Computed
        nodes,
        connections,
        money,
        totalEarned,
        unlockedFactories,
        won,
        selectedNode,
        buildCostFor,
        canBuild,
        expansionCost,
        // Actions
        startLoop,
        stopLoop,
        placeNode,
        removeNode,
        moveNode,
        addConnection,
        removeConnection,
        upgradeNode,
        upgradeLine,
        expandCanvas,
        selectNode,
        getUpgradeCost,
        getLineCost,
    }
})
