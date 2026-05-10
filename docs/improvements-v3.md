# Verbeterpunten v3 – Performance & DRY

Inventaris van concrete verbeterpunten opgesteld op basis van codeanalyse (mei 2026).
Uitvoeren in willekeurige volgorde; elk punt is onafhankelijk tenzij anders vermeld.

## Performance

### P1 — O(n²) in `calcNodeSpeedFactors` (`simulation/energy.ts`)

`energyConns.find(c => c.toNodeId === node.id)` en `energyConns.filter(c => c.fromNodeId === supply.id)` worden **per node** opnieuw uitgevoerd → O(nodes × connections).

**Fix:** bouw vóór de node-loop twee Maps:

- `Map<toNodeId, Connection>` (één energy-conn per afnemer)
- `Map<fromNodeId, Connection[]>` (alle afnemers per supply)

Dan is de inner loop O(1) en de totale complexiteit O(n).

---

### P2 — O(n²) in `drawConnections` (`canvas/renderer/connections.ts`)

Binnen de per-connection loop: `connections.filter(c => c.isEnergy && c.fromNodeId === src.id)` → O(connections²).

**Fix:** bouw buiten de loop een `Map<nodeId, number>` van energyOutputCounts en geef die mee als parameter.

---

### P3 — O(n²) in `buildDotHitShapes` (`canvas/interaction/hit-builder.ts`)

`state.connections.filter(c => c.isEnergy && c.fromNodeId === node.id)` staat in de per-node loop → O(nodes × connections).

**Fix:** zelfde Map als P2; geef als parameter door of bouw hem lokaal vóór de loop.

---

### P4 — `nodeMap` vier keer per tick opgebouwd

`tickConnections`, `calcNodeSpeedFactors`, `render()` en `spawnParticles()` bouwen elk zelfstandig een `new Map<string, NodeInstance>`. Vier O(n)-iteraties per tick puur voor index-opbouw.

**Fix:** bouw de nodeMap éénmalig in `tick()` en geef hem door als parameter aan de functies die hem nodig hebben. Hetzelfde voor `spawnParticles` en `render`.

---

### P5 — `calcNodeSpeedFactors` dubbel berekend per tick

`simulator.ts` roept `calcNodeSpeedFactors` aan voor tick-logica; daarna roept `render()` in `canvas/renderer/index.ts` het **opnieuw** aan voor de renderer. Het resultaat wordt niet meegegeven.

**Fix:** geef het `Map<string, number>` resultaat terug uit `tick()` (of sla het op in `GameState.lastSpeedFactors`) en hergebruik het in de renderer.

---

### P6 — O(n) lookups in `traceUnitsPerTick` (`simulation/throughput.ts`)

Gebruikt `nodes.find()` en `connections.find()` recursief per recursielaag — geen index. Bij diepe ketens O(depth × n).

**Fix:** geef een pre-built `nodeMap: Map<string, NodeInstance>` en `connsByTarget: Map<string, Connection>` mee als parameters.

---

### P7 — DFS in `wouldCreateCycle` itereert alle connections per stap (`simulation/useGameState.ts`)

Per bezocht knooppunt loopt de DFS over **alle** connections: `for (const c of connections)`. Worst case O(nodes × connections).

**Fix:** bouw vóór de DFS een adjacency-`Map<string, string[]>` (fromNodeId → toNodeIds), dan is traversal O(nodes + connections).

---

### P8 — `simulator.ts` loopt twee keer over `nodes`

Iteratie 1: alle niet-Splitter nodes; iteratie 2: alleen Splitters. Beide lopen over de volledige array.

**Fix:** één pass die Splitters uitstelt naar een lokale array en die daarna afwerkt — of één pass met twee fasen zonder aparte array.

---

### P9 — `countNodes` gebruikt `.filter()` per plaatsingspoging (`simulation/useGameState.ts`)

`gameState.nodes.filter(n => n.type === type).length` scant alle nodes bij elke klik op 'Place'.

