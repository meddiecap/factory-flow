# Factory Flow – Implementatieplan v1

> Doel: één speelbare run van start tot Raket, met alle mechanics uit `game-design.md`.
> Aanpak: elke fase is één atomaire agenttaak. Voer één fase per keer uit.
> Referentie: alle sectienummers verwijzen naar `game-design.md`.

---

## Fase 0 – Projectopzet

**Eén taak: richt het project in.**

- Initialiseer Vite + Vue 3 + TypeScript (`npm create vite`)
- Installeer: `konva`, `vue-konva`, `tailwindcss`, `vitest`, `@vitest/ui`
- Configureer `tsconfig.json` met strict mode
- Maak mappen aan: `src/`, `src/simulation/`, `src/canvas/`, `src/ui/`, `__tests__/`
- Voeg een leeg `__tests__/placeholder.test.ts` toe zodat Vitest opstart
- Zorg dat `npm test` en `npm run dev` beide werken

**Klaar wanneer:** `npm run dev` toont een lege pagina; `npm test` slaagt.

---

## Fase 1 – Datatypes

**Eén taak: definieer alle TypeScript-types. Nog geen logica.**

Bestand: `src/simulation/types.ts`

- `ResourceType` — enum van alle 13 resources uit sectie 4.1 + 5.2
- `NodeType` — enum van alle 12 fabriektypes uit sectie 4.5
- `NodeStatus` — `'active' | 'waiting' | 'output-blocked' | 'idle'`
- `Buffer` — `{ resource: ResourceType; amount: number; capacity: number }`
- `NodeDef` — statische definitie van een fabriektype (recipe, cycleDuration, buildCost, fuelPerTick, gridSize) gebaseerd op sectie 4.5
- `NodeInstance` — runtime-instantie: positie, progress, status, invoerbuffer[], uitvoerbuffer[]
- `Connection` — `{ fromNodeId, fromDotIndex, toNodeId, toDotIndex, capacity }`
- `GameState` — `{ nodes: NodeInstance[], connections: Connection[], money: number, totalEarned: number, tick: number }`

Bestand: `src/simulation/recipes.ts`

- Exporteer `NODE_DEFS: Record<NodeType, NodeDef>` met alle waarden uit de tabel in sectie 4.5
- Exporteer `MARKET_PRICES: Record<ResourceType, number>` uit sectie 5.2

**Klaar wanneer:** `vue-tsc --noEmit` slaagt; geen tests vereist (pure types + data).

---

## Fase 2a – Tick-logica: cyclus en buffers

**Eén taak: implementeer de productiecyclus voor één node.**

Bestand: `src/simulation/tick.ts`
Referentie: sectie 13.1

Schrijf en test één functie:

```ts
function tickNode(node: NodeInstance, def: NodeDef, speedFactor: number): void
```

Gedrag (TDD-first):

1. Als `progress < cyclusDuur`: hoog `progress` op met `speedFactor`
2. Als `progress >= cyclusDuur` EN invoerbuffer heeft genoeg: trek inputs af, voeg output toe aan uitvoerbuffer, verlaag `progress` met `cyclusDuur`
3. Als uitvoerbuffer vol: zet status op `output-blocked`, hoog `progress` niet op
4. Als invoerbuffer leeg: zet status op `waiting`, hoog `progress` niet op
5. Stilstaande node (waiting/output-blocked) verbruikt 0 brandstof (sectie 13.2)

Tests in `__tests__/tick-node.test.ts`:

- Node produceert na exact `cyclusDuur` ticks
- Output-blocked blokkeert nieuwe cyclus
- Waiting stopt progress
- speedFactor < 1 vertraagt productie proportioneel

**Klaar wanneer:** alle 4 tests groen; `npm test` slaagt.

---

## Fase 2b – Tick-logica: energiesysteem

**Eén taak: implementeer de globale energiebalans en speedFactor-berekening.**

Bestand: `src/simulation/energy.ts`
Referentie: secties 5.3, 13.2, 13.3

```ts
function calcSpeedFactor(
    nodes: NodeInstance[],
    defs: Record<NodeType, NodeDef>,
): number
```

- Tel alle geproduceerde brandstof op (alleen actieve Energy Supply-nodes)
- Tel alle verbruikte brandstof op (alleen actieve productienodes, niet waiting/output-blocked)
- Bereken `speedFactor = clamp(beschikbaar / benodigd, 0, 1)`
- Pas surplus-multiplier toe: `1 + 0.2 × ln(surplus + 1)` (alleen als speedFactor = 1)

Tests in `__tests__/energy.test.ts`:

- Precies genoeg brandstof → speedFactor = 1.0
- Tekort 50% → speedFactor = 0.5
- Geen fabrieken actief → speedFactor = 1.0 (geen verbruik)
- Surplus +10 → multiplier ≈ 1.48 (≈ ln(11) × 0.2 + 1)
- Surplus-multiplier tabel uit sectie 5.3 (±0.05 tolerantie)

**Klaar wanneer:** alle 5 tests groen.

---

## Fase 2c – Tick-logica: verbindingstransport

