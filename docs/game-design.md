# Factory Flow – Game Design Document

> Werktitel: **Factory Flow**
> Status: Concept / Pre-development
> Taal: Nederlands (game zelf waarschijnlijk Engels)

---

## 1. Kernconcept

Een incrementele fabrieksbouwgame waarbij de speler **productieketens opbouwt als een visueel diagram**. Fabrieken zijn nodes op een canvas — rechthoekige vensters met invoer- en uitvoerpunten — verbonden met lijnen die de grondstof- en goederenstroom weergeven. Het doel is een eindproduct te produceren via een oplopend complexe productieketen.

Het spel combineert de **visuele leesbaarheid van een flowchart** met de **tactische diepgang van een factory builder**: je ziet in één oogopslag waar je keten vastloopt en waarom.

---

## 2. Kernloop

```
Plaats fabriek → Verbind met lijnen → Produceer goederen →
Verkoop overschot → Koop nieuwe fabrieken/upgrades → Bereik eindproduct
```

De cyclus is **nooit volledig idle**: de speler moet actief beslissingen nemen over routing, verkoop-timing en bottleneck-oplossing.

**Pacing:** een eerste run duurt naar schatting 45–90 minuten. In latere runs versnelt dit door opgeslagen schematics.

---

## 3. Het Canvas & Node Systeem

### 3.1 Nodes

Elke node is een rechthoekig venster op het canvas met:

- **Naam & icoon** van de fabriek of resource
- **Invoer-dots** (links) — gekleurde aansluitpunten per grondstof
- **Uitvoer-dots** (rechts) — gekleurde aansluitpunten per product
- **Buffer-indicator** — visuele weergave van huidige voorraad (in/uit)
- **Status** — actief, wachtend (input ontbreekt), gestopt (output vol)

### 3.2 Verbindingen

- Lijnen worden gesleept van een **output-dot naar een input-dot**
- Conventiionele richting: **links → rechts**
- Lijnen hebben een **maximale doorvoercapaciteit** (upgradebaar)
- Kleurcodering van lijnen geeft doorvoerstatus aan:
    - Groen: optimale flow
    - Oranje: gedeeltelijk benut / lichte bottleneck
    - Rood: overvol of gestopt

### 3.3 Canvas

- Het canvas is een **2D-grid**: fabrieken nemen één of meer celvakken in beslag en snappen automatisch in op de dichtstbijzijnde cel
- Geen pixelprecieze plaatsing vereist — de speler sleept een fabriek naar een cel en laat los
- Het grid is **eindig maar uitbreidbaar** (koop meer rijen/kolommen met geld; er is geen hard maximum)
- Lijnen lopen langs de randen van gridcellen; kruisingen zijn toegestaan maar visueel onderscheiden
- **Node Groups**: meerdere nodes bundelen in één inklapbare container

---

## 4. Productie & Resource Flow

### 4.1 Grondstoffen & Goederen

Productie verloopt in lagen van toenemende complexiteit:

| Laag                     | Voorbeeld                                       |
| ------------------------ | ----------------------------------------------- |
| Laag 0 – Grondstoffen    | IJzererts, Kolen, Zand                          |
| Laag 1 – Basisverwerking | Gesmolten ijzer, Glas                           |
| Laag 2 – Halffabricaten  | Stalen platen, Draden, Buizen                   |
| Laag 3 – Componenten     | Motoren, Circuits, Tandwielen                   |
| Laag 4 – Producten       | Machines, Apparaten                             |
| Laag 5 – Eindproduct     | (per run bepaald, bv. Raket, Computer, Fabriek) |

### 4.2 Ratio's & Bottlenecks

Fabrieken verbruiken inputs in **vaste ratio's**:

> Staalfabriek: 3× IJzererts + 1× Kolen → 1× Staal per seconde

Als de aanvoer te langzaam is, produceert de fabriek trager. Dit is de **tactische kern** van het spel: ratio's in balans brengen door meerdere aanvoerfabrieken te plaatsen of de snelheid te upgraden.

### 4.3 Buffers

- Elke node heeft een **invoerbuffer** en **uitvoerbuffer** met instelbare grootte
- Volle uitvoerbuffer → fabriek stopt
- Lege invoerbuffer → fabriek wacht
- Buffergrootte is upgradebaar

### 4.4 Bijzondere Nodes

| Node                   | Functie                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| **Bron**               | Produceert grondstoffen (laag 0), upgradebaar in snelheid        |
| **Splitter/Allocator** | Verdeelt 1 input over 2 outputs met instelbare ratio (bv. 70/30) |
| **Opslagpakhuis**      | Grote buffer tussen twee fabrieken                               |
| **Markt/Verkooppunt**  | Zet goederen om in geld                                          |
| **Node Group**         | Meerdere nodes bundelen tot één container                        |

---

## 5. Economie

### 5.1 Geld

- Verkregen door goederen te **verkopen via de Markt-node**
- Geld wordt gebruikt voor: nieuwe fabrieken, upgrades, canvas-uitbreiding, tech tree

### 5.2 Marktprijzen

