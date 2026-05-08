---
description: "Genereer een nieuwe factory node definitie. Gebruik dit prompt om snel een nieuw fabriektype aan te maken op basis van naam, laag, inputs en outputs."
argument-hint: "Naam van de fabriek, bv. Staalfabriek"
agent: "agent"
---

Genereer een nieuwe factory node definitie voor het Factory Flow spel.

## Invoer

De gebruiker geeft een of meer van de volgende gegevens:

- **Naam** van de fabriek
- **Laag** (0 = grondstoffen, 1 = basisverwerking, 2 = halffabricaten, 3 = componenten, 4 = producten, 5 = eindproduct)
- **Inputs**: lijst van `{ resource, hoeveelheid per tick }`
- **Outputs**: lijst van `{ resource, hoeveelheid per tick }`
- **Energiekost** per tick (optioneel; standaard: redelijke waarde op basis van laag)

Ontbrekende gegevens mag je afleiden uit het gameontwerp. Raadpleeg [game-design.md](../../docs/game-design.md) voor productierecepten en resourcenamen.

## Output

Genereer een TypeScript object in het volgende formaat:

```js
// src/data/factories.js (toevoegen aan het bestaande array)
{
  id: 'steel-mill',          // kebab-case, uniek
  name: 'Staalfabriek',
  layer: 2,
  inputs: [
    { resource: 'iron-ore', amountPerTick: 3 },
    { resource: 'coal',     amountPerTick: 1 },
  ],
  outputs: [
    { resource: 'steel', amountPerTick: 1 },
  ],
  inputBufferSize:  10,      // geheel getal
  outputBufferSize: 5,       // geheel getal
  energyCostPerTick: 2,      // geheel getal
  buildCost: 150,            // geheel getal, in guldens
}
```

## Regels

- Alle hoeveelheden en buffergroottes zijn **gehele getallen**
- Resourcenamen zijn `kebab-case` (consistent met bestaande resources)
- `buildCost` schaalt ruwweg met de laag: laag 1 ≈ 50–100, laag 2 ≈ 100–250, laag 3 ≈ 300–600
- Voeg na het object een korte JSDoc-opmerking toe als de receptverhouding niet vanzelfsprekend is
