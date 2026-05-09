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

> Smelterij: 3× IJzererts + 1× Kolen → 1× Staal per 80 ticks (= 0,25 Staal/sec bij basissnelheid)

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

| Node                   | Functie                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bron**               | Produceert grondstoffen (laag 0), upgradebaar in snelheid                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Energy Supply**      | Produceert Brandstof zonder grondstofkosten; upgradebaar in productie                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Splitter/Allocator** | Verdeelt 1 input over 2 outputs met instelbare ratio via fractionele accumulatie (zie hieronder)                                                                                                                                                                                                                                                                                                                                                                                              |
| **Opslagpakhuis**      | Grote buffer als tussenstation. Verbind de **uitvoer-dot van een productienode** met de **invoer-dot links** van het pakhuis. Verbind de **uitvoer-dot rechts** van het pakhuis met de invoer-dot van de volgende schakel. Accepteert elk resourcetype; 200 eenheden per kant.                                                                                                                                                                                                                |
| **Markt/Verkooppunt**  | Pure sink; geen uitvoer-dot. Verbind de **uitvoer-dot van een productienode** met de **invoer-dot links** van de Markt. De Markt verkoopt automatisch alles wat binnenkomt; max 20 eenheden/tick per aansluitpunt. De Markt start met **1 verkooppunt** (= 1 invoer-dot). Extra aansluitpunten worden gekocht via de **Verkooppunten-upgrade** (zie sectie 6). Per verkooppunt is in de NodeDetail-panel zichtbaar welke resource er doorheen loopt en hoeveel geld die per seconde oplevert. |
| **Node Group**         | Meerdere nodes bundelen tot één container                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

**Splitter — fractionele accumulatie**: elke tick wordt de ratio opgeteld bij twee interne accumulatoren. Zodra een accumulator ≥ 1 bereikt, stuurt hij 1 eenheid door en trekt hij 1 af. Voorbeeld bij 70/30: accumulator A krijgt +0.7/tick, B +0.3/tick. Tick 1: A=0.7, B=0.3. Tick 2: A=1.4 → stuurt 1 door, A=0.4; B=0.6. Tick 3: A=1.1 → stuurt 1 door, A=0.1; B=0.9. Tick 4: A=0.8; B=1.2 → stuurt 1 door, B=0.2. Over 10 ticks: 7 naar A, 3 naar B.

### 4.5 Fabrieksrecepten

Alle fabrieken met hun productierecept, cyclusduur, bouwkosten en brandstofverbruik.

**Incrementele bouwkosten**: elke extra fabriek van hetzelfde type kost ×1.5 meer dan de vorige.
Formule: `kosten_n = basiskosten × 1.5^(n−1)` waarbij n het aantal al gebouwde fabrieken van dat type is.
Voorbeeld: 3e IJzermijn = €50 × 1.5² = €113.

De basisproductiesnelheid is bewust laag gehouden zodat het vroege spel uitdagend blijft. Alle cyclustijden gaan uit van 20 ticks/seconde; de kolom _Sec/cyclus_ toont de werkelijke duur bij basissnelheid (zonder energie-surplus).

| Fabriek        | Input per cyclus                                                          | Output per cyclus                | Ticks | Sec/cyclus | Bouwkost (1e) | Brandstof/tick |
| -------------- | ------------------------------------------------------------------------- | -------------------------------- | ----- | ---------- | ------------- | -------------- |
| IJzermijn      | —                                                                         | 1× IJzererts                     | 40    | 2 sec      | €50           | 0.5            |
| Kolenmijn      | —                                                                         | 1× Kolen                         | 40    | 2 sec      | €60           | 0.5            |
| Kopermijn      | —                                                                         | 1× Koper                         | 40    | 2 sec      | €80           | 0.5            |
| Siliciummijn   | —                                                                         | 1× Silicium                      | 40    | 2 sec      | €80           | 0.5            |
| Energy Supply  | —                                                                         | 2× Brandstof                     | 40    | 2 sec      | €150          | —              |
| Smelterij      | 3× IJzererts + 1× Kolen                                                   | 1× Staal                         | 80    | 4 sec      | €500          | 1              |
| Kabelproductie | 2× Koper                                                                  | 1× Kabels                        | 80    | 4 sec      | €400          | 1              |
| Gieterij       | 4× Staal                                                                  | 1× Rompdelen + 1× Brandstoftanks | 160   | 8 sec      | €1.000        | 1.5            |
| Chipfabriek    | 2× Silicium + 3× Kabels                                                   | 1× Circuits                      | 160   | 8 sec      | €3.000        | 2              |
| Elektronica    | 2× Circuits                                                               | 1× Besturingssysteem             | 160   | 8 sec      | €6.000        | 2              |
| Motorenfabriek | 4× Staal + 2× Brandstof                                                   | 1× Stuwraketten                  | 160   | 8 sec      | €15.000       | 2 \*           |
| Assemblage     | 2× Rompdelen + 2× Brandstoftanks + 1× Besturingssysteem + 2× Stuwraketten | 1× Raket                         | 800   | 40 sec     | €50.000       | 3              |

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

