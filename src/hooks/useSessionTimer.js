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

    function tick() {
      const left = Math.max(0, SESSION_TTL_MS - (Date.now() - auth.loginTime));
      setRemaining(left);
      if (left <= 0) {
        dispatchSessionExpired();
        clearInterval(id);
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [window.__PEACH_AUTH__?.loginTime]);

  if (remaining === null) return { show: false };

  const totalSecs = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSecs / 60);
  const seconds = totalSecs % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return {
    show: true,
    display,
    isWarning: remaining <= WARNING_MS && remaining > 0,
    isExpired: remaining <= 0,
  };
}
