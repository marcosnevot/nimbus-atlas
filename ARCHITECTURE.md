# Nimbus Atlas – Frontend Architecture

## 1. High-level overview

Nimbus Atlas is a map-centric single page application (SPA) that visualizes current weather and short-term forecasts on top of an interactive globe.

The project is intentionally frontend-only and aims to be portfolio-grade:

- Clear separation between UI, domain models and integrations.
- Map-first UX with a persistent side panel for details.
- Explicit handling of performance, error states and observability.
- No backend: all data is fetched directly from third-party APIs.

### 1.1 Goals

- Provide a **map-first experience** for exploring weather (globe as the main canvas).
- Show **current conditions and short-term forecasts** for a selected location.
- Keep the codebase **easy to reason about** with small, focused modules.
- Be **backend-less**: fetch data directly from MapTiler / MapLibre styles and OpenWeather 2.5.

### 1.2 Non-goals

- User accounts, authentication or personalization.
- Long-term historical analytics or climatology.
- A full settings system (the `/settings` route is intentionally a stub).

---

## 2. Tech stack & build

### 2.1 Core libraries

- **React 19** (`react`, `react-dom`) – UI framework.
- **React Router 7** (`react-router-dom`) – client-side routing.
- **Zustand 5** (`zustand`) – global state for map, UI and weather.
- **MapLibre GL JS 5** (`maplibre-gl`) – WebGL-based map rendering.
- **TanStack Query 5** (`@tanstack/react-query`) – available at the root for data fetching; current weather flow uses a custom store instead.

### 2.2 Tooling

- **Vite 7** + `@vitejs/plugin-react-swc` – dev server and bundler, React compiled with SWC.
- **TypeScript 5.9** – strict typing across components, state and domain models.
- **ESLint 9 + TypeScript-ESLint + Prettier 3** – linting and formatting.
- **Vitest 4 + Testing Library + jsdom** – unit and integration tests in a browser-like JSDOM environment.

`package.json` scripts:

- `npm run dev` – start Vite dev server.
- `npm run build` – `tsc -b` then `vite build`.
- `npm run preview` – preview built assets.
- `npm run lint` – run ESLint.
- `npm run test` – run Vitest tests.

`vite.config.ts` (test-related):

- `environment: "jsdom"` – tests run in a simulated browser.
- `globals: true` – Vitest globals enabled.
- `setupFiles: "./src/setupTests.ts"` – shared test configuration.
- `css: true` – CSS imports allowed inside tests.

---

## 3. Application composition & routing

### 3.1 Entry point

`src/main.tsx` wires the application:

- Creates the React root via `ReactDOM.createRoot`.
- Wraps `<App />` in:

  - `<React.StrictMode>` – extra checks in development.
  - `<QueryClientProvider>` – TanStack Query client at the top level.
  - `<BrowserRouter>` – HTML5 history-based routing.

- Loads global styles from `src/styles/index.css`.

This guarantees a single SPA root with routing and cross-cutting concerns (future data fetching) configured once.

### 3.2 App shell & routes

`src/app/App.tsx` defines the top-level layout and routes:

- `<AppShell>` – persistent frame (top bar and main area).
- Inside the shell, a `Routes` tree:

  - `/` → `MapView` (main map experience).
  - `/settings` → `SettingsView` (placeholder; not functionally relevant).
  - `*` → `NotFoundView` (simple 404 that links back to `/`).

`AppShell` (`src/app/layout/AppShell.tsx`):

- Renders the **top bar** (`<TopBar />`) and a `<main className="na-app-shell__main">` region where the current route is mounted.
- Uses CSS classes `na-app-shell` / `na-app-shell__main` to implement the flexible full-height layout.

`NotFoundView` (`src/app/routes/NotFoundView.tsx`):

- Shows a “Page not found” message.
- Provides a link back to the main map (`/`).
- Styled via `na-not-found-view` CSS classes.

The `/settings` route (`SettingsView`) is a stub and is not central to the architecture.

---

## 4. Map-centric UI architecture

The core UX lives under `src/app/layout` and `src/features/map`.

### 4.1 `MapLayout` and page composition

`src/app/layout/MapLayout.tsx` owns the map area and side panel:

```tsx
<div className="na-map-layout">
  <div
    className="na-map-layout__map-area"
    data-side-panel-open={isSidePanelOpen ? "true" : "false"}
  >
    <MapRoot
      styleUrl={mapStyleConfig.styleUrl}
      projection={mapStyleConfig.projection}
      onViewportChange={handleViewportChange}
      onMapClick={handleMapClick}
      onMapReady={setMapReady}
      baseMapStyle={baseMapStyle}
      onMapBackgroundClick={handleMapBackgroundClick}
    />
    <MapOverlays />
    <SidePanel isOpen={isSidePanelOpen} />
  </div>
</div>
```

