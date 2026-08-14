# Product Scope

FlexTrade AI is a multi-country AI Energy Intelligence Terminal.

The product exists to answer:

- What is happening in the energy market?
- Why is it happening?
- What will likely happen next?
- Which zones and assets are affected?
- What should the user do?
- How much value can be created or saved?
- Is the recommendation safe?

## Active Product Modules

The production path is focused on these modules:

- Market Cockpit
- Power Prices
- Gas & Carbon
- Weather Intelligence
- Infrastructure Map
- Screener
- Derivatives
- Flexibility Optimizer
- Trading Simulator
- Risk Monitor
- AI Advisor
- Reports

## First Production Focus

Power Prices is the next priority. It should become the first page that feels
production-ready end to end:

- DK1/DK2 switching visibly changes cards, charts, and recommendations.
- Price charts support selected-hour inspection and CSV export.
- Cheap and expensive windows are visible beside the recommendation.
- Data quality and risk status are combined into a trust gate.
- Every control has an obvious effect or a clear disabled/empty state.

The first hardening pass is implemented. The next Power Prices pass should add
weather-driver attribution and stronger forecast confidence explanations without
turning the page into a separate market-event product.

## Deferred Surfaces

Standalone Market Events and Market Context pages are not part of the active
product surface right now. Their backend contracts may remain as support for
future Risk Monitor and AI Advisor work, but they should not distract from the
core terminal workflow.
