---
description: "Analyseer de ratio's en bottlenecks in een productieketen. Gebruik dit prompt om te controleren of inputs en outputs van fabrieken op elkaar aansluiten."
argument-hint: "Beschrijf de keten, of plak de fabrieken die je wil checken"
agent: "agent"
---

Analyseer de opgegeven productieketen op ratio-fouten en potentiële bottlenecks.

## Wat te controleren

1. **Ratio-balans**: zijn de output-hoeveelheden van upstream fabrieken voldoende voor de input-behoeften van downstream fabrieken?
2. **Overproductie**: zijn er fabrieken die meer produceren dan verbruikt wordt?
3. **Underproductie**: zijn er fabrieken die een bottleneck veroorzaken?
4. **Energiekost**: wat zijn de totale energiekosten per tick van de keten?

## Invoer

De gebruiker geeft een beschrijving of een lijst van fabrieken in de keten. Als er fabrieken ontbreken, raadpleeg dan [game-design.md](../../docs/game-design.md) voor de standaardrecepten.

## Output

Geef per knelpunt:

- **Fabriek** waar het probleem zit
- **Tekort of overschot** (in eenheden per tick)
- **Aanbeveling**: hoeveel extra exemplaren van een fabriek nodig zijn, of welke upgrade het oplost

Sluit af met een **samenvatting** in tabelvorm:

| Fabriek | Output/tick | Benodigde input downstream | Status       |
| ------- | ----------- | -------------------------- | ------------ |
| …       | …           | …                          | ✅ / ⚠️ / ❌ |
