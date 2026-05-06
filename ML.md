# MLBB Draft Strategizer - Product Requirements Document

> A full-featured Mobile Legends: Bang Bang (MLBB) draft strategizer web app for ranked and competitive play. Supports drag-and-drop hero picking and banning, real-time counter suggestions, an interactive rotation planner map, and a strategy board powered by cached MLBBHub data.

---

## Goal

Build a full-featured MLBB draft strategizer web app for players preparing for ranked or competitive matches. The app must support drag-and-drop hero picking and banning, real-time counter hero suggestions, draft synergy warnings, and an interactive rotation planner map.

---

## Recommended Tech Stack

This stack is optimized for a new implementation in 2026 with current LTS/runtime support, TypeScript safety, touch-friendly drag-and-drop, and predictable scraping behavior.

### Frontend

- App shell: Vite + React + TypeScript
- React version: React 19 if all selected libraries install cleanly; React 18.3 is acceptable as a fallback if dependency peer ranges block React 19
- Styling: Tailwind CSS v4 using `@tailwindcss/vite`
- UI primitives: Headless UI, Radix UI, or custom accessible primitives; avoid heavy component kits unless design speed becomes more important than custom MLBB styling
- Icons: lucide-react
- Drag and drop: `@dnd-kit/core` with Pointer, Touch, and Keyboard sensors
- Avoid: `react-beautiful-dnd` for new work because it is deprecated and archived
- Map interaction: `react-konva` + `konva` for waypoint, arrow, label, drag, and export support
- State management: Zustand for draft, filters, map annotations, notes, and history
- Server state/data fetching: TanStack Query for cached API calls, retries, loading states, and background refresh
- Form/input validation: Zod for imported strategy codes and API response schemas
- Export: Prefer Konva `stage.toDataURL()` for map-only export; use `html-to-image` for full board screenshots
- Testing: Vitest + React Testing Library for units/components; Playwright for end-to-end draft and map workflows

### Backend

- Runtime: Node.js 24 LTS
- Package manager: npm, pnpm, or yarn; choose one and commit its lockfile
- Framework: Express + TypeScript
- HTTP client: Undici/native `fetch` with timeout and retry wrapper
- Scraper: Cheerio for MLBBHub HTML parsing
- Validation: Zod schemas for all scraper outputs before caching/returning JSON
- Cache:
  - MVP/local: in-memory cache plus persisted JSON fallback files under `backend/data/cache/`
  - Production/multi-instance: Redis with the same 6-hour TTL
- Logging: Pino or Winston with endpoint, scrape duration, cache hit/miss, and parse failure logs
- Security/middleware: CORS allowlist, Helmet, compression, and basic rate limiting on `/api/refresh`
- Language: TypeScript only; do not mix JavaScript and TypeScript in source files

### Versioning Rules

- Pin Node with `.nvmrc` or `.node-version` set to `24`.
- Set `engines.node` in `package.json` to `>=24 <26`.
- Commit lockfiles for reproducible installs.
- Keep frontend and backend as separate apps inside one repo unless deployment requires a monorepo workspace.

---

## Data Sources

### Primary: MLBBHub (`mlbbhub.com`)

Fan-made MLBB data site. As of May 4, 2026, MLBBHub shows Patch 2.1.67 and a 132-hero roster. It has no public API, so data should be scraped from HTML through the backend proxy layer.

#### URL Patterns to Scrape

| Data | URL |
|------|-----|
| Hero roster + roles + images | `https://mlbbhub.com/heroes` |
| Counter picks per hero | `https://mlbbhub.com/counter/{hero-slug}` |
| Win / pick / ban rates | `https://mlbbhub.com/statistics` |
| Tier list ratings | `https://mlbbhub.com/tier-list` |
| Full matchup matrix, if still exposed | `https://mlbbhub.com/matchups` |

#### Counter Page Data Fields

Each counter page should be parsed into:

- Counter hero name
- Counter hero slug
- Portrait URL
- Matchup win rate percentage
- Win rate delta vs average
- Game phase strength tags: Early / Mid / Late
- Matchup difficulty or description text, when available
- Scrape timestamp
- Source URL

#### Statistics Page Data Fields

Filter by rank tier when MLBBHub exposes rank filters:

- Hero name
- Hero slug
- Role list
- Win rate percentage
- Pick rate percentage
- Ban rate percentage
- Tier grade
- Rank filter used
- Patch/version label, when visible

#### Hero Slug Format

MLBBHub uses lowercase kebab-case slugs. Build a slug normalizer utility and test special characters:

```ts
normalizeHeroSlug("Popol and Kupa") // "popol-and-kupa"
normalizeHeroSlug("X.Borg")         // "x-borg"
normalizeHeroSlug("Yi Sun-shin")    // "yi-sun-shin"
normalizeHeroSlug("Luo Yi")         // "luo-yi"
normalizeHeroSlug("Zetian")         // "zetian"
```

### Secondary: Official Moonton Leaderboard

