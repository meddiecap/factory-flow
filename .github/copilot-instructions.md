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

## Spelregels voor code

- Productiesnelheid wordt altijd uitgedrukt als **eenheden per tick**
- Buffergroottes en doorvoercapaciteiten zijn **gehele getallen**
- Geldwaarden zijn **gehele getallen** (geen floats voor valuta)
- Node-posities zijn **gridcoördinaten** (kolom, rij), niet픽celpixels
