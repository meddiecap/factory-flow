# Infinite Canvas – Ontwerpdocument

> Status: Voorstel
> Vervangt: de "Canvas uitbreiden"-mechanic uit sectie 3.3 en 9.2 van `game-design.md`

---

## 1. Beslissing

Het grid is **oneindig** in alle richtingen. De speler hoeft geen rijen of kolommen te kopen. In
plaats daarvan navigeert de speler via **zoomen en pannen** door het speelveld.

De "Canvas uitbreiden"-knop (HUD-balk) en de bijbehorende uitbreidingskosten (`€200 × 1.5^n`)
vervallen volledig.

### Reden

- Ruimte als koopbaar resource voelt arbitrair aan in een game die verder draait op productiesnelheid
  en geldstromen. Het is een extra drempel zonder strategische diepgang.
- Een oneindig canvas sluit beter aan bij het genre (vergelijk Factorio, Satisfactory): de speler
  organiseert zijn eigen fabriek zonder kunstmatige grenzen.
- Zoomen en pannen zijn standaard UX-verwachtingen voor een canvas-gebaseerde game.

---

## 2. Grid & Coördinatensysteem

Het grid is conceptueel oneindig: nodes kunnen op elke gridcoördinaat `(kolom, rij)` worden
geplaatst, ook negatieve waarden. Er is geen harde grens.

De **camera** heeft een eigen positie `(cameraX, cameraY)` in **wereldpixels** en een
**zoomniveau** (zie sectie 3). Het canvas-element is altijd even groot als het browservenster;
wat er zichtbaar is, wordt bepaald door de camerabeweging en zoom.

**Conversiefuncties (wereld ↔ scherm):**

```
schermX = (wereldX − cameraX) × zoom
schermY = (wereldY − cameraY) × zoom

wereldX = schermX / zoom + cameraX
wereldY = schermY / zoom + cameraY
```

Nodes slaan hun positie op als gridcoördinaten `(kolom, rij)`. De omzetting naar wereldpixels
gebeurt via een vaste `CELL_SIZE` constante (bijv. 96 px):

```
wereldX = kolom × CELL_SIZE
wereldY = rij × CELL_SIZE
```

Pixelposities worden puur voor rendering berekend en nooit opgeslagen.

---

## 3. Zoom

### 3.1 Zoomniveaus

| Niveau | Zoomfactor | Zichtbare gridcellen (bij 1920×1080) |
| ------ | ---------- | ------------------------------------ |
| Min    | 0.25×      | ~80 × 43 cellen                      |
| Start  | 1.0×       | ~20 × 11 cellen                      |
| Max    | 3.0×       | ~7 × 4 cellen                        |

De startzoom van 1.0× geldt voor **elke schermgrootte**; de viewport bepaalt hoeveel cellen er
zichtbaar zijn, maar de zoom past zich niet automatisch aan aan de schermafmetingen. De grenzen
zijn richtlijnen; exacte waarden worden in de implementatiefase afgesteld op gevoel.

### 3.2 Invoer

| Actie                        | Resultaat                                 |
| ---------------------------- | ----------------------------------------- |
| Scrollwiel omhoog            | Inzoomen op muiscursorpositie             |
| Scrollwiel omlaag            | Uitzoomen op muiscursorpositie            |
| `Ctrl` + scrollwiel          | Idem (voor trackpads die scrollen sturen) |
| `+` / `-` toets              | Inzoomen / uitzoomen op canvascentrum     |
| `0` toets                    | Reset zoom naar 1.0×                      |
| Knijpgebaar (touchpad/touch) | Pinch-to-zoom op centroïd van gebaren     |

**Zoom-op-cursor:** bij scrollen blijft het punt onder de cursor op dezelfde schermlocatie. Dit
vereist dat de camera meebeweegt:

```
cameraX += cursorWorldX × (1 − schaalFactor)
cameraY += cursorWorldY × (1 − schaalFactor)
```

waarbij `schaalFactor = nieuwZoom / oudZoom`.

---

## 4. Pannen

### 4.1 Invoer

| Actie                                          | Resultaat                                        |
| ---------------------------------------------- | ------------------------------------------------ |
| Middelste muisknop ingedrukt + slepen          | Pannen naar sleeprichting                        |
| `Spatiebalk` ingedrukt + linkermuisknop slepen | Tijdelijk pannen (zelfde als middelste muisknop) |
| Pijltjestoetsen                                | Pannen in stapjes (snelheid: 10 gridcellen/s)    |
| Trackpad twee-vingers scrollen                 | Pannen horizontaal en verticaal                  |

