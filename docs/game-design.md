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

**Startcondities:** de speler begint met **€0** en twee **vooraf geplaatste nodes**: een **IJzermijn** en een **Energy Supply** (beide gratis, beide tellen als n=1 in de bouwkostformule). Zonder een Energy Supply is de snelheidsmultiplier 0 — de deadlock-preventiestarter. Een tweede IJzermijn kost €75 (€50 × 1.5); een tweede Energy Supply kost €225 (€150 × 1.5). Er is geen startbudget.

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
- **Één lijn per dot**: elke invoer- en uitvoer-dot accepteert precies één verbinding. Voor het splitsen van output gebruik je de Splitter-node.
- Lijnen hebben een **maximale doorvoercapaciteit** van standaard **10 eenheden/tick** (upgradebaar via Lijnkapaciteit-upgrade)
- Kleurcodering van lijnen geeft doorvoerstatus aan:
    - Groen: optimale flow
    - Oranje: gedeeltelijk benut / lichte bottleneck
    - Rood: overvol of gestopt

### 3.3 Canvas

- Het canvas is een **2D-grid**: fabrieken nemen één of meer celvakken in beslag en snappen automatisch in op de dichtstbijzijnde cel
- Geen pixelprecieze plaatsing vereist — de speler sleept een fabriek naar een cel en laat los
- Het grid is **eindig maar uitbreidbaar** (koop meer rijen/kolommen met geld; er is geen hard maximum)
- **Startgrootte**: 20 kolommen × 12 rijen
- **Uitbreidingskosten**: `€200 × 1.5^n` per rij of kolom, waarbij n het totaal aantal reeds gekochte uitbreidingen is (1e uitbreiding: €200, 2e: €300, 3e: €450, …)
- Lijnen lopen langs de randen van gridcellen; kruisingen zijn toegestaan maar visueel onderscheiden
- **Node Groups**: meerdere nodes bundelen in één inklapbare container

---

## 4. Productie & Resource Flow

### 4.1 Grondstoffen & Goederen

Productie verloopt in lagen van toenemende complexiteit:

| Laag                    | Producten in dit spel                                  |
| ----------------------- | ------------------------------------------------------ |
| Laag 0 – Grondstoffen   | IJzererts, Kolen, Koper, Silicium                      |
| Laag 1 – Energie        | Brandstof                                              |
| Laag 2 – Halffabricaten | Staal, Kabels                                          |
| Laag 3 – Componenten    | Rompdelen, Brandstoftanks, Circuits, Besturingssysteem |
| Laag 4 – Producten      | Stuwraketten                                           |
| Laag 5 – Eindproduct    | Raket                                                  |

### 4.2 Ratio's & Bottlenecks

Fabrieken verbruiken inputs in **vaste ratio's**:

> Smelterij: 3× IJzererts + 1× Kolen → 1× Staal per 2 ticks (= 10 Staal/sec bij basissnelheid)

Als de aanvoer te langzaam is, produceert de fabriek trager. Dit is de **tactische kern** van het spel: ratio's in balans brengen door meerdere aanvoerfabrieken te plaatsen of de snelheid te upgraden.

### 4.3 Buffers

- Elke node heeft een **invoerbuffer** en **uitvoerbuffer** met instelbare grootte
- Volle uitvoerbuffer → fabriek stopt
- Lege invoerbuffer → fabriek wacht
- Buffergrootte is upgradebaar

**Standaard buffergroottes bij plaatsing:**

| Fabriektype               | Invoerbuffer | Uitvoerbuffer |
| ------------------------- | ------------ | ------------- |
| Mijnen & Energy Supply    | —            | 20            |
| Smelterij, Kabelproductie | 20           | 10            |
| Gieterij, Chipfabriek     | 10           | 10            |
| Elektronica, Motoren      | 10           | 5             |
| Assemblage                | 10           | 1             |

### 4.4 Bijzondere Nodes

