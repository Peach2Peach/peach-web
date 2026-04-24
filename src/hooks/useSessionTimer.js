import { useState, useEffect } from "react";
import { dispatchSessionExpired } from "../utils/sessionGuard.js";

const SESSION_TTL_MS = 120 * 60 * 1000; // 120 minutes
const WARNING_MS = 5 * 60 * 1000;      // 5 minutes

export function useSessionTimer() {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const auth = window.__PEACH_AUTH__;
    if (!auth?.loginTime) {
      setRemaining(null);
      return;
    }

    let id;
    function tick() {
      const left = Math.max(0, SESSION_TTL_MS - (Date.now() - auth.loginTime));
      setRemaining(left);
      if (left <= 0) {
        dispatchSessionExpired();
        clearInterval(id);
      }
    }

    tick();
    id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [window.__PEACH_AUTH__?.loginTime]);

  if (remaining === null) return { show: false };

  const totalSecs = Math.ceil(remaining / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const display = hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;

  return {
    show: true,
    display,
    progress: remaining / SESSION_TTL_MS,
    isWarning: remaining <= WARNING_MS && remaining > 0,
    isExpired: remaining <= 0,
  };
}
