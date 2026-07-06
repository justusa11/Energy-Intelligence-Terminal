# UI Design

## Stack

- Next.js 16 (App Router), React 19, TypeScript.
- Tailwind CSS v4 (via `@tailwindcss/postcss`).
- `lucide-react` icons.
- No component library — small, hand-written components keep the bundle lean.

## Layout

- **Login** (`app/login`) → **Dashboard** (`app/dashboard`).
- `components/layout/DashboardShell.tsx` composes the fixed **Sidebar** (72
  units wide), **Topbar**, and the routed page content.
- `Sidebar.tsx` renders `dashboardNavItems` and `secondaryNavItems` from
  `lib/constants.ts`. Add a module by adding a nav item and a page folder.

## Theme

Dark, terminal-style:

| Token | Usage |
|---|---|
| `bg-slate-950` | app background, sidebar |
| `bg-slate-900` | cards/panels |
| `bg-slate-950` (inset) | nested tiles inside cards |
| `border-slate-800` | card and divider borders |
| `text-slate-100/300/400/500` | primary → muted text ramp |
| `blue-600` | active nav, primary actions |
| `green-400` | safe / cheap / positive |
| `amber-400` | warning / regime highlight |
| `red-500` | critical / expensive / negative |

Price bars use a three-color scale: green (bottom third), blue (middle), red
(top third), computed from the day's min/max.

## Page conventions

Every module page follows the same skeleton:

1. Header row: title + subtitle on the left, `ZoneSelect` (and any extra
   controls) on the right.
2. A row of stat cards (KPIs).
3. One or more panels (`rounded-xl border border-slate-800 bg-slate-900 p-6`).

Data is fetched with `useApi<T>(path)` (or a module hook). Each page renders
three states inline: loading (`"Loading..."`), error (the thrown message), and
data. There are no global spinners or toasts — state is local and visible.

## Components worth reusing

- `ZoneSelect` — country/zone switcher; calls back with `(zone, country)`.
- `DataQualityStatusCard` — renders a `DataQualityStatus` with per-check colors.
- `RoadmapModule` — honest "planned" page for not-yet-built modules
  (Gas & Carbon, Derivatives).

## Accessibility & responsiveness

- Grids collapse from multi-column to single-column at small breakpoints
  (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3` patterns).
- Interactive SVG assets and chart bars carry `<title>`/`title` tooltips.
- Color is never the only signal — status text accompanies status colors.

## Adding a module page

1. Create `app/dashboard/<name>/page.tsx` (client component).
2. Add a nav entry in `lib/constants.ts`.
3. Fetch with `useApi`, add a type in `types/terminal.ts` mirroring the backend
   schema, and follow the header → stats → panels skeleton.