Responsibilities:

- **Map state wiring** via `useMapStore`:

  - `setViewport` – keeps `mapStore.viewport` in sync with MapLibre.
  - `setSelectedLocation` / `clearSelectedLocation` – manage current focus.
  - `setMapReady` – marks the map as initialized.

- **UI state wiring** via `useUiStore`:

  - `isSidePanelOpen`, `openSidePanel` – side panel visibility.
  - `baseMapStyle` – dark vs satellite basemap.

- **Callbacks into `MapRoot`**:

  - `onViewportChange(viewport)` → updates `mapStore.viewport`.
  - `onMapClick(location)`:

    - Sets `selectedLocation` in `mapStore`.
    - Auto-opens the side panel if it is currently closed.

  - `onMapBackgroundClick()` → clears selection if user clicks “space” outside the globe.
  - `onMapReady()` → sets `isMapReady` to `true`.

Map style configuration is derived from UI state:

```ts
const mapStyleConfig: { styleUrl: string; projection: MapProjection } =
  baseMapStyle === "dark"
    ? { styleUrl: MAP_STYLE_URL_DARK, projection: "globe" }
    : { styleUrl: MAP_STYLE_URL_SATELLITE, projection: "globe" };
```

### 4.2 `MapRoot` – MapLibre integration

`src/features/map/MapRoot.tsx` encapsulates all direct interaction with MapLibre GL.

#### 4.2.1 Props & types

Core types:

```ts
export type MapCoordinates = {
  lng: number;
  lat: number;
};

export type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type MapViewport = {
  center: MapCoordinates;
  zoom: number;
  bearing: number;
  pitch: number;
  bounds?: MapBounds;
};

export type MapSelectedLocation = MapCoordinates & {
  name?: string;
  countryCode?: string;
};
```

Component props:

```ts
export type MapRootProps = {
  initialCenter?: MapCoordinates;
  initialZoom?: number;
  markers?: MapCoordinates[]; // legacy small-dot markers
  onViewportChange?: (viewport: MapViewport) => void;
  onMapClick?: (location: MapSelectedLocation) => void;
  onMapBackgroundClick?: () => void;
  onMapReady?: () => void;
  baseMapStyle?: "dark" | "satellite";
  className?: string;
};
```

#### 4.2.2 Initialization & lifecycle

- On first mount:

  - Creates `maplibregl.Map` with:

    - `container: mapContainerRef.current`
    - `style: MAP_STYLE_URL_DARK` or `MAP_STYLE_URL_SATELLITE`
    - `center` and `zoom` from props or defaults.
    - `attributionControl: true`.

  - On `style.load`:

    - If `MAP_PROJECTION_TYPE === "globe"` and `setProjection` is available, sets the projection to globe.

  - On `load`:

    - Calls `onMapReady` if provided.
    - Emits the initial viewport.

- Subscribes to:

  - `moveend` → emits updated viewport.
  - `mousemove` → updates cursor based on nearby place features.
  - `click` → picks a location or triggers background click behavior.
  - `styleimagemissing` → adds 1×1 transparent placeholders for missing icons (prevents MapLibre errors).
  - `error` → development-only logging with noise filtering for style-switch aborts.

- Adds a `NavigationControl` (zoom + pitch) in the top-left corner.

- On unmount:

  - Unsubscribes listeners, removes markers and calls `map.remove()`.

Viewport emission:

```ts
const emitViewport = (map: MapLibreMap) => {
  const center = map.getCenter();
  const bounds = map.getBounds();

  const viewport: MapViewport = {
    center: { lng: center.lng, lat: center.lat },
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
    bounds: {
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    },
  };

  viewportCallbackRef.current?.(viewport);
};
```

Refs are used to keep callbacks (`onViewportChange`, `onMapClick`, etc.) up to date without recreating the map.

#### 4.2.3 Click & hover behavior

- Hover (`mousemove`):

  - Queries rendered features around the cursor (small bounding box).
  - Uses `pickBestPlaceFeature` to identify place-like features based on `layer.id`, `class` and presence of names.
  - Sets cursor to `pointer` when hovering over a usable place; resets otherwise.

- Click (`click`):

  - First checks `isClickOutsideGlobe(map, event)` when in globe mode:

    - Approximates the globe as a circle centered in the canvas.
    - If the click is outside, triggers `onMapBackgroundClick` and returns.

  - Otherwise:

    - Queries rendered features in a small box around the click.
    - Picks the “best” place feature and extracts metadata:

      - Name: prefers `name:es`, then `name:en`, then `name`.
      - Country code: checks multiple common properties (e.g. `iso_3166_1`, `country_code`, `iso_a2`).

    - Calls `onMapClick({ lng, lat, name, countryCode })`.

