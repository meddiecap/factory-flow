# Factory Flow – Verbeteringen v1

> Status: Ontwerp – gereed voor implementatie
> Gebaseerd op: eerste speelbare versie van de game

Dit document beschrijft de gewenste verbeteringen op de eerste versie van de game.
Per punt worden het ontwerp en de genomen beslissingen beschreven.

---

## 1. Nodes slepen naar een andere positie

### Ontwerp

De speler moet bestaande nodes kunnen verslepen naar een andere positie op het grid.
De node snapt automatisch in op de dichtstbijzijnde vrije cel, precies zoals bij het initieel plaatsen.

### Gedrag

- Klik en houd een node vast → de node licht op en volgt de muis
- Bij loslaten: node snapt naar de dichtstbijzijnde cel
- **Verbindingen volgen mee**: lijnen worden opnieuw getekend vanuit de nieuwe positie van de node
- Nodes mogen **overlappen**: er is geen collision detection. De speler is vrij om het canvas overzichtelijk te houden.
- Er is **geen undo/redo** voor verplaatsen.

---

## 2. Verbindingen verwijderen of verplaatsen

### Ontwerp

De speler moet bestaande verbindingen (lijnen) kunnen verwijderen of een eindpunt kunnen verplaatsen naar een andere dot.

### Gedrag – verwijderen

- Klik (zonder te slepen) op een **bezette invoer-dot of uitvoer-dot** → de optie om de verbinding te verwijderen verschijnt
- Bevestiging verwijdert de verbinding; de goederenstroom stopt onmiddellijk

### Gedrag – verplaatsen (herverbinden)

- Klik en sleep een **bezette invoer-dot of uitvoer-dot** om de verbinding los te koppelen
- Sleep naar een andere geldige dot en laat los om opnieuw te verbinden
- Loslaten op een ongeldige plek (bezette dot, of een kringverbinding) annuleert de actie en herstelt de originele verbinding
    - Een **kringverbinding** is: een cyclus in de dataflow (bijv. A→B→C→A), óf een node die verbonden wordt met zichzelf
- Herverbinden is mogelijk vanuit **zowel de output-dot als de input-dot**
- Verplaatsen is **niet** beschikbaar via het detailpanel

---

## 3. Voortgang van een cyclus in de node

### Ontwerp

Elke node toont visueel hoe ver de huidige productiecyclus gevorderd is. Dit helpt de speler direct zien welke fabrieken actief produceren en welke wachten.

### Weergave – productienodes

- Een **voortgangsbalk** op de node (onderaan, volle breedte)
- **Numerieke weergave** naast de balk: bijv. `32 / 80 ticks`
- Kleur van de balk volgt de nodestatus:
    - **Groen** – actief, cyclus loopt
    - **Oranje** – wachtend op invoer (`waiting`)
    - **Rood** – uitvoerbuffer vol (`output-blocked`)
    - **Grijs** – stil / geen energie
- De balk loopt van 0% naar 100% over `cyclusDuur` ticks; bij 100% reset hij direct

### Weergave – Splitter

- Toont de **huidige split-verhouding** in plaats van een voortgangsbalk, bijv. `70 / 30`

### Weergave – Opslagpakhuis

- Toont een **opslagbalk**: hoe vol de buffer is ten opzichte van de maximale capaciteit, bijv. `120 / 200`

---

## 4. Upgrade-niveau weergave per node

### Ontwerp

Elke node toont op het canvas een compacte weergave van de huidige upgradeniveaus, zodat de speler zonder het detailpanel te openen kan zien hoe ver een node geüpgraded is.

### Weergave

Formaat: `[Snelheid] / [Buffer] / [Energie-eff.]` als cijfers, bijv.:

| Situatie               | Weergave    |
| ---------------------- | ----------- |
| Geen upgrades          | `0 / 0 / 0` |
| Snelheid 1×            | `1 / 0 / 0` |
| Snelheid 2×, Buffer 1× | `2 / 1 / 0` |

- De drie posities corresponderen met de **voor die node relevante upgrades** in een vaste volgorde
- Nodes zonder bepaalde upgrades laten die positie weg of tonen een streepje `—`

### Volgorde per nodetype

| Nodetype              | Positie 1     | Positie 2 | Positie 3    |
| --------------------- | ------------- | --------- | ------------ |
| Mijnen (laag 0)       | Snelheid      | Buffer    | Energie-eff. |
| Energy Supply         | Snelheid      | Buffer    | —            |
| Smelterij / Kabel / … | Snelheid      | Buffer    | Energie-eff. |
| Markt                 | Verkooppunten | —         | —            |
| Splitter              | —             | —         | —            |
| Opslagpakhuis         | —             | Buffer    | —            |

