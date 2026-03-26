import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SideNav, Topbar, formatPeachId } from "../components/Navbars.jsx";
import { SatsAmount, IcoBtc } from "../components/BitcoinAmount.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useApi, getCached, setCache } from "../hooks/useApi.js";
import { STATUS_CONFIG } from "../data/statusConfig.js";
import { BTC_PRICE_FALLBACK as BTC_PRICE, fmt as formatSats, fmtPct } from "../utils/format.js";

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  /* ── WELCOME HEADER ── */
  .welcome-row{display:flex;align-items:center;gap:14px}
  .welcome-avatar{width:44px;height:44px;border-radius:50%;background:var(--grad);
    display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:800;
    color:white;flex-shrink:0}
  .welcome-text h1{font-size:1.35rem;font-weight:800;color:var(--black);line-height:1.2}
  .welcome-text p{font-size:.82rem;font-weight:500;color:var(--black-65);margin-top:2px}
  .welcome-actions{margin-left:auto;display:flex;gap:10px}

  /* ── LAYOUT ── */
  .page-wrap{display:flex;flex-direction:column;flex:1}
  .content{padding:28px 28px 60px;display:flex;flex-direction:column;gap:28px;max-width:1200px;margin:0 auto;width:100%}

  /* ── GRID ── */
  .dashboard-grid{display:grid;grid-template-columns:auto auto;gap:18px;justify-content:start}
  .span-2{flex:0 0 auto}
  .span-4{flex:0 0 auto}

  /* ── CARD ── */
  .card{background:var(--surface);border-radius:16px;border:1px solid var(--black-10);
    padding:20px;display:inline-flex;flex-direction:column;gap:14px;width:fit-content;max-width:100%}
  .card-header{display:flex;align-items:center;justify-content:space-between}
  .card-title{font-size:1.15rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--black-65)}
  .card-link{font-size:.75rem;font-weight:700;color:var(--primary);cursor:pointer;text-decoration:none}
  .card-link:hover{color:var(--primary-dark)}

  /* ── STAT CARDS ── */
  .stat-big{font-size:2rem;font-weight:800;color:var(--black);line-height:1;letter-spacing:-.02em}
  .stat-sub{font-size:.78rem;font-weight:500;color:var(--black-65);margin-top:4px}
  .stat-change{display:inline-flex;align-items:center;gap:3px;font-size:.72rem;font-weight:700;
    padding:2px 8px;border-radius:999px;margin-top:8px}
  .stat-change.pos{background:var(--success-bg);color:var(--success)}
  .stat-change.neg{background:var(--error-bg);color:var(--error)}
  .stat-change.neu{background:var(--black-5);color:var(--black-65)}
  .stat-icon{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;
    justify-content:center;font-size:1.1rem;flex-shrink:0}

  /* ── OFFER BOOK ── */
  .offerbook-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .ob-col-title{display:flex;align-items:center;gap:6px;font-size:.78rem;font-weight:800;
    padding-bottom:8px;border-bottom:2px solid;margin-bottom:2px}
  .ob-buy-title{color:var(--success);border-color:var(--success)}
  .ob-sell-title{color:var(--error);border-color:var(--error)}
  .ob-dot-buy{width:8px;height:8px;border-radius:50%;background:var(--success);flex-shrink:0}
  .ob-dot-sell{width:8px;height:8px;border-radius:50%;background:var(--error);flex-shrink:0}
  .ob-count{margin-left:auto;font-size:.67rem;font-weight:600;color:var(--black-65)}

  .ob-row{display:flex;align-items:center;gap:10px;padding:8px 0;
    border-bottom:1px solid var(--black-5);cursor:pointer;transition:background .1s;
    border-radius:6px;padding:7px 8px;margin:0 -8px}
  .ob-row:hover{background:var(--black-5)}
  .ob-row:last-child{border-bottom:none}
  .ob-avatar{width:28px;height:28px;border-radius:50%;background:var(--grad);
    display:flex;align-items:center;justify-content:center;font-size:.58rem;
    font-weight:800;color:white;flex-shrink:0;position:relative}
  .ob-avatar .online-dot{position:absolute;bottom:0;right:0;width:7px;height:7px;
    border-radius:50%;background:var(--success);border:1.5px solid var(--surface)}
  .ob-info{flex:1;min-width:0}
  .ob-amount{font-size:.85rem;font-weight:800;color:var(--black);line-height:1.2}
  .ob-fiat{font-size:.68rem;font-weight:500;color:var(--black-65)}
  .ob-methods{display:flex;gap:3px;flex-wrap:wrap;margin-top:2px}
  .ob-method{font-size:.6rem;font-weight:600;padding:1px 5px;border-radius:999px;
    background:var(--black-5);color:var(--black-65);border:1px solid var(--black-10)}
  .ob-prem{font-size:.82rem;font-weight:800;white-space:nowrap}
  .ob-prem.pos{color:var(--error)}
  .ob-prem.neg{color:var(--success)}
  .ob-prem-sell.pos{color:var(--success)}
  .ob-prem-sell.neg{color:var(--error)}
  .ob-prem-sell{font-size:.82rem;font-weight:800;white-space:nowrap}
  .ob-filter-sel{
    appearance:none;border:1.5px solid var(--black-10);border-radius:8px;
    padding:4px 24px 4px 9px;font-family:var(--font);font-size:.72rem;font-weight:600;
    color:var(--black);background:var(--surface);cursor:pointer;outline:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237D675E'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 7px center;
    transition:border-color .14s
  }
  .ob-filter-sel:focus{border-color:var(--primary)}
  .ob-auto{display:inline-flex;align-items:center;gap:2px;font-size:.58rem;font-weight:800;
    padding:1px 5px;border-radius:999px;background:var(--grad);color:white;white-space:nowrap}

  /* ── PAYMENT METHODS BAR ── */
  .methods-list{display:flex;flex-direction:column;gap:8px}
  .method-row{display:flex;align-items:center;gap:10px}
  .method-name{font-size:.82rem;font-weight:700;color:var(--black);min-width:68px}
  .method-bar-wrap{flex:1;height:8px;background:var(--black-5);border-radius:999px;overflow:hidden}
  .method-bar{height:100%;border-radius:999px;background:var(--grad)}
  .method-pct{font-size:.72rem;font-weight:600;color:var(--black-65);min-width:30px;text-align:right}
  .method-count{font-size:.68rem;font-weight:500;color:var(--black-25);min-width:40px;text-align:right}

  /* ── PROFILE CARD ── */
  .profile-top{display:flex;align-items:center;gap:14px}
  .profile-avatar{width:52px;height:52px;border-radius:50%;background:var(--grad);
    display:flex;align-items:center;justify-content:center;font-size:.95rem;
    font-weight:800;color:white;flex-shrink:0}
  .profile-name{font-size:1rem;font-weight:800;color:var(--black);letter-spacing:.04em}
  .profile-since{font-size:.72rem;font-weight:500;color:var(--black-65);margin-top:2px}
  .profile-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .profile-stat{background:var(--black-5);border-radius:10px;padding:10px;text-align:center}
  .profile-stat-val{font-size:1.2rem;font-weight:800;color:var(--black);line-height:1}
  .profile-stat-lbl{font-size:.62rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--black-65);margin-top:3px}
  .profile-row{display:flex;flex-direction:column;gap:5px}
  .profile-row-label{font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--black-25)}
  .profile-badges{display:flex;gap:5px;flex-wrap:wrap}
  .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;
    font-size:.65rem;font-weight:700;white-space:nowrap}
  .badge-super{background:linear-gradient(90deg,#FF4D42,#FFA24C);color:white}
  .badge-fast{background:var(--primary-mild);color:var(--primary-dark)}
  .profile-methods{display:flex;gap:5px;flex-wrap:wrap}
  .pref-chip{padding:3px 9px;border-radius:999px;font-size:.72rem;font-weight:600;
    background:var(--black-5);color:var(--black-75);border:1px solid var(--black-10)}
  .disputes-none{display:flex;align-items:center;gap:5px;font-size:.78rem;font-weight:600;color:var(--success)}
  .disputes-val{font-size:.78rem;font-weight:700;color:var(--error)}

  /* ── QUICK ACTIONS ── */
  .action-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .action-card{background:var(--surface);border-radius:14px;border:1px solid var(--black-10);
    padding:18px 16px;display:flex;flex-direction:column;align-items:flex-start;gap:10px;
    cursor:pointer;transition:all .15s}
  .action-card:hover{border-color:var(--primary);box-shadow:0 4px 18px rgba(245,101,34,.14);
    transform:translateY(-2px)}
  .action-card-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;
    justify-content:center;flex-shrink:0}
  .action-card-icon.green{background:var(--success-bg);color:var(--success)}
  .action-card-icon.orange{background:var(--primary-mild);color:var(--primary)}
  .action-card-icon.blue{background:#E8F4FA;color:#037DB5}
  .action-card h3{font-size:.9rem;font-weight:800;color:var(--black);line-height:1.2}
  .action-card p{font-size:.75rem;font-weight:500;color:var(--black-65);line-height:1.4}

  /* ── BUTTONS ── */
  .btn-grad{padding:8px 22px;border-radius:999px;background:var(--grad);color:white;
    font-family:var(--font);font-size:.85rem;font-weight:800;border:none;cursor:pointer;
    box-shadow:0 2px 12px rgba(245,101,34,.3);transition:transform .1s,box-shadow .1s;white-space:nowrap}
  .btn-grad:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(245,101,34,.42)}
  .btn-ghost{padding:8px 18px;border-radius:999px;background:var(--surface);color:var(--black);
    font-family:var(--font);font-size:.85rem;font-weight:700;
    border:1.5px solid var(--black-10);cursor:pointer;transition:border-color .14s,color .14s;white-space:nowrap}
  .btn-ghost:hover{border-color:var(--primary);color:var(--primary-dark)}

  /* ── DIVIDER ── */
  .divider{height:1px;background:var(--black-5)}

  /* ── AVATAR DROPDOWN ── */
  .avatar-menu-wrap{position:relative}
  .avatar-menu{
    position:absolute;top:calc(100% + 6px);right:0;
    background:var(--surface);border:1px solid var(--black-10);border-radius:12px;
    box-shadow:0 8px 28px rgba(43,25,17,.12);
    min-width:160px;padding:6px;z-index:300;
    animation:fadeIn .12s ease;
  }
  .avatar-menu-item{
    width:100%;display:flex;align-items:center;gap:8px;padding:9px 12px;
    border-radius:8px;border:none;background:transparent;cursor:pointer;
    font-family:var(--font);font-size:.82rem;font-weight:600;color:var(--black);
    transition:background .1s;
  }
  .avatar-menu-item:hover{background:var(--black-5)}
  .avatar-menu-item.danger{color:var(--error)}
  .avatar-menu-item.danger:hover{background:var(--error-bg)}
  .avatar-login-btn{
    display:flex;align-items:center;gap:8px;cursor:pointer;
    padding:4px 10px;border-radius:999px;transition:background .14s;
  }
  .avatar-login-btn:hover{background:var(--black-5)}
  .avatar-login-label{font-size:.78rem;font-weight:700;color:var(--primary);white-space:nowrap}

  /* ── AUTH OVERLAY (profile card) ── */
  .auth-blur-wrap{position:relative;overflow:hidden;border-radius:16px}
  .auth-blur-content{filter:blur(6px);pointer-events:none;user-select:none}
  .auth-overlay{
    position:absolute;inset:0;z-index:10;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
    background:rgba(255,249,246,.55);border-radius:16px;
  }
  .auth-overlay-text{font-size:.88rem;font-weight:600;color:var(--black-75);text-align:center}
  .auth-overlay-btn{
    padding:8px 22px;border-radius:999px;background:var(--grad);color:white;
    font-family:var(--font);font-size:.82rem;font-weight:800;border:none;cursor:pointer;
    box-shadow:0 2px 12px rgba(245,101,34,.3);transition:transform .1s,box-shadow .1s;
  }
  .auth-overlay-btn:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(245,101,34,.42)}

  /* ── ANIMATIONS ── */
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  .content > *{animation:slideUp .22s ease both}
  .content > *:nth-child(1){animation-delay:.03s}
  .content > *:nth-child(2){animation-delay:.07s}
  .content > *:nth-child(3){animation-delay:.11s}
  .content > *:nth-child(4){animation-delay:.15s}
  .content > *:nth-child(5){animation-delay:.19s}

  /* ── PEACH STATS RESPONSIVE GRID ── */
  .stats-card-wrap{container-type:inline-size;container-name:stats;width:100%}
  .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .stats-bottom{display:contents}
  @container stats (max-width:540px){
    .stats-grid{grid-template-columns:1fr}
    .stats-vol{grid-column:1/-1}
    .stats-bottom{display:grid;grid-template-columns:1fr 1fr;gap:16px;grid-column:1/-1}
  }

  /* ── RESPONSIVE ── */
  @media(max-width:767px){
    .burger-btn{display:flex}
    .topbar-price{display:none}
    .sidenav-price-slot{display:block}
    .sidenav{
      width:220px;transform:translateX(-100%);
      transition:transform .25s cubic-bezier(.4,0,.2,1);
      z-index:500;align-items:flex-start;box-shadow:none;
    }
    .sidenav-collapsed{width:220px}
    .sidenav.sidenav-mobile-open{transform:translateX(0);box-shadow:6px 0 28px rgba(43,25,17,.16)}
    .sidenav-item{width:calc(100% - 16px);flex-direction:row;justify-content:flex-start;gap:12px;padding:10px 14px}
    .sidenav-collapsed .sidenav-item{width:calc(100% - 16px)}
    .sidenav-label,.sidenav-collapsed .sidenav-label{opacity:1!important;max-height:none!important;font-size:.8rem;text-transform:none;font-weight:600;letter-spacing:0}
    .sidenav-toggle{display:none}
    .sidenav-backdrop.open{display:block}
    .dashboard-grid{grid-template-columns:1fr}
    .dashboard-grid .card{width:100%!important;max-width:100%!important}
    .offerbook-cols{grid-template-columns:1fr}
    .action-cards{grid-template-columns:1fr}
    .welcome-actions{display:none}
    .content{padding:18px 14px 48px;max-width:100%}
    .profile-stats{grid-template-columns:repeat(3,1fr)}
    .card{width:100%!important;max-width:100%!important;min-width:0!important}
    .cards-row{flex-direction:column!important}
  }