If feature picking fails, it gracefully falls back to coordinates-only selection.

#### 4.2.4 Basemap style switching

A dedicated `useEffect` reacts to `baseMapStyle` changes:

- Computes `nextStyleUrl` from `MAP_STYLE_URL_DARK` / `MAP_STYLE_URL_SATELLITE`.
- In globe mode, wraps `easeTo` to strip the `around` option from options, avoiding MapLibre warnings.
- Calls `map.setStyle(nextStyleUrl, { diff: false })` to avoid noisy style diffing errors.

#### 4.2.5 Markers

A separate effect handles simple markers:

- Clears previous markers.
- For each `markers` entry, creates a `maplibregl.Marker` with a `div.na-map-marker` element.
- Adds the marker to the map and stores it in `markersRef`.

### 4.3 Side panel – location, weather and viewport

`src/app/layout/SidePanel.tsx` renders location details and weather info.

Inputs:

- From `mapStore`:

  - `selectedLocation` – coordinates and optional name/country.
  - `viewport` – used for displaying zoom in the “Map status” section.

- From hooks:

  - `useSelectedLocationCurrentWeather()` – maps `selectedLocation` to a `LocationRef` and ensures `current` weather is loaded in `weatherStore`.
  - `useSelectedLocationForecast()` – same pattern for forecast timelines.

Structure:

- Root `<aside>` with:

  - `className="na-side-panel"`.
  - `data-open="true" | "false"` – slide-in/out animation.
  - `data-has-selection` – selection presence.
  - `aria-busy` – reflects aggregate loading state.

- **Header**:

  - `Location details` title.
  - If no selection: placeholder text prompting the user to click on the map.

- **When a selection exists**:

  - Location section:

    - Subtitle “Selected location”.
    - City name + country code (if present).
    - Coordinates (`lat`, `lng`) formatted to 4 decimals.

  - **Current weather**:

    - Loading:

      - Skeleton layout using `Skeleton` primitives.
      - Copy: “Loading current weather for this location…”.

    - Error:

      - `buildCurrentWeatherErrorMessage(error)` maps `WeatherError.kind` (network, rate_limit, config, contract, http, unknown) to user-friendly messages.

    - Success:

      - Rounded temperature in °C.
      - Condition label.
      - Humidity and wind speed if available.

  - **Forecast**:

    - Loading:

      - Skeleton list for “Next hours & days”.
      - Copy: “Loading forecast for this location…”.

    - Error:

      - General copy “Forecast is temporarily unavailable.”
      - Additional hints for `network` and `rate_limit` errors.

    - Success:

      - “Next hours” block rendered from 3h `ForecastTimeline` slices (first 4).
      - “Next days” block rendered from daily `ForecastTimeline` slices (first 4).
      - If no slices, shows a “No forecast data available” message.

- **Map status** section:

  - If `viewport` exists, shows the current zoom (`zoom.toFixed(2)`) and leaves room for additional metadata in the future.

The component stays presentational; all domain logic is delegated to hooks and stores.

### 4.4 Map overlays & controls

`src/app/layout/MapOverlays.tsx` renders two overlay clusters: the side panel handle and the basemap toggle.

State:

- Uses `useUiStore` to:

  - `toggleSidePanel()` when clicking the handle.
  - Read `isSidePanelOpen`.
  - Read `baseMapStyle` and update it via `setBaseMapStyle`.

Side panel handle:

- Rendered as a circular glassmorphism button (`na-side-panel-handle`) that sits anchored to the side panel edge.
- Uses an SVG chevron that rotates depending on whether the panel is open or closed (`na-side-panel-handle--open` / `--closed`).
- Accessible label switches between “Show details panel” and “Hide details panel”.

Basemap toggle:

- Rendered as a pill-shaped UI (`na-map-basemap-toggle`) with a sliding thumb implemented via `::before` and `data-style` attribute.
- Contains two buttons:

  - `"Map"` → sets `baseMapStyle` to `"dark"`.
  - `"Satellite"` → sets `baseMapStyle` to `"satellite"`.

- Implements an ARIA `radiogroup` pattern with accessible labels.

### 4.5 Top bar & search

`src/app/layout/TopBar.tsx`:

- Renders:

  - A brand area with logo emoji and “Nimbus Atlas” title.
  - A centered search input (`type="search"`) styled with `na-text-field__input`.
  - A settings icon button (⚙️) using `na-icon-button` styles.