> Voor de Splitter (alle posities `—`) wordt de upgradeweergave **niet** gerenderd op de node; de ruimte blijft leeg. Voor andere nodes met één of twee streepjes worden die posities **letterlijk als `—`** weergegeven, bijv. `1 / —` of `— / 2 / —`.

> Efficiëntie (input-reductie) en Lijnkapaciteit staan niet in dit overzicht omdat ze minder frequent worden geüpgraded en beter uitgelegd worden in het detailpanel.

### Beslissingen

- Alle **relevante upgrades voor die node** worden getoond in een vaste volgorde; het aantal kolommen varieert per nodetype
- Weergave als **kleine tekst** in de hoek van de node; geen icoôntjes

---

## 5. Animerende bolletjes op verbindingen

### Ontwerp

Wanneer goederen van de ene node naar de andere worden getransporteerd, verschijnt er een geanimeerd bolletje dat over de verbindingslijn beweegt. Dit maakt de goederenstroom zichtbaar en intuïtief.

### Gedrag

- Elke tick waarop daadwerkelijk goederen worden getransporteerd spawnt er **één bolletje per getransporteerde eenheid** op de output-dot van de bronnode; er kunnen dus meerdere bolletjes tegelijk op dezelfde lijn in transit zijn
- De animatieduur is een vaste **0,5 seconde** per bolletje, ongeacht de ticksnelheid
- Het bolletje heeft de **kleur van de resource** die wordt getransporteerd
- Wordt de verbinding verwijderd terwijl een bolletje in transit is: het bolletje verdwijnt onmiddellijk
- Lijnbreedte en boljetaantal schalen **niet** mee met de lijnkapaciteit; dit wordt later opnieuw beoordeeld als het in de praktijk visueel druk blijkt

---

## 6. Grid-resolutie verhogen (nodes visueel even groot)

### Ontwerp

Het huidige grid heeft te grove eenheden: een **IJzermijn** neemt slechts 2×1 cellen in. De speler wil dat nodes meer cellen beslaan — bijv. de IJzermijn 4×2 — terwijl de **visuele grootte op het scherm gelijk blijft**.

Dit wordt bereikt door de **gridcelgrootte te halveren** (zoom-out of kleinere pixels per cel), zodat dezelfde schermoppervlakte wordt gedekt maar met fijnere positionering.

### Aanpak

- **Gridcelgrootte**: van de huidige waarde halveren (bijv. van 64px naar 32px per cel)
- **Alle node-afmetingen verdubbelen** in het ontwerp:

| Fabriek                                                                       | Huidig | Nieuw |
| ----------------------------------------------------------------------------- | ------ | ----- |
| IJzermijn, Kolenmijn, Kopermijn, Siliciummijn, Energy Supply                  | 2 × 1  | 4 × 2 |
| Markt, Splitter                                                               | 2 × 1  | 4 × 2 |
| Smelterij, Kabelproductie, Gieterij, Chipfabriek, Elektronica, Motorenfabriek | 2 × 2  | 4 × 4 |
| Opslagpakhuis                                                                 | 2 × 2  | 4 × 4 |
| Assemblage                                                                    | 4 × 3  | 8 × 6 |

- **Startgrootte canvas**: van 20×12 naar 40×24 cellen (zelfde schermoppervlakte)
- **Uitbreidingskosten** blijven hetzelfde in euro's; de speler koopt dezelfde schermoppervlakte als voorheen

### Effect

- Verbindingen hebben meer tussenruimte om langs te lopen → minder visuele overlap
- Fijnere snapping maakt plaatsing intuïtiever
- Meer celruimte op een node biedt ruimte voor voortgangsbalk, upgradeweergave en bolletjesanimaties (verbeteringen 3, 4 en 5)

### Beslissingen

- **Panning en zooming** worden niet aangepast; de resolutiewijziging levert fijnere snapping op zonder extra zoom-aanpassingen
- **Geen migratie** van localStorage; bestaande opgeslagen layouts worden gereset

---

## 7. Bouwkosten voor Splitter, Opslagpakhuis en Markt

### Ontwerp

Splitter, Opslagpakhuis en Markt zijn momenteel gratis. Dit maakt het oneindig plaatsen van Markets aantrekkelijk, waardoor de Verkooppunten-upgrade (€200–€800+) economisch overbodig wordt.

