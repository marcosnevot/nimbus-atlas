// src/app/layout/SidePanel.tsx
import React from "react";
import { useMapStore } from "../../state/mapStore";
import { useSelectedLocationCurrentWeather } from "../../hooks/useSelectedLocationCurrentWeather";
import { useSelectedLocationForecast } from "../../hooks/useSelectedLocationForecast";
import { Skeleton } from "../../ui/Skeleton";
import type { WeatherError } from "../../entities/weather/models";

const formatCoord = (value: number) => value.toFixed(4);

const formatTimeShort = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const formatDateShort = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "";
  }
};

function buildCurrentWeatherErrorMessage(error?: WeatherError): string {
  const base = "Unable to load current weather";

  if (!error) {
    return `${base}.`;
  }

  switch (error.kind) {
    case "network":
      // Preserves original message so tests that look for "Network down" still pass
      return error.message
        ? `${base}: ${error.message}`
        : `${base}: network error.`;
    case "rate_limit": {
      const suffix =
        typeof error.retryAfterMs === "number" && error.retryAfterMs > 0
          ? " Please try again in a few seconds."
          : " Please try again shortly.";
      return `${base}: too many requests to the weather provider.${suffix}`;
    }
    case "config":
      return `${base}: weather provider is not fully configured in this demo.`;
    case "contract":
      return `${base}: the weather data from the provider had an unexpected format.`;
    case "http":
      return error.statusCode
        ? `${base}: the weather provider returned an unexpected response (${error.statusCode}).`
        : `${base}: the weather provider returned an unexpected response.`;
    default:
      return error.message ? `${base}: ${error.message}` : `${base}.`;
  }
}

type SidePanelProps = {
  isOpen: boolean;
};