The search bar is designed to resolve text queries into map locations, update the `mapStore.selectedLocation`, optionally open the side panel and move the map camera to the new location so that click and search workflows share the same downstream pipeline.

### 4.6 UI primitives

Located in `src/ui`:

- `Button`:

  - Wraps `<button>`.
  - Variants: `"primary"` and `"ghost"`.
  - Sizes: `"sm"` and `"md"`.
  - BEM-style classes: `na-button`, `na-button--primary`, `na-button--sm`, etc.

- `IconButton`:

  - Wraps `<button>` for icon-only use cases.
  - Always includes `na-icon-button` plus any extra `className`.

- `Skeleton`:

  - Generic skeleton block using the shimmer animation defined in CSS.
  - Accepts `className` and `style` to match different shapes (temperature, labels, lines).

---

## 5. State management

The app uses **Zustand** for global state, with one store per concern.

### 5.1 Map store

`src/state/mapStore.ts`:

```ts
export type MapStoreState = {
  viewport: MapViewport | null;
  isMapReady: boolean;
  selectedLocation: MapCoordinates | null;

  setViewport: (viewport: MapViewport) => void;
  setMapReady: () => void;
  setSelectedLocation: (coords: MapCoordinates) => void;
  clearSelectedLocation: () => void;
};
```

- `viewport` – last viewport emitted by `MapRoot` (center, zoom, bearing, pitch, bounds).
- `isMapReady` – prevents features from running before map initialization.
- `selectedLocation` – currently focused location (from map clicks or search).

This store is the single source of truth for map camera and selection state.

### 5.2 UI store

`src/state/uiStore.ts`:

```ts
export type BaseMapStyle = "dark" | "satellite";

export type UiStoreState = {
  isSidePanelOpen: boolean;
  baseMapStyle: BaseMapStyle;

  openSidePanel: () => void;
  closeSidePanel: () => void;
  toggleSidePanel: () => void;

  setBaseMapStyle: (style: BaseMapStyle) => void;
};
```

- `isSidePanelOpen` – UI-only visibility flag.
- `baseMapStyle` – `"dark"` or `"satellite"`; drives both `MapRoot` and `MapOverlays`.

This store is intentionally small and decoupled from business logic.

### 5.3 Weather store

`src/state/weatherStore.ts` is the central cache for weather data.

Resource wrapper:

```ts
export type WeatherResourceStatus = "idle" | "loading" | "success" | "error";

export interface WeatherResource<T> {
  status: WeatherResourceStatus;
  data?: T;
  error?: WeatherError;
  lastUpdatedAt?: number;
  isRefreshing?: boolean;
}
```

Global state:

```ts
export interface WeatherState {
  currentByLocationKey: Record<string, WeatherResource<CurrentWeather>>;
  forecastByLocationKey: Record<string, WeatherResource<ForecastTimeline[]>>;
  alertsByLocationKey: Record<string, WeatherResource<WeatherAlert[]>>;
  bundleTtlMs: number;

  ensureCurrentWeather: (location: LocationRef) => Promise<void>;
  ensureForecast: (location: LocationRef) => Promise<void>;
  ensureAlerts: (location: LocationRef) => Promise<void>;

  clearCurrentForLocation: (locationKey: string) => void;
  clearForecastForLocation: (locationKey: string) => void;
  clearAlertsForLocation: (locationKey: string) => void;
}
```

Location key:

```ts
export function buildLocationKey(location: LocationRef): string {
  const lat = location.lat.toFixed(3);
  const lon = location.lon.toFixed(3);
  const idPart = location.id ? `:${location.id}` : "";
  return `loc:${lat},${lon}${idPart}`;
}
```

- Rounds coordinates to 3 decimals to avoid infinite key cardinality.
- Optionally appends an `id` segment.

Bundle TTL and de-duplication:

- `DEFAULT_BUNDLE_TTL_MS = 5 * 60 * 1000` (5 minutes).
- `ensureBundleInternal(location)` implements the shared logic:

  - If an existing `current` resource is `success` and still within TTL, early return.
  - Uses `inFlightWeatherRequests: Map<string, Promise<void>>` to ensure only one in-flight request per location key.
  - When refreshing data for a location with existing data:

    - Keeps previous `data`.
    - Marks `isRefreshing: true`.
    - Keeps `status: "success"` until new data arrives.

  - Calls `weatherService.fetchWeatherBundle(location)` (OpenWeather 2.5).
  - On success:

    - Updates `currentByLocationKey`, `forecastByLocationKey`, `alertsByLocationKey` with `status: "success"`, fresh data, shared timestamps and `isRefreshing: false`.

  - On error:

    - Sets `status: "error"` for all three resources.
    - Preserves last known `data` where available.
    - Saves error details with `WeatherError`.

  - Always clears the in-flight marker for that key in a `finally` block.