### Voorstel: basiskosten

| Node          | Bouwkost (1e) | Toelichting                                                    |
| ------------- | ------------- | -------------------------------------------------------------- |
| Splitter      | €100          | Goedkoop hulpmiddel; mag frequent worden gebruikt              |
| Opslagpakhuis | €300          | Tussenstation; prijsstelling vergelijkbaar met een kleine mine |
| Markt         | €500          | Duurder dan een Splitter; goedkoper dan een Smelterij (€500)   |

- **Splitter**: vlakprijs €100, geen incrementele schaling (hulpnode)
- **Opslagpakhuis en Markt**: incrementele bouwkostformule: `kosten_n = basiskosten × 1.5^(n−1)`
    - 2e Opslagpakhuis: €450, 3e: €675, …
    - 2e Markt: €750, 3e Markt: €1.125, …
- Dit maakt het sparen voor een extra verkooppunt (€200 upgrade) aantrekkelijker dan een tweede Market

### Vrijspelen in de tech tree

| Node          | Vrijspelen bij totaal verdiend                                 |
| ------------- | -------------------------------------------------------------- |
| Splitter      | Direct beschikbaar (samen met IJzermijn)                       |
| Opslagpakhuis | €200 (vroeg beschikbaar)                                       |
| Markt         | Direct beschikbaar (1× gratis bij opstart, zoals de IJzermijn) |

> De eerste Market is gratis (vooraf geplaatst of gratis te kopen), zodat de speler altijd een afzetpunt heeft. Extra Markets kosten geld.

### Beslissingen

- €500 voor de Markt is de definitieve prijs
- De **eerste Markt** is gratis en direct beschikbaar bij de start, zodat de speler altijd een afzetpunt heeft
- De **Splitter** heeft altijd een vlakprijs (€100); de incrementele formule geldt niet

---

## 8. Energy Supply: overflow-gedrag

### Probleem

Als de uitvoerbuffer van de Energy Supply vol raakt (geen afname via verbindingen), stopt de node. Hierdoor kan ook de IJzermijn stilvallen — de simualtor heeft dan geen energieproductie meer, en de speler zit in een doodpunt: geen energie → geen productie → geen inkomsten.

### Oplossing

De Energy Supply produceert **onbeperkt door**, ook als de uitvoerbuffer vol is. Overtollige Brandstof die niet in de buffer past, verdwijnt stilletjes.

De snelheidsmultiplier (globale energiepool, sectie 5.3 game-design.md) wordt bepaald door daadwerkelijk geconsumeerde Brandstof — **niet** door gespilde Brandstof.

### Gedrag

- Energy Supply-node stopt **nooit** vanwege een volle uitvoerbuffer
- Overtollige productie boven de buffergrootte wordt afgedankt zonder effect
- Dit geldt **uitsluitend** voor de Energy Supply; alle andere nodes stoppen nog bij een volle uitvoerbuffer
- De speler is hierdoor niet verplicht een verbinding of Markt aan te leggen voor de Energy Supply, maar doet het wel als hij de snelheidsmultiplier wil benutten

---

## Implementatievolgorde

De aanbevolen volgorde van implementatie, van minste naar meeste afhankelijkheden:

| Stap | Verbetering                                   | Reden                                                                     |
| ---- | --------------------------------------------- | ------------------------------------------------------------------------- |
| 1    | **8** – Energy Supply overflow                | Pure simulatielogica, geen UI-afhankelijkheden                            |
| 2    | **7** – Bouwkosten                            | Pure economielogica, geen UI-afhankelijkheden                             |
| 3    | **6** – Grid-resolutie                        | Fundamentele visuele wijziging; noodzakelijk vóór verbeteringen 3, 4 en 5 |
| 4    | **1** – Nodes slepen                          | Canvas-interactie; bouwt op het nieuwe grid                               |
| 5    | **2** – Verbindingen verwijderen/herverbinden | Canvas-interactie; logisch aansluitend op node-slepen                     |
| 6    | **3** – Voortgangsbalk                        | Visueel; profiteert van de grotere nodes uit stap 3                       |
| 7    | **4** – Upgrade-niveau weergave               | Visueel; profiteert van de grotere nodes uit stap 3                       |
| 8    | **5** – Animerende bolletjes                  | Meest complexe animatielogica; als laatste zodat de rest al stabiel is    |

---

## Status: alle ontwerpvragen beantwoord

Alle vragen uit het initiële ontwerp zijn verwerkt. Dit document is gereed als basis voor implementatie.
