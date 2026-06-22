import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IcoBtc } from "./BitcoinAmount.jsx";
import { useUnread } from "../hooks/useUnread.js";
import { useUrgentCount } from "../hooks/useUrgentCount.js";
import { useSessionTimer } from "../hooks/useSessionTimer.js";
import { useNotifications } from "../hooks/useNotifications.js";
import { useServerNotifications } from "../hooks/useServerNotifications.js";
import { useTheme } from "../hooks/useTheme.js";
import NotificationPanel from "./NotificationPanel.jsx";
import ServerNotificationPanel from "./ServerNotificationPanel.jsx";
import { getNotifTarget } from "../data/notificationConfig.js";
import Avatar from "./Avatar.jsx";
import peachLogo from "../assets/PEACH WEB-LOGO.svg";

// ─── PEACH ID FORMATTING ─────────────────────────────────────────────────────
export function formatPeachId(rawId) {
  if (!rawId) return "PEACH00000000";
  return "PEACH" + rawId.slice(0, 8).toUpperCase();
}

// ─── TOPBAR PEACH ID ─────────────────────────────────────────────────────────
export function getTopbarPeachId() {
  const auth = window.__PEACH_AUTH__;
  if (auth?.token) {
    const pub = auth.peachId || auth.profile?.publicKey || "";
    return formatPeachId(pub);
  }
  return "";
}

// ─── PEACH ICON ─────────────────────────────────────────────────────────────────────
export const PeachIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 352 353" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect y="0.38" width="352" height="352" rx="58.13" fill="var(--bg)"/>
    <path d="M151.8 45.5c11.2-1.2 21.1 5.35 24.2 16.02.54 1.88.82 3.89.88 5.86.13 4.2.05 8.41.05 12.62 0 .39-.33.69-.72.7-3.07.11-6.08-.02-9.02-1-9.21-3.03-15.33-11.47-15.42-21.35-.04-4-.01-8.01 0-12.01" fill="var(--success)"/>
    <path d="M205.3 64.23c.99 8.75-5.26 16.21-13.69 16.46-4.77.14-9.15-3.93-7.14-8.26.95-2.06 2.42-3.88 4.47-5.44 2.3-1.76 4.93-2.69 7.82-2.74 2.83-.04 5.66 0 8.54 0" fill="var(--success)"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M276 155.69c0 49.73-43.64 96.87-97.47 96.87-19.52 0-37.71-6.2-52.95-16.48v49.48c0 12.29-9.96 22.26-22.26 22.26s-22.26-9.97-22.26-22.26V157.39h.02c-.01-.57-.02-1.13-.02-1.7 0-43.02 32.67-72.02 76.33-68.64 14.01 1.09 28.26 1.09 42.27 0 43.67-3.39 76.34 25.62 76.34 68.64zM125.61 163.8v-.39c.1-24.1 19.36-39.92 44.44-36.17 5.13.77 10.37.77 15.49 0 25.15-3.77 44.44 12.15 44.44 36.35 0 26.64-23.36 51.89-52.19 51.89-28.75 0-52.07-25.13-52.18-51.68z" fill="url(#pg_navbar)"/>
    <defs>
      <radialGradient id="pg_navbar" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(276 88) rotate(159) scale(220 130)">
        <stop stopColor="#FFA24C"/>
        <stop offset=".5" stopColor="#FF7A50"/>
        <stop offset="1" stopColor="#FF4D42"/>
      </radialGradient>
    </defs>
  </svg>
);

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IconMarket     = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,14 7,9 11,12 18,5"/><polyline points="13,5 18,5 18,10"/></svg>;
const IconTrades     = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 7h10M13 4l3 3-3 3"/><path d="M15 13H5M7 10l-3 3 3 3"/></svg>;
const IconCreate     = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6.5" x2="10" y2="13.5"/><line x1="6.5" y1="10" x2="13.5" y2="10"/></svg>;
const IconSettings   = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>;
const IconCreditCard = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="18" height="13" rx="2"/><line x1="1" y1="9" x2="19" y2="9"/><line x1="5" y1="14" x2="8" y2="14"/></svg>;
export const IconBurger = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="4.5" x2="16" y2="4.5"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="13.5" x2="16" y2="13.5"/></svg>;
const IconBell = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 7a5 5 0 00-10 0c0 5-2 7-2 7h14s-2-2-2-7"/><path d="M8.5 17a1.5 1.5 0 003 0"/></svg>;
const IconMoon = () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 12.5A7 7 0 017.5 3.5a7 7 0 109 9z"/></svg>;
const IconSun  = () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="3.5"/><path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M3.8 3.8l1.4 1.4M14.8 14.8l1.4 1.4M3.8 16.2l1.4-1.4M14.8 5.2l1.4-1.4"/></svg>;

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { id:"home",             label:"Home",     icon:()=><PeachIcon size={20}/> },
  { id:"market",           label:"Market",   icon:()=><IconMarket/> },
  { id:"trades",           label:"Trades",   icon:()=><IconTrades/> },
  { id:"create",           label:"Create",   icon:()=><IconCreate/> },
  { id:"payment-methods",  label:"Payments", icon:()=><IconCreditCard/> },
  { id:"settings",         label:"Settings", icon:()=><IconSettings/> },
];