| Node                   | Functie                                                                                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Bron**               | Produceert grondstoffen (laag 0), upgradebaar in snelheid                                                                                                                                                                                                                      |
| **Energy Supply**      | Produceert Brandstof zonder grondstofkosten; upgradebaar in productie                                                                                                                                                                                                          |
| **Splitter/Allocator** | Verdeelt 1 input over 2 outputs met instelbare ratio via fractionele accumulatie (zie hieronder)                                                                                                                                                                               |
| **Opslagpakhuis**      | Grote buffer als tussenstation. Verbind de **uitvoer-dot van een productienode** met de **invoer-dot links** van het pakhuis. Verbind de **uitvoer-dot rechts** van het pakhuis met de invoer-dot van de volgende schakel. Accepteert elk resourcetype; 200 eenheden per kant. |
| **Markt/Verkooppunt**  | Pure sink; geen uitvoer-dot. Verbind de **uitvoer-dot van een productienode** met de **invoer-dot links** van de Markt. De Markt verkoopt automatisch alles wat binnenkomt; max 20 eenheden/tick per tick.                                                                     |
| **Node Group**         | Meerdere nodes bundelen tot één container                                                                                                                                                                                                                                      |

**Splitter — fractionele accumulatie**: elke tick wordt de ratio opgeteld bij twee interne accumulatoren. Zodra een accumulator ≥ 1 bereikt, stuurt hij 1 eenheid door en trekt hij 1 af. Voorbeeld bij 70/30: accumulator A krijgt +0.7/tick, B +0.3/tick. Tick 1: A=0.7, B=0.3. Tick 2: A=1.4 → stuurt 1 door, A=0.4; B=0.6. Tick 3: A=1.1 → stuurt 1 door, A=0.1; B=0.9. Tick 4: A=0.8; B=1.2 → stuurt 1 door, B=0.2. Over 10 ticks: 7 naar A, 3 naar B.

### 4.5 Fabrieksrecepten

Alle fabrieken met hun productierecept, cyclusduur, bouwkosten en brandstofverbruik.

**Incrementele bouwkosten**: elke extra fabriek van hetzelfde type kost ×1.5 meer dan de vorige.
Formule: `kosten_n = basiskosten × 1.5^(n−1)` waarbij n het aantal al gebouwde fabrieken van dat type is.
Voorbeeld: 3e IJzermijn = €50 × 1.5² = €113.

| Fabriek        | Input per cyclus                                                          | Output per cyclus                | Ticks | Bouwkost (1e) | Brandstof/tick |
| -------------- | ------------------------------------------------------------------------- | -------------------------------- | ----- | ------------- | -------------- |
| IJzermijn      | —                                                                         | 1× IJzererts                     | 1     | €50           | 0.5            |
| Kolenmijn      | —                                                                         | 1× Kolen                         | 1     | €60           | 0.5            |
| Kopermijn      | —                                                                         | 1× Koper                         | 1     | €80           | 0.5            |
| Siliciummijn   | —                                                                         | 1× Silicium                      | 1     | €80           | 0.5            |
| Energy Supply  | —                                                                         | 2× Brandstof                     | 1     | €150          | —              |
| Smelterij      | 3× IJzererts + 1× Kolen                                                   | 1× Staal                         | 2     | €500          | 1              |
| Kabelproductie | 2× Koper                                                                  | 1× Kabels                        | 2     | €400          | 1              |
| Gieterij       | 4× Staal                                                                  | 1× Rompdelen + 1× Brandstoftanks | 4     | €1.000        | 1.5            |
| Chipfabriek    | 2× Silicium + 3× Kabels                                                   | 1× Circuits                      | 4     | €3.000        | 2              |
| Elektronica    | 2× Circuits                                                               | 1× Besturingssysteem             | 4     | €6.000        | 2              |
| Motorenfabriek | 4× Staal + 2× Brandstof                                                   | 1× Stuwraketten                  | 4     | €15.000       | 2 \*           |
| Assemblage     | 2× Rompdelen + 2× Brandstoftanks + 1× Besturingssysteem + 2× Stuwraketten | 1× Raket                         | 20    | €50.000       | 3              |

> \* Motorenfabriek verbruikt naast 2 brandstof/tick als energiebron ook 2 brandstof per cyclus als recept-input (= 0.5/tick extra bij basissnelheid).
> Assemblage is uniek; er wordt slechts één gebouwd.

**Gridgrootte per fabriek:**

