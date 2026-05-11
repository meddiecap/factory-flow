# Factory Flow

**Factory Flow** is an incremental factory-building game in the browser. Build and optimise production chains as a visual flowchart diagram until you complete the ultimate challenge: assembling a rocket.

---

## Gameplay

Place factories on an infinite 2D grid, connect them with production lines and balance the flow of goods. Each factory is a node with input and output connection points; lines link those points and transport raw materials and intermediate products.

### Core Loop

1. **Place** a factory from the left palette onto the canvas
2. **Connect** the output dots of one factory to the input dots of the next
3. **Produce** — the simulation runs automatically; factories process inputs in fixed ratios
4. **Sell** surplus goods via the Market node and earn money
5. **Buy** new factories and upgrades to expand the chain
6. **Win** by assembling one Rocket

The game is never fully idle: you must actively hunt bottlenecks, balance ratios and manage energy production.

---

## Production Layers

The production chain runs from raw materials to the final product across six layers:

| Layer              | Products                                         |
| ------------------ | ------------------------------------------------ |
| 0 – Raw Materials  | Iron Ore, Coal, Copper, Silicon                  |
| 1 – Energy         | Fuel                                             |
| 2 – Intermediates  | Steel, Cables                                    |
| 3 – Components     | Hull Parts, Fuel Tanks, Circuits, Control System |
| 4 – Sub-assemblies | Rocket Engines                                   |
| 5 – Final Product  | **Rocket**                                       |

---

## Factories

| Factory        | Recipe                                                                             | Cycle Time | Build Cost |
| -------------- | ---------------------------------------------------------------------------------- | ---------- | ---------- |
| Iron Mine      | → 1× Iron Ore                                                                      | 2 s        | €50        |
| Coal Mine      | → 1× Coal                                                                          | 2 s        | €60        |
| Copper Mine    | → 1× Copper                                                                        | 2 s        | €80        |
| Silicon Mine   | → 1× Silicon                                                                       | 2 s        | €80        |
| Energy Supply  | → 2× Fuel                                                                          | 2 s        | €150       |
| Smelter        | 3× Iron Ore + 1× Coal → 1× Steel                                                   | 4 s        | €500       |
| Cable Factory  | 2× Copper → 1× Cables                                                              | 4 s        | €400       |
| Foundry        | 4× Steel → 1× Hull Parts + 1× Fuel Tanks                                           | 8 s        | €1,000     |
| Chip Factory   | 2× Silicon + 3× Cables → 1× Circuits                                               | 8 s        | €3,000     |
| Electronics    | 2× Circuits → 1× Control System                                                    | 8 s        | €6,000     |
| Engine Factory | 4× Steel + 2× Fuel → 1× Rocket Engines                                             | 8 s        | €15,000    |
| Assembly       | 2× Hull Parts + 2× Fuel Tanks + 1× Control System + 2× Rocket Engines → **Rocket** | 40 s       | €50,000    |

Each additional factory of the same type costs ×1.5 more than the previous one (stacking build costs).

---

## Energy

All factories consume **Fuel** every tick to operate. The Energy Supply produces Fuel at no resource cost.

- **Shortage**: factories slow down proportionally (speed factor = available ÷ required)
- **Surplus**: production speed bonus with diminishing returns (max ×2.2)

Managing energy is one of the central challenges of the game.

---

## Upgrades

Each node has upgrades available for money, all with diminishing returns at higher levels:

| Upgrade           | Effect                                      |
| ----------------- | ------------------------------------------- |
| Speed             | ×1.5 per level (multiplicative)             |
| Buffer            | +10 units per level                         |
| Efficiency        | −10% input consumption per level (min. 50%) |
| Line Capacity     | +10 units/tick per level                    |
| Energy Efficiency | −10% fuel consumption per level             |
| Sales Points      | +1 input dot on the Market per level        |

---

## Progression & Prestige

Factories are unlocked step by step as you earn more money:

| Unlock Threshold | What Becomes Available                      |
| ---------------- | ------------------------------------------- |
| Immediately      | Iron Mine + Energy Supply (free at startup) |
| €50              | Additional Energy Supplies                  |
| €200             | Coal Mine, Copper Mine, Silicon Mine        |
| €800             | Smelter                                     |
| €3,000           | Foundry, Cable Factory                      |
| €15,000          | Chip Factory, Electronics, Engine Factory   |
| €40,000          | Assembly                                    |

After winning you can reset the run (**Prestige**) — everything starts fresh.

---

## Controls

| Action          | Input                              |
| --------------- | ---------------------------------- |
| Pan             | Middle mouse button / Space + drag |
| Zoom            | Scroll wheel                       |
| Place factory   | Drag from palette onto canvas      |
| Make connection | Drag from output dot to input dot  |
| Select node     | Click on a node                    |
| Fit to view     | `F`                                |
| Toggle minimap  | `M`                                |

---

## Tech Stack

- **Canvas**: TypeScript + Konva.js
- **UI**: Vue.js (panels, palette, HUD)
- **Simulation**: tick-based (20 ticks/sec)
- **Persistence**: localStorage
- **Platform**: Browser (no installation required)

---

## Development

```bash
npm install
npm run dev
```

Run tests:

```bash
npm run test
```

See [game-design.md](docs/game-design.md) for the full game design and [implementation-plan.md](docs/implementation-plan.md) for the implementation strategy.