`;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PeachHome() {
  const navigate = useNavigate();
  const [allPrices,           setAllPrices]           = useState({ EUR: BTC_PRICE });
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR","CHF","GBP"]);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const btcPrice = Math.round(allPrices[selectedCurrency] ?? BTC_PRICE);
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  // ── AUTH ──
  const { auth, isLoggedIn, handleLogin, handleLogout, showAvatarMenu, setShowAvatarMenu } = useAuth();
  const { get } = useApi();
  const liveProfile = auth?.profile ?? null;
  // Build user profile — live data when logged in, mock data when logged out.
  // Some fields (preferredMethods, totalVolumeBtc, etc.) are not yet returned by
  // the API, so we show "—" / empty instead of fake mock values.
  const disputes = liveProfile?.disputes;
  const disputesTotal = disputes
    ? (typeof disputes === "number" ? disputes : Object.values(disputes).reduce((s, v) => s + (v || 0), 0))
    : 0;
  const user = auth ? {
    peachId:             auth.peachId ? formatPeachId(auth.peachId) : "—",
    memberSince:         liveProfile?.creationDate
                           ? new Date(liveProfile.creationDate).toLocaleDateString("en-US", { month:"long", year:"numeric" })
                           : "—",
    trades:              liveProfile?.trades ?? 0,
    disputesTotal,
    rating:              liveProfile?.rating ?? 0,
    badges:              liveProfile?.medals ?? liveProfile?.badges ?? [],
    preferredMethods:    liveProfile?.preferredPaymentMethods ?? [],
    preferredCurrencies: liveProfile?.preferredCurrencies ?? [],
    totalVolumeBtc:      liveProfile?.totalVolumeBtc ?? 0,
    lastTradeDaysAgo:    liveProfile?.lastTradeDaysAgo ?? null,
    blockedByCount:      liveProfile?.blockedByCount ?? 0,
  } : {
    peachId: "—", memberSince: "—", trades: 0, disputesTotal: 0,
    rating: 0, badges: [], preferredMethods: [], preferredCurrencies: [],
    totalVolumeBtc: 0, lastTradeDaysAgo: null, blockedByCount: 0,
  };

  // Close avatar menu on outside click
  useEffect(() => {
    if (!showAvatarMenu) return;
    const close = (e) => {
      if (!e.target.closest(".avatar-menu-wrap")) setShowAvatarMenu(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showAvatarMenu]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await get('/market/prices');
        const data = await res.json();
        if (data && typeof data === "object") {
          setAllPrices(data);
          setAvailableCurrencies(Object.keys(data).sort());
        }
      } catch {}
    }
    fetchPrices();
    const iv = setInterval(fetchPrices, 30000);
    return () => clearInterval(iv);
  }, []);

  // ── URGENT TRADES COUNT ──
  function countUrgent(items) {
    return items.filter(t => {
      const s = t.tradeStatus ?? t.status ?? "unknown";
      return (STATUS_CONFIG[s] || {}).action;
    }).length;
  }
  const [urgentCount, setUrgentCount] = useState(() => {
    if (!auth) return 0;
    const cached = getCached("trades-items")?.data;
    return cached ? countUrgent(cached) : 0;
  });
  useEffect(() => {
    if (!auth) { setUrgentCount(0); return; }
    // Use cache immediately if available
    const cached = getCached("trades-items")?.data;
    if (cached) setUrgentCount(countUrgent(cached));
    async function fetchUrgent() {
      try {
        const [offersRes, contractsRes] = await Promise.all([
          get('/offers/summary'),
          get('/contracts/summary'),
        ]);
        const [offersData, contractsData] = await Promise.all([
          offersRes.ok ? offersRes.json() : [],
          contractsRes.ok ? contractsRes.json() : [],
        ]);
        const offers = Array.isArray(offersData) ? offersData : (offersData?.offers ?? []);
        const contracts = Array.isArray(contractsData) ? contractsData : (contractsData?.contracts ?? []);
        const all = [...offers, ...contracts];
        setUrgentCount(countUrgent(all));
        setCache("home-urgent", all);
      } catch {}
    }
    fetchUrgent();
    const iv = setInterval(fetchUrgent, 30000);
    return () => clearInterval(iv);
  }, [auth]);

  const satsPerCur  = Math.round(100_000_000 / btcPrice);
  const navWidth = isMobile ? 0 : (sidebarCollapsed ? 44 : 68);

  return (
    <>
      <style>{css}</style>
      <div className="app">

        <Topbar
          onBurgerClick={() => setSidebarMobileOpen(o => !o)}
          isLoggedIn={isLoggedIn}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
          showAvatarMenu={showAvatarMenu}
          setShowAvatarMenu={setShowAvatarMenu}
          btcPrice={btcPrice}
          selectedCurrency={selectedCurrency}
          availableCurrencies={availableCurrencies}
          onCurrencyChange={c => setSelectedCurrency(c)}
        />

        <SideNav
          active="home"
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
          mobileOpen={sidebarMobileOpen}
          onClose={() => setSidebarMobileOpen(false)}
          onNavigate={navigate}
          mobilePriceSlot={
            <div className="mobile-price-pill">
              <IcoBtc size={16}/>
              <div className="mobile-price-text">
                <span className="mobile-price-main">{btcPrice.toLocaleString("fr-FR")} {selectedCurrency}</span>
                <span className="mobile-price-sats">{satsPerCur.toLocaleString()} sats / {selectedCurrency.toLowerCase()}</span>
              </div>
              <div className="topbar-cur-select mobile-cur-select">
                <span className="cur-select-label">{selectedCurrency}</span>
                <svg className="cur-select-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents:"none",flexShrink:0}}><polyline points="1,1 5,5 9,1"/></svg>
                <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} className="cur-select-inner">
                  {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          }
        />

        <div className="page-wrap" style={{ marginTop:"var(--topbar)", marginLeft: navWidth, flex:1 }}>
          <div className="content">

            {/* ── WELCOME ROW ── */}
            <div className="welcome-row">
              {isLoggedIn ? (
                <>
                  <div className="welcome-avatar">PW</div>
                  <div className="welcome-text">
                    <h1>Welcome back 👋</h1>
                    <p>{user.peachId} · {user.trades} trades completed</p>
                  </div>
                  <div className="welcome-actions">
                    <button className="btn-ghost" onClick={() => navigate("/trades")}>View Trades</button>
                    <button className="btn-grad" onClick={() => navigate("/offer/new")}>+ Create Offer</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="welcome-avatar" style={{background:"var(--black-10)",color:"var(--black-25)"}}>
                    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="5.5" r="3"/><path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg>
                  </div>
                  <div className="welcome-text">
                    <h1>Welcome to Peach 🍑</h1>
                    <p>Buy and sell Bitcoin peer-to-peer, without KYC</p>
                  </div>
                  <div className="welcome-actions">
                    <button className="btn-grad" onClick={handleLogin}>Log in</button>
                  </div>
                </>
              )}
            </div>

            {/* ── ATTENTION ALERT (only when logged in + trades need action) ── */}
            {isLoggedIn && urgentCount > 0 && (
              <div style={{background:"#FEFCE5",border:"1.5px solid #F5CE22",borderRadius:12,
                padding:"12px 18px",display:"inline-flex",alignItems:"center",gap:12,width:"fit-content"}}>
                <span style={{fontSize:"1.1rem"}}>⚠️</span>
                <span style={{fontSize:".88rem",fontWeight:700,color:"#2B1911"}}>
                  {urgentCount} trade{urgentCount > 1 ? "s" : ""} need{urgentCount === 1 ? "s" : ""} your attention
                </span>
                <span style={{fontSize:".78rem",fontWeight:700,color:"var(--primary)",cursor:"pointer",paddingLeft:42}} onClick={() => navigate("/trades")}>View →</span>
              </div>
            )}

            {/* ── NEWS CARD ── */}
            <div className="card" style={{width:"100%",marginBottom:4}}>
              <div className="card-header">
                <span className="card-title">Latest from Peach</span>
                <span className="card-link" style={{color:"var(--black-25)",cursor:"default"}} title="Coming soon">See all →</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:0}}>
                {[
                  { date:"26 Feb 2026", headline:"Peach now supports Strike payments across all EU markets" },
                  { date:"18 Feb 2026", headline:"New trading limits: anonymous trades up to €1 000/month" },
                  { date:"05 Feb 2026", headline:"Web app beta is live — trade from any browser, no install needed" },
                ].map((item, i, arr) => (
                  <div key={i} style={{
                    display:"flex",alignItems:"center",gap:16,
                    padding:"11px 0",
                    borderBottom: i < arr.length-1 ? "1px solid #F4EEEB" : "none",
                  }}>
                    <span style={{fontSize:".7rem",fontWeight:600,color:"#C4B5AE",whiteSpace:"nowrap",minWidth:80}}>{item.date}</span>
                    <span style={{fontSize:".85rem",fontWeight:600,color:"#2B1911",flex:1}}>{item.headline}</span>
                    <span style={{fontSize:".78rem",fontWeight:700,color:"#C4B5AE",whiteSpace:"nowrap",paddingLeft:42}} title="Coming soon">Read →</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── PROFILE + PEACH STATS ROW ── */}
            <div className="cards-row" style={{display:"flex",gap:18,alignItems:"flex-start",flexWrap:"wrap"}}>

              {/* Profile Card — left (blurred when logged out) */}
              {isLoggedIn ? (
                <div className="card" style={{flexShrink:0,minWidth:260}}>
                  <div className="card-header">
                    <span className="card-title">My Profile</span>
                    <span className="card-link" onClick={() => navigate("/settings")}>Edit →</span>
                  </div>
                  <div className="profile-top">
                    <div className="profile-avatar">PW</div>
                    <div>
                      <div className="profile-name">{user.peachId}</div>
                      <div className="profile-since">Member since {user.memberSince}</div>
                    </div>
                  </div>
                  <div className="profile-row">
                    <span className="profile-row-label">Preferred methods</span>
                    <div className="profile-methods">
                      {user.preferredMethods.map(m => <span key={m} className="pref-chip">{m}</span>)}
                    </div>
                  </div>
                  <div className="profile-row">
                    <span className="profile-row-label">Preferred currencies</span>
                    <div className="profile-methods">
                      {user.preferredCurrencies.map(c => <span key={c} className="pref-chip">{c}</span>)}
                    </div>
                  </div>
                  <div className="profile-row">
                    <span className="profile-row-label">Badges</span>
                    <div className="profile-badges">
                      {user.badges.includes("supertrader") && <span className="badge badge-super">🏆 Supertrader</span>}
                      {user.badges.includes("fast") && <span className="badge badge-fast">⚡ Fast</span>}
                      {user.badges.length === 0 && <span style={{fontSize:".78rem",color:"var(--black-65)"}}>No badges yet</span>}
                    </div>
                  </div>

                  {/* Row 1: Rating · Disputes · Blocked by */}
                  <div className="profile-stats">
                    <div className="profile-stat">
                      <div className="profile-stat-val">⭐ {user.rating}</div>
                      <div className="profile-stat-lbl">Rating</div>
                    </div>
                    <div className="profile-stat">
                      <div className="profile-stat-val" style={{color: user.disputesTotal > 0 ? "var(--error)" : "var(--success)"}}>
                        {user.disputesTotal}
                      </div>
                      <div className="profile-stat-lbl">Disputes</div>
                    </div>
                    <div className="profile-stat">
                      <div className="profile-stat-val" style={{color: user.blockedByCount > 0 ? "var(--error)" : "var(--black-65)"}}>
                        {user.blockedByCount}
                      </div>
                      <div className="profile-stat-lbl">Blocked by</div>
                    </div>
                  </div>

                  {/* Row 2: Trades · Total Volume · Last Trade */}
                  <div className="profile-stats">
                    <div className="profile-stat">
                      <div className="profile-stat-val">{user.trades}</div>
                      <div className="profile-stat-lbl">Trades</div>
                    </div>
                    <div className="profile-stat">
                      <div className="profile-stat-val">{user.totalVolumeBtc} BTC</div>
                      <div className="profile-stat-lbl">Total Volume</div>
                    </div>
                    <div className="profile-stat">
                      <div className="profile-stat-val">{user.lastTradeDaysAgo}d ago</div>
                      <div className="profile-stat-lbl">Last Trade</div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── BLURRED PROFILE CARD (logged out) ── */
                <div className="auth-blur-wrap" style={{flexShrink:0,minWidth:260}}>
                  <div className="card auth-blur-content" style={{minWidth:260}}>
                    <div className="card-header">
                      <span className="card-title">My Profile</span>
                      <span className="card-link">Edit →</span>
                    </div>
                    <div className="profile-top">
                      <div className="profile-avatar">PW</div>
                      <div>
                        <div className="profile-name">PEACH08476D23</div>
                        <div className="profile-since">Member since March 2023</div>
                      </div>
                    </div>
                    <div className="profile-stats">
                      <div className="profile-stat">
                        <div className="profile-stat-val">⭐ 4.7</div>
                        <div className="profile-stat-lbl">Rating</div>
                      </div>
                      <div className="profile-stat">
                        <div className="profile-stat-val">0</div>
                        <div className="profile-stat-lbl">Disputes</div>
                      </div>
                      <div className="profile-stat">
                        <div className="profile-stat-val">23</div>
                        <div className="profile-stat-lbl">Trades</div>
                      </div>
                    </div>
                  </div>
                  <div className="auth-overlay">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><circle cx="16" cy="12" r="5"/><path d="M6 28c0-5.5 4.5-10 10-10s10 4.5 10 10"/></svg>
                    <span className="auth-overlay-text">Please authenticate<br/>to view your profile</span>
                    <button className="auth-overlay-btn" onClick={handleLogin}>Log in</button>
                  </div>
                </div>
              )}

              {/* Right column: PM+Currencies side by side, then Peach Stats */}
              <div style={{display:"flex",flexDirection:"column",gap:18,flex:"1 1 0",minWidth:0}}>
              <div className="cards-row" style={{display:"flex",gap:18,flexWrap:"wrap"}}>
                <div className="card" style={{flex:"1 1 280px",minWidth:260,width:"auto"}}>
                  <div className="card-header">
                    <span className="card-title">Top Payment Methods</span>
                    <span className="card-link" onClick={() => navigate("/payment-methods")}>See all →</span>
                  </div>
                  <div className="methods-list">
                    <div style={{padding:"18px 0",textAlign:"center",color:"var(--black-40)",fontSize:".82rem",fontWeight:600}}>No data yet</div>
                  </div>
                </div>

                <div className="card" style={{flex:"1 1 220px",minWidth:200,width:"auto"}}>
                  <div className="card-header">
                    <span className="card-title">Top Currencies</span>
                  </div>
                  <div className="methods-list">
                    <div style={{padding:"18px 0",textAlign:"center",color:"var(--black-40)",fontSize:".82rem",fontWeight:600}}>No data yet</div>
                  </div>
                </div>
              </div>

              {/* Peach Stats — 24h Volume, Trades Today, Active Offers */}
              <div className="stats-card-wrap">
              <div className="card" style={{width:"100%"}}>
                <div className="card-header">
                  <span className="card-title">Peach Stats</span>
                </div>
                <div className="stats-grid">

                  {/* 24h Volume — full width when narrow */}
                  <div className="stats-vol" style={{display:"flex",flexDirection:"column",gap:4}}>
                    <span style={{fontSize:".72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"var(--black-65)"}}>24h Volume</span>
                    <div className="stat-big"><SatsAmount sats={0} fontSize="1.1rem"/></div>
                    <div className="stat-sub">≈ €0 · today</div>
                    <span className="stat-change neu">—</span>
                  </div>

                  {/* Bottom 2 cols wrapper — only used at narrow widths */}
                  <div className="stats-bottom">

                    {/* Trades Today */}
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      <span style={{fontSize:".72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"var(--black-65)"}}>Trades Today</span>
                      <div className="stat-big">0</div>
                      <div className="stat-sub">completed trades · today</div>
                      <span className="stat-change neu">—</span>
                    </div>

                    {/* Active Offers */}
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      <span style={{fontSize:".72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"var(--black-65)"}}>Active Offers</span>
                      <div className="stat-big">0</div>
                      <div className="stat-sub">
                        <span style={{color:"var(--success)",fontWeight:700}}>0 buy</span>
                        {" · "}
                        <span style={{color:"var(--error)",fontWeight:700}}>0 sell</span>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-start",marginTop:2}}>
                        <span className="stat-change neu" style={{width:"fit-content"}}>—</span>
                      </div>
                    </div>

                  </div>{/* end stats-bottom */}

                </div>
              </div>
              </div>{/* end stats-card-wrap */}

              </div>{/* end right column */}

            </div>{/* end outer flex */}
          </div>
        </div>
      </div>
    </>
  );
}
