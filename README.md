# YULI by NARO

**Learn your way. Grow every day.**

YULI is a mobile-first bilingual learning adventure for two young learners. Version 1.1 includes independent profiles, Korean and New Zealand English, an adventure map, progress tracking, and a hands-on pizza fractions mission.

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

## Version 1.1 scope

- Editable profiles for Gayul and Hayul with stable internal IDs
- Per-profile year, language, difficulty, progress, XP, and answer history
- Korean or English UI (one language at a time)
- Home, adventure map, review, growth, and settings screens
- Interactive SVG pizza with equal slices, mouse, touch, and keyboard controls
- Three-stage Pizza Restaurant mission: discover, solve a customer order, and personalised challenge
- Year- and difficulty-aware questions using exact rational arithmetic
- Progressive hints, optional translation help, supportive feedback, resume, and results
- First-completion-only XP; replay keeps completion and awards no duplicate XP
- Validated JSON backup and restore
- Installable/offline-capable PWA shell

Existing IndexedDB data from 1.0 remains compatible. Shopping, Travel, Nature, and Creator missions appear on the adventure map as clearly labelled future content. No account sync or external analytics are included in this version.

## Privacy

YULI does not require an account and does not send learning data to a server. Browser data can be lost when site data is cleared. Export a JSON backup from Settings when needed; backups may contain profile names and learning history.
