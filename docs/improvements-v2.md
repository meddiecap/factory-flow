# Factory Flow – Verbeteringen v2

> Status: Ontwerpbeslissingen genomen – gereed voor implementatie
> Gebaseerd op: improvements-v1.md (volledig doorgevoerd)

Dit document beschrijft vier wijzigingen op het huidige ontwerp.
Alle ontwerpvragen zijn beantwoord; het document is gereed als basis voor implementatie.

---

## 1. Energieverbruik zichtbaar per factory

### Wat de speler wil zien

Elke node toont hoeveel **Brandstof/tick** hij verbruikt. De speler kan zo in één oogopslag zien welke fabrieken energiehonger hebben zonder het detailpanel te openen.

### Voorstel – weergave op de node

- Toon het energieverbruik als een compacte regel op de node, bijv. `⚡ 1.5 /tick`
- Wordt getoond op **alle actieve productienodes** (niet op Splitter, Markt of Opslagpakhuis)
- Waarden uit de tabel in sectie 4.5 van game-design.md:

| Fabriek        | Weergave       |
| -------------- | -------------- |
| IJzermijn      | `⚡ 0.5 /tick` |
| Kolenmijn      | `⚡ 0.5 /tick` |
| Kopermijn      | `⚡ 0.5 /tick` |
| Siliciummijn   | `⚡ 0.5 /tick` |
| Smelterij      | `⚡ 1.0 /tick` |
| Kabelproductie | `⚡ 1.0 /tick` |
| Gieterij       | `⚡ 1.5 /tick` |
| Chipfabriek    | `⚡ 2.0 /tick` |
| Elektronica    | `⚡ 2.0 /tick` |
| Motorenfabriek | `⚡ 2.0 /tick` |
| Assemblage     | `⚡ 3.0 /tick` |

- De waarde is **statisch** (vaste eigenschap van de fabriek); hij hoeft niet per tick opnieuw berekend te worden
- Bij energie-efficiëntie-upgrades past de waarde aan naar het werkelijk verbruik

### Status

Geen openstaande vragen — kan direct worden uitgewerkt voor implementatie.

---

## 2. Weergave hoeveel supply een Energy Supply levert

### Wat de speler wil zien

Op de Energy Supply-node is direct zichtbaar hoeveel energie er per tick wordt geleverd en hoe die verdeeld wordt over de aangesloten fabrieken.

### Ontwerp

Energie loopt via expliciete gele verbindingen (zie punt 3). De Energy Supply toont op de node:

- **Totale output per tick**: de energie die deze node per tick genereert, bijv. `⚡ 0.05 /tick`
- **Verdeling**: als er N fabrieken zijn aangesloten, ontvangt elke fabriek `0.05 / N /tick`; dit is impliciet zichtbaar via de gele verbindingslijnen
- **Bufferinhoud**: de huidige hoeveelheid energie in de uitvoerbuffer, bijv. `Buffer: 12 / 20`

De speler ziet zo in één oogopslag of de Energy Supply voldoende levert voor de aangesloten fabrieken.

### Opmerking over balanswaarden

De huidige productiewaarde van de Energy Supply (2 eenheden per 40 ticks = 0.05/tick) was ontworpen voor de globale pool, waarbij meerdere Energy Supplies optelden. In het nieuwe verbindingsmodel kan één Energy Supply slechts een fractie leveren van wat een gemiddelde fabriek nodig heeft (bijv. 0.5/tick voor een IJzermijn). **De productiewaarden van de Energy Supply zullen moeten worden aangepast** om het directe verbindingsmodel speelbaar te maken — dit is een balancevraagstuk voor implementatie, niet een ontwerpdiscussie.

---

## 3. Energy Supply met output-dot verbinden aan Energy Input bij factories

### Huidige situatie

In het bestaande ontwerp werkt energie als een **globale pool** (sectie 5.3 en 13.2–13.3 van game-design.md):

- Alle Energy Supplies produceren Brandstof; dit gaat in één globale pot
- Alle fabrieken trekken er per tick uit
- Het nettosurplus bepaalt de snelheidsmultiplier voor _iedereen tegelijk_
- **Geen verbindingen nodig** voor energie — het is onzichtbare infrastructuur

### Gewenste situatie

De speler wil:

1. De Energy Supply een **output-dot** geven waarmee energie expliciet wordt doorgevoerd
2. Elke fabriek een **Energy Input-dot** geven waarop een verbinding van een Energy Supply kan worden aangesloten

### Ontwerpbeslissingen

#### Beslissing 1 – De globale pool verdwijnt volledig

Energie loopt **uitsluitend via expliciete verbindingen**. De globale Brandstof-pool (sectie 5.3 en 13.2–13.3 van game-design.md) vervalt volledig. Elke fabriek moet expliciet worden aangesloten op een Energy Supply om te werken.

Noot: "energie" in het nieuwe model is een **abstract power-concept** — het is niet hetzelfde als Brandstof als verkoopbaar product. Energie is niet te verkopen bij de Markt. De Energy Supply-node is voortaan een stroomgenerator, niet een Brandstoffabriek.

#### Beslissing 2 – Energy Supply heeft meerdere output-dots; gelijkmatige verdeling

Een Energy Supply kan meerdere fabrieken bedienen **zonder Splitter**. Hiervoor wijkt de Energy Supply af van de standaardregel "één verbinding per dot":

- De Energy Supply heeft **dynamisch meerdere energie-output-dots**: het aantal dots = het aantal actieve verbindingen + 1 (de vrije, aansluitbare dot)
- Elke tick verdeelt de Energy Supply zijn totale energieproductie **gelijkmatig** over alle aangesloten fabrieken: bij N verbindingen ontvangt elke fabriek `1/N` van de totale output per tick
- Er is **geen maximum** op het aantal verbindingen van een Energy Supply

