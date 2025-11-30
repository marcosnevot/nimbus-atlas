# Nimbus Atlas

Nimbus Atlas is a map-centric single page application (SPA) for exploring current weather and short-term forecasts on top of an interactive globe.

It is designed as a **portfolio-grade frontend project**: clean architecture, clear separation of concerns, strong UX focus and production-style integration with third-party APIs — all without a custom backend.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture overview](#architecture-overview)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Configuration](#configuration)
  - [Install & run](#install--run)
- [Project structure](#project-structure)
- [Development workflow](#development-workflow)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

- 🌍 **Map-first experience**
  - Interactive globe powered by MapLibre GL.
  - Dark and satellite base map styles with a smooth toggle.
  - “Space” background around the globe for visual focus.

- 📍 **Location selection**
  - Click anywhere on the globe to select a location.
  - Smart feature picking: attempts to resolve city name and country from map features.
  - Side panel auto-opens on first selection and shows location details.

- ☁️ **Current weather & forecast**
  - Uses **OpenWeather 2.5 APIs** for current conditions and 3-hourly forecast.
  - Normalized domain models (temperature, conditions, wind, humidity, etc.).
  - Short-term forecast grouped into:
    - Next hours (3h timeline).
    - Next days (aggregated daily timeline).

- 🧱 **Polished UI**
  - Glassmorphism side panel with smooth transitions.
  - Skeleton placeholders while data loads.
  - Responsive layout with a map-first experience on both desktop and smaller screens.

- ⚙️ **Robust error handling**
  - Dedicated error types (network, rate limit, config, contract, http).
  - User-friendly messages for both current weather and forecast failures.
  - Safe fallbacks when provider data is incomplete.

- 📊 **Telemetry hooks**
  - App-level telemetry helper with pluggable sink.
  - Weather telemetry with:
    - API request / success / error events.
    - Data degradation tracking (e.g. missing timelines, no alerts in free tier).
  - Location data is **sanitized** before being sent to telemetry sinks.

- 🧪 **Tested**
  - Vitest + Testing Library.
  - Tests for:
    - Map integration wrapper.
    - Zustand stores (map, weather).
    - OpenWeather service and telemetry.
    - Side panel behavior and weather rendering.

For a deeper technical view, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Tech stack

**Core**

- [React](https://react.dev/) 19
- [React Router](https://reactrouter.com/) 7
- [Zustand](https://github.com/pmndrs/zustand) 5 (global state)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js-docs/) 5
- [OpenWeather 2.5 APIs](https://openweathermap.org/api)
- [Vite](https://vitejs.dev/) 7
- [TypeScript](https://www.typescriptlang.org/) 5.9

**Tooling & quality**

- [ESLint](https://eslint.org/) + TypeScript-ESLint + [Prettier](https://prettier.io/)
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [jsdom](https://github.com/jsdom/jsdom) (browser-like test environment)

---

## Architecture overview

Nimbus Atlas follows a **map-centric architecture** with clear separation of concerns:

- `src/app` – routing, layout, and page-level composition.
- `src/features/map` – `MapRoot` wrapper around MapLibre GL and map-specific logic.
- `src/state` – Zustand stores for map, UI and weather.
- `src/entities` – domain models (weather bundle, locations, alerts).
- `src/services` – integration with OpenWeather 2.5.
- `src/observability` – app and weather telemetry utilities.
- `src/ui` – reusable UI primitives (buttons, icon buttons, skeletons).
- `src/styles` – design tokens, layout and components styling.

The map emits a **domain-level viewport and selection**. Weather hooks subscribe to that selection, compute cache keys and call into the weather store, which in turn talks to the OpenWeather service. The side panel remains purely presentational and reacts to store state.

You can find a detailed explanation of each layer and the mapping from provider payloads to domain models in **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Getting started

### Prerequisites

- **Node.js**: v20+ is recommended.
- **npm**: comes with Node.js.

You will also need API keys for:

- **Map tiles**: MapTiler (recommended) or rely on the MapLibre demo style.
- **Weather data**: OpenWeather (2.5).

### Configuration

Copy the existing `.env.example` file to `.env` at the project root and update the values with your keys:

```env
# Map tiles – recommended
VITE_MAPTILER_API_KEY=your_maptiler_key_here

# Weather – required for real data
VITE_OPENWEATHER_API_KEY=your_openweather_key_here
```

Notes:

- If `VITE_MAPTILER_API_KEY` is **missing**, the app will fall back to the MapLibre demo style. This is fine for local testing but not ideal for production.
- If `VITE_OPENWEATHER_API_KEY` is **missing**, weather calls will fail with a configuration error and the UI will surface friendly error messages instead of data.

### Install & run

Clone the repository and install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Vite will show a local URL (typically `http://localhost:5173`).  
Open it in your browser to explore the app.

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## Project structure

High-level layout:

```text
nimbus-atlas/
├─ CHANGELOG
├─ ARCHITECTURE.md
├─ README.md
├─ package.json
├─ vite.config.ts
├─ tsconfig*.json
├─ public/
│  ├─ space-bg.svg     # Space background behind the globe
│  └─ vite.svg
└─ src/
   ├─ main.tsx         # SPA entry point (React + Router + QueryClient)
   ├─ app/
   │  ├─ App.tsx       # Routes and app shell wiring
   │  ├─ layout/
   │  │  ├─ AppShell.tsx
   │  │  ├─ TopBar.tsx
   │  │  ├─ MapLayout.tsx
   │  │  ├─ MapOverlays.tsx
   │  │  └─ SidePanel.tsx
   │  └─ routes/
   │     ├─ MapView.tsx
   │     ├─ SettingsView.tsx   # Stub
   │     └─ NotFoundView.tsx
   ├─ config/
   │  └─ map.config.ts         # MapTiler/MapLibre configuration
   ├─ entities/
   │  ├─ location/
   │  │  └─ location.ts
   │  └─ weather/
   │     └─ models.ts          # Canonical domain models
   ├─ features/
   │  └─ map/
   │     └─ MapRoot.tsx        # MapLibre integration
   ├─ hooks/
   │  ├─ useSelectedLocationCurrentWeather.ts
   │  └─ useSelectedLocationForecast.ts
   ├─ observability/
   │  ├─ appTelemetry.ts
   │  └─ weatherTelemetry.ts
   ├─ services/
   │  ├─ openWeatherService.ts # OpenWeather 2.5 integration
   │  └─ locationSearchService.ts 
   ├─ state/
   │  ├─ mapStore.ts
   │  ├─ uiStore.ts
   │  └─ weatherStore.ts
   ├─ styles/
   │  └─ index.css             # Global styles & design tokens
   └─ ui/
      ├─ Button.tsx
      ├─ IconButton.tsx
      ├─ Skeleton.tsx
      └─ TextField.tsx
```

Tests live under `tests/` and cover stores, map integration, weather service and telemetry.

---

## Development workflow

Suggested workflow for local development:

1. Create a feature branch from `main`.
2. Implement changes with a focus on:
   - Keeping components small and focused.
   - Preserving the separation between UI, state, services and domain models.
3. Run quality checks locally:
   - `npm run lint`
   - `npm run test`
4. Build the project to ensure it still compiles:
   - `npm run build`
5. Open a pull request and link the relevant changes to the changelog.

The repository also includes a `CHANGELOG` file adopting a Keep-a-Changelog-style format.

---

## Testing

Run the full test suite:

```bash
npm run test
```

Highlights:

- **Environment**: `jsdom` (browser-like).
- **UI tests**: React Testing Library is used to assert behavior by interacting with rendered components.
- **State tests**: Zustand stores are tested in isolation (map, weather).
- **Service tests**: OpenWeather integration and telemetry helpers are tested using fixtures and controlled responses.

---

## Roadmap

Potential future improvements:

- Settings page with:
  - Units (°C/°F, m/s vs km/h).
  - Default base map style and initial camera.
- Additional overlays (e.g. city weather points, severe weather indicators).
- Offline-friendly and PWA enhancements.
- Pluggable provider support beyond OpenWeather, reusing the existing domain models.

---

## License

This project is intended as a portfolio piece.  
See it in **[LICENSE](./LICENSE)**
