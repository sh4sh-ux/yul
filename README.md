# YULI by NARO

**Learn your way. Grow every day.**

YULI is a mobile-first bilingual learning adventure for two young learners. Version 1.2 adds a hands-on Shopping Challenge to the existing profiles, bilingual adventure map, progress tracking, and Pizza Restaurant mission.

## Run locally

```bash
npm ci
npm run dev
```

Open the URL shown by Vite. Data is stored locally in IndexedDB and remains separate for each profile.

## Quality checks

```bash
npm test
npm run build
npm run typecheck
```

The production build uses the `/yul/` base path for GitHub Pages. `vite-plugin-pwa` generates the web app manifest and service worker during the build.

## Version 1.2 scope

- Editable profiles for Gayul and Hayul with stable internal IDs
- Per-profile school year, independent maths level, language, progress, XP, and answer history
- Korean or English UI (one language at a time)
- Home, adventure map, review, growth, and settings screens
- Interactive SVG pizza with equal slices, mouse, touch, and keyboard controls
- Three-stage Pizza Restaurant mission: discover, solve a customer order, and personalised challenge
- Three-stage Shopping Challenge with a live trolley, integer-cent NZ$ budgets, discounts, change, unit-price comparisons, compound constraints, checkout, and receipts
- Fictional educational supermarket prices clearly distinguished from real retail prices
- Five learning levels: Foundation, Core, Advanced (default), Expert, and Master extension
- A 10-question Year-aware diagnostic that recommends—but does not force—a level
- Structurally distinct Year 5 and Year 7 pathways using exact rational arithmetic
- Level 3+ multi-step fractions, decimals, percentages, ratios, and real-life reasoning
- Progressive hints, optional translation help, alternate explanations, similar-problem retries, resume, and results
- First-completion-only XP; replay keeps completion and awards no duplicate XP
- Validated JSON backup and restore
- Installable/offline-capable PWA shell

Existing IndexedDB data and version-1 backups remain compatible. Shopping answers and resumable trolley state use the existing answer and progress stores. Legacy Easy, Medium, Challenge, and Auto settings migrate to the five-level model without changing profile IDs, XP, answers, or Pizza Restaurant completion. Travel, Nature, and Creator missions remain clearly labelled future content. No account sync or external analytics are included in this version.

The curriculum cross-check and its limits are documented in [`docs/curriculum-alignment.md`](docs/curriculum-alignment.md). Master is explicitly extension content, not a claim about required school progress.

## Privacy

YULI does not require an account and does not send learning data to a server. Browser data can be lost when site data is cleared. Export a JSON backup from Settings when needed; backups may contain profile names and learning history.