**Voorbeeld van de dynamische dot-weergave:**

| Aantal verbonden fabrieken | Gerenderde output-dots op Energy Supply |
| -------------------------- | --------------------------------------- |
| 0                          | 1 lege dot (uitnodigend)                |
| 1                          | 1 verbonden dot + 1 lege dot            |
| 2                          | 2 verbonden dots + 1 lege dot           |
| N                          | N verbonden dots + 1 lege dot           |

De extra lege dot is altijd zichtbaar zodat de speler direct ziet dat hij nog een fabriek kan aansluiten.

#### Beslissing 3 – Geen energieverbinding = volledig stil

Een fabriek zonder energieverbinding heeft `speedFactor = 0` en staat **volledig stil**. Status op de node: `geen energie` (visueel grijs, zie ook verbeteringen punt 3 – voortgangsbalk).

#### Beslissing 4 – Surplus-multiplier verdwijnt

De surplus-multiplier (`1 + 0.2 × ln(surplus + 1)`) vervalt. Het nieuwe snelheidsmodel per fabriek:

```
speedFactor = clamp(ontvangenEnergie / benodidgeEnergie, 0, 1)
```

- Ontvangt een fabriek **precies genoeg of meer**: `speedFactor = 1.0` (volle snelheid)
- Ontvangt een fabriek **minder dan nodig**: `speedFactor` schaalt lineair van 1 naar 0
- Ontvangt een fabriek **niets** (geen verbinding): `speedFactor = 0` (volledig stil)

Er is geen snelheidsbonus voor overschot. Het loont niet meer om meer energie te leveren dan een fabriek nodig heeft.

#### Beslissing 5 – Energie-dots zijn geel

Energie-dots (zowel output op Energy Supply als input op fabrieken) krijgen een **gele kleur** (elektriciteitskleur), distinct van alle grondstof- en productieresourcekleuren. De verbindingslijn tussen een Energy Supply en een fabriek is eveneens geel. Dit maakt het energienetwerk in één oogopslag herkenbaar op het canvas.

---

## 4. Motorenfabriek: recept-input wijzigen van Brandstof naar Kolen

### Huidige situatie

De Motorenfabriek heeft een dubbele rol voor Brandstof (zie voetnoot in sectie 4.5 game-design.md):

1. **Energie** (globale pool): 2 Brandstof/tick
2. **Recept-input** (via verbinding): 2× Brandstof per cyclus (= 0.5/tick bij basissnelheid)

Dit is verwarrend: Brandstof doet dienst als zowel energie _als_ grondstof in dezelfde fabriek.

### Gewenste wijziging

De recept-input van de Motorenfabriek wordt gewijzigd van **Brandstof** naar **Kolen**.

| Onderdeel     | Voor                            | Na                                            |
| ------------- | ------------------------------- | --------------------------------------------- |
| Recept-input  | 4× Staal + 2× Brandstof         | 4× Staal + 2× Kolen                           |
| Energie-input | 2 Brandstof/tick (globale pool) | 2 energie-eenheden/tick (via gele verbinding) |

### Motivatie

- Verwijdert de verwarrende dubbele rol van Brandstof in de Motorenfabriek
- Kolen is al aanwezig als laag-0 resource en wordt momenteel alleen door de Smelterij (1× per cyclus) gebruikt — een tweede afnemer maakt Kolen strategisch interessanter
- Past goed bij de thematische logica: een motorenfabriek die cokes/steenkool nodig heeft als brandstof voor het smeltproces

### Beslissingen

**Recept na wijziging:** `4× Staal + 2× Kolen → 1× Stuwraketten per 160 ticks`

| Onderdeel     | Voor                            | Na                                            |
| ------------- | ------------------------------- | --------------------------------------------- |
| Recept-input  | 4× Staal + 2× Brandstof         | 4× Staal + 2× Kolen                           |
| Energie-input | 2 Brandstof/tick (globale pool) | 2 energie-eenheden/tick (via gele verbinding) |

- **2× Kolen per cyclus**: zelfde intensiteit als de Smelterij bij 160-tick cyclus (Smelterij: 1× Kolen per 80 ticks)
- De voetnoot in game-design.md sectie 4.5 over de dubbele Brandstof-rol van de Motorenfabriek vervalt
- De productieketen-tabel in game-design.md sectie 8.1 wordt bijgewerkt: `Staal + Brandstof` → `Staal + Kolen`
- In de tabel van sectie 4.5 vervalt de `*`-voetnoot; de Brandstof/tick-kolom blijft (maar verwijst nu naar de energie-verbinding, niet de globale pool)

---

## Implementatievolgorde

Aanbevolen volgorde, van minste naar meeste afhankelijkheden:

| Stap | Verbetering                                             | Reden                                                                                |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | **4** – Motorenfabriek recept: Brandstof → Kolen        | Pure simulatiewijziging; geen UI-afhankelijkheden                                    |
| 2    | **3** – Energy verbindingsmodel (inclusief surplus weg) | Kernwijziging simulatie; alle andere verbeteringen bouwen op dit nieuwe energiemodel |
| 3    | **1** – Energieverbruik tonen per node                  | Visueel; vereist het nieuwe energiemodel uit stap 2                                  |
| 4    | **2** – Energy Supply supply-weergave                   | Visueel; afhankelijk van stap 2 en 3                                                 |

## Status: alle ontwerpvragen beantwoord

Dit document is gereed als basis voor implementatie.
