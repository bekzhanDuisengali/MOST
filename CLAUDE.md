# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server at http://127.0.0.1:5173
npm run build    # production build → dist/
npm run preview  # preview dist/ at http://127.0.0.1:4173
```

No test suite. No linter configured.

## Architecture

Single-page Vue 3 app (Composition API, `<script setup>`). No router library — routing is manual client-side via `window.history.pushState` + `popstate`.

**All app logic lives in `src/App.vue`.** There are no child components. The file handles:
- Route state (`currentPath`) derived from `window.location.pathname`
- Page switching via `v-if`/`v-else-if` blocks in the template keyed on computed booleans (`isAboutPage`, `isContactsPage`, `isProjectsPage`, `isProjectPage`)
- `isProjectPage` is true when `currentPath` matches a slug in `translations[lang].projectPages`

**`src/i18n.js`** — all UI text and project data in EN / KZ / RU. Language stored in `localStorage` key `most-language`. The `t` computed ref (`translations[currentLanguage]`) is the single source for all displayed text and project content.

**Adding a new project:**
1. Add images to `public/<slug>/`
2. Add slug → image mapping in `projectImageGroups` in `App.vue`
3. Add a thumbnail to `projectThumbs` array
4. Add project entry to `translations[lang].projectPages[slug]` for all three languages
5. Add a card to `translations[lang].projects.items` for all three languages

**Assets:** `public/` is served at the Vite base URL. All image paths go through `publicAsset(path)` which prepends `import.meta.env.BASE_URL`.

**Google Maps:** loaded lazily on contacts page. Requires `VITE_GOOGLE_MAPS_API_KEY` env var; falls back to an embedded iframe when key is absent.

**Scroll animations:** `data-animate` attribute on elements + IntersectionObserver adds `is-visible` class when element enters viewport.

**Header:** transitions from transparent → solid (`is-solid` class) after scrolling past the first section.

**Project image slider:** auto-advances every 5200 ms. Respects `prefers-reduced-motion`.
