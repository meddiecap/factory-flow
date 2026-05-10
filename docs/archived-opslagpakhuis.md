# Gearchiveerde mechanic: Opslagpakhuis

> Status: **Verwijderd uit het ontwerp** — niet geïmplementeerd
> Datum verwijderd: mei 2026
> Reden: niet nodig voor de kernloop

---

## Beschrijving

Het Opslagpakhuis was een bijzondere node die diende als **grote tussentijdse buffer** in de productieketen. Het accepteerde elk resourcetype en fungeerde als flexibel koppelpunt tussen twee delen van de keten.

### Werking

- Verbind de **uitvoer-dot van een productienode** met de **invoer-dot (links)** van het pakhuis.
- Verbind de **uitvoer-dot (rechts)** van het pakhuis met de **invoer-dot van de volgende schakel**.
- Accepteerde elk resourcetype (generieke buffer, niet resourcespecifiek).
- Buffergrootte: **200 eenheden per kant** (invoer én uitvoer).

### Gridgrootte

| Node          | Gridcellen |
| ------------- | ---------- |
| Opslagpakhuis | 2 × 2      |

---

## Reden van verwijdering

Het pakhuis voegde geen tactische beslissing toe die niet al gedekt wordt door de bestaande buffermechanics op productienodes en de Bufferupgrade. De extra complexiteit in de UI en simulatielaag woog niet op tegen de spelwaarde.

---

## Mogelijke herintroductie

Het concept kan later heroverwogen worden als:

- De productieketens lang genoeg worden dat lokale buffering tactisch relevant wordt.
- Er een duidelijk onderscheid nodig is tussen "in-node buffer" en "standalone opslag".
- Een latere run-mechanic (bv. schematics met gedeelde buffers) het rechtvaardigt.