Public API:

- `ensureCurrentWeather`, `ensureForecast`, `ensureAlerts` all delegate to `ensureBundleInternal`, providing a unified bundle fetch.
- `clear*ForLocation` helpers remove specific entries from the caches.

This store is the only place that talks to the OpenWeather service; components and hooks only interact with it via selectors and helper hooks.

---

## 6. Weather domain & OpenWeather 2.5 integration

### 6.1 Domain models

`src/entities/weather/models.ts` defines the canonical weather domain:

```ts
export interface LocationRef {
  id?: string;
  name?: string;
  countryCode?: string;
  timezone?: string;
  lat: number;
  lon: number;
}
```

- `WeatherConditionCode` – normalized condition categories:

  ```ts
  export type WeatherConditionCode =
    | "clear"
    | "partly_cloudy"
    | "cloudy"
    | "rain"
    | "snow"
    | "storm"
    | "drizzle"
    | "mist"
    | "fog"
    | "thunderstorm"
    | "other";
  ```

- `CurrentWeather` – normalized current conditions (Celsius, m/s, degrees):

  ```ts
  export interface CurrentWeather {
    location: LocationRef;
    observedAt: string; // ISO UTC
    temperature: number;
    feelsLike?: number;
    conditionCode: WeatherConditionCode;
    conditionLabel: string;
    humidity?: number;
    pressure?: number;
    windSpeed?: number;
    windDirection?: number;
  }
  ```

- Forecast:

  ```ts
  export type ForecastGranularity = "3h" | "daily";

  export interface ForecastSlice {
    timestamp: string; // ISO UTC
    temperature: number;
    conditionCode: WeatherConditionCode;
    conditionLabel: string;
    precipitationProbability?: number; // 0..1
    windSpeed?: number;
    windDirection?: number;
    minTemperature?: number;
    maxTemperature?: number;
  }

  export interface ForecastTimeline {
    location: LocationRef;
    granularity: ForecastGranularity;
    slices: ForecastSlice[];
  }
  ```

- Alerts (currently unused by OpenWeather 2.5):

  ```ts
  export type WeatherAlertSeverity =
    | "minor"
    | "moderate"
    | "severe"
    | "extreme"
    | "unknown";

  export type WeatherAlertType =
    | "storm"
    | "heatwave"
    | "coldwave"
    | "flood"
    | "wind"
    | "rain"
    | "snow"
    | "fog"
    | "other";

  export interface WeatherAlert {
    id: string;
    alertType: WeatherAlertType;
    severity: WeatherAlertSeverity;
    title: string;
    description: string;
    startsAt?: string;
    endsAt?: string;
    locations?: LocationRef[];
    source?: string;
    tags?: string[];
  }
  ```

- Errors:

  ```ts
  export type WeatherErrorKind =
    | "network"
    | "http"
    | "contract"
    | "rate_limit"
    | "config"
    | "unknown";

  export interface WeatherError {
    kind: WeatherErrorKind;
    message: string;
    statusCode?: number;
    retryAfterMs?: number;
  }
  ```

- Aggregate bundle:

  ```ts
  export interface WeatherBundle {
    current: CurrentWeather;
    forecastTimelines: ForecastTimeline[];
    alerts: WeatherAlert[];
    provider: ProviderMetadata;
  }
  ```

### 6.2 OpenWeatherService (2.5)

`src/services/openWeatherService.ts` implements the production integration with OpenWeather **2.5 REST endpoints**.

Endpoints:

- Current: `https://api.openweathermap.org/data/2.5/weather`
- Forecast: `https://api.openweathermap.org/data/2.5/forecast`

API key handling:

- `getApiKeyOrThrow()`:

  - Uses an optional test override (`__TEST_OPENWEATHER_API_KEY__`) when present.
  - Otherwise reads `VITE_OPENWEATHER_API_KEY` from `import.meta.env`.
  - Throws a `WeatherError` of kind `"config"` if the key is missing.

URL builders:

```ts
function buildCurrentUrl(lat: number, lon: number, apiKey: string): string {
  const url = new URL(CURRENT_BASE_URL);
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lon.toString());
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");
  return url.toString();
}

function buildForecastUrl(lat: number, lon: number, apiKey: string): string {
  const url = new URL(FORECAST_BASE_URL);
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lon.toString());
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");
  return url.toString();
}
```

Low-level fetchers:

