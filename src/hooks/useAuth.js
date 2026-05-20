import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearCache } from "./useApi.js";
import { invalidateUserPMs } from "./useUserPMs.js";
import { clearWalletCache } from "./useWallet.js";
import { resetSessionExpiredFlag } from "../utils/sessionGuard.js";

// Module-level subscribers so every useAuth() consumer re-renders when the
// blocked-users list changes (after a block/unblock action anywhere in the app).
const blockedUsersSubscribers = new Set();

function notifyBlockedUsers(value) {
  for (const fn of blockedUsersSubscribers) fn(value);
}

/**
 * Fetch GET /v069/selfUser/blockedUsers and stash the result on
 * window.__PEACH_AUTH__.blockedUsers. Persists into sessionStorage so the
 * count survives a page refresh, and notifies all useAuth() subscribers so
 * surfaces showing the count re-render.
 */
export async function refreshBlockedUsers() {
  const auth = window.__PEACH_AUTH__;
  if (!auth?.token || !auth?.baseUrl) return;
  let next = auth.blockedUsers ?? { count: 0, list: [] };
  try {
    const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
    const res = await fetch(`${v069Base}/selfUser/blockedUsers`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data?.users) ? data.users : [];
      next = { count: list.length, list };
    }
  } catch {
    // Silent fallback: keep prior value.
  }
  auth.blockedUsers = next;
  try { sessionStorage.setItem("peach_auth", JSON.stringify(auth)); } catch {}
  notifyBlockedUsers(next);
}

export function useAuth() {
  const auth = window.__PEACH_AUTH__ ?? null;
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (window.__PEACH_AUTH__) return true;
    try { return localStorage.getItem("peach_logged_in") !== "false"; } catch { return true; }
  });

  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  const [blockedUsers, setBlockedUsers] = useState(
    () => window.__PEACH_AUTH__?.blockedUsers ?? { count: 0, list: [] }
  );

  useEffect(() => {
    blockedUsersSubscribers.add(setBlockedUsers);
    return () => { blockedUsersSubscribers.delete(setBlockedUsers); };
  }, []);

  const handleLogin = () => {
    navigate("/");
  };

  const handleLogout = () => {
    clearCache();
    invalidateUserPMs();
    clearWalletCache();
    resetSessionExpiredFlag();
    window.__PEACH_AUTH__ = null;
    setIsLoggedIn(false);
    setShowAvatarMenu(false);
    notifyBlockedUsers({ count: 0, list: [] });
    try { localStorage.setItem("peach_logged_in", "false"); } catch {}
    try { sessionStorage.removeItem("peach_auth"); } catch {}
  };

  return {
    auth, isLoggedIn, setIsLoggedIn, handleLogin, handleLogout,
    showAvatarMenu, setShowAvatarMenu,
    blockedUsers, refreshBlockedUsers,
  };
}