**Eén taak: verplaats goederen via verbindingen tussen nodes.**

Bestand: `src/simulation/connections.ts`
Referentie: sectie 3.2

```ts
function tickConnections(nodes: NodeInstance[], connections: Connection[]): void
```

- Per verbinding: haal `min(uitvoerbuffer.amount, connection.capacity)` op uit de uitvoerbuffer van de bronnode
- Voeg dat toe aan de invoerbuffer van de doelnode (tot de capaciteit)
- Kleur-status van verbinding (berekend, niet opgeslagen): < 50% = groen, 50–90% = oranje, vol = rood

Tests in `__tests__/connections.test.ts`:

- Goods stromen van uitvoer naar invoer binnen capaciteitslimiet
- Volle invoerbuffer stopt transport
- Lege uitvoerbuffer transporteert niets
- Capaciteitslimiet van verbinding wordt gerespecteerd

**Klaar wanneer:** alle 4 tests groen.

---

## Fase 2d – Splitter

**Eén taak: implementeer de Splitter-node met fractionele accumulatie.**

Bestand: `src/simulation/splitter.ts`
Referentie: sectie 4.4

- Elke Splitter heeft twee interne accumulatoren en een instelbare ratio (standaard 50/50)
- Elke tick: accumulatoren += ratio-deel; zodra ≥ 1 → stuur 1 eenheid door, trek 1 af

Tests in `__tests__/splitter.test.ts`:

- 70/30-ratio: na 10 ticks gaan 7 eenheden naar output A en 3 naar output B
- 50/50-ratio: precies gelijk
- Volle uitvoerbuffer blokkeert die kant (accumulatie gaat door aan de andere kant)

**Klaar wanneer:** alle 3 tests groen.

---

## Fase 2e – Simulatielus

**Eén taak: combineer alle tick-functies in één `tick()`-aanroep.**

Bestand: `src/simulation/simulator.ts`
Referentie: secties 13.1–13.3

```ts
function tick(state: GameState): void
```

Volgorde elke tick:

1. `calcSpeedFactor(nodes, defs)` → speedFactor
2. `tickConnections(nodes, connections)` (transport)
3. Voor elke node: `tickNode(node, def, speedFactor)`
4. Voor elk Splitter-node: `tickSplitter(splitter)`
5. `state.tick++`

Reachability-test in `__tests__/reachability.test.ts`:

- Bouw de volledige raket-keten (sectie 8.1) als NodeInstances
- Draai 10.000 ticks
- Assert dat de Assemblage-node minstens 1× Raket heeft geproduceerd

**Klaar wanneer:** reachability-test groen; alle vorige tests nog groen.

---

## Fase 3 – Economie

**Eén taak: implementeer geld, marktverkoop en tech tree-ontgrendeling.**

Bestand: `src/simulation/economy.ts`
Referentie: secties 5.1, 5.2, 7.1

```ts
function tickMarket(state: GameState): void // verkoopt uit Markt-invoerbuffer
function canUnlock(type: NodeType, state: GameState): boolean // check totalEarned
function buildCost(type: NodeType, count: number): number // sectie 4.5 formule
```

- `tickMarket`: voor elke Markt-node, per verkooppunt: verplaats max 20 eenheden uit invoerbuffer, tel op bij `state.money` en `state.totalEarned`
- `canUnlock`: check drempelwaarden uit sectie 7.1 op basis van `state.totalEarned`
- `buildCost`: `basiskosten × 1.5^(n-1)` uit sectie 4.5

Tests in `__tests__/economy.test.ts`:

- Markt verkoopt correct en verhoogt money
- Tech tree-check: fabrieken vergrendeld tot drempel bereikt
- Bouwkostformule: 3e IJzermijn = €50 × 1.5² = €113
- Incometest: na X ticks met alleen IJzermijn + Energy Supply is €50 bereikt (drempel voor extra Energy Supply)

**Klaar wanneer:** alle 4 tests groen.

---

## Fase 4 – Canvas: statische weergave

**Eén taak: teken het grid en nodes in Konva.js. Nog geen interactie.**

Bestand: `src/canvas/CanvasRenderer.ts`
Referentie: secties 3.3, 4.5 (gridgrootte per fabriek), 10

- Maak een Konva Stage aan op een `<div id="canvas">`
- Teken het 20×12 grid als lijnen (celgrootte: 64px)
- Teken voor elke node in `GameState.nodes`:
    - Rechthoek op de juiste gridpositie (breedte/hoogte in gridcellen × 64px)
    - Naam van de fabriek als tekst
    - Invoer-dots (links, blauw) en uitvoer-dots (rechts, groen)
- Teken verbindingen als Manhattan-geleidde polylijnen (geen diagonalen)

Geen tests voor rendering. Visueel testen via `npm run dev` met een hardcoded `GameState`.

**Klaar wanneer:** hardcoded IJzermijn + Energy Supply zichtbaar op canvas; Vue-tsc slaagt.

---

## Fase 5 – Interactie: plaatsen en verbinden

**Eén taak: implementeer drag-vanuit-palet en dot-verbinden.**