- `fetchCurrent2_5(location, apiKey)` and `fetchForecast2_5(location, apiKey)`:

  - Catch network errors and map them to `WeatherError` with `kind: "network"`.
  - Inspect HTTP status:

    - `429` → `kind: "rate_limit"` and optional `retryAfterMs`.
    - `401` / `403` → `kind: "config"` (API key / configuration problems).
    - Other 4xx/5xx → `kind: "http"`.

  - On JSON parse errors → `kind: "contract"`.

Mapping helpers:

- `buildDomainLocationFromCurrent(requested, payload)`:

  - Applies coordinates from payload if valid; falls back to requested otherwise.
  - Propagates `name` and `sys.country` when present.

- `mapMainToConditionCode(main, id)`:

  - Maps raw `weather.main` / `weather.id` to `WeatherConditionCode` (storm, rain, snow, clear, cloudy, etc.).

- `mapCurrentFrom2_5(location, payload)`:

  - Validates `main.temp` and `dt`.
  - Builds `CurrentWeather` with normalized condition code, label and basic metrics (humidity, pressure, wind).

- `mapForecastTimelinesFrom2_5(location, payload)`:

  - Builds a `"3h"` `ForecastTimeline` directly from `list` entries (skipping invalid ones).
  - Aggregates `"daily"` timeline using `buildDailyTimelineFrom3h`:

    - Groups slices by `YYYY-MM-DD` (UTC).
    - Computes min/max temperatures per day.
    - Uses midday as a canonical timestamp.

  - Emits `trackWeatherDataDegraded` events when expected timelines cannot be built (missing data or aggregation failure).

Public service:

```ts
export class OpenWeatherService implements WeatherService {
  async fetchWeatherBundle(location: LocationRef): Promise<WeatherBundle> {
    const startedAt = performance.now?.() ?? Date.now();

    trackWeatherApiRequest({
      provider: "openweather",
      operation: "bundle_2_5",
      location,
      timestamp: Date.now(),
    });

    try {
      const apiKey = getApiKeyOrThrow();

      const [currentRaw, forecastRaw] = await Promise.all([
        fetchCurrent2_5(location, apiKey),
        fetchForecast2_5(location, apiKey),
      ]);

      const domainLocation = buildDomainLocationFromCurrent(location, currentRaw);
      const current = mapCurrentFrom2_5(domainLocation, currentRaw);
      const timelines = mapForecastTimelinesFrom2_5(domainLocation, forecastRaw);

      const alerts: WeatherAlert[] = [];

      trackWeatherDataDegraded({
        provider: "openweather",
        operation: "bundle_2_5",
        aspect: "alerts",
        reason: "alerts_not_available_in_free_2_5",
        hadInput: false,
        hasOutput: false,
        timestamp: Date.now(),
      });

      const bundle: WeatherBundle = {
        current,
        forecastTimelines: timelines,
        alerts,
        provider: buildProviderMetadata(),
      };

      const finishedAt = performance.now?.() ?? Date.now();

      trackWeatherApiSuccess({
        provider: "openweather",
        operation: "bundle_2_5",
        location: domainLocation,
        durationMs: finishedAt - startedAt,
        timestamp: Date.now(),
      });

      return bundle;
    } catch (e) {
      const finishedAt = performance.now?.() ?? Date.now();
      const error =
        (e as WeatherError) ??
        ({
          kind: "unknown",
          message: "Unknown error in fetchWeatherBundle (2.5)",
        } as WeatherError);

      trackWeatherApiError({
        provider: "openweather",
        operation: "bundle_2_5",
        location,
        durationMs: finishedAt - startedAt,
        error,
        timestamp: Date.now(),
      });

      throw error;
    }
  }
}
```

Telemetry hooks (`trackWeatherApiRequest/Success/Error/DataDegraded`) connect the integration to the observability layer.

### 6.3 Hooks – connecting map selection to weather

`src/hooks/useSelectedLocationCurrentWeather.ts`:

- Reads `mapStore.selectedLocation` as a `MapSelectedLocation`.
- Maps it to a `LocationRef` (note `lon` from `lng`).
- Computes a `locationKey` using `buildLocationKey(location)`.
- Selects the `WeatherResource<CurrentWeather>` from `weatherStore.currentByLocationKey[locationKey]`.
- Triggers `ensureCurrentWeather(location)` in an effect when `locationKey` changes.

`src/hooks/useSelectedLocationForecast.ts`:

- Same pattern, but reads `forecastByLocationKey` and calls `ensureForecast(location)`.

These hooks bridge map selection and weather without coupling UI to store internals.

---

## 7. Map configuration

`src/config/map.config.ts` centralizes map-related configuration.

API key & styles:

- `MAPTILER_API_KEY` from `VITE_MAPTILER_API_KEY`.
- `buildMaptilerStyleUrl(mapId: string)`:

  - When the key is missing:

    - Logs a warning in development.
    - Falls back to `https://demotiles.maplibre.org/style.json` so local development still works.

