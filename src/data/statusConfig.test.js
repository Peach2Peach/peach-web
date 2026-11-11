import { describe, it, expect } from "vitest";
import {
  STATUS_CONFIG,
  FINISHED_STATUSES,
  PENDING_STATUSES,
  LIFECYCLE,
  deriveDisplayStatus,
} from "./statusConfig.js";

describe("STATUS_CONFIG", () => {
  const keys = Object.keys(STATUS_CONFIG);

  it("has 31 status entries", () => {
    expect(keys.length).toBe(31);
  });

  it("every entry has required fields", () => {
    for (const key of keys) {
      const entry = STATUS_CONFIG[key];
      expect(entry.label, `${key}.label`).toBeTruthy();
      expect(entry.bg, `${key}.bg`).toMatch(/^(#|var\()/);
      expect(entry.color, `${key}.color`).toMatch(/^(#|var\()/);
      expect(typeof entry.action, `${key}.action`).toBe("boolean");
    }
  });
});

describe("FINISHED_STATUSES", () => {
  it("all exist in STATUS_CONFIG", () => {
    for (const status of FINISHED_STATUSES) {
      expect(STATUS_CONFIG, `missing: ${status}`).toHaveProperty(status);
    }
  });
});

describe("PENDING_STATUSES", () => {
  it("all exist in STATUS_CONFIG", () => {
    for (const status of PENDING_STATUSES) {
      expect(STATUS_CONFIG, `missing: ${status}`).toHaveProperty(status);
    }
  });
});

describe("FINISHED vs PENDING", () => {
  it("no overlap between sets", () => {
    for (const status of FINISHED_STATUSES) {
      expect(PENDING_STATUSES.has(status), `overlap: ${status}`).toBe(false);
    }
  });
});

describe("LIFECYCLE", () => {
  it("has 4 steps", () => {
    expect(LIFECYCLE.length).toBe(4);
  });

  it("each step has id, label, desc", () => {
    for (const step of LIFECYCLE) {
      expect(step.id).toBeTruthy();
      expect(step.label).toBeTruthy();
      expect(step.desc).toBeTruthy();
    }
  });

  it("all lifecycle ids exist in STATUS_CONFIG", () => {
    for (const step of LIFECYCLE) {
      expect(STATUS_CONFIG, `missing lifecycle id: ${step.id}`).toHaveProperty(step.id);
    }
  });
});

describe("deriveDisplayStatus — buyer escrow (escrowVersion 3)", () => {
  const base = { direction: "sell", escrowVersion: 3, canceledBy: "buyer" };

  it("seller waits for the buyer when the buyer cancelled", () => {
    expect(deriveDisplayStatus({ ...base, tradeStatus: "refundTxSignatureRequired" })).toBe("waitingForBuyerRefund");
    expect(deriveDisplayStatus({ ...base, tradeStatus: "refundOrReviveRequired" })).toBe("waitingForBuyerRefund");
    expect(deriveDisplayStatus({ ...base, tradeStatus: "tradeCanceled", tradeStatusNew: "refundOrReviveRequired" })).toBe("waitingForBuyerRefund");
  });

  it("keeps the server status otherwise", () => {
    expect(deriveDisplayStatus({ ...base, escrowVersion: 2, tradeStatus: "refundTxSignatureRequired" })).toBe("refundTxSignatureRequired");
    expect(deriveDisplayStatus({ ...base, canceledBy: "seller", tradeStatus: "refundTxSignatureRequired" })).toBe("refundTxSignatureRequired");
    expect(deriveDisplayStatus({ ...base, direction: "buy", tradeStatus: "refundTxSignatureRequired" })).toBe("refundTxSignatureRequired");
    expect(deriveDisplayStatus({ ...base, tradeStatus: "tradeCanceled" })).toBe("tradeCanceled");
  });
});
