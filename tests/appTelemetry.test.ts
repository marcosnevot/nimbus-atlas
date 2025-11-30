// tests/appTelemetry.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  trackAppEvent,
  setAppTelemetrySink,
} from "../src/observability/appTelemetry";

describe("appTelemetry", () => {
  afterEach(() => {
    // Reset sink to default after each test
    setAppTelemetrySink(null);
  });

  it("forwards events to the active sink", () => {
    const onEvent = vi.fn();
    setAppTelemetrySink({ onEvent });

    const event = {
      eventType: "test_event",
      category: "ux" as const,
      timestamp: 1234567890,
    };

    trackAppEvent(event);

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith(event);
  });

  it("does not throw when the sink throws", () => {
    const onEvent = vi.fn(() => {
      throw new Error("sink failure");
    });
    setAppTelemetrySink({ onEvent });

    expect(() =>
      trackAppEvent({
        eventType: "test_event",
        category: "ux",
        timestamp: Date.now(),
      })
    ).not.toThrow();
  });
});