- Style URLs:

  - `MAP_STYLE_URL_DARK` – MapTiler `streets-v2-dark`.
  - `MAP_STYLE_URL_SATELLITE` – MapTiler `hybrid`.
  - `MAP_STYLE_URL` – currently set to `MAP_STYLE_URL_DARK` for legacy usage.

Projection & viewport:

- `MAP_USE_GLOBE = true` and `MAP_PROJECTION_TYPE` derived as `"globe"` or `"mercator"`.
- Initial viewport:

  - `DEFAULT_MAP_CENTER` – Madrid (`lng: -3.7038`, `lat: 40.4168`).
  - `DEFAULT_MAP_ZOOM = 4`.
  - `MIN_MAP_ZOOM = 2`, `MAX_MAP_ZOOM = 12`.

---

## 8. Observability

### 8.1 App telemetry

`src/observability/appTelemetry.ts` defines generic app-level telemetry.

Types:

```ts
export type AppEventCategory = "ux" | "data" | "error" | "performance";
export type AppEventResult = "success" | "error" | "degraded";

export interface AppEvent {
  eventType: string;
  category: AppEventCategory;
  result?: AppEventResult;
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface AppTelemetrySink {
  onEvent(event: AppEvent): void;
}
```

Behavior:

- Default sink:

  - Logs `[app][event]` to `console.debug` in non-production environments.
  - No-op in production.

- `setAppTelemetrySink(sink)` – sets a custom sink (e.g. send events to a backend or analytics platform).
- `trackAppEvent(event)`:

  - Forwards events to `activeSink.onEvent`.
  - Guards against sink failures, logging a warning in development.

Logging helper:

```ts
export type LogLevel = "debug" | "info" | "warn" | "error";

export function log(level: LogLevel, message: string, details?: unknown): void {
  if (level === "debug" && !isDev) {
    return;
  }

  const prefix = `[app][${level}]`;

  const consoleMethod =
    level === "debug"
      ? console.debug
      : level === "info"
      ? console.info
      : level === "warn"
      ? console.warn
      : console.error;

  if (typeof details === "undefined") {
    consoleMethod(prefix, message);
  } else {
    consoleMethod(prefix, message, details);
  }
}
```

### 8.2 Weather telemetry

`src/observability/weatherTelemetry.ts` captures weather integration events.

Types:

```ts
export interface WeatherApiRequestEvent {
  provider: string;
  operation: string;
  location?: LocationRef;
  timestamp: number;
}

export interface WeatherApiSuccessEvent extends WeatherApiRequestEvent {
  durationMs: number;
}

export interface WeatherApiErrorEvent extends WeatherApiRequestEvent {
  durationMs: number;
  error: WeatherError;
}

export type WeatherDataAspect = "forecast_hourly" | "forecast_daily" | "alerts";

export interface WeatherDataDegradedEvent {
  provider: string;
  operation: string;
  aspect: WeatherDataAspect;
  reason: string;
  hadInput: boolean;
  hasOutput: boolean;
  timestamp: number;
}

export interface WeatherTelemetrySink {
  onApiRequest?(event: WeatherApiRequestEvent): void;
  onApiSuccess?(event: WeatherApiSuccessEvent): void;
  onApiError?(event: WeatherApiErrorEvent): void;
  onDataDegraded?(event: WeatherDataDegradedEvent): void;
}
```

Privacy-aware location sanitization:

- `sanitizeLocationForTelemetry(location)`:

  - Rounds `lat` and `lon` to 2 decimals.
  - Keeps `name` and `countryCode`.
  - Drops `id`, `timezone` and other fields.

- `withSanitizedLocation(event)`:

  - Returns a shallow clone of the event with sanitized `location`.

Default sink:

- In development:

  - Logs `[weather][request]`, `[weather][success]`, `[weather][error]`, `[weather][degraded]` via `console.debug`.

- In production:

  - No-op.

API:

- `setWeatherTelemetrySink(sink)` – injects a custom sink.
- `trackWeatherApiRequest`, `trackWeatherApiSuccess`, `trackWeatherApiError`, `trackWeatherDataDegraded`:

  - Sanitize location for request/success/error events.
  - Delegate to the current sink if handlers are implemented.

OpenWeather integration uses these functions around every bundle call so that operational diagnostics can be collected without exposing sensitive coordinates.

---

## 9. Styling & design system

Global styles live in `src/styles/index.css`.

### 9.1 Design tokens

Root CSS variables:

