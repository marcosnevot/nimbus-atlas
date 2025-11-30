# Contributing to Nimbus Atlas

Thanks for taking the time to look into Nimbus Atlas.  
This project is primarily a portfolio-grade frontend app, but it is structured as if it were a production codebase.

The guidelines below describe how to work with the repository, structure changes, and keep the codebase consistent.

---

## How to work on changes

1. **Fork and clone** the repository.
2. Make sure you can run the app locally (see [`README.md`](./README.md) for full setup instructions).
3. Create a **feature branch** from `main`:
   ```bash
   git checkout main
   git pull --ff-only
   git checkout -b feature/short-description
   ```
4. Implement your changes following the coding and UX guidelines below.
5. Run the quality checks locally:
   ```bash
   npm run lint
   npm run test
   npm run build
   ```
6. Open a Pull Request against `main` and describe **what** you changed and **why**.

Branch naming suggestions:

- `feature/...` – new user-facing functionality.
- `fix/...` – bug fixes.
- `chore/...` – refactors and internal maintenance.
- `test/...` – additional tests or testing infrastructure.

---

## Development setup

Nimbus Atlas is a Vite + React + TypeScript project.

- Install dependencies:
  ```bash
  npm install
  ```
- Start the dev server:
  ```bash
  npm run dev
  ```
- Build for production:
  ```bash
  npm run build
  ```

Configuration details (API keys, environment variables, etc.) are documented in [`README.md`](./README.md).  
**Never commit real API keys** or secrets. Use `.env` locally and only update `.env.example` when adding new config flags.

---

## Coding standards

### General

- **Language**: all code, types, function/variable names and comments are in **English**.
- Use **TypeScript** everywhere; avoid plain `.js` files for app code.
- Prefer **small, focused modules**:
  - Components: one file per component when possible.
  - Stores/services: keep public APIs small and explicit.

### React

- Use **function components** and React hooks.
- Prefer **composition over inheritance**:
  - Build small components and compose them at layout level.
- Avoid adding global singletons or mutable module-level state outside of Zustand stores.
- Keep components **presentational** whenever possible:
  - Domain logic lives in hooks, stores, or services.
  - Components read from hooks/stores and render based on props/state.

### State management

Global state lives in **Zustand stores** under `src/state/`:

- `mapStore` – map viewport, readiness and selection.
- `uiStore` – side panel visibility and base map style.
- `weatherStore` – cached weather bundles per location key.

Guidelines:

- Do **not** introduce new global state mechanisms (no extra Redux, context-based stores, etc.) without a strong reason.
- Keep store shapes plain and serialisable where possible.
- Prefer **pure functions** for transformations; use methods on the store only for updates and orchestration.
- When adding new state:
  - Define it in the appropriate store or create a new store under `src/state/`.
  - Expose a minimal number of actions to mutate that state.

### Styling

All styling is handled via `src/styles/index.css` and `na-*` CSS classes.

- Reuse existing **design tokens** (`--na-color-*`, `--na-radius-*`, `--na-spacing-*`, etc.) before adding new ones.
- Keep the visual system consistent:
  - Buttons and interactive elements should be based on `na-button` and `na-icon-button` primitives.
  - Skeletons should use the `na-skeleton` base class.
  - Map controls and overlays should follow the existing glassmorphism look.
- Do **not** introduce CSS frameworks (Tailwind, Bootstrap, etc.) or CSS-in-JS libraries.
- Respect accessibility and motion preferences:
  - Use the existing `@media (prefers-reduced-motion: reduce)` pattern when adding new animations.
  - Ensure hover/focus states are visible.

### Architecture boundaries

Keep responsibilities separated by directory:

- `src/app` – routing, application shell, layout and top-level pages.
- `src/features` – feature-specific integration layers (e.g. `MapRoot` for MapLibre).
- `src/entities` – domain types and models (weather bundle, locations, alerts).
- `src/state` – Zustand stores: map, UI, weather.
- `src/services` – external API integrations (OpenWeather 2.5).
- `src/observability` – telemetry helpers (app and weather).
- `src/ui` – small, reusable UI primitives.
- `src/styles` – design tokens and CSS rules.

When in doubt:

- **UI logic** → component in `src/app` or `src/ui`.
- **Domain logic** → hook in `src/hooks` or utility in `src/services` / `src/entities`.
- **Integration with external APIs** → `src/services` or a dedicated integration module.
- **Cross-cutting concerns** (telemetry, logging) → `src/observability`.

---

## UX & accessibility guidelines

Nimbus Atlas is **map-centric**. UX changes should respect these principles:

- The **map** is the primary canvas.
- The **side panel** provides detail and context; it should not feel heavier than the map.
- Map overlays (buttons, toggles) should:
  - Avoid obstructing critical map content.
  - Be clearly grouped (e.g. base map toggle bottom-left, panel handle near the panel).
- Keep copy short and clear (especially error and loading messages).

Accessibility best practices:

- Use appropriate **ARIA roles and labels** for interactive elements.
- Ensure **keyboard accessibility**:
  - All interactive controls must be reachable and operable via keyboard.
- Color and contrast:
  - Respect the existing dark theme palette.
  - Ensure sufficient contrast for text and icons against the background.
- Respect **motion preferences**:
  - New animations should be disabled or toned down under `prefers-reduced-motion`.

---

## Tests and quality checks

Nimbus Atlas uses Vitest + Testing Library and ESLint + Prettier.

Before opening a PR, run:

```bash
npm run lint
npm run test
npm run build
```

- **Lint** (`npm run lint`):
  - Must pass with no errors.
  - If you adjust lint rules, keep them consistent with the rest of the repo.
- **Tests** (`npm run test`):
  - Add tests for new behavior (components, stores, services).
  - Prefer user-facing tests (React Testing Library) over implementation details.
- **Build** (`npm run build`):
  - Ensures TypeScript types and bundling are still valid.

When adding a new feature, try to cover:

- At least one **unit or integration test** for the core behavior.
- Any relevant edge cases (loading, error states, no data).

---

## Working with APIs and configuration

Nimbus Atlas uses:

- **MapLibre + MapTiler** for map tiles.
- **OpenWeather 2.5** for current weather and forecast.

Guidelines:

- **Do not hardcode API keys** in the source code.
- Use `import.meta.env.*` for configuration flags.
- If you add a new configuration variable:
  - Read it in code from `import.meta.env`.
  - Add it to `.env.example` with a clear placeholder.
- When handling errors from APIs:
  - Prefer mapping to `WeatherError` with an appropriate `kind`.
  - Surface user-friendly messages in the UI while keeping technical details in logs/telemetry.

---

## Commit messages & Pull Requests

Commit messages should be **clear and concise**. A simple convention like the following works well:

- `feat: add hourly forecast section`
- `fix: handle missing openweather city name`
- `chore: refactor map viewport store`
- `test: add side panel loading state tests`

Pull Requests should include:

- A short description of the change.
- Any relevant screenshots or GIFs for UX changes.
- Notes on **breaking changes** (if any).
- A summary of tests run (`lint`, `test`, `build`).

---

## When in doubt

If you are unsure where something should live or how to align with the existing architecture:

- Look at **similar existing code** first (e.g. how `weatherStore` or `MapRoot` are structured).
- Aim for **consistency over novelty**:
  - It is usually better to follow an existing pattern than to introduce a new one for a small feature.
- Keep the map-centric UX and clean architecture in mind: every change should support that goal.

Thank you for helping keep Nimbus Atlas clean, understandable and enjoyable to work with.