| Fabriek                                                                       | Gridcellen |
| ----------------------------------------------------------------------------- | ---------- |
| IJzermijn, Kolenmijn, Kopermijn, Siliciummijn, Energy Supply, Markt, Splitter | 2 × 1      |
| Smelterij, Kabelproductie, Gieterij, Chipfabriek, Elektronica, Motorenfabriek | 2 × 2      |
| Opslagpakhuis                                                                 | 2 × 2      |
| Assemblage                                                                    | 4 × 3      |

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
- Een tekort aan Brandstof vertraagt alle fabrieken proportioneel: `snelheidsfactor = beschikbaar / benodigd` (lineair, minimum 0; fabrieken kunnen volledig stoppen)
- **Surplus Brandstof** geeft een productiesnelheid-bonus met afnemend meerrendement:

| Brandstof-surplus per tick | Snelheidsmultiplier |
| -------------------------- | ------------------- |
| 0 (precies genoeg)         | ×1.0                |
| +10                        | ×1.5                |
| +50                        | ×1.9                |
| +200                       | ×2.1                |

Formule: `multiplier = 1 + 0.2 × ln(surplus + 1)`
De asymptoot ligt bij ×2.2; in de praktijk is het verschil boven +200 verwaarloosbaar.

Boven een bepaald surplusniveau loont het meer om een fabriek direct te upgraden dan nog meer Energy Supplies te bouwen.

> **Architectuurnotitie — twee rollen van Brandstof:**
>
> 1. **Globale energiepool** — elke tick telt de simulator alle geproduceerde Brandstof op minus het totale verbruik (Brandstof/tick-kolom uit sectie 4.5). Het netto surplus bepaalt de snelheidsmultiplier voor álle fabrieken. Dit verloopt _niet_ via verbindingen.
> 2. **Recept-input** (alleen Motorenfabriek) — Brandstof als grondstof wordt via een gewone verbindingslijn aangeleverd en per productiecyclus verbruikt. Dit staat los van de globale pool.
>
> De Motorenfabriek verbruikt Brandstof dus op twee manieren tegelijk: 2/tick uit de globale pool (energie) + 0.5/tick via verbinding (recept-input bij basissnelheid).

---

## 6. Upgrades

Upgrades zijn per-node beschikbaar en kosten geld. Elke upgrade heeft **afnemend meerrendement**: hogere niveaus kosten exponentieel meer maar leveren steeds minder extra opbrengst op.

| Upgrade             | Effect                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Snelheid            | Multiplicatief: niveau n geeft ×1.5ⁿ boven basissnelheid (n=1: ×1.5; n=2: ×2.25; n=3: ×3.375); elke stap ×3 duurder; geen maximum |
| Buffer              | +10 eenheden per niveau op zowel invoer- als uitvoerbuffer                                                                        |
| Efficiëntie         | −10% inputverbruik per niveau (minimum 50% van basis); n=1: ×2.7 i.p.v. ×3 erts; n=5: ×1.5                                        |
| Lijnkapaciteit      | +10 eenheden/tick per niveau boven de standaard van 10 (n=1: 20/tick; n=2: 30/tick)                                               |
| Energie-efficiëntie | −10% Brandstof-verbruik per niveau van één specifieke fabriek (minimum 50% van basis)                                             |

### 6.1 Marginaal Rendement

Het rendement van een upgrade wordt uitgedrukt als **terugverdientijd**: upgradekosten ÷ extra netto-opbrengst per seconde. Hoe korter, hoe aantrekkelijker.

Gegevens bij basissnelheid (20 ticks/sec), zonder energie-surplus, fabriek volledig bevoorraad.
Upgrade niveau 1 kost 2× bouwkosten; elk volgend niveau ×3 duurder.

Netto-opbrengst/sec = verkoopprijs van de output min inputkosten van grond- en halfstoffen, per seconde.

| Fabriek        | Netto inkomst/sec | Upgrade L1 kosten | Extra/sec (+50%) | Terugverdientijd |
| -------------- | ----------------- | ----------------- | ---------------- | ---------------- |
| IJzermijn      | €40               | €100              | +€20             | **5 sec**        |
| Kolenmijn      | €60               | €120              | +€30             | **4 sec**        |
| Kopermijn      | €80               | €160              | +€40             | **4 sec**        |
| Smelterij      | €510              | €1.000            | +€255            | **3.9 sec**      |
| Kabelproductie | €320              | €800              | +€160            | **5 sec**        |
| Gieterij       | €1.050            | €2.000            | +€525            | **3.8 sec**      |
| Chipfabriek    | €1.360            | €6.000            | +€680            | **8.8 sec**      |
| Elektronica    | €4.000            | €12.000           | +€2.000          | **6 sec**        |
| Motorenfabriek | €23.700           | €30.000           | +€11.850         | **2.5 sec**      |

