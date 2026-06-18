import { createContext, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Topbar, SideNav, CurrencyDropdown } from "./Navbars.jsx";
import { IcoBtc } from "./BitcoinAmount.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useApi, getCached, setCache } from "../hooks/useApi.js";

const CurrencyContext = createContext(null);

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <AppLayout>");
  return ctx;
}

export default function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [allPrices, setAllPrices] = useState(() => getCached("market-prices")?.data ?? null);
  const [availableCurrencies, setAvailableCurrencies] = useState(() => {
    const cached = getCached("market-prices")?.data;
    return cached ? Object.keys(cached).sort() : ["EUR", "CHF", "GBP"];
  });
  const [selectedCurrency, setSelectedCurrency] = useState("EUR");
  const pricesLoaded = allPrices !== null;
  // Null when prices haven't loaded — consumers render a placeholder rather
  // than a guessed BTC price (no stale/wrong fiat figures when logged out).
  const rawPrice = allPrices?.[selectedCurrency];
  const btcPrice = rawPrice != null ? Math.round(rawPrice) : null;
  const satsPerCur = btcPrice > 0 ? Math.round(100_000_000 / btcPrice) : 0;

  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const { isLoggedIn, setIsLoggedIn, handleLogin, handleLogout, showAvatarMenu, setShowAvatarMenu } = useAuth();
  const { get } = useApi();

  // After QR auth completes, peach-auth navigates to /home. Resync isLoggedIn
  // from window.__PEACH_AUTH__ on every route change so the topbar reflects the
  // post-login state without depending on screen remount.
  useEffect(() => {
    setIsLoggedIn(!!window.__PEACH_AUTH__);
  }, [location.pathname, setIsLoggedIn]);

  // Single /market/prices fetch for the whole app. Cache write keeps
  // useNotifications.js (which reads getCached("market-prices")) working.
  useEffect(() => {
    let cancelled = false;
    const retryTimers = [];

    async function fetchPrices() {
      try {
        const res = await get("/market/prices");
        const data = await res.json();
        if (data && typeof data === "object") {
          if (!cancelled) {
            setAllPrices(data);
            setAvailableCurrencies(Object.keys(data).sort());
            setCache("market-prices", data);
          }
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }

    async function initialFetchWithRetry() {
      if (await fetchPrices()) return;
      for (const delay of [500, 1000, 2000, 4000]) {
        if (cancelled) return;
        await new Promise((r) => retryTimers.push(setTimeout(r, delay)));
        if (cancelled) return;
        if (await fetchPrices()) return;
      }
    }

    initialFetchWithRetry();
    const iv = setInterval(fetchPrices, 30000);

    return () => {
      cancelled = true;
      retryTimers.forEach(clearTimeout);
      clearInterval(iv);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close avatar menu on outside click (was duplicated across every screen).
  useEffect(() => {
    if (!showAvatarMenu) return;
    const close = (e) => {
      if (!e.target.closest(".avatar-menu-wrap")) setShowAvatarMenu(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showAvatarMenu, setShowAvatarMenu]);

  const ctxValue = {
    allPrices,
    selectedCurrency,
    setSelectedCurrency,
    btcPrice,
    pricesLoaded,
    availableCurrencies,
    satsPerCur,
  };

  return (
    <CurrencyContext.Provider value={ctxValue}>
      <div className="app">
        <Topbar
          onBurgerClick={() => setSidebarMobileOpen((o) => !o)}
          isLoggedIn={isLoggedIn}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
          showAvatarMenu={showAvatarMenu}
          setShowAvatarMenu={setShowAvatarMenu}
          btcPrice={btcPrice}
          pricesLoaded={pricesLoaded}
          selectedCurrency={selectedCurrency}
          availableCurrencies={availableCurrencies}
          onCurrencyChange={setSelectedCurrency}
        />
        <SideNav
          mobileOpen={sidebarMobileOpen}
          onClose={() => setSidebarMobileOpen(false)}
          onNavigate={navigate}
          mobilePriceSlot={
            <div className="mobile-price-pill">
              <IcoBtc size={16} />
              <div className="mobile-price-text">
                <span className="mobile-price-main">
                  {pricesLoaded ? btcPrice.toLocaleString("fr-FR") : "?"} {selectedCurrency}
                </span>
                <span className="mobile-price-sats">
                  {pricesLoaded ? satsPerCur.toLocaleString() : "?"} sats / {selectedCurrency.toLowerCase()}
                </span>
              </div>
              <CurrencyDropdown
                className="mobile-cur-select"
                value={selectedCurrency}
                options={availableCurrencies}
                onChange={setSelectedCurrency}
              />
            </div>
          }
        />
        {children}
      </div>
    </CurrencyContext.Provider>
  );
}
