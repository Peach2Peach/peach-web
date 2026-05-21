// useMeetupEvents — Bitcoin meetup events for the "Cash & Meetups" PM flow.
//
// Fetches `GET /events` (public — works logged-out) once and caches it for the
// page session. Each event is the source of truth for a cash payment method:
// the method id is `cash.${event.id}`. We attach an absolute `logoUrl` so the
// Add-PM modal can render the real event logo without knowing the API origin.

import { useState, useEffect } from "react";
import { useApi, getCached, setCache } from "./useApi.js";
import { API_V1 } from "../utils/network.js";

const CACHE_KEY = "meetupEvents";

export function useMeetupEvents() {
  const { auth, get } = useApi();
  // Logo paths come back as "/v1/events/logo/x.png"; strip the trailing /v1 from
  // the API base so we don't double it when building the absolute URL.
  const apiOrigin = (auth?.baseUrl ?? API_V1).replace(/\/v1$/, "");

  const [events, setEvents] = useState(() => getCached(CACHE_KEY)?.data ?? []);
  const [loading, setLoading] = useState(() => !getCached(CACHE_KEY));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (getCached(CACHE_KEY)) return; // already have it for this session
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await get("/events");
        if (!res.ok) throw new Error(`events ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json) ? json : json?.events ?? [];
        const withLogos = list.map((e) => ({
          ...e,
          logoUrl: e.logo ? `${apiOrigin}${e.logo}` : null,
        }));
        if (cancelled) return;
        setCache(CACHE_KEY, withLogos);
        setEvents(withLogos);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError(true);
        setEvents([]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { events, loading, error };
}
