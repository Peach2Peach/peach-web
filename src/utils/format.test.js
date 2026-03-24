import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SAT, BTC_PRICE_FALLBACK,
  fmt, fmtPct, fmtFiat, satsToFiatRaw, satsToFiat,
  relTime, formatDate, formatTradeId,
} from "./format.js";

// ── Constants ────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("SAT is 100 million", () => {
    expect(SAT).toBe(100_000_000);
  });

  it("BTC_PRICE_FALLBACK is a positive number", () => {
    expect(BTC_PRICE_FALLBACK).toBeGreaterThan(0);
  });
});

// ── fmt ──────────────────────────────────────────────────────────────────────

describe("fmt", () => {
  it("returns plain number below 1k", () => {
    expect(fmt(500)).toBe("500");
    expect(fmt(0)).toBe("0");
    expect(fmt(999)).toBe("999");
  });

  it("formats thousands as Xk", () => {
    expect(fmt(1000)).toBe("1k");
    expect(fmt(85000)).toBe("85k");
  });

  it("formats millions as X.XXM", () => {
    expect(fmt(1_240_000)).toBe("1.24M");
    expect(fmt(5_000_000)).toBe("5.00M");
  });
});

// ── fmtPct ───────────────────────────────────────────────────────────────────

describe("fmtPct", () => {
  it("adds + sign for positive values", () => {
    expect(fmtPct(1.5)).toBe("+1.50%");
  });

  it("shows - sign for negative values", () => {
    expect(fmtPct(-0.3)).toBe("-0.30%");
  });

  it("no plus sign for zero", () => {
    expect(fmtPct(0)).toBe("0.00%");
  });

  it("respects showPlus=false", () => {
    expect(fmtPct(1.5, false)).toBe("1.50%");
  });
});

// ── fmtFiat ──────────────────────────────────────────────────────────────────

describe("fmtFiat", () => {
  it("uses comma as decimal separator (European)", () => {
    const result = fmtFiat(74.3);
    expect(result).toContain("74");
    expect(result).toContain(",");
    expect(result).toContain("30");
  });

  it("formats two decimal places", () => {
    const result = fmtFiat(100);
    expect(result).toContain(",00");
  });
});

// ── satsToFiatRaw ────────────────────────────────────────────────────────────

describe("satsToFiatRaw", () => {
  it("1 BTC at price 50000 = 50000", () => {
    expect(satsToFiatRaw(100_000_000, 50000)).toBe(50000);
  });

  it("0.5 BTC at price 50000 = 25000", () => {
    expect(satsToFiatRaw(50_000_000, 50000)).toBe(25000);
  });

  it("small amounts", () => {
    const result = satsToFiatRaw(85000, 87432);
    expect(result).toBeCloseTo((85000 / SAT) * 87432, 5);
  });
});

// ── satsToFiat ───────────────────────────────────────────────────────────────

describe("satsToFiat", () => {
  it("returns a formatted string with comma", () => {
    const result = satsToFiat(100_000_000, 50000);
    expect(result).toContain(",");
  });

  it("uses fallback price when none provided", () => {
    const result = satsToFiat(100_000_000);
    // Should use BTC_PRICE_FALLBACK
    expect(result).toBeTruthy();
  });
});

// ── relTime ──────────────────────────────────────────────────────────────────

describe("relTime", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("just now (< 1 minute)", () => {
    vi.setSystemTime(new Date("2026-03-24T12:00:00Z"));
    expect(relTime(Date.now() - 30_000)).toBe("just now");
  });

  it("minutes ago", () => {
    vi.setSystemTime(new Date("2026-03-24T12:00:00Z"));
    expect(relTime(Date.now() - 5 * 60_000)).toBe("5m ago");
  });

  it("hours ago", () => {
    vi.setSystemTime(new Date("2026-03-24T12:00:00Z"));
    expect(relTime(Date.now() - 3 * 3600_000)).toBe("3h ago");
  });

  it("days ago", () => {
    vi.setSystemTime(new Date("2026-03-24T12:00:00Z"));
    expect(relTime(Date.now() - 2 * 86400_000)).toBe("2d ago");
  });
});

// ── formatDate ───────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("formats as DD Mon YYYY", () => {
    expect(formatDate(new Date(2026, 2, 13))).toBe("13 Mar 2026");
  });

  it("pads single-digit day", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("05 Jan 2026");
  });
});

// ── formatTradeId ────────────────────────────────────────────────────────────

describe("formatTradeId", () => {
  it("contract: decimal pair → hex with PC prefix", () => {
    // 1361 = 0x551, 1360 = 0x550
    expect(formatTradeId("1361-1360", "contract")).toBe("PC\u2011551\u2011550");
  });

  it("offer: single decimal → hex with P prefix", () => {
    // 325 = 0x145
    expect(formatTradeId("325", "offer")).toBe("P\u2011145");
  });

  it("defaults to contract kind", () => {
    expect(formatTradeId("1361-1360")).toBe("PC\u2011551\u2011550");
  });
});