| Upgrade             | Van toepassing op         | Effect                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Snelheid            | Alle productienodes       | Multiplicatief: niveau n geeft ×1.5ⁿ boven basissnelheid (n=1: ×1.5; n=2: ×2.25; n=3: ×3.375); elke stap ×3 duurder; geen maximum                                                                                                                        |
| Buffer              | Alle nodes met buffers    | +10 eenheden per niveau op zowel invoer- als uitvoerbuffer                                                                                                                                                                                               |
| Efficiëntie         | Productienodes met invoer | −10% inputverbruik per niveau (minimum 50% van basis); n=1: ×2.7 i.p.v. ×3 erts; n=5: ×1.5                                                                                                                                                               |
| Lijnkapaciteit      | Verbindingen (niet nodes) | +10 eenheden/tick per niveau boven de standaard van 10 (n=1: 20/tick; n=2: 30/tick)                                                                                                                                                                      |
| Energie-efficiëntie | Productienodes            | −10% Brandstof-verbruik per niveau van één specifieke fabriek (minimum 50% van basis)                                                                                                                                                                    |
| Verkooppunten       | Alleen Markt              | +1 invoer-dot per niveau; elk extra verkooppunt kost `€200 × 2^(niveau−1)` (niveau 1: €200, niveau 2: €400, niveau 3: €800, …). De Markt start met 1 gratis verkooppunt. Elk verkooppunt heeft zijn eigen aansluitlijn en verkoopt tot 20 eenheden/tick. |

### 6.1 Marginaal Rendement

Het rendement van een upgrade wordt uitgedrukt als **terugverdientijd**: upgradekosten ÷ extra netto-opbrengst per seconde. Hoe korter, hoe aantrekkelijker.

Gegevens bij basissnelheid (20 ticks/sec en nieuwe cyclustijden uit sectie 4.5), zonder energie-surplus, fabriek volledig bevoorraad.
Upgrade niveau 1 kost 2× bouwkosten; elk volgend niveau ×3 duurder.

Netto-opbrengst/sec = (output/sec × verkoopprijs) − (input/sec × marktwaarde inputs).

| Fabriek        | Productie | Netto inkomst/sec | Upgrade L1 kosten | Extra/sec (+50%) | Terugverdientijd |
| -------------- | --------- | ----------------- | ----------------- | ---------------- | ---------------- |
| IJzermijn      | 0,5/sec   | €1                | €100              | +€0,50           | **200 sec**      |
| Kolenmijn      | 0,5/sec   | €1,50             | €120              | +€0,75           | **160 sec**      |
| Kopermijn      | 0,5/sec   | €2                | €160              | +€1              | **160 sec**      |
| Smelterij      | 0,25/sec  | €12,75            | €1.000            | +€6,38           | **157 sec**      |
| Kabelproductie | 0,25/sec  | €8                | €800              | +€4              | **200 sec**      |
| Gieterij       | 0,125/sec | €26,25            | €2.000            | +€13,13          | **152 sec**      |
| Chipfabriek    | 0,125/sec | €34               | €6.000            | +€17             | **353 sec**      |
| Elektronica    | 0,125/sec | €100              | €12.000           | +€50             | **240 sec**      |
| Motorenfabriek | 0,125/sec | €592,50           | €30.000           | +€296,25         | **101 sec**      |

> Terugverdientijd geldt alleen als de fabriek ononderbroken draait met voldoende input.
> Chipfabriek scoort lager door hoge tussenliggende inputkosten; is echter verplicht voor de raket.
> Motorenfabriek heeft korte terugverdientijd dankzij de hoge stuwrakettenprijs.

**Schaling over meerdere niveaus** (terugverdientijd ×3 per niveau):

| Upgrade niveau | IJzermijn | Smelterij | Motorenfabriek |
| -------------- | --------- | --------- | -------------- |
| Niveau 1       | 200 sec   | 157 sec   | 101 sec        |
| Niveau 2       | 600 sec   | 471 sec   | 303 sec        |
| Niveau 3       | 1.800 sec | 1.413 sec | 909 sec        |

Zodra de terugverdientijd van de beste beschikbare upgrade hoger is dan een nog-niet-geüpgrade fabriek elders in de keten, is die andere upgrade aantrekkelijker. Als de Energy Supply een brandstoftekort veroorzaakt, verslechtert dat de netto-opbrengst van álle fabrieken — dat maakt het altijd de eerste prioriteit.