**Fix:** vervang door een `Map<NodeType, number>` die wordt bijgehouden in `placeNode` en bij het wissen van nodes.

---

## DRY

### D1 — `effectiveFuelPerTick` en `effectiveInputAmount` zijn vrijwel identiek (`simulation/tick.ts`)

Beide berekenen `Math.max(0.5, 1 - level * 0.1) * base`. De reductiefactor is duplicaat.

**Fix:** extraheer `upgradeReductionFactor(level: number): number` en gebruik die in beide bestaande functies.

---

### D2 — Salespoint-kostenformule gedupliceerd (`simulation/upgrades.ts` + `components/DetailPanel.vue`)

`Math.ceil(200 * 2 ** (pts - 1))` staat in `applyUpgrade` (`case 'salesPoint'`) én in de `salesPointCost` computed van `DetailPanel.vue`.

**Fix:** extraheer naar een exporteerbare `salesPointUpgradeCost(pts: number): number` in `simulation/economy.ts` en importeer die in beide consumers.

---

### D3 — Verbindingsvalidatie gedupliceerd in `addConnection` vs `reconnectConnection` (`simulation/useGameState.ts`)

De checks `alreadyPowered`, `fromDotUsed`, `toDef.hasEnergyInput` en `toDotIndex !== toDef.inputs.length` staan bijna identiek in beide functies.

**Fix:** extraheer een interne helper `validateConnectionEndpoints(fromNode, fromDotIndex, toNode, toDotIndex, connections): boolean` en roep die aan vanuit beide functies.

---

### D4 — `connections.filter(c => c.isEnergy)` her-gefilterd op meerdere plaatsen

Verschijnt los in `simulation/energy.ts`, `canvas/interaction/hit-builder.ts`, `canvas/renderer/connections.ts` en `canvas/renderer/index.ts`.

**Fix:** exporteer een helper `filterEnergyConnections(connections: Connection[]): Connection[]` (of gebruik de Map uit P1/P2/P3) zodat de filterlogica op één plek staat.

---

### D5 — `energyOutputCount` berekend op drie plaatsen

`canvas/renderer/index.ts` (render loop), `canvas/renderer/connections.ts` (drawConnections loop) en `canvas/interaction/hit-builder.ts` berekenen elk `connections.filter(c => c.isEnergy && c.fromNodeId === node.id).length`.

**Fix:** bouw één gedeelde `Map<nodeId, number>` (energyOutputCounts) aan vóór deze aanroepen en geef hem door als parameter. Sluit aan op P2 en P3.

---

### D6 — `effectiveEnergyOutput` inline berekend op twee plaatsen

`(def.energyOutputPerTick ?? 1) + (node.energyOutputUpgradeLevel ?? 0)` staat in `canvas/renderer/nodes.ts` (`drawNode`) en conceptueel ook in `simulation/energy.ts`.

**Fix:** extraheer `effectiveEnergyOutput(node: NodeInstance, def: NodeDef): number` in `simulation/energy.ts` en importeer die in de renderer.

---

### D7 — Inline node-type-lijsten in `DetailPanel.vue` afgeleid van node-def-velden

`[NodeType.Splitter, NodeType.Warehouse, NodeType.Market, NodeType.EnergySupply]` verschijnt als hardcoded array in `hasSpeedUpgrade` en `hasEfficiencyUpgrade`. Dit dupliceert kennis die al in `NODE_DEFS` zit.

**Fix:** vervang door checks op def-eigenschappen:

- `hasSpeedUpgrade`: `def.cycleDuration > 0 && def.hasEnergyInput !== false` (of een expliciete `canUpgradeSpeed` flag in NodeDef)
- `hasEfficiencyUpgrade`: `def.cycleDuration > 0 && def.inputs.length > 0`

Zo hoeft `DetailPanel.vue` geen NodeType-constanten meer op te sommen voor uitsluitingslogica.