Official Moonton leaderboard pages are client-side rendered and not required for the MVP. Skip direct scraping unless a future implementation adds a Playwright-based scheduled scraper. Use MLBBHub statistics for rank-based win/pick/ban data.

### Data Source Risk

Because MLBBHub is scraped rather than consumed through a supported API:

- Scrapers must fail gracefully and return stale cached data when parsing breaks.
- API responses must include `isStale`, `lastUpdated`, and `source` metadata.
- Parser tests should use saved HTML fixtures so UI development does not depend on live network access.
- Do not block draft usage if counters fail; show unavailable counter data while keeping picks/bans functional.

---

## Backend Scraper Layer

### Why It Is Needed

The React frontend cannot reliably call MLBBHub directly because of CORS and because scraping on every user action would be slow and fragile. A lightweight backend should scrape, validate, cache, and serve normalized JSON to the frontend.

### API Endpoints

```http
GET  /api/health
GET  /api/heroes
GET  /api/counter/:heroSlug
GET  /api/stats?rank=all|epic|legend|mythic|honor|glory
GET  /api/tierlist
POST /api/refresh
```

### Response Metadata

Every data endpoint should return:

```ts
type ApiEnvelope<T> = {
  data: T;
  meta: {
    source: string;
    lastUpdated: string;
    cacheStatus: "hit" | "miss" | "stale";
    isStale: boolean;
    patch?: string;
  };
};
```

### Caching Strategy

- Cache scraped responses for 6 hours.
- Persist the latest successful scrape to JSON files so the app can start with fallback data after a backend restart.
- Refresh manually through `POST /api/refresh`.
- If MLBBHub is unreachable or parsing fails, return the last good cached data with `isStale: true`.
- Store hero portrait URLs as source URLs for the MVP; consider proxying images later if hotlinking or CORS becomes unreliable.

### Example Scraper Flow

```ts
// GET /api/counter/:heroSlug
// 1. Normalize and validate heroSlug.
// 2. Check memory cache and return fresh data if available.
// 3. Fetch HTML from https://mlbbhub.com/counter/{heroSlug} with timeout.
// 4. Parse with Cheerio into a typed object.
// 5. Validate with Zod.
// 6. Sort counters by win rate descending.
// 7. Save to memory cache and persisted JSON fallback.
// 8. Return ApiEnvelope<CounterPick[]>.
```

---

## Module 1 - Draft Picker UI

### Hero Roster Panel

- Display all MLBB heroes in a scrollable grid.
- Each hero card shows portrait image, hero name, role badge, tier grade, win rate, pick rate, and ban rate when available.
- Filter heroes by role using tabs or segmented controls.
- Search heroes by name.
- Sort by name, tier, win rate, pick rate, or ban rate.
- Heroes already picked or banned appear dimmed and cannot be assigned again.

### Pick & Ban Slots

- Two team columns: Blue Team and Red Team.
- Each team has 5 pick slots and 5 ban slots.
- Default ranked draft mode should support 5 bans per team.
- Add a legacy/custom mode for 3-ban drafts if needed.
- Active slot is highlighted.
- Heroes snap into the active slot when dropped.
- Slots show hero portrait when filled and a clear placeholder when empty.
- Users can remove or replace a hero from a slot.

### Draft Order

- Provide a configurable draft-order model rather than hard-coding text in the UI.
- MVP should include:
  - Standard ranked draft preset
  - Competitive/custom preset
  - Manual mode
- Store draft actions in a history stack for undo/redo.

### Drag and Drop

- Heroes are draggable from the roster grid.
- Heroes can be dropped into the active pick or ban slot.
- Manual slot selection is available for keyboard/mobile fallback.
- Touch drag must work on tablet.
- Visual drag overlay follows pointer/finger.

---

## Module 2 - Counter Picker Engine

### Counter Suggestions Panel

- Shown as a right-side panel on desktop and bottom drawer on tablet/mobile.
- Triggered whenever a hero is placed in an enemy pick slot.
- Data fetched from `/api/counter/:heroSlug`.
- Display top 3-5 counter heroes with:
  - Hero portrait and name
  - Matchup win rate percentage
  - Win rate delta badge
  - Phase strength tags: Early / Mid / Late
  - Difficulty description text when available
- Exclude heroes already picked or banned.
- Show stale-data indicators when the backend returned cached fallback data.

### Synergy Check

- After 2+ allied heroes are picked, display detected combo synergy tags.
- Example tags: "Engage + AoE burst", "Peel + sustain", "Pickoff", "Split push", "Protect the marksman".
- Warn if team composition is missing expected duties such as frontline, engage, wave clear, magic damage, physical damage, or late-game damage.

### Threat Detector

- If the enemy team completes a known pattern, show a warning banner.
- Example patterns: full engage, triple burst, deathball, heavy crowd control, split push pressure, poke/siege.
- Trigger from role/tag pattern matching first; upgrade to curated hero combo rules later.

---

## Module 3 - Rotation Planner Map

