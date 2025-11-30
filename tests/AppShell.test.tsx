// tests/AppShell.test.tsx
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../src/app/App";

vi.mock("../src/features/map/MapRoot", () => {
  type MockMapRootProps = {
    onViewportChange?: (viewport: any) => void;
    onMapClick?: (coords: any) => void;
    onMapReady?: () => void;
  };

  const MockMapRoot: React.FC<MockMapRootProps> = (props) => {
    React.useEffect(() => {
      props.onMapReady?.();
      props.onViewportChange?.({
        center: { lat: 10, lng: 20 },
        zoom: 5,
        bearing: 0,
        pitch: 0,
      });
      props.onMapClick?.({ lat: 10, lng: 20 });
    }, []);

    return <div data-testid="mock-map-root" />;
  };

  return {
    MapRoot: MockMapRoot,
  };
});

const renderApp = () =>
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

describe("AppShell", () => {
  it("renders top bar, map area and side panel", () => {
    renderApp();

    expect(
      screen.getByRole("banner", { name: /nimbus atlas top bar/i })
    ).toBeInTheDocument();

    expect(screen.getByTestId("mock-map-root")).toBeInTheDocument();

    expect(
      screen.getByRole("complementary", { name: /location details/i })
    ).toBeInTheDocument();
  });

  it("shows selected location after map emits events", async () => {
    renderApp();

    expect(
      await screen.findByText(/selected location/i)
    ).toBeInTheDocument();

    expect(screen.getByText(/latitude:/i)).toBeInTheDocument();
    expect(screen.getByText(/longitude:/i)).toBeInTheDocument();
  });
});
