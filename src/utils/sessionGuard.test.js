import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithSessionCheck, resetSessionExpiredFlag } from "./sessionGuard.js";

// Deferred-resolution fetch mock: lets us assert that a second identical GET
// joins the first while it is still in flight.
function deferredFetch(status = 200, body = "{}") {
  let resolve;
  const gate = new Promise((r) => { resolve = r; });
  const fn = vi.fn(() => gate.then(() => new Response(body, { status })));
  return { fn, release: () => resolve() };
}

describe("fetchWithSessionCheck in-flight GET de-duplication", () => {
  beforeEach(() => {
    resetSessionExpiredFlag();
    globalThis.window = globalThis.window ?? {};
    window.__PEACH_AUTH__ = { token: "t", baseUrl: "http://x/v1" };
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("collapses two concurrent identical GETs into one network call", async () => {
    const { fn, release } = deferredFetch(200, JSON.stringify({ ok: 1 }));
    vi.stubGlobal("fetch", fn);

    const p1 = fetchWithSessionCheck("http://x/v1/market/prices");
    const p2 = fetchWithSessionCheck("http://x/v1/market/prices");
    release();
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(fn).toHaveBeenCalledTimes(1);
    // Each caller gets an independent, readable body.
    expect(await r1.json()).toEqual({ ok: 1 });
    expect(await r2.json()).toEqual({ ok: 1 });
  });

  it("does NOT de-duplicate POST (mutation) requests", async () => {
    const { fn, release } = deferredFetch(200, "{}");
    vi.stubGlobal("fetch", fn);

    const p1 = fetchWithSessionCheck("http://x/v1/offer/search", { method: "POST" });
    const p2 = fetchWithSessionCheck("http://x/v1/offer/search", { method: "POST" });
    release();
    await Promise.all([p1, p2]);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("refetches once the in-flight request has resolved (no stale caching)", async () => {
    const d1 = deferredFetch(200, "{}");
    vi.stubGlobal("fetch", d1.fn);
    const p1 = fetchWithSessionCheck("http://x/v1/market/prices");
    d1.release();
    await p1;

    const p2 = fetchWithSessionCheck("http://x/v1/market/prices");
    d1.release();
    await p2;

    expect(d1.fn).toHaveBeenCalledTimes(2);
  });
});
