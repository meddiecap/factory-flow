# Factory Flow – Workspace Instructions

## Project

Factory Flow is een incrementele fabrieksbouwgame in de browser. Productieketens worden
opgebouwd als een visueel flowchart-diagram op een 2D-grid canvas. Het einddoel per run
is het assembleren van een raket via een oplopend complexe productieketen.

Raadpleeg [game-design.md](../docs/game-design.md) voor het volledige ontwerp.

## Technische stack

- **Canvas**: TypeScript, geen framework (overweeg Konva.js)
- **UI-laag**: Vue.js — panelen, menus, upgrades, HUD buiten het canvas
- **Platform**: Browser (HTML5 Canvas / WebGL)
- **Simulatie**: tick-gebaseerd (elke X ms wordt de flow berekend)
- **Persistentie**: localStorage (vroeg stadium)
- **Invoer**: muis en toetsenbord; drag-and-drop via pointer events

## Terminologie

| Term                  | Betekenis                                                                     |
| --------------------- | ----------------------------------------------------------------------------- |
| **Node**              | Een fabriek of speciale eenheid op het canvas (rechthoekig venster)           |
| **Dot**               | Gekleurd aansluitpunt op een node: invoer-dot (links), uitvoer-dot (rechts)   |
| **Verbinding / lijn** | Gesleepte lijn van een uitvoer-dot naar een invoer-dot                        |
| **Tick**              | Één simulatiestap; de frequentie bepaalt de productiesnelheid                 |
| **Buffer**            | Tijdelijke opslag van goederen in een node (invoer- of uitvoerzijde)          |
| **Schematic**         | Opgeslagen configuratie van een groep nodes, herbruikbaar in een volgende run |
| **Prestige**          | Run afsluiten na winst; alles resetten behalve schematics                     |
| **Bron**              | Laag-0-node die grondstoffen produceert (onbeperkt, upgradebaar)              |
| **Splitter**          | Node die één input verdeelt over twee outputs met instelbare ratio            |

## Codeerstijl

- Gebruik **ES modules** (`import`/`export`); geen CommonJS
- Klassen voor nodes en verbindingen; plain objects voor simulatiedata
- **TypeScript** verplicht; gebruik types en interfaces voor publieke API's
- Canvas-logica en Vue-UI strikt gescheiden houden
- Bestandsnamen: `kebab-case.ts`

## Taal in de codebase

- **Code, variabelenamen, functienamen, comments**: altijd in het **Engels**
- **In-game teksten en labels** (UI, node-namen, resource-namen, foutmeldingen): altijd in het **Engels**
- **Documentatie en ontwerpbestanden** (zoals bestanden in `docs/`): Nederlands

## Docblock comments

Elke publieke functie, methode en klasse krijgt een JSDoc/TSDoc-comment met:

- Één zin die beschrijft **wat** de functie doet
- Één zin die beschrijft **waarom** de functie bestaat (de rol in het systeem), tenzij triviaal
- `@param` en `@returns` voor alle parameters en returnwaarden

Voorbeeld:

```ts
/**
 * Advances the simulation by one tick, updating all node buffers and connections.
 * Called by the game loop at a fixed interval to drive production flow.
 *
 * @param nodes - All active nodes on the canvas
 * @param connections - All active connections between nodes
 * @returns The updated simulation state after the tick
 */
function tick(nodes: Node[], connections: Connection[]): SimulationState { … }
```

Private helpers die enkel intern worden gebruikt hoeven geen uitgebreide docblock, maar krijgen wel een korte één-regel comment als de logica niet vanzelfsprekend is.

## Bestandsgrootte en moduleopsplitsing

- **Harde limiet: 300 regels per bestand.** Overschrijdt een bestand deze limiet, splits het dan op voordat je nieuwe functionaliteit toevoegt.
- Splits canvas-bestanden op verantwoordelijkheid:
    - `canvas/renderer/` — één bestand per visueel onderdeel (nodes, connections, grid, overlays)
    - `canvas/interaction/` — één bestand per interactiemodus (drag, connect, select, pan)
- Splits `useGameState.ts` in losse composables: één per domein (nodes, connections, economy, upgrades, …)
- Vue-componenten > 200 regels opsplitsen in sub-componenten of losse `<script>`-composables
- Elk nieuw canvas-subsysteem krijgt een eigen bestand; nooit uitbreiden in een bestaand bestand dat al > 200 regels heeft

## Scheiding simulatie en UI

**Simulatielogica hoort nooit in een Vue-component.**

| Laag              | Verantwoordelijkheid                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/simulation/` | Alle spellogica: tick-berekeningen, doorvoersnelheden, graaf-traversals, recepten, upgrades, energie. Pure TypeScript — geen Vue-imports.      |
| `src/components/` | Weergave en gebruikersinteractie: lezen van `gameState` voor render, forwarden van click-events naar simulatiefuncties. Geen eigen spellogica. |

**Signalen dat logica op de verkeerde plek zit:**

- Een functie in een `.vue`-bestand accepteert `nodes` of `connections` als parameter.
- Een `computed` in een component doet meer dan opmaak of selectie uit game state.
- Logica is niet testbaar zonder een Vue-omgeving op te starten.

Verplaats dergelijke functies naar een passend bestand in `src/simulation/` en exporteer ze als gewone TypeScript-functies.

## Performance

- Kies altijd de meest efficiënte datastructuur voor de use case: gebruik `Map` of `Set` voor O(1)-opzoekingen in plaats van `.find()` of `.filter()` over arrays wanneer de collectie groot kan worden.
- Vermijd onnodige iteraties: combineer bewerkingen in één doorloop waar mogelijk; loop niet meerdere keren over dezelfde collectie.
- Tick-logica draait elke paar milliseconden — O(n²)-algoritmen in de simulatielaag zijn verboden; streef naar O(n) of O(n log n).
- Cache dure berekeningen (graaf-traversals, reachability, receptopzoekingen) en herbereken alleen bij een echte state-wijziging.
- Render-callbacks (canvas `requestAnimationFrame`) mogen geen spellogica bevatten; houd ze zo slank mogelijk.

## DRY – Don't Repeat Yourself

- Extraheer herhaalde logica altijd naar een gedeelde helperfunctie of utility; dupliceer nooit meer dan één keer dezelfde berekening.
- Recepten, constanten en drempelwaarden staan op één plek (bijv. `recipes.ts`, `constants.ts`); importeer ze — kopieer ze nooit.
- Als twee codepaden hetzelfde patroon volgen, maak dan een generieke functie met parameters in plaats van twee bijna-identieke implementaties.
- Controleer bij elke nieuwe functie of vergelijkbare logica al elders bestaat voordat je iets nieuws schrijft.

## Spelregels voor code

- Productiesnelheid wordt altijd uitgedrukt als **eenheden per tick**
- Buffergroottes en doorvoercapaciteiten zijn **gehele getallen**
- Geldwaarden zijn **gehele getallen** (geen floats voor valuta)
- Node-posities zijn **gridcoördinaten** (kolom, rij), niet픽celpixels
