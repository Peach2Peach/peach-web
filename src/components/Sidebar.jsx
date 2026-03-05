// ─── TOPBAR PEACH ID (3 states: logged out / mock / regtest) ─────────────────
export function getTopbarPeachId() {
  const auth = window.__PEACH_AUTH__;
  if (auth?.token) {
    const pub = auth.peachId || auth.profile?.publicKey || "";
    return "Regtest: PEACH" + pub.slice(0, 8).toUpperCase();
  }
  return "MOCK: PEACH08476D23";
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
export const PeachIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 352 353" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect y="0.38" width="352" height="352" rx="58.13" fill="#FFF9F6"/>
    <path d="M151.8 45.5c11.2-1.2 21.1 5.35 24.2 16.02.54 1.88.82 3.89.88 5.86.13 4.2.05 8.41.05 12.62 0 .39-.33.69-.72.7-3.07.11-6.08-.02-9.02-1-9.21-3.03-15.33-11.47-15.42-21.35-.04-4-.01-8.01 0-12.01" fill="#05A85A"/>
    <path d="M205.3 64.23c.99 8.75-5.26 16.21-13.69 16.46-4.77.14-9.15-3.93-7.14-8.26.95-2.06 2.42-3.88 4.47-5.44 2.3-1.76 4.93-2.69 7.82-2.74 2.83-.04 5.66 0 8.54 0" fill="#05A85A"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M276 155.69c0 49.73-43.64 96.87-97.47 96.87-19.52 0-37.71-6.2-52.95-16.48v49.48c0 12.29-9.96 22.26-22.26 22.26s-22.26-9.97-22.26-22.26V157.39h.02c-.01-.57-.02-1.13-.02-1.7 0-43.02 32.67-72.02 76.33-68.64 14.01 1.09 28.26 1.09 42.27 0 43.67-3.39 76.34 25.62 76.34 68.64zM125.61 163.8v-.39c.1-24.1 19.36-39.92 44.44-36.17 5.13.77 10.37.77 15.49 0 25.15-3.77 44.44 12.15 44.44 36.35 0 26.64-23.36 51.89-52.19 51.89-28.75 0-52.07-25.13-52.18-51.68z" fill="url(#pg_sidebar)"/>
    <defs>
      <radialGradient id="pg_sidebar" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(276 88) rotate(159) scale(220 130)">
        <stop stopColor="#FFA24C"/>
        <stop offset=".5" stopColor="#FF7A50"/>
        <stop offset="1" stopColor="#FF4D42"/>
      </radialGradient>
    </defs>
  </svg>
);

// ─── NAV ICONS (private — only used inside SideNav) ───────────────────────────
const IconMarket     = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,14 7,9 11,12 18,5"/><polyline points="13,5 18,5 18,10"/></svg>;
const IconTrades     = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 7h10M13 4l3 3-3 3"/><path d="M15 13H5M7 10l-3 3 3 3"/></svg>;
const IconCreate     = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6.5" x2="10" y2="13.5"/><line x1="6.5" y1="10" x2="13.5" y2="10"/></svg>;
const IconSettings   = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>;
const IconCreditCard = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="18" height="13" rx="2"/><line x1="1" y1="9" x2="19" y2="9"/><line x1="5" y1="14" x2="8" y2="14"/></svg>;
const IconChevLeft   = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,2 4,7 9,12"/></svg>;
const IconChevRight  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="5,2 10,7 5,12"/></svg>;
export const IconBurger = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="4.5" x2="16" y2="4.5"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="13.5" x2="16" y2="13.5"/></svg>;

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

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
export function SideNav({ active, collapsed, onToggle, mobileOpen, onClose, onNavigate, mobilePriceSlot }) {
  return (
    <>
      <div className={`sidenav-backdrop${mobileOpen ? " open" : ""}`} onClick={onClose}/>
      <nav className={`sidenav${collapsed ? " sidenav-collapsed" : ""}${mobileOpen ? " sidenav-mobile-open" : ""}`}>
        <button className="sidenav-toggle" onClick={onToggle} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <IconChevRight/> : <IconChevLeft/>}
        </button>
        {NAV_ITEMS.map(({ id, label, icon }) => (
          <button key={id} className={`sidenav-item${active === id ? " sidenav-active" : ""}`}
            onClick={() => { if (onNavigate && NAV_ROUTES[id]) onNavigate(NAV_ROUTES[id]); }}>
            <span className="sidenav-icon">{icon()}</span>
            <span className="sidenav-label">{label}</span>
          </button>
        ))}
        {mobilePriceSlot && (
          <div className="sidenav-price-slot">{mobilePriceSlot}</div>
        )}
      </nav>
    </>
  );
}
