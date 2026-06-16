import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { formatPeachId } from "../components/Navbars.jsx";
import { SatsAmount, IcoBtc } from "../components/BitcoinAmount.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useApi, getCached } from "../hooks/useApi.js";
import { useUrgentCount } from "../hooks/useUrgentCount.js";
import { STATUS_CONFIG, FINISHED_STATUSES } from "../data/statusConfig.js";
import { methodDisplayName } from "../data/paymentMethodMeta.js";
import { fmt as formatSats, fmtPct, toPeaches } from "../utils/format.js";
import PeachRating from "../components/PeachRating.jsx";
import Avatar from "../components/Avatar.jsx";
import { RefreshIndicator } from "../components/RefreshIndicator.jsx";
import { AttentionStrip, AttentionPill } from "../components/AttentionIndicators.jsx";
import { API_V1 } from "../utils/network.js";
import { useCurrency } from "../components/AppLayout.jsx";
import { BadgesInfoPopup } from "../components/InfoPopup.jsx";

const ATTENTION_DISMISS_KEY = "peach.attention.dismissed";

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  /* ── WELCOME HEADER ── */
  .welcome-block{display:flex;flex-direction:column;gap:8px}
  .welcome-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
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

  /* ── MARKET TOP CARD (combined PMs + Currencies) ── */
  .market-section-label{font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--black-40);margin-bottom:6px}
  .market-list{display:flex;flex-direction:column;gap:6px}
  .market-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px;font-size:.84rem}
  .market-name{font-weight:700;color:var(--black)}
  .market-count{font-size:.72rem;font-weight:500;color:var(--black-65)}
  .market-empty{padding:8px 0;color:var(--black-40);font-size:.78rem;font-weight:600}
  .market-cols{display:flex;align-items:stretch;gap:18px}
  .market-col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:6px}
  .market-divider{width:1px;background:var(--black-10);align-self:stretch}

  /* ── SEE-ALL POPUP ── */
  .seeall-overlay{position:fixed;inset:0;background:rgba(43,25,17,.55);display:flex;align-items:center;justify-content:center;z-index:600;animation:seeallFadeIn .12s ease-out}
  .seeall-popup{background:var(--surface);border:1px solid var(--border);border-radius:16px;width:min(92vw,520px);max-height:80vh;display:flex;flex-direction:column;overflow:hidden;animation:seeallSlideUp .18s ease-out}
  .seeall-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px 12px;border-bottom:1px solid var(--black-5)}
  .seeall-title{font-size:1rem;font-weight:800;color:var(--black);text-transform:uppercase;letter-spacing:.08em}
  .seeall-close{background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--black-65);padding:4px 8px;line-height:1}
  .seeall-close:hover{color:var(--black)}
  .seeall-body{padding:14px 22px 20px;overflow-y:auto;display:flex;flex-direction:column;gap:18px}
  .seeall-col-label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--black-40);margin-bottom:8px}
  @keyframes seeallFadeIn{from{opacity:0}to{opacity:1}}
  @keyframes seeallSlideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

  /* ── PROFILE STRIP (discrete, under welcome) ── */
  .profile-strip{display:flex;flex-direction:column;gap:3px}
  .profile-strip-l1{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .profile-strip-l2{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .profile-strip-id{font-size:.92rem;font-weight:800;color:var(--black);letter-spacing:.04em}
  .profile-strip-sub{font-size:.82rem;font-weight:500;color:var(--black-65)}
  .profile-strip-stat{display:inline-flex;align-items:center;gap:4px;font-size:.82rem;font-weight:600;color:var(--black-75)}
  .profile-strip-sep{color:var(--black-25);font-size:.82rem}
  .profile-strip-badges{display:inline-flex;gap:4px;font-size:.95rem;cursor:pointer}
  .profile-strip-link{font-size:.82rem;font-weight:600;color:var(--black-65);cursor:pointer}
  .profile-strip-link:hover{color:var(--primary)}
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
    transition:transform .1s;white-space:nowrap}
  .btn-grad:hover{transform:translateY(-1px)}
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

  /* ── ATH WIDGET ── */
  .ath-header{display:flex;align-items:center;gap:8px}
  .ath-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .ath-periods{display:flex;gap:4px}
  .ath-pill{
    background:none;border:1.5px solid var(--black-10);border-radius:999px;
    padding:4px 14px;font-family:var(--font);font-size:.72rem;font-weight:700;
    color:var(--black-65);cursor:pointer;transition:all .14s;white-space:nowrap
  }
  .ath-pill:hover{border-color:var(--primary);color:var(--primary-dark)}
  .ath-pill.active{background:var(--primary-mild);border-color:var(--primary);color:var(--primary-dark)}
  .ath-cur-select{
    appearance:none;border:1.5px solid var(--black-10);border-radius:8px;
    padding:4px 24px 4px 9px;font-family:var(--font);font-size:.72rem;font-weight:600;
    color:var(--black);background:var(--surface);cursor:pointer;outline:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237D675E'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 7px center;
    transition:border-color .14s
  }
  .ath-cur-select:focus{border-color:var(--primary)}
  .ath-price-row{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-top:4px}
  .ath-price-value{font-size:2rem;font-weight:800;color:var(--black);line-height:1;letter-spacing:-.02em}
  .ath-kyc-block{display:flex;flex-direction:column;gap:2px;text-align:right}
  .ath-kyc-label{font-size:.72rem;font-weight:500;color:var(--black-65);line-height:1.2}
  .ath-kyc-value{font-size:1rem;font-weight:700;color:var(--black);line-height:1.2;letter-spacing:-.01em}

  /* ── OPEN OFFERS CARD ── */
  .open-offers-card{justify-content:flex-start}
  .open-offers-badge{
    align-self:flex-start;background:var(--primary);color:#fff;
    border-radius:999px;padding:6px 16px;font-size:.82rem;font-weight:800;
    text-transform:uppercase;letter-spacing:.04em
  }
  .open-offers-cols{display:flex;align-items:stretch;gap:20px}
  .oo-col{display:flex;flex-direction:column;gap:8px;flex:1 1 0;min-width:0}
  .oo-divider{width:1px;align-self:stretch;background:var(--black-10);flex:0 0 auto}
  .oo-count-row{display:flex;align-items:center;gap:12px}
  .oo-count{
    border-radius:10px;padding:6px 18px;font-size:1.7rem;font-weight:800;
    color:var(--black);line-height:1.1;letter-spacing:-.02em
  }
  .oo-count-buy{background:var(--success-bg)}
  .oo-count-sell{background:var(--primary-mild)}
  .oo-label{font-size:1.05rem;font-weight:600;color:var(--black)}
  .oo-premium{font-size:.82rem;font-weight:500;color:var(--black-65);line-height:1.35}
  .oo-market-link{font-size:.8rem;font-weight:700;color:var(--primary);cursor:pointer;width:fit-content}
  .oo-market-link:hover{color:var(--primary-dark)}
  .oo-hr{height:1px;background:var(--black-10);width:100%;margin:2px 0}
  .oo-actions{display:flex;gap:14px}
  .oo-btn{
    flex:1 1 0;background:none;border:1.5px solid;border-radius:999px;
    padding:13px 16px;font-family:var(--font);font-size:.92rem;font-weight:800;
    text-transform:uppercase;letter-spacing:.02em;cursor:pointer;transition:all .14s
  }
  .oo-btn-buy{border-color:var(--success);color:var(--success)}
  .oo-btn-buy:hover{background:var(--success-bg)}
  .oo-btn-sell{border-color:var(--primary);color:var(--primary)}
  .oo-btn-sell:hover{background:var(--primary-mild)}

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
  .stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
  .stats-bottom{display:contents}
  @container stats (max-width:540px){
    .stats-grid{grid-template-columns:1fr}
    .stats-vol{grid-column:1/-1}
    .stats-bottom{display:grid;grid-template-columns:1fr;gap:16px;grid-column:1/-1}
  }

  /* ── RESPONSIVE ── */
  @media(max-width:767px){
    .dashboard-grid{grid-template-columns:1fr}
    .dashboard-grid .card{width:100%!important;max-width:100%!important}
    .offerbook-cols{grid-template-columns:1fr}
    .action-cards{grid-template-columns:1fr}
    .welcome-actions{display:none}
    .content{padding:18px 14px 48px;max-width:100%}
    .card{width:100%!important;max-width:100%!important;min-width:0!important}
    .card.home-stack-card{max-width:450px!important}
    .cards-row{flex-direction:column!important;align-items:stretch!important}
    /* stacked column: stop the 360px flex-basis from becoming a fixed height */
    .ath-offers-row > .card{flex:0 0 auto!important}
    .ath-price-value{font-size:1.5rem}
    .ath-controls{gap:8px}
    /* keep the Open Offers card tight so labels/buttons stay on one line */
    .open-offers-cols{gap:12px}
    .oo-col{gap:6px}
    .oo-count-row{gap:8px}
    .oo-count{padding:5px 12px;font-size:1.3rem}
    .oo-label{font-size:.85rem;white-space:nowrap}
    .oo-premium{font-size:.74rem}
    .oo-actions{gap:10px}
    .oo-btn{padding:11px 8px;font-size:.78rem;white-space:nowrap}
  }
`;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PeachHome() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [marketStats, setMarketStats] = useState(null);
  const [contractsData, setContractsData] = useState([]);
  // Market-wide PM + currency breakdown (counts of outstanding offers).
  // Fetched once on home mount from /v069/{buyOffer,sellOffer}?ownOffers=false.
  const [marketBreakdown, setMarketBreakdown] = useState({ pms: [], currencies: [] });
  const [seeAllOpen, setSeeAllOpen] = useState(false);
  const [athData, setAthData]       = useState(null);
  const [athPeriod, setAthPeriod]   = useState("24h");
  const [athCurrency, setAthCurrency] = useState("EUR");
  const [news, setNews] = useState([
    { text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.", shareText: "", url: "https://peachbitcoin.com" },
    { text: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", shareText: "", url: "https://peachbitcoin.com" },
    { text: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.", shareText: "", url: "https://peachbitcoin.com" },
  ]);

  // AppLayout owns Topbar/SideNav state (avatar menu, mobile drawer, currency).
  // Home only needs auth/isLoggedIn for profile + attention-strip, and
  // handleLogin for the logged-out CTA buttons.
  const { auth, isLoggedIn, handleLogin, blockedUsers } = useAuth();
  const { get } = useApi();
  const { allPrices } = useCurrency();
  const liveProfile = auth?.profile ?? null;
  // Build user profile — live data when logged in, empty defaults when logged out.
  // Some fields (preferredMethods, totalVolumeBtc, etc.) are not yet returned by
  // the API, so we show "—" / empty defaults.
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
    rating:              liveProfile?.rating != null ? toPeaches(liveProfile.rating) : 0,
    badges:              liveProfile?.medals ?? liveProfile?.badges ?? [],
    preferredMethods:    liveProfile?.preferredPaymentMethods ?? [],
    preferredCurrencies: liveProfile?.preferredCurrencies ?? [],
    totalVolumeBtc:      liveProfile?.totalVolumeBtc ?? 0,
    lastTradeDaysAgo:    liveProfile?.lastTradeDaysAgo ?? null,
  } : {
    peachId: "—", memberSince: "—", trades: 0, disputesTotal: 0,
    rating: 0, badges: [], preferredMethods: [], preferredCurrencies: [],
    totalVolumeBtc: 0, lastTradeDaysAgo: null,
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── MARKET OFFERS STATS (public, platform-wide) ──
  useEffect(() => {
    async function fetchMarketStats() {
      try {
        const res = await get('/market/offers/stats');
        if (res.ok) {
          const data = await res.json();
          if (data) setMarketStats(data);
        }
      } catch {}
    }
    fetchMarketStats();
    const iv = setInterval(fetchMarketStats, 60000);
    return () => clearInterval(iv);
  }, []);

  // ── NEWS (public, platform-wide) ──
  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await get('/info/news');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) setNews(data);
        }
      } catch {}
    }
    fetchNews();
    const iv = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  // ── ATH PRICE DATA (public endpoint — no auth headers, always via proxy) ──
  useEffect(() => {
    async function fetchAth() {
      try {
        const res = await fetch(`${API_V1}/market/tradePricePeaks`);
        if (res.ok) {
          const data = await res.json();
          if (data?.tradePeaks) setAthData(data);
        } else {
          console.warn('[ATH] non-ok response:', res.status);
        }
      } catch (err) {
        console.warn('[ATH] fetch error:', err);
      }
    }
    fetchAth();
    const iv = setInterval(fetchAth, 60000);
    return () => clearInterval(iv);
  }, []);

  // Auto-correct ATH currency if it's not available in the selected period
  const athPeaks = athData?.tradePeaks ?? null;
  useEffect(() => {
    if (!athPeaks) return;
    const available = Object.keys(athPeaks[athPeriod] ?? {});
    if (available.length > 0 && !available.includes(athCurrency)) {
      setAthCurrency(available.includes("EUR") ? "EUR" : available[0]);
    }
  }, [athPeaks, athPeriod]);

  // ── URGENT TRADES COUNT ──
  // Shared with the side-nav badge via useUrgentCount — same predicate, one source.
  const { urgentCount } = useUrgentCount();
  const [isRefetching, setIsRefetching] = useState(false);

  // ── ATTENTION INDICATORS (top strip + scroll-triggered floating pill) ──
  // Single dismissal flag — dismissing either indicator hides both for the session.
  const [attentionDismissed, setAttentionDismissed] = useState(() => {
    try { return sessionStorage.getItem(ATTENTION_DISMISS_KEY) === "1"; } catch { return false; }
  });
  const [welcomeOutOfView, setWelcomeOutOfView] = useState(false);
  const [badgesHelpOpen, setBadgesHelpOpen] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setWelcomeOutOfView(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLoggedIn, urgentCount]);

  function dismissAttention() {
    try { sessionStorage.setItem(ATTENTION_DISMISS_KEY, "1"); } catch {}
    setAttentionDismissed(true);
  }
  function goToTrades() { navigate("/trades"); }
  const fmtPremium = (p) => p == null ? "—" : `${p > 0 ? "+" : ""}${p.toFixed(2)}%`;

  const showStrip = isLoggedIn && urgentCount > 0 && !attentionDismissed;
  const showPill  = isLoggedIn && urgentCount > 0 && !attentionDismissed && welcomeOutOfView;
  // Cache is populated by useNotifications (every 15 s, globally). Re-derive
  // urgent count + contracts list from it on mount and on a short interval so
  // background poll updates flow into home state without home owning a fetch.
  useEffect(() => {
    if (!auth) {
      setContractsData([]);
      return;
    }
    function syncFromCache() {
      const cached = getCached("trades-items")?.data;
      if (!cached) return;
      setContractsData(cached.filter((i) => i.kind === "contract"));
    }
    syncFromCache();
    const iv = setInterval(syncFromCache, 3000);
    return () => clearInterval(iv);
  }, [auth]);

  useEffect(() => {
    if (!seeAllOpen) return;
    function onKey(e) { if (e.key === "Escape") setSeeAllOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seeAllOpen]);

  // ── MARKET BREAKDOWN: top PMs + currencies across all outstanding offers ──
  // Fired once on home mount. Counts each offer once toward every PM and
  // currency it lists, so an offer accepting SEPA in EUR and USD adds 1 to
  // SEPA, 1 to EUR, 1 to USD.
  useEffect(() => {
    if (!auth) {
      setMarketBreakdown({ pms: [], currencies: [] });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
        const headers = { Authorization: `Bearer ${auth.token}` };
        const [buyRes, sellRes] = await Promise.all([
          fetch(`${v069Base}/buyOffer?ownOffers=false`, { headers }).catch(() => null),
          fetch(`${v069Base}/sellOffer?ownOffers=false`, { headers }).catch(() => null),
        ]);
        const parse = async (r) => {
          if (!r || !r.ok) return [];
          const j = await r.json().catch(() => null);
          return Array.isArray(j) ? j : (j?.offers ?? []);
        };
        const all = [...(await parse(buyRes)), ...(await parse(sellRes))];
        const pmCounts  = new Map();
        const curCounts = new Map();
        for (const o of all) {
          const mop = o.meansOfPayment ?? {};
          const currencies = Object.keys(mop);
          const methods = [...new Set(Object.values(mop).flat())];
          for (const c of currencies) curCounts.set(c, (curCounts.get(c) ?? 0) + 1);
          for (const m of methods)    pmCounts.set(m,  (pmCounts.get(m)  ?? 0) + 1);
        }
        const toSorted = (m) =>
          [...m.entries()].sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
        if (!cancelled) {
          setMarketBreakdown({ pms: toSorted(pmCounts), currencies: toSorted(curCounts) });
        }
      } catch {
        if (!cancelled) setMarketBreakdown({ pms: [], currencies: [] });
      }
    })();
    return () => { cancelled = true; };
  }, [auth]);

  // ── DERIVED: top 5 from market breakdown (full lists go to See-all popup) ──
  const topPms        = marketBreakdown.pms.slice(0, 3);
  const topCurrencies = marketBreakdown.currencies.slice(0, 3);

  const navWidth = isMobile ? 0 : 68;

  // ── ATH DERIVED ──
  const ATH_CUR_SYM = { EUR: "\u20ac", USD: "$", CHF: "CHF", GBP: "\u00a3" };
  const athCurrSym = (c) => ATH_CUR_SYM[c] || c;
  const athAvailCurrencies = Object.keys(athPeaks?.[athPeriod] ?? {}).sort();
  const athPrice = athPeaks?.[athPeriod]?.[athCurrency] ?? null;
  const kycPrice = allPrices?.[athCurrency] ?? null;

  return (
    <>
      <style>{css}</style>
      <div className="page-wrap" style={{ marginTop:"var(--topbar)", marginLeft: navWidth, flex:1 }}>
          <div className="content">

            {/* ── WELCOME ROW + PROFILE STRIP ── */}
            <div className="welcome-block">
            <div className="welcome-row">
              {isLoggedIn ? (
                <>
                  <div className="welcome-text">
                    <h1>
                      Welcome back 👋
                      <RefreshIndicator active={isRefetching} />
                    </h1>
                  </div>
                  {showStrip && (
                    <AttentionStrip
                      count={urgentCount}
                      onView={goToTrades}
                      onDismiss={dismissAttention}
                    />
                  )}
                  <div className="welcome-actions">
                    <button className="btn-ghost" onClick={() => navigate("/trades")}>View Trades</button>
                    <button className="btn-grad" onClick={() => navigate("/offer/new")}>+ Create Offer</button>
                  </div>
                </>
              ) : (
                <>
                  <Avatar size={44} />
                  <div className="welcome-text">
                    <h1>Welcome to Peach 🍑</h1>
                    <p>Peer-to-Peer Bitcoin Marketplace, self-custodial, KYC-free</p>
                  </div>
                  <div className="welcome-actions">
                    <button className="btn-grad" onClick={handleLogin}>Log in</button>
                  </div>
                </>
              )}
            </div>

            {/* ── USER PROFILE (discrete strip, under welcome) ── */}
            {isLoggedIn && (
              <div className="profile-strip">
                <div className="profile-strip-l1">
                  <Avatar peachId={auth?.peachId} size={28} />
                  <span className="profile-strip-id">{user.peachId}</span>
                  <span className="profile-strip-sep">·</span>
                  <span className="profile-strip-sub">Member since {user.memberSince}</span>
                </div>
                <div className="profile-strip-l2">
                  <span className="profile-strip-stat"><PeachRating rep={user.rating} size={13} trades={user.trades}/></span>
                  <span className="profile-strip-sep">·</span>
                  <span className="profile-strip-stat" style={{color: user.disputesTotal > 0 ? "var(--error)" : "var(--success)"}}>
                    {user.disputesTotal} {user.disputesTotal === 1 ? "dispute" : "disputes"}
                  </span>
                  {user.badges.length > 0 && (
                    <>
                      <span className="profile-strip-sep">·</span>
                      <span className="profile-strip-badges" onClick={() => setBadgesHelpOpen(true)} title="View badges">
                        {user.badges.includes("superTrader") && <span>🏆</span>}
                        {user.badges.includes("fastTrader") && <span>⚡</span>}
                        {user.badges.includes("ambassador") && <span>🎖️</span>}
                      </span>
                    </>
                  )}
                  <span className="profile-strip-sep">·</span>
                  <span
                    className="profile-strip-link"
                    onClick={() => navigate("/settings", { state: { openSection: "block-users" } })}
                  >
                    {blockedUsers?.count ?? 0} blocked
                  </span>
                </div>
              </div>
            )}
            </div>

            {/* Sentinel: when this leaves the viewport, the floating pill appears */}
            <div ref={sentinelRef} aria-hidden="true" style={{height:1,width:"100%",margin:0,padding:0}} />

            {/* ── ATH WIDGET + OPEN OFFERS ROW ── */}
            <div className="cards-row ath-offers-row" style={{display:"flex",gap:18,alignItems:"flex-start",flexWrap:"wrap"}}>
            {/* ── OPEN OFFERS CARD ── */}
            <div className="card open-offers-card" style={{flex:"1 1 360px",minWidth:0,width:"auto"}}>
              <span className="open-offers-badge">OPEN OFFERS</span>
              <div className="open-offers-cols">
                {/* buy column */}
                <div className="oo-col">
                  <div className="oo-count-row">
                    <span className="oo-count oo-count-buy">{marketStats?.buy?.open ?? "—"}</span>
                    <span className="oo-label">buy offers</span>
                  </div>
                  <span className="oo-premium">average premium of completed trades: {fmtPremium(marketStats?.buy?.avgPremium)}</span>
                  <span className="oo-market-link" onClick={() => navigate("/market", { state: { marketTab: "sell" } })}>See market →</span>
                </div>
                <div className="oo-divider" />
                {/* sell column */}
                <div className="oo-col">
                  <div className="oo-count-row">
                    <span className="oo-count oo-count-sell">{marketStats?.sell?.open ?? "—"}</span>
                    <span className="oo-label">sell offers</span>
                  </div>
                  <span className="oo-premium">average premium of completed trades: {fmtPremium(marketStats?.sell?.avgPremium)}</span>
                  <span className="oo-market-link" onClick={() => navigate("/market", { state: { marketTab: "buy" } })}>See market →</span>
                </div>
              </div>
              <div className="oo-hr" />
              <div className="oo-actions">
                <button className="oo-btn oo-btn-buy"  onClick={() => navigate("/offer/new?type=buy")}>CREATE BUY OFFER</button>
                <button className="oo-btn oo-btn-sell" onClick={() => navigate("/offer/new?type=sell")}>CREATE SELL OFFER</button>
              </div>
            </div>

            <div className="card" style={{flex:"1 1 360px",minWidth:0,width:"auto"}}>
              <div className="ath-header">
                <IcoBtc size={20}/>
                <span className="card-title">Bitcoin ATH on Peach</span>
              </div>
              <div className="ath-controls">
                <div className="ath-periods">
                  {[
                    { key: "24h",  label: "24H" },
                    { key: "7d",   label: "7-DAY" },
                    { key: "30d",  label: "30-DAY" },
                  ].map(p => (
                    <button
                      key={p.key}
                      className={`ath-pill${athPeriod === p.key ? " active" : ""}`}
                      onClick={() => setAthPeriod(p.key)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {athAvailCurrencies.length > 0 && (
                  <select
                    className="ath-cur-select"
                    value={athCurrency}
                    onChange={e => setAthCurrency(e.target.value)}
                  >
                    {athAvailCurrencies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="ath-price-row">
                <span className="ath-price-value">
                  {athPrice != null
                    ? `${athCurrSym(athCurrency)}${athCurrency === "CHF" ? " " : ""}${athPrice.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    : "\u2014"}
                </span>
                {kycPrice != null && (
                  <div className="ath-kyc-block">
                    <div className="ath-kyc-label">
                      {athPeriod === "24h" ? "KYC market price:" : "KYC price today:"}
                    </div>
                    <div className="ath-kyc-value">
                      {athCurrSym(athCurrency)}{athCurrency === "CHF" ? " " : ""}{Math.round(kycPrice).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>

            {/* ── NEWS CARD ── */}
            {news.length > 0 && (
              <div className="card" style={{width:"100%",marginBottom:4}}>
                <div className="card-header">
                  <span className="card-title">Latest from Peach</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:0}}>
                  {news.map((item, i, arr) => (
                    <div key={i} style={{
                      display:"flex",alignItems:"center",gap:16,
                      padding:"11px 0",
                      borderBottom: i < arr.length-1 ? "1px solid var(--black-5)" : "none",
                    }}>
                      <span style={{fontSize:".85rem",fontWeight:600,color:"var(--black)",flex:1}}>{item.text}</span>
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{fontSize:".78rem",fontWeight:700,color:"var(--primary)",whiteSpace:"nowrap",paddingLeft:42,textDecoration:"none"}}
                        >
                          Read →
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MARKET BREAKDOWN + PEACH STATS ROW ── */}
            <div className="cards-row" style={{display:"flex",gap:18,alignItems:"flex-start",flexWrap:"wrap"}}>

              {/* Right column: PM+Currencies side by side, then Peach Stats */}
              <div style={{display:"flex",flexDirection:"column",gap:18,flex:"1 1 0",minWidth:0}}>
              <div className="cards-row" style={{display:"flex",gap:18,flexWrap:"wrap"}}>
                <div className="card home-stack-card" style={{flex:"1 1 280px",minWidth:260,width:"auto"}}>
                  <div className="card-header">
                    <span className="card-title">Top payment methods</span>
                    <span className="card-link" onClick={() => setSeeAllOpen(true)}>See all →</span>
                  </div>

                  <div className="market-cols">
                    <div className="market-col">
                      <div className="market-section-label">Payment Methods</div>
                      <div className="market-list">
                        {topPms.length === 0 ? (
                          <div className="market-empty">No outstanding offers</div>
                        ) : topPms.map(({ name, count }) => (
                          <div className="market-row" key={`pm-${name}`}>
                            <span className="market-name">{methodDisplayName(name)}</span>
                            <span className="market-count">{count} offer{count === 1 ? "" : "s"}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="market-divider" />

                    <div className="market-col">
                      <div className="market-section-label">Currencies</div>
                      <div className="market-list">
                        {topCurrencies.length === 0 ? (
                          <div className="market-empty">No outstanding offers</div>
                        ) : topCurrencies.map(({ name, count }) => (
                          <div className="market-row" key={`cur-${name}`}>
                            <span className="market-name">{name}</span>
                            <span className="market-count">{count} offer{count === 1 ? "" : "s"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Peach Stats — 24h Volume, Trades Today, Active Offers */}
              <div className="stats-card-wrap">
              <div className="card home-stack-card" style={{width:"100%"}}>
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

                  </div>{/* end stats-bottom */}

                </div>
              </div>
              </div>{/* end stats-card-wrap */}

              </div>{/* end right column */}

            </div>{/* end outer flex */}
          </div>
        </div>

        {showPill && (
          <AttentionPill
            count={urgentCount}
            onView={goToTrades}
            onDismiss={dismissAttention}
          />
        )}

      {seeAllOpen && (
        <div className="seeall-overlay" onClick={() => setSeeAllOpen(false)}>
          <div className="seeall-popup" onClick={(e) => e.stopPropagation()}>
            <div className="seeall-header">
              <span className="seeall-title">Market — outstanding offers</span>
              <button className="seeall-close" onClick={() => setSeeAllOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="seeall-body">
              <div>
                <div className="seeall-col-label">Payment Methods ({marketBreakdown.pms.length})</div>
                <div className="market-list">
                  {marketBreakdown.pms.length === 0 ? (
                    <div className="market-empty">No outstanding offers</div>
                  ) : marketBreakdown.pms.map(({ name, count }) => (
                    <div className="market-row" key={`pm-all-${name}`}>
                      <span className="market-name">{methodDisplayName(name)}</span>
                      <span className="market-count">{count} offer{count === 1 ? "" : "s"}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="seeall-col-label">Currencies ({marketBreakdown.currencies.length})</div>
                <div className="market-list">
                  {marketBreakdown.currencies.length === 0 ? (
                    <div className="market-empty">No outstanding offers</div>
                  ) : marketBreakdown.currencies.map(({ name, count }) => (
                    <div className="market-row" key={`cur-all-${name}`}>
                      <span className="market-name">{name}</span>
                      <span className="market-count">{count} offer{count === 1 ? "" : "s"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {badgesHelpOpen && <BadgesInfoPopup onClose={() => setBadgesHelpOpen(false)} />}
    </>
  );
}