Er is geen maximumniveau; upgrades schalen altijd door, maar het rendement daalt zodanig dat de speler altijd een betere optie elders in de keten vindt.

---

## 7. Tech Tree

- Ontgrendelt **nieuwe fabriektypes** en **recepten**
- Vereist bepaalde mijlpalen: bv. "Produceer 500× IJzererts" of "Verdien €500"
- Structureel: boom van lagen die grofweg overeenkomen met productielagen

### 7.1 Startpositie en progressie

De speler begint met een **gratis IJzermijn en een gratis Energy Supply** (beide vooraf geplaatst). Elke volgende fabriek wordt vrijgespeeld door voldoende geld te verdienen:

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
- **Markt-verkooppunten indicator**: in de NodeDetail-panel van een Markt-node staat per verkooppunt (per aangesloten invoer-dot) welke resource er doorheen loopt en hoeveel dat op dit moment per seconde oplevert (berekend als gemiddelde over de laatste seconde)

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
- **Testbestanden**: alle tests staan in een `./__tests__/` map; bestandsnaam: `*.test.ts`

---

## 11. Openstaande Vragen

- Monetisatie: gratis, betaald, of cosmetics? _(later te bepalen)_

---

## 12. Ontwikkelwerkwijze

- **Kleine stappen**: elke codewijziging is één logische eenheid — één feature, één bugfix, één refactor. Combineer nooit meerdere losstaande wijzigingen in één commit.
- **Losse commits per onderwerp**: een commit bevat wijzigingen die bij elkaar horen. Naamgeving volgt Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- **Tests eerst**: bij nieuwe simulatielogica schrijf je de test vóór de implementatie (TDD). De test documenteert het verwachte gedrag.
- **Geen grote batches**: de situatie waarbij meerdere features in één keer worden geïmplementeerd en dan in één commit worden vastgelegd, moet worden vermeden. Als je merkt dat je meer dan 3–4 bestanden wijzigt voor één commit, splits dan op in kleinere stappen.
- **Controleer voor commit**: voer altijd `npm test` en `vue-tsc --noEmit` uit vóór een commit; commit alleen als beide slagen.

## 13. Implementatie-architectuurnotities

### 13.1 Fractionele cycle-voortgang

Elke node houdt een `progress: number` (float 0.0–N) bij die elke tick met `snelheidsfactor` wordt opgehoogd. Zodra `progress ≥ cyclusduur`, wordt één productiecyclus afgerond:

1. **Cyclus-start check**: vóór de start controleert de node of de invoerbuffer voldoende eenheden bevat voor de volledige cyclus. Zo niet, wacht de node (status: `waiting`) zonder `progress` op te hogen.
2. **Inputs aftrekken**: bij cyclus-start worden de benodigde inputs direct uit de invoerbuffer afgetrokken.
3. **Output toevoegen**: bij cyclus-einde worden de outputs aan de uitvoerbuffer toegevoegd (mits buffer niet vol; anders stopt de cyclus en worden reeds afgetrokken inputs niet teruggegeven — de cyclus is afgerond, de output wacht intern).
4. `progress` wordt met `cyclusduur` verminderd (zodat overloop in de volgende cyclus doorloopt).

## 14. Implementatieaanbevelingen

### 14.1 Balancetesten via TDD

Elke feature en elk stukje simulatielogica krijgt geautomatiseerde tests in `./__tests__/`. Er is geen limiet op het aantal tests — dekking is leidend, niet een getal. Als balanswaarden in dit document wijzigen, falen de betrokken tests direct — wat inconsistenties tussen ontwerp en implementatie voorkomt.

| Testtype              | Wat het verifieert                                                                                                                                                 | Status                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Simulatietest**     | Geef een keten nodes op, draai N ticks, assert verwachte output op basis van recepten in 4.5                                                                       | ✅ Klaar                                                          |
| **Balancetest**       | Bereken terugverdientijd (upgradekosten ÷ extra opbrengst/sec) per fabriek op basis van de nieuwe cyclustijden uit 4.5 en herbalanceerde tabel uit 6.1             | ⚠️ Aanpassen — cyclustijden ×40 en opbrengsten/sec zijn gewijzigd |
| **Incometest**        | Start met €0 + IJzermijn + Energy Supply (beide gratis), controleer of na X ticks voldoende geld is voor de volgende fabriek (tech tree progressie uit sectie 7.1) | ⚠️ Aanpassen — startconditie gewijzigd (nu 2 nodes)               |
| **Reachability-test** | Verifieer dat de volledige raket-keten (sectie 8.1) geen doodlopende afhankelijkheden bevat                                                                        | ✅ Klaar                                                          |
| **Energietest**       | Assert dat een Energy Supply-surplus de productiesnelheid correct schaalt per de tabel in 5.3                                                                      | ✅ Klaar                                                          |
