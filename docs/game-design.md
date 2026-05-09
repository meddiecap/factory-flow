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
- Conventionele richting: **links → rechts**
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

| Laag                     | Voorbeeld                     |
| ------------------------ | ----------------------------- |
| Laag 0 – Grondstoffen    | IJzererts, Kolen, Zand        |
| Laag 1 – Basisverwerking | Gesmolten ijzer, Glas         |
| Laag 2 – Halffabricaten  | Stalen platen, Draden, Buizen |
| Laag 3 – Componenten     | Motoren, Circuits, Tandwielen |
| Laag 4 – Producten       | Machines, Apparaten           |
| Laag 5 – Eindproduct     | Raket                         |

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

| Node                   | Functie                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| **Bron**               | Produceert grondstoffen (laag 0), upgradebaar in snelheid             |
| **Energy Supply**      | Produceert Brandstof zonder grondstofkosten; upgradebaar in productie |
| **Splitter/Allocator** | Verdeelt 1 input over 2 outputs met instelbare ratio (bv. 70/30)      |
| **Opslagpakhuis**      | Grote buffer tussen twee fabrieken                                    |
| **Markt/Verkooppunt**  | Zet goederen om in geld                                               |
| **Node Group**         | Meerdere nodes bundelen tot één container                             |

---

## 5. Economie

### 5.1 Geld

- Verkregen door goederen te **verkopen via de Markt-node**
- Geld wordt gebruikt voor: nieuwe fabrieken, upgrades, canvas-uitbreiding, tech tree

### 5.2 Marktprijzen

Elk goed heeft een **vaste prijs** die niet verandert op basis van aanbod. Prijzen stijgen sterk per laag zodat de speler altijd wordt gemotiveerd om door te ontwikkelen — laag-0-producten blijven verkopen loont niet op de lange termijn.

| Laag | Resource          | Verkoopprijs                      |
| ---- | ----------------- | --------------------------------- |
| 0    | IJzererts         | €2                                |
| 0    | Kolen             | €3                                |
| 0    | Koper             | €4                                |
| 0    | Silicium          | €4                                |
| 1    | Brandstof         | €10                               |
| 2    | Staal             | €60                               |
| 2    | Kabels            | €40                               |
| 3    | Rompdelen         | €250                              |
| 3    | Brandstoftanks    | €200                              |
| 3    | Circuits          | €400                              |
| 3    | Besturingssysteem | €1.600                            |
| 4    | Stuwraketten      | €5.000                            |
| 5    | Raket             | — (winconditie, niet verkoopbaar) |

### 5.3 Energie

- Alle fabrieken verbruiken **Brandstof** per tick om te produceren
- Brandstof wordt geproduceerd door de **Energy Supply**-node (geen grondstofkosten)
- Een tekort aan Brandstof vertraagt alle fabrieken proportioneel
- **Surplus Brandstof** geeft een productiesnelheid-bonus met afnemend meerrendement:

| Brandstof-surplus per tick | Snelheidsmultiplier |
| -------------------------- | ------------------- |
| 0 (precies genoeg)         | ×1.0                |
| +10                        | ×1.5                |
| +50                        | ×1.9                |
| +200                       | ×2.1                |

Boven een bepaald surplusniveau loont het meer om een fabriek direct te upgraden dan nog meer Energy Supplies te bouwen.

---

## 6. Upgrades

Upgrades zijn per-node beschikbaar en kosten geld. Elke upgrade heeft **afnemend meerrendement**: hogere niveaus kosten exponentieel meer maar leveren steeds minder extra opbrengst op.

| Upgrade             | Effect                                                 |
| ------------------- | ------------------------------------------------------ |
| Snelheid            | Productiesnelheid ×1.5 / ×2 / ×3 (elke stap duurder)   |
| Buffer              | Invoer-/uitvoerbuffer vergroten                        |
| Efficiëntie         | Inputverbruik verlagen (bv. 2.5× i.p.v. 3× erts)       |
| Lijnkapaciteit      | Maximale doorvoer van verbindingslijn verhogen         |
| Energie-efficiëntie | Verlaagt Brandstof-verbruik van een specifieke fabriek |

### 6.1 Marginaal Rendement

Het rendement van een upgrade = **extra opbrengst per tick ÷ upgradekosten**. Hogere-laag fabrieken produceren duurdere goederen per tick, waardoor hun upgrades meer opleveren — ook al zijn ze nominaal duurder. Dit drijft de speler organisch naar hogere productielagen:

- Energy Supply niveau 8 upgraden is doorgaans minder rendabel dan Smelterij niveau 2 upgraden
- Smelterij niveau 10 kan minder interessant zijn dan Gieterij niveau 2 upgraden
- Als de Energy Supply de bottleneck is (Brandstof-tekort vertraagt alles), is dat de meest rendabele upgrade

Er is geen maximumniveau; upgrades schalen altijd door, maar het rendement daalt zodanig dat de speler altijd een betere optie vindt elders in de keten.

---

## 7. Tech Tree

- Ontgrendelt **nieuwe fabriektypes** en **recepten**
- Vereist bepaalde mijlpalen: bv. "Produceer 500× IJzererts" of "Verdien €500"
- Structureel: boom van lagen die grofweg overeenkomen met productielagen

### 7.1 Startpositie en progressie

De speler begint met alleen de **IJzermijn**. Elke volgende fabriek wordt vrijgespeeld door voldoende geld te verdienen:

| Volgorde | Fabriek / Node                           | Vrijspelen door                     |
| -------- | ---------------------------------------- | ----------------------------------- |
| 1        | IJzermijn (Bron)                         | Direct beschikbaar                  |
| 2        | Energy Supply                            | Eerste IJzererts-inkomsten          |
| 3        | Kolenmijn, Kopermijn, Siliciummijn       | Geld uit IJzererts en Brandstof     |
| 4        | Smelterij                                | Vergt sparen; levert sterk meer op  |
| 5        | Gieterij, Kabelproductie                 | Na eerste Staal-productie           |
| 6        | Chipfabriek, Elektronica, Motorenfabriek | Vereist volledige grondstoffenketen |
| 7        | Assemblage                               | Eindstation; produceert de Raket    |

> Prestige-interactie met de tech tree wordt later uitgewerkt. Voor nu reset elke run naar een schone lei.

---

## 8. Progressie & Prestige

### 8.1 Eindproduct

Het einddoel van het spel is de **Raket**. De productieketen:

| Stap           | Invoer                                               | Uitvoer                           |
| -------------- | ---------------------------------------------------- | --------------------------------- |
| Mijnbouw       | —                                                    | IJzererts, Kolen, Koper, Silicium |
| Energy Supply  | —                                                    | Brandstof                         |
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
- **Tick-frequentie**: 20 ticks per seconde (50 ms per tick); productiesnelheden worden uitgedrukt in eenheden per tick
- **State management**: Tick-gebaseerde simulatie
- **Persistentie**: localStorage (vroeg) → cloud save (later)

---

## 11. Openstaande Vragen

- Monetisatie: gratis, betaald, of cosmetics? _(later te bepalen)_