- **Colors** (dark theme):

  - `--na-color-bg`, `--na-color-bg-elevated`, `--na-color-surface`.
  - `--na-color-border-subtle`.
  - `--na-color-text`, `--na-color-text-muted`.
  - `--na-color-accent`, `--na-color-accent-soft`.
  - `--na-color-danger`.

- **Radii**:

  - `--na-radius-sm`, `--na-radius-md`, `--na-radius-lg`.

- **Spacing**:

  - `--na-spacing-2`, `--na-spacing-3`, `--na-spacing-4`, `--na-spacing-6`.

- **Motion**:

  - `--na-motion-fast`, `--na-motion-standard`, `--na-motion-easing`.

Global layout:

- `html, body, #root` fill the viewport and use `color-scheme: dark`.
- `body` uses `system-ui` / Segoe UI stack.

### 9.2 Layout classes

Key layout classes:

- `.na-app-shell`, `.na-app-shell__main` – main shell flex structure.
- `.na-top-bar` – top bar with radial gradient background, brand, search and actions.
- `.na-map-layout`, `.na-map-layout__map-area` – map container and “space” background (SVG).
- `.na-side-panel` – glassmorphism side panel with blur, elevated shadow and transitions driven by `data-open`.
- `.na-map-overlays` – absolute overlay container for controls, with pointer-events tuned to avoid blocking the map canvas.

### 9.3 Controls & primitives

Buttons:

- `.na-button`, `.na-button--primary`, `.na-button--ghost`, `.na-button--sm`.
- `.na-icon-button` – circular/glass buttons for map controls:

  - Active/disabled states.
  - Visible focus outline.

Text fields:

- `.na-text-field__input` – dark background, subtle hover state, accent-colored focus ring.
- `::placeholder` uses muted text color.

Skeletons:

- `.na-skeleton` with variants:

  - `.na-skeleton--temperature`, `.na-skeleton--label`, `.na-skeleton--meta`, `.na-skeleton--line`.

- Shimmer animation via `@keyframes na-skeleton-shimmer`.
- `@media (prefers-reduced-motion: reduce)` disables animation and transitions for accessibility.

Map-specific:

- `.na-map-marker` – simple accent-colored dot markers with outer glow.
- `.maplibregl-marker` override ensures markers are absolutely positioned and opt-in to GPU transform.

### 9.4 Responsiveness & motion

Responsive tweaks (`@media (max-width: 768px)`):

- Reduce padding in `na-app-shell__main` and `na-top-bar`.
- Allow side panel to stretch across width at the bottom on small screens.

Reduced motion:

- `@media (prefers-reduced-motion: reduce)`:

  - Disables transitions on buttons, text fields and side panel.
  - Removes heavy shadows to avoid distracting animations.

---

## 10. Testing

Tests live in the `tests/` folder and use Vitest with Testing Library.

Example coverage (non-exhaustive):

- Layout and map:

  - `AppShell.test.tsx` – verifies shell composition.
  - `MapRoot.test.tsx` – MapLibre wrapper behavior under typical interactions.
  - `SidePanel.location.test.tsx` – Side panel behavior when a location is selected.

- State stores:

  - `mapStore.test.ts` – viewport and selection semantics.
  - `weatherStore.test.ts` – TTL, de-duplication, error propagation.

- Weather and observability:

  - `openWeatherService.test.ts` – mapping, error classification and telemetry integration.
  - `weatherTelemetry.test.ts` – sanitization and sink behavior.
  - `appTelemetry.test.ts` – app event logging.

- Fixtures:

  - `tests/fixtures/openWeatherCurrentFixture.ts`.
  - `tests/fixtures/openWeatherForecastFixture.ts`.

Tests are focused on:

- Stability of MapLibre integration under common scenarios.
- Correctness of store semantics (especially caching behavior).
- Robust mapping of OpenWeather payloads as APIs evolve.
- Safety of telemetry utils (no leaking of sensitive information).

---

## 11. Extensibility & future directions

The architecture is intentionally modular and designed to evolve:

- **New weather providers**:

  - Implement a service that returns `WeatherBundle`.
  - Swap it into `weatherStore` in place of `OpenWeatherService`.

- **Additional map overlays**:

  - Plug new components into `MapOverlays` (e.g. city weather points, severe weather layers).
  - Drive them with additional stores/selectors without touching `MapRoot`.

- **Settings**:

  - Model user preferences (units, theme overrides, default basemap) in `uiStore`.
  - Expose them via a richer `/settings` route.

- **Telemetry sinks**:

  - Use `setAppTelemetrySink` and `setWeatherTelemetrySink` to push events into external monitoring platforms without coupling the core logic to any vendor.

Because state, domain models, integrations and UI are clearly separated, Nimbus Atlas can grow features over time while remaining readable and review-friendly for recruiters and tech leads.