> Terugverdientijd geldt alleen als de fabriek ononderbroken draait met voldoende input.
> Chipfabriek scoort lager door hoge tussenliggende inputkosten; is echter verplicht voor de raket.

**Schaling over meerdere niveaus** (terugverdientijd ×3 per niveau):

| Upgrade niveau | IJzermijn | Smelterij | Motorenfabriek |
| -------------- | --------- | --------- | -------------- |
| Niveau 1       | 5 sec     | 3.9 sec   | 2.5 sec        |
| Niveau 2       | 15 sec    | 11.7 sec  | 7.5 sec        |
| Niveau 3       | 45 sec    | 35 sec    | 22.5 sec       |

Zodra de terugverdientijd van de beste beschikbare upgrade hoger is dan een nog-niet-geüpgrade fabriek elders in de keten, is die andere upgrade aantrekkelijker. Als de Energy Supply een brandstoftekort veroorzaakt, verslechtert dat de netto-opbrengst van álle fabrieken — dat maakt het altijd de eerste prioriteit.

Er is geen maximumniveau; upgrades schalen altijd door, maar het rendement daalt zodanig dat de speler altijd een betere optie elders in de keten vindt.

---

## 7. Tech Tree

- Ontgrendelt **nieuwe fabriektypes** en **recepten**
- Vereist bepaalde mijlpalen: bv. "Produceer 500× IJzererts" of "Verdien €500"
- Structureel: boom van lagen die grofweg overeenkomen met productielagen

### 7.1 Startpositie en progressie

De speler begint met alleen de **IJzermijn**. Elke volgende fabriek wordt vrijgespeeld door voldoende geld te verdienen:

| Volgorde | Fabriek / Node                                             | Vrijspelen bij totaal verdiend |
| -------- | ---------------------------------------------------------- | ------------------------------ |
| 1        | IJzermijn (Bron) + Energy Supply _(1× gratis bij opstart)_ | Direct beschikbaar             |
| 2        | Energy Supply _(extra exemplaren kopen)_                   | €50                            |
| 3        | Kolenmijn, Kopermijn, Siliciummijn                         | €200                           |
| 4        | Smelterij                                                  | €800                           |
| 5        | Gieterij, Kabelproductie                                   | €3.000                         |
| 6        | Chipfabriek, Elektronica, Motorenfabriek                   | €15.000                        |
| 7        | Assemblage                                                 | €40.000                        |

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
- **Styling**: TailwindCSS voor de opmaak van Vue-componenten
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

## 13. Implementatie-architectuurnotities

### 13.1 Fractionele cycle-voortgang

Elke node houdt een `progress: number` (float 0.0–N) bij die elke tick met `snelheidsfactor` wordt opgehoogd. Zodra `progress ≥ cyclusduur`, wordt één productiecyclus afgerond en wordt `progress` met `cyclusduur` verminderd. Buffers en inputs worden pas aangesproken op het moment dat de cyclus start (inputs) en eindigt (output).

## 12. Implementatieaanbevelingen

### 12.1 Balancetesten via TDD

De balansdata in dit document (sectie 4.5, 5.2, 6.1) is precies genoeg om geautomatiseerde tests te schrijven vóór de UI bestaat. Aanbevolen testaanpak:

| Testtype              | Wat het verifieert                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Simulatietest**     | Geef een keten nodes op, draai N ticks, assert verwachte output op basis van recepten in 4.5                         |
| **Balancetest**       | Bereken terugverdientijd per fabriek en assert dat hogere lagen altijd korter zijn bij niveau 1                      |
| **Incometest**        | Start met €0 + IJzermijn, controleer of na X ticks voldoende geld is voor de volgende fabriek (tech tree progressie) |
| **Reachability-test** | Verifieer dat de volledige raket-keten (sectie 8.1) geen doodlopende afhankelijkheden bevat                          |
| **Energietest**       | Assert dat een Energy Supply-surplus de productiesnelheid correct schaalt per de tabel in 5.3                        |

Voordeel: als balanswaarden in het document wijzigen, falen de tests direct — wat inconsistenties tussen ontwerp en implementatie voorkomt.