### Map Canvas

- Render the MLBB map as a background image.
- Overlay `react-konva` layers for waypoints, arrows, labels, selections, and drag handles.
- Store waypoint coordinates as normalized percentages so layouts remain responsive.
- Include image attribution/license notes for any map asset used.

### Interaction

- Click/tap to place a hero waypoint on the map.
- Assign a hero from the current draft lineup to each waypoint.
- Drag waypoints to reposition them.
- Draw directional arrows between waypoints to show rotation paths.
- Label each waypoint with a timing note, such as "Rotate bot at 2:30" or "Contest turtle at 3:00".
- Arrows are color-coded by team.

### Phase Tabs

- Early Game
- Mid Game
- Late Game

Each phase stores independent waypoints, paths, and labels.

### Controls

- Clear current phase
- Undo last map action
- Toggle hero name labels
- Toggle timing note labels
- Export map as PNG
- Fit/reset zoom

---

## Module 4 - Strategy Board

### Save & Export

- Save current draft, map annotations, and notes as a named strategy.
- Store strategies in localStorage or IndexedDB for the MVP.
- Sidebar list includes load, rename, duplicate, and delete actions.
- Export full board as PNG screenshot.
- Optional share code: compress draft/map state into a URL-safe encoded string.

### Notes Panel

- Freeform text area for win condition and objective notes.
- Prompt labels:
  - Win Condition
  - Key Objectives
  - Team Comp Weakness
  - Priority Bans

### Session History

- Track every pick, ban, slot clear, map action, and note edit in a chronological log.
- Support undo for draft/map actions.
- Display action log as a collapsible side panel.

---

## UI & UX Requirements

- Dark theme by default with MLBB-inspired navy, charcoal, steel, gold, blue, and red accents.
- Avoid relying only on gold/navy so the app does not become visually flat.
- Primary font: Rajdhani or Oswald, loaded with a system-font fallback.
- Responsive: optimized for desktop, functional on tablet, usable for review on mobile.
- Smooth drag animations, drawer transitions, and slot fill transitions.
- Graceful loading, empty, stale-data, and error states for backend data.
- Counter and stats panels must remain useful while data is stale or unavailable.
- All interactive controls need keyboard-accessible alternatives.

---

## Project Structure

```text
/
|-- frontend/
|   |-- index.html
|   |-- package.json
|   |-- src/
|   |   |-- app/
|   |   |-- components/
|   |   |   |-- DraftPicker/
|   |   |   |-- CounterPanel/
|   |   |   |-- RotationMap/
|   |   |   |-- StrategyBoard/
|   |   |   `-- shared/
|   |   |-- hooks/
|   |   |-- services/
|   |   |-- store/
|   |   |-- types/
|   |   `-- utils/
|   `-- public/
|       `-- assets/
|           `-- map.png
|
|-- backend/
|   |-- package.json
|   |-- src/
|   |   |-- cache/
|   |   |-- config/
|   |   |-- routes/
|   |   |-- scrapers/
|   |   |-- schemas/
|   |   |-- services/
|   |   |-- types/
|   |   `-- server.ts
|   |-- data/
|   |   |-- cache/
|   |   `-- fixtures/
|   `-- tests/
|
|-- README.md
|-- .node-version
`-- .gitignore
```

---

## Deliverables

1. Vite + React + TypeScript frontend with Draft Picker, Counter Engine, Rotation Map, and Strategy Board modules.
2. Express + TypeScript backend with `/api/health`, `/api/heroes`, `/api/counter/:slug`, `/api/stats`, `/api/tierlist`, and `/api/refresh`.
3. Cheerio-based MLBBHub scrapers with 6-hour cache, persisted fallback JSON, and fixture-based parser tests.
4. Hero slug normalizer utility with unit tests for punctuation and multi-word hero names.
5. MLBB map background integrated into `react-konva` rotation planner.
6. README with local setup, env vars, scripts, scraper limitations, and troubleshooting.
7. Playwright smoke test that verifies selecting/banning a hero, showing counters, adding a waypoint, and saving a strategy.

---

## Implementation Acceptance Criteria

- `npm install` succeeds for frontend and backend on Node 24 LTS.
- `npm run build` succeeds for both apps.
- Frontend can run without live MLBBHub access if backend has fixture or cached data.
- Drag-and-drop works with mouse and touch.
- Keyboard/manual selection works without drag-and-drop.
- Counter panel excludes already picked/banned heroes.
- Scraper failures return stale cached data instead of breaking the UI.
- Strategy save/load survives page refresh.
- Map annotations remain correctly positioned after viewport resize.

---

## Out of Scope for MVP

- Real-time multiplayer or live draft sync.
- Direct scraping of `mobilelegends.com/rank`.
- Account system, login, or saved user profiles.
- In-app item, emblem, spell, or build recommendations.
- Automated patch detection or webhook-based cache invalidation.
- Production Redis deployment unless the app is deployed across multiple backend instances.