Referentie: secties 3.1, 3.2, 9.1

- **Drag uit palet**: sleep een fabriekicoon vanuit de linker Vue-sidebar en laat het vallen op het canvas → node wordt aangemaakt op de dichtstbijzijnde grid-cel
- **Dot verbinden**: klik op een output-dot, sleep naar een input-dot → verbinding aangemaakt als beide dots nog vrij zijn (één lijn per dot)
- **Snappen**: node-positie rondt af op gridcoordinaten
- Controleer `canUnlock()` voordat een node geplaatst wordt
- Controleer `buildCost()` en trek van `money` af bij plaatsing

**Klaar wanneer:** handmatig testen: sleep twee fabrieken, verbind ze, run de simulatie.

---

## Fase 6 – UI-panels

**Eén taak: implementeer de drie vaste zones uit sectie 9.1.**

Referentie: secties 9.1, 9.2

Vue-componenten:

- `PalettePanel.vue` — linker sidebar: lijst van NodeTypes gegroepeerd per laag; vergrendelde fabrieken zijn grijsgedimd; drag-to-canvas
- `DetailPanel.vue` — rechter panel: toont naam, status, bufferinhoud, throughput, uptime %, upgradeknoppen + kosten; sluit als niets geselecteerd
- `HudBar.vue` — balk boven canvas: huidig saldo €, totaal verdiend €, tick-teller, knop "Expand canvas" (toont kosten)

**Klaar wanneer:** selecteer een node → detail-panel opent met correcte data; HUD toont saldo.

---

## Fase 7 – Upgrades

**Eén taak: implementeer alle 6 upgrade-typen uit sectie 6.**

Bestand: `src/simulation/upgrades.ts`
Referentie: sectie 6

- `applyUpgrade(node: NodeInstance, type: UpgradeType): void`
- Snelheid: voeg upgrade-level toe; simulator past `speedFactor × 1.5^level` toe per node
- Buffer: +10 op invoer- én uitvoerbuffercapaciteit
- Efficiëntie: −10% inputverbruik per level (minimum 50%)
- Lijnkapaciteit: +10/tick op één verbinding
- Energie-efficiëntie: −10% fuelPerTick per level (minimum 50%)
- Verkooppunten (Markt): +1 invoer-dot; kosten `€200 × 2^(level-1)`

Upgrade-kosten check in `DetailPanel.vue`: knop alleen klikbaar als `money >= upgradeCost`.

Tests in `__tests__/upgrades.test.ts`:

- Snelheid niveau 1 → ×1.5 sneller
- Buffer niveau 3 → +30 capaciteit
- Efficiëntie niveau 5 → 50% inputverbruik (minimum bereikt)

**Klaar wanneer:** alle 3 tests groen; upgrade via UI werkt.

---

## Fase 8 – Spelloop en winconditie

**Eén taak: koppel de simulatielus aan de UI en implementeer het winscherm.**

Referentie: secties 2, 8.3, 9.2

- Start `setInterval(() => tick(state), 50)` bij game-start (20 ticks/sec)
- Na elke tick: update reactieve Vue-state zodat HUD en panels refreshen
- Windetectie: na elke tick check of Assemblage-uitvoerbuffer ≥ 1 Raket bevat
- Bij winst: stop de simulatielus; toon winscherm-overlay (sectie 9.2) met eindtijd en "Opnieuw spelen"-knop

**Klaar wanneer:** volledig speelbaar van start tot Raket-productie; winscherm verschijnt.

---

## Fase 9 – Persistentie

**Eén taak: sla de spelstatus op in localStorage en herstel bij herladen.**

Referentie: sectie 10 (persistentie)

- Serialiseer `GameState` naar JSON en sla op in `localStorage` elke 5 seconden
- Laad bij opstart: als `localStorage` een geldige `GameState` bevat, herstel die; anders start een nieuwe run
- "Opnieuw spelen" (na winscherm): wis localStorage en herlaad de pagina

**Klaar wanneer:** refresh de browser → spelstaat is hersteld.

---

## Overzicht

| Fase | Onderwerp                        | Afhankelijk van |
| ---- | -------------------------------- | --------------- |
| 0    | Projectopzet                     | —               |
| 1    | Datatypes & recepten             | 0               |
| 2a   | Tick: cyclus & buffers           | 1               |
| 2b   | Tick: energiesysteem             | 1               |
| 2c   | Tick: verbindingstransport       | 1               |
| 2d   | Splitter                         | 1               |
| 2e   | Simulatielus (combineert 2a–2d)  | 2a, 2b, 2c, 2d  |
| 3    | Economie                         | 2e              |
| 4    | Canvas: statische weergave       | 1               |
| 5    | Interactie: plaatsen & verbinden | 3, 4            |
| 6    | UI-panels                        | 3, 4            |
| 7    | Upgrades                         | 3, 5, 6         |
| 8    | Spelloop & winconditie           | 2e, 6, 7        |
| 9    | Persistentie                     | 8               |

**Paralleliseerbaar:** fase 2a, 2b, 2c, 2d kunnen tegelijk; fase 4 kan parallel aan 2a–2d.