- Elk goed heeft een **vaste prijs** die niet verandert op basis van aanbod
- Hogere-laag producten leveren meer op maar zijn moeilijker te maken
- De prijs weerspiegelt de productiecomplexiteit: meer verwerkingsstappen = hogere waarde

### 5.3 Lopende Kosten

- Fabrieken hebben **energiekosten** per seconde
- Gestopte fabrieken verbruiken minder energie (maar niet nul)
- Dwingt de speler om inefficiënte fabrieken af te sluiten of te upgraden

---

## 6. Upgrades

Upgrades zijn per-node beschikbaar en kosten geld:

| Upgrade             | Effect                                             |
| ------------------- | -------------------------------------------------- |
| Snelheid            | Productiesnelheid ×1.5 / ×2 / ×3                   |
| Buffer              | Invoer-/uitvoerbuffer vergroten                    |
| Efficiëntie         | Inputverbruik verlagen (bv. 2.5× i.p.v. 3× erts)   |
| Lijnkapaciteit      | Maximale doorvoer van verbindingslijn verhogen     |
| Energie-efficiëntie | Verlaagt stroomverbruik van een specifieke fabriek |

---

## 7. Tech Tree

- Ontgrendelt **nieuwe fabriektypes** en **recepten**
- Vereist bepaalde mijlpalen: bv. "Produceer 1000× Staal" of "Verdien €1M"
- Structureel: boom van lagen die grofweg overeenkomen met productielagen

> Prestige-interactie met de tech tree wordt later uitgewerkt. Voor nu reset elke run naar een schone lei.

---

## 8. Progressie & Prestige

### 8.1 Eindproduct per run

Elke run heeft een specifiek eindproduct als doel. Het bereiken ervan voltooit de run en triggert het prestige-systeem.

**Run 1 — Raket**
De raket is het eerste en centrale einddoel. De productieketen:

| Stap           | Invoer                                               | Uitvoer                           |
| -------------- | ---------------------------------------------------- | --------------------------------- |
| Mijnbouw       | —                                                    | IJzererts, Kolen, Koper, Silicium |
| Smelterij      | IJzererts + Kolen                                    | Staal                             |
| Gieterij       | Staal                                                | Rompdelen, Brandstoftanks         |
| Kabelproductie | Koper                                                | Kabels                            |
| Chipfabriek    | Silicium + Kabels                                    | Circuits                          |
| Elektronica    | Circuits                                             | Besturingssysteem                 |
| Motorenfabriek | Staal + Brandstof                                    | Stuwraketten                      |
| Assemblage     | Rompdelen + Tanks + Besturingssysteem + Stuwraketten | **Raket**                         |

### 8.2 Prestige (Reset)

- Reset **alles**: canvas, geld en tech tree
- Behoudt **opgeslagen schematics** — zie sectie 8.3

> Herhaalbaarheidsmechanics (multipliers, permanente ontgrendelingen) worden later uitgewerkt als het ontwerp verder is.

### 8.3 Winconditie

Het doel van het spel is één raket assembleren. Zodra de assemblage-node de raket uitvoert, wint de speler de run.

### 8.4 Schematics

De speler kan een groep nodes (bv. de volledige staalproductie) opslaan als herbruikbaar schema. In een volgende run kan het schema direct worden neergezet, mits:

- De speler **genoeg geld** heeft om alle betrokken fabrieken te kopen
- De benodigde fabriektypes **vrijgespeeld** zijn in de tech tree

### 8.5 Speedrun-modus (optioneel, later)

Een aparte uitdagingsmodus met een tijdslimiet per run. Geen effect op het hoofdspel.

---

## 9. UI/UX Overwegingen

- **Minimap** voor grote canvassen
- **Bottleneck-highlighting**: klik op een fabriek om de volledige keten te markeren
- **Statistieken per node**: gemiddelde throughput, uptime %, kosten/baten
- **Undo/redo** voor plaatsings- en verbindingsacties
- **Zoomen & pannen** op het canvas
- Inklapbare **Node Groups** voor organisatie van complexe subsystemen

---

## 10. Technische Richting

- **Platform**: Browser (HTML5 Canvas / WebGL)
- **Taal**: TypeScript (geen framework op het canvas zelf)
- **UI-laag**: Vue.js voor panelen, menus, upgrades en HUD buiten het canvas
- **Canvas-libraries**: Konva.js of custom canvas (geen React Flow)
- **Grid**: vaste celgrootte; nodes snappen in op gridposities
- **Node-representatie**: elke fabriek beslaat één of meer gridcellen; gekleurde cirkels op de linkerrand zijn invoerpunten, op de rechterrand uitvoerpunten; lijnen worden gesleept van uitvoer naar invoer
- **Input**: muis en toetsenbord (PC); drag-and-drop via muisevents
- **Grondstoffen (laag 0)**: onbeperkt; bronnen produceren continu zolang ze actief zijn
- **Single-player**: geen multiplayer
- **State management**: Tick-gebaseerde simulatie (elke X ms wordt flow berekend)
- **Persistentie**: localStorage (vroeg) → cloud save (later)

---

## 11. Openstaande Vragen

- Monetisatie: gratis, betaald, of cosmetics? _(later te bepalen)_