export const NAV_ROUTES = {
  home:              "/home",
  market:            "/market",
  trades:            "/trades",
  create:            "/offer/new",
  "payment-methods": "/payment-methods",
  settings:          "/settings",
};

// Map a pathname back to a SideNav item id. Returns null for routes that don't
// correspond to a nav item (e.g. /, /trade/:id, /user/:id).
function routeToNavId(pathname) {
  if (pathname === "/home") return "home";
  if (pathname === "/market") return "market";
  if (pathname === "/trades") return "trades";
  if (pathname.startsWith("/offer/new")) return "create";
  if (pathname === "/payment-methods") return "payment-methods";
  if (pathname === "/settings") return "settings";
  return null;
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
export function SideNav({ active: activeProp, mobileOpen, onClose, onNavigate, mobilePriceSlot }) {
  const { urgentCount } = useUrgentCount();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const active = activeProp ?? routeToNavId(location.pathname);

  // Create button → Buy/Sell options. Desktop: hover opens a popover to the right.
  // Mobile: the Create row is split — tapping the icon+label navigates to the create
  // screen, tapping the blank area / chevron toggles an inline dropdown.
  const [createOpen, setCreateOpen] = useState(false);        // desktop hover popover
  const [mobileExpanded, setMobileExpanded] = useState(false); // mobile chevron dropdown
  const [flyoutTop, setFlyoutTop] = useState(0);
  const createWrapRef = useRef(null);
  const closeTimer = useRef(null);

  // Desktop flyout is position:fixed (the sidenav clips overflow), so align it to the button top.
  const syncFlyoutTop = () => { if (createWrapRef.current) setFlyoutTop(createWrapRef.current.getBoundingClientRect().top); };
  const openCreate = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } syncFlyoutTop(); setCreateOpen(true); };
  const closeCreateSoon = () => { closeTimer.current = setTimeout(() => setCreateOpen(false), 120); };

  useEffect(() => {
    if (!createOpen) return;
    const onDocDown = (e) => { if (createWrapRef.current && !createWrapRef.current.contains(e.target)) setCreateOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setCreateOpen(false); };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDocDown); document.removeEventListener("keydown", onKey); };
  }, [createOpen]);

  // Collapse the mobile dropdown whenever the slide-in menu closes.
  useEffect(() => { if (!mobileOpen) setMobileExpanded(false); }, [mobileOpen]);

  const goCreate = (type) => {
    if (onNavigate) onNavigate(type ? `/offer/new?type=${type}` : NAV_ROUTES.create);
    setCreateOpen(false);
    setMobileExpanded(false);
    if (onClose) onClose();
  };

  return (
    <>
      <div className={`sidenav-backdrop${mobileOpen ? " open" : ""}`} onClick={onClose}/>
      <nav className={`sidenav${mobileOpen ? " sidenav-mobile-open" : ""}`}>
        {NAV_ITEMS.map(({ id, label, icon }) => {
          if (id === "create") {
            return (
              <div key={id} className="sidenav-create-wrap" ref={createWrapRef}>
                <div className="sidenav-create-row">
                  <button className={`sidenav-item sidenav-create-main${active === id ? " sidenav-active" : ""}`}
                    onMouseEnter={openCreate} onMouseLeave={closeCreateSoon}
                    onClick={() => goCreate()}>
                    <span className="sidenav-icon">{icon()}</span>
                    <span className="sidenav-label">{label}</span>
                  </button>
                  <button className="sidenav-create-toggle" aria-label="Show buy and sell options"
                    aria-expanded={mobileExpanded} onClick={() => setMobileExpanded(v => !v)}>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4"/></svg>
                  </button>
                </div>
                <div className={`sidenav-create-flyout${createOpen ? " open" : ""}${mobileExpanded ? " expanded" : ""}`} role="menu" style={{ top: flyoutTop }}
                  onMouseEnter={openCreate} onMouseLeave={closeCreateSoon}>
                  <button className="sidenav-create-option buy" role="menuitem" onClick={() => goCreate("buy")}>Buy offer</button>
                  <button className="sidenav-create-option sell" role="menuitem" onClick={() => goCreate("sell")}>Sell offer</button>
                </div>
              </div>
            );
          }
          return (
            <button key={id} className={`sidenav-item${active === id ? " sidenav-active" : ""}`}
              onClick={() => { if (onNavigate && NAV_ROUTES[id]) onNavigate(NAV_ROUTES[id]); if (onClose) onClose(); }}>
              <span className="sidenav-icon" style={{ position:"relative" }}>
                {icon()}
                {id === "trades" && urgentCount > 0 && <span className="sidenav-badge">{urgentCount > 99 ? "99+" : urgentCount}</span>}
              </span>
              <span className="sidenav-label">{label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="sidenav-theme-toggle"
          onClick={toggleTheme}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          aria-label="Toggle theme"
        >
          <span className="sidenav-icon">{theme === "light" ? <IconMoon/> : <IconSun/>}</span>
          <span className="sidenav-theme-label">{theme === "light" ? "Dark mode" : "Light mode"}</span>
        </button>
        {mobilePriceSlot && (
          <div className="sidenav-price-slot">{mobilePriceSlot}</div>
        )}
      </nav>
    </>
  );
}

// ─── CURRENCY DROPDOWN ────────────────────────────────────────────────────────
const FAVORITE_CURRENCIES = ["CHF", "EUR", "GBP", "USD"];

export function CurrencyDropdown({ value, options, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const favs = FAVORITE_CURRENCIES.filter(c => options.includes(c));
  const showDivider = favs.length > 0 && options.length > favs.length;
  const rows = showDivider ? [...favs, "__sep__", ...options] : options;
  const sepIdx = showDivider ? favs.length : -1;
  const step = (h, dir) => {
    let n = h + dir;
    if (n === sepIdx) n += dir;
    return Math.max(0, Math.min(rows.length - 1, n));
  };

  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, rows.indexOf(value));
    setHighlight(idx);
    requestAnimationFrame(() => {
      const li = listRef.current?.querySelector(`[data-idx="${idx}"]`);
      li?.scrollIntoView({ block: "nearest" });
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => step(h, +1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => step(h, -1)); }
      else if (e.key === "Enter") { e.preventDefault(); const next = rows[highlight]; if (next != null && next !== "__sep__") { onChange(next); setOpen(false); } }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open, highlight, rows, onChange]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !listRef.current) return;
    const li = listRef.current.querySelector(`[data-idx="${highlight}"]`);
    li?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  return (
    <div ref={wrapRef} className={`cur-select-wrap ${className}`.trim()}>
      <button
        type="button"
        className="topbar-cur-select"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="cur-select-label">{value}</span>
        <svg className="cur-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,1 5,5 9,1"/></svg>
      </button>
      {open && (
        <ul ref={listRef} className="cur-select-menu" role="listbox" tabIndex={-1}>
          {rows.map((c, i) => c === "__sep__" ? (
            <li key="sep" className="cur-select-divider" aria-hidden="true" />
          ) : (
            <li
              key={`${c}-${i}`}
              data-idx={i}
              role="option"
              aria-selected={c === value}
              className={i === highlight ? "is-hl" : ""}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => { onChange(c); setOpen(false); }}
            >
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
export function Topbar({
  onBurgerClick,
  isLoggedIn,
  handleLogin,
  handleLogout,
  showAvatarMenu,
  setShowAvatarMenu,
  btcPrice,
  selectedCurrency,
  availableCurrencies,
  onCurrencyChange,
  showPrice = true,
  pricesLoaded = true,
  hideLoginCta: hideLoginCtaProp,
}) {
  const { total: unreadTotal } = useUnread();
  const { notifications, unreadCount: unreadNotifs, readIds, markAllRead, markRead } = useNotifications();
  const {
    notifications: serverNotifs,
    unreadCount: serverUnread,
    readDisplayIds,
    markRead: markServerRead,
    markAllRead: markServerAllRead,
  } = useServerNotifications();
  const { theme, toggleTheme } = useTheme();
  const session = useSessionTimer();
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const hideLoginCta = hideLoginCtaProp ?? (location.pathname === "/");
  const satsPerCur = btcPrice > 0 ? Math.round(100_000_000 / btcPrice) : 0;

  const handleLogoClick = () => {
    if (location.pathname === "/home") return;
    const loggedIn = !!window.__PEACH_AUTH__;
    navigate(loggedIn ? "/home" : "/");
  };
  const logoHref = `#/${window.__PEACH_AUTH__ ? "home" : ""}`;

  // Close notification panel on outside click or Escape
  useEffect(() => {
    if (!showNotifPanel) return;
    const close = (e) => { if (!e.target.closest(".notif-panel-wrap")) setShowNotifPanel(false); };
    const esc   = (e) => { if (e.key === "Escape") setShowNotifPanel(false); };
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", esc); };
  }, [showNotifPanel]);

  const handleServerNotifNavigate = (n) => {
    markServerRead(n.id);
    setShowNotifPanel(false);
    const target = getNotifTarget(n);
    if (target?.to) navigate(target.to, target.state ? { state: target.state } : undefined);
  };

  const openNotifPanel = (e) => {
    e.stopPropagation();
    setShowNotifPanel(v => !v);
    setShowAvatarMenu(false);
  };
  const openAvatarMenu = (e) => {
    e.stopPropagation();
    setShowAvatarMenu(v => !v);
    setShowNotifPanel(false);
  };
  const handleNotifNavigate = (n) => {
    markRead(n.id);
    setShowNotifPanel(false);
    if (n.noNavigate) return;
    if (n.contractId) {
      navigate(`/trade/${n.contractId}`);
    } else if (n.offerId) {
      // Stale tradeRequest / pre-contract chat: if a contract has already been
      // created from this offer, jump to it instead of reopening the now-empty
      // matches popup.
      if (n.type === "tradeRequest" || n.type === "message") {
        const offerIdStr = String(n.offerId);
        const contracts = window.__PEACH_CONTRACTS__?.data ?? [];
        const contract = contracts.find(c => String(c.id).split("-").includes(offerIdStr));
        if (contract) {
          navigate(`/trade/${contract.id}`);
          return;
        }
      }
      const tab = (n.type === "expiry") ? "history" : "pending";
      const intent = (n.type === "tradeRequest" || n.type === "message") ? "tradeRequest" : undefined;
      navigate("/trades", { state: { openOfferId: n.offerId, tab, intent } });
    } else {
      navigate("/trades");
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="burger-btn" onClick={onBurgerClick}><IconBurger/></button>
        <a
          href={logoHref}
          className="topbar-logo-btn topbar-logo-desktop"
          style={{ backgroundImage: `url(${peachLogo})` }}
          onClick={(e) => { e.preventDefault(); handleLogoClick(); }}
          aria-label="Go to homepage"
        />
      </div>

      <div className="topbar-center">
        <a
          href={logoHref}
          className="topbar-logo-btn topbar-logo-mobile"
          style={{ backgroundImage: `url(${peachLogo})` }}
          onClick={(e) => { e.preventDefault(); handleLogoClick(); }}
          aria-label="Go to homepage"
        />
        {showPrice && (
          <div className="topbar-price">
            <IcoBtc size={18}/>
            <span className="topbar-price-main">{pricesLoaded ? btcPrice.toLocaleString("fr-FR") : "?"} {selectedCurrency}</span>
            <span className="topbar-price-sats">{pricesLoaded ? satsPerCur.toLocaleString() : "?"} sats / {selectedCurrency.toLowerCase()}</span>
            <CurrencyDropdown
              value={selectedCurrency}
              options={availableCurrencies}
              onChange={onCurrencyChange}
            />
          </div>
        )}
      </div>

      <div className="topbar-right">
        {/* Legacy "derived" notification bell — hidden while the new server-driven
            notification system is built. The useNotifications() engine still runs
            (subscribed below) so wrong-amount popups and the unread badge keep working. */}
        {false && isLoggedIn && (
          <div className="notif-panel-wrap" style={{position:"relative"}}>
            <button className="notif-bell-btn" onClick={openNotifPanel}>
              <IconBell/>
              {unreadNotifs > 0 && <span className="notif-bell-badge">{unreadNotifs > 99 ? "99+" : unreadNotifs}</span>}
            </button>
            {showNotifPanel && (
              <NotificationPanel
                notifications={notifications}
                readIds={readIds}
                onMarkAllRead={markAllRead}
                onMarkRead={markRead}
                onNavigate={handleNotifNavigate}
              />
            )}
          </div>
        )}
        {isLoggedIn && (
          <div className="notif-panel-wrap" style={{position:"relative"}}>
            <button className="notif-bell-btn" onClick={openNotifPanel}>
              <IconBell/>
              {serverUnread > 0 && <span className="notif-bell-badge">{serverUnread > 99 ? "99+" : serverUnread}</span>}
            </button>
            {showNotifPanel && (
              <ServerNotificationPanel
                notifications={serverNotifs}
                readDisplayIds={readDisplayIds}
                onNavigate={handleServerNotifNavigate}
                onMarkRead={markServerRead}
                onMarkAllRead={markServerAllRead}
              />
            )}
          </div>
        )}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          aria-label="Toggle theme"
        >
          {theme === "light" ? <IconMoon/> : <IconSun/>}
        </button>
        {isLoggedIn ? (
          <div className="avatar-menu-wrap">
            <div className="avatar-peachid" onClick={openAvatarMenu}>
              {session.show && (
                <span className={`session-timer${session.isWarning ? " session-timer-warn" : ""}`}>
                  {session.display}
                </span>
              )}
              <span className="peach-id">{getTopbarPeachId()}</span>
              <div className="avatar-ring-wrap">
                {session.show && (
                  <svg className="avatar-ring" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
                    <circle className="avatar-ring-track" cx="22" cy="22" r="20" />
                    <circle
                      className={`avatar-ring-progress avatar-ring-${session.progress < 0.25 ? "danger" : session.progress < 0.5 ? "warn" : "ok"}`}
                      cx="22" cy="22" r="20"
                      strokeDasharray={2 * Math.PI * 20}
                      strokeDashoffset={2 * Math.PI * 20 * (1 - Math.max(0, Math.min(1, session.progress)))}
                    />
                  </svg>
                )}
                <Avatar peachId={window.__PEACH_AUTH__?.peachId} size={34} badge={unreadTotal} />
              </div>
            </div>
            {showAvatarMenu && (
              <div className="avatar-menu">
                <div className="avatar-menu-peachid">{getTopbarPeachId()}</div>
                <button
                  className="avatar-menu-item"
                  onClick={() => { setShowAvatarMenu(false); navigate("/settings", { state: { openProfile: true } }); }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5.5" r="2.6"/><path d="M2.8 13.4c.7-2.6 2.8-4 5.2-4s4.5 1.4 5.2 4"/></svg>
                  Profile
                </button>
                <button
                  className="avatar-menu-item"
                  onClick={() => { setShowAvatarMenu(false); navigate("/payment-methods"); }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/><path d="M1.5 6.5h13"/><path d="M3.5 10.5h2"/></svg>
                  Payments
                </button>
                <button
                  className="avatar-menu-item"
                  onClick={() => { setShowAvatarMenu(false); navigate("/settings"); }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2.1"/><path d="M13 8a5 5 0 0 0-.08-.9l1.2-.93-1-1.73-1.4.5a5 5 0 0 0-1.55-.9L9.9 2.5h-2l-.27 1.55a5 5 0 0 0-1.55.9l-1.4-.5-1 1.73 1.2.93A5 5 0 0 0 5 8a5 5 0 0 0 .08.9l-1.2.93 1 1.73 1.4-.5a5 5 0 0 0 1.55.9L8.1 13.5h2l.27-1.55a5 5 0 0 0 1.55-.9l1.4.5 1-1.73-1.2-.93A5 5 0 0 0 13 8z"/></svg>
                  Settings
                </button>
                <div className="avatar-menu-divider" />
                <button className="avatar-menu-item danger" onClick={handleLogout}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2H3.5A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14H6"/><path d="M10.5 11.5L14 8l-3.5-3.5"/><path d="M14 8H6"/></svg>
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : hideLoginCta ? (
          <div style={{ display: "flex", alignItems: "center" }}>
            <Avatar size={34} />
          </div>
        ) : (
          <div className="avatar-login-btn" onClick={handleLogin}>
            <Avatar size={34} />
            <span className="avatar-login-label">Log in</span>
          </div>
        )}
      </div>
    </header>
  );
}