export const SidePanel: React.FC<SidePanelProps> = ({ isOpen }) => {
  const selectedLocation = useMapStore((state) => state.selectedLocation);
  const viewport = useMapStore((state) => state.viewport);

  const { resource: weatherResource } = useSelectedLocationCurrentWeather();
  const { resource: forecastResource } = useSelectedLocationForecast();

  const weatherStatus = weatherResource?.status ?? "idle";
  const currentWeather = weatherResource?.data;
  const weatherError = weatherResource?.error;

  const forecastStatus = forecastResource?.status ?? "idle";
  const timelines = forecastResource?.data ?? [];
  const forecastError = forecastResource?.error;

  const hourlyTimeline = timelines.find((t) => t.granularity === "3h");
  const dailyTimeline = timelines.find((t) => t.granularity === "daily");

  const upcomingHourlySlices = hourlyTimeline
    ? hourlyTimeline.slices.slice(0, 4)
    : [];
  const upcomingDailySlices = dailyTimeline
    ? dailyTimeline.slices.slice(0, 4)
    : [];

  const hasSelection = Boolean(selectedLocation);

  const isWeatherLoading =
    hasSelection && (weatherStatus === "idle" || weatherStatus === "loading");
  const isForecastLoading =
    hasSelection && (forecastStatus === "idle" || forecastStatus === "loading");

  const isBusy = isWeatherLoading || isForecastLoading;

  return (
    <aside
      className="na-side-panel"
      aria-label="Location details"
      data-open={isOpen ? "true" : "false"}
      data-has-selection={hasSelection ? "true" : "false"}
      aria-busy={isBusy}
    >
      <h2 className="na-side-panel__title">Location details</h2>

      {!selectedLocation && (
        <p className="na-side-panel__placeholder">
          Click on the map to select a location and see its details here.
        </p>
      )}

      {selectedLocation && (
        <section className="na-side-panel__section">
          <h3 className="na-side-panel__subtitle">Selected location</h3>

          {selectedLocation.name && (
            <p className="na-side-panel__location-name">
              {selectedLocation.name}
              {selectedLocation.countryCode
                ? `, ${selectedLocation.countryCode}`
                : ""}
            </p>
          )}

          <p className="na-side-panel__coords">
            <span>Latitude: {formatCoord(selectedLocation.lat)}</span>
            <span>Longitude: {formatCoord(selectedLocation.lng)}</span>
          </p>

          {/* Current weather */}
          <div className="na-side-panel__weather">
            <h4 className="na-side-panel__subtitle na-side-panel__subtitle--small">
              Current weather
            </h4>

            {isWeatherLoading && (
              <div
                className="na-side-panel__weather-loading"
                aria-live="polite"
              >
                <div className="na-side-panel__weather-main">
                  <Skeleton className="na-skeleton--temperature" />
                  <Skeleton className="na-skeleton--label" />
                </div>
                <div className="na-side-panel__weather-meta">
                  <Skeleton className="na-skeleton--meta" />
                  <Skeleton className="na-skeleton--meta" />
                </div>
                <p className="na-side-panel__muted na-side-panel__loading-label">
                  Loading current weather for this location…
                </p>
              </div>
            )}

            {weatherStatus === "error" && (
              <p className="na-side-panel__error" aria-live="polite">
                {buildCurrentWeatherErrorMessage(weatherError)}
              </p>
            )}

            {weatherStatus === "success" && currentWeather && (
              <>
                <div className="na-side-panel__weather-main">
                  <span className="na-side-panel__weather-temp">
                    {Math.round(currentWeather.temperature)}°C
                  </span>
                  <span className="na-side-panel__weather-label">
                    {currentWeather.conditionLabel}
                  </span>
                </div>

                <div className="na-side-panel__weather-meta">
                  {typeof currentWeather.humidity === "number" && (
                    <span>Humidity: {currentWeather.humidity}%</span>
                  )}
                  {typeof currentWeather.windSpeed === "number" && (
                    <span>
                      Wind: {Math.round(currentWeather.windSpeed)} m/s
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Forecast */}
          <div className="na-side-panel__forecast">
            <h4 className="na-side-panel__subtitle na-side-panel__subtitle--small">
              Forecast
            </h4>

            {(forecastStatus === "idle" || forecastStatus === "loading") &&
              hasSelection && (
                <div
                  className="na-side-panel__forecast-loading"
                  aria-live="polite"
                >
                  <p className="na-side-panel__forecast-label">
                    Next hours & days
                  </p>
                  <ul className="na-side-panel__forecast-list">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <li
                        key={index}
                        className="na-side-panel__forecast-item"
                      >
                        <Skeleton
                          className="na-skeleton--line"
                          style={{ maxWidth: "3rem" }}
                        />
                        <Skeleton
                          className="na-skeleton--line"
                          style={{ maxWidth: "4rem" }}
                        />
                        <Skeleton
                          className="na-skeleton--line"
                          style={{ maxWidth: "6rem" }}
                        />
                      </li>
                    ))}
                  </ul>
                  <p className="na-side-panel__muted na-side-panel__loading-label">
                    Loading forecast for this location…
                  </p>
                </div>
              )}

            {forecastStatus === "error" && (
              <p className="na-side-panel__error" aria-live="polite">
                Forecast is temporarily unavailable.
                {forecastError?.kind === "network" &&
                  " Please check your connection and try again."}
                {forecastError?.kind === "rate_limit" &&
                  " The weather provider is temporarily limiting requests. Please try again shortly."}
              </p>
            )}

            {forecastStatus === "success" && (
              <>
                {upcomingHourlySlices.length > 0 && (
                  <div className="na-side-panel__forecast-block">
                    <p className="na-side-panel__forecast-label">Next hours</p>
                    <ul className="na-side-panel__forecast-list">
                      {upcomingHourlySlices.map((slice) => (
                        <li
                          key={slice.timestamp}
                          className="na-side-panel__forecast-item"
                        >
                          <span className="na-side-panel__forecast-time">
                            {formatTimeShort(slice.timestamp)}
                          </span>
                          <span className="na-side-panel__forecast-temp">
                            {Math.round(slice.temperature)}°C
                          </span>
                          <span className="na-side-panel__forecast-cond">
                            {slice.conditionLabel}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {upcomingDailySlices.length > 0 && (
                  <div className="na-side-panel__forecast-block">
                    <p className="na-side-panel__forecast-label">Next days</p>
                    <ul className="na-side-panel__forecast-list">
                      {upcomingDailySlices.map((slice) => (
                        <li
                          key={slice.timestamp}
                          className="na-side-panel__forecast-item"
                        >
                          <span className="na-side-panel__forecast-time">
                            {formatDateShort(slice.timestamp)}
                          </span>
                          <span className="na-side-panel__forecast-temp">
                            {typeof slice.minTemperature === "number" &&
                            typeof slice.maxTemperature === "number"
                              ? `${Math.round(
                                  slice.minTemperature
                                )}° / ${Math.round(slice.maxTemperature)}°C`
                              : `${Math.round(slice.temperature)}°C`}
                          </span>
                          <span className="na-side-panel__forecast-cond">
                            {slice.conditionLabel}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {upcomingHourlySlices.length === 0 &&
                  upcomingDailySlices.length === 0 && (
                    <p className="na-side-panel__muted">
                      No forecast data available for this location.
                    </p>
                  )}
              </>
            )}
          </div>
        </section>
      )}

      {viewport && (
        <section className="na-side-panel__section na-side-panel__section--secondary">
          <h3 className="na-side-panel__subtitle">Map status</h3>
          <p className="na-side-panel__viewport-row">
            Zoom: {viewport.zoom.toFixed(2)}
          </p>
        </section>
      )}
    </aside>
  );
};