Tijdens het pannen via `Spatiebalk` verandert de cursor in een hand-icoon om de panning-modus
aan te geven en te voorkomen dat de speler per ongeluk verbindingen of nodes aanraakt.

### 4.2 Animatie

Pannen is altijd direct (geen inertie of momentum in het basisontwerp). Inertie kan later worden
toegevoegd als QoL-verbetering.

---

## 5. Minimap

Een minimap in de hoek van het canvas geeft een vogelvluchtoverzicht. Dit is essentieel nu het
canvas oneindig is.

### 5.1 Gedrag

- Toont alle geplaatste nodes als kleine gekleurde rechthoeken
- Het zichtbare venster ("viewport") is aangeduid als een transparante rechthoek op de minimap
- Klik of sleep op de minimap om snel naar een locatie te springen
- Standaard zichtbaar; kan worden ingeklapt via een knop (`M` als sneltoets)

### 5.2 Positionering

Rechtsonder in het canvas-venster, als overlay boven het speelveld. Vaste grootte (bijv.
200 × 120 px), schaalbaar met de viewport als dat nodig blijkt.

### 5.3 Kleurcodering minimap

De minimap gebruikt vereenvoudigde kleuren:

| Node-type     | Kleur op minimap |
| ------------- | ---------------- |
| Bron          | Donkergroen      |
| Productienode | Blauw            |
| Markt         | Goud             |
| Splitter      | Grijs            |
| Energy Supply | Geel             |
| Geselecteerd  | Wit omranding    |

---

## 6. "Fit to view"-functie

Een knop (en sneltoets `F`) centreert en zoomt het canvas zodat alle geplaatste nodes net zichtbaar
zijn met een kleine marge. Nuttig na het plaatsen van een schematic of na een lang bouwsessie.

Algoritme:

1. Bereken de bounding box van alle nodes (min/max kolom en rij).
2. Voeg een marge van 2 gridcellen toe aan alle zijden.
3. Bereken de benodigde zoom zodat de bounding box volledig zichtbaar is: neem het **minimum**
   van de zoom die past op breedte en de zoom die past op hoogte.
4. Clamp zoom op [0.25, 3.0].
5. Centreer de camera op het midden van de bounding box.

---

## 7. Impact op de rest van het ontwerp

### 7.1 Economie

De uitbreidingskosten (`€200 × 1.5^n`) vervallen. Het budget dat de speler zou besteden aan
canvas-uitbreiding, gaat nu volledig naar fabrieken en upgrades. Dit kan het totale geldverloop
iets sneller maken; hier kan worden gecompenseerd door fabriekskosten of upgradeprijzen licht aan
te passen als playtest dit uitwijst.

De bullet in sectie 5.1 van `game-design.md` — _"Geld wordt gebruikt voor: nieuwe fabrieken,
upgrades, canvas-uitbreiding, tech tree"_ — moet worden bijgewerkt: **canvas-uitbreiding
vervalt** als bestedingscategorie.

### 7.2 UI-wijzigingen

- De "Canvas uitbreiden"-knop in de HUD-balk vervalt.
- De bijbehorende bevestigingsmodal in sectie 9.2 vervalt.
- De minimap (sectie 5 hierboven en sectie 9 van `game-design.md`) wordt kernonderdeel in plaats
  van optioneel.
- De sectie "Zoomen & pannen" in sectie 9 van `game-design.md` wordt uitgewerkt op basis van
  dit document.

### 7.3 Persistentie

De opgeslagen state slaat de **cameratoestand** (positie + zoomniveau) op per sessie, zodat de
speler terugkeert op dezelfde plek. Is er geen opgeslagen cameratoestand (eerste start of nieuwe
run na prestige), dan start de camera op wereldcoördinaat `(0, 0)` met startzoom 1.0×. Bij het
laden van een schematic wordt de camera via "Fit to view" gericht op de zojuist geplaatste nodes.

---

## 8. Openstaande vragen

- **Zoomsnelheid**: hoeveel procent per scroll-tick is prettig? Typisch 10–15 % per stap.
- **Inertie bij pannen**: wél of geen momentum na loslaten? Kan QoL verbeteren maar voelt soms
  slordig. Bepalen in playtesting.
- **Performantiegrens van de minimap**: bij honderden nodes kan de minimap duur worden om elke
  frame opnieuw te renderen. Overweeg om de minimap op een lagere framerate te renderen (bijv.
  10 fps) of alleen bij state-wijzigingen te hertekenen.
