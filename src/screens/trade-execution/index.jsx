import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SideNav, Topbar } from "../../components/Navbars.jsx";
import { SatsAmount, IcoBtc } from "../../components/BitcoinAmount.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useApi, createTask } from "../../hooks/useApi.js";
import MobileSigningModal, { hasPendingTask, savePendingTask, clearPendingTask } from "../../components/MobileSigningModal.jsx";
import { decryptPGPMessage, decryptSymmetric, encryptSymmetric, signPGPMessage, encryptForPublicKey } from "../../utils/pgp.js";
import { SAT, BTC_PRICE_FALLBACK as BTC_PRICE, satsToFiat, formatTradeId, toPeaches } from "../../utils/format.js";
import { deriveEscrowPubKey, deriveReturnAddress } from "../../utils/escrow.js";
import Avatar from "../../components/Avatar.jsx";
import StatusChip from "../../components/StatusChip.jsx";
import PeachRating from "../../components/PeachRating.jsx";
import {
  IconBack, IconAlert,
  HorizontalStepper, PaymentDetailsCard, EscrowAddressCard,
  EscrowFundingCard, WrongAmountFundedCard, ActionPanel, RatingPanel, ChatPanel,
} from "./components.jsx";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  /* ── Page layout ── */
  .page-wrap{margin-top:var(--topbar);margin-left:68px;height:calc(100vh - var(--topbar));
    display:flex;flex-direction:column;overflow:hidden}
  @media(max-width:767px){.page-wrap{margin-left:0}}

  /* ── Horizontal stepper (fixed bottom bar) ── */
  .h-stepper-wrap{
    position:fixed;bottom:0;left:68px;right:0;height:var(--stepper-h);
    background:var(--surface);border-top:1px solid var(--black-10);
    display:flex;align-items:center;justify-content:center;
    padding:0 24px;z-index:190;gap:0;
  }
  @media(max-width:767px){.h-stepper-wrap{left:0}}
  .h-stepper{display:flex;align-items:center;gap:0;width:100%;max-width:600px}
  .h-step{
    display:flex;flex-direction:column;align-items:center;
    position:relative;flex:1;
  }
  .h-step-line{
    position:absolute;top:8px;right:50%;
    width:100%;height:2px;
    transform:translateX(-50%);
    z-index:0;
  }
  .h-step-dot{
    width:16px;height:16px;border-radius:50%;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    position:relative;z-index:1;transition:background .3s,box-shadow .3s;
  }
  .h-step-label{
    font-size:.62rem;font-weight:500;text-align:center;
    margin-top:5px;white-space:nowrap;transition:color .3s;
  }
  .h-stepper-alert{
    display:flex;align-items:center;gap:6px;margin-left:16px;
    font-size:.72rem;font-weight:700;color:var(--error);white-space:nowrap;
    background:var(--error-bg);border-radius:999px;padding:3px 10px;flex-shrink:0;
  }

  /* ── Trade topbar (below main topbar) ── */
  .trade-topbar{
    display:flex;align-items:center;gap:12px;padding:0 24px;
    height:52px;background:var(--surface);border-bottom:1px solid var(--black-10);
    flex-shrink:0;
  }
  .trade-topbar-back{
    display:flex;align-items:center;justify-content:center;
    width:32px;height:32px;border-radius:8px;border:1.5px solid var(--black-10);
    background:transparent;cursor:pointer;color:var(--black-65);flex-shrink:0;transition:all .15s}
  .trade-topbar-back:hover{border-color:var(--primary);color:var(--primary-dark);background:var(--primary-mild)}
  .trade-topbar-id{font-family:monospace;font-size:.82rem;font-weight:700;color:var(--black-65)}
  .trade-topbar-sep{color:var(--black-10);font-size:1.2rem;flex-shrink:0}
  .trade-topbar-name{font-size:.9rem;font-weight:700}
  .trade-topbar-elapsed{font-size:.75rem;color:var(--black-65);display:flex;align-items:center;gap:4px}
  .trade-topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px}


  /* ── Split layout ── */
  .split-layout{display:flex;flex:1;overflow:hidden}
  .split-left{
    width:42%;min-width:320px;flex-shrink:0;
    overflow-y:auto;padding:24px 24px calc(24px + var(--stepper-h));
    border-right:1px solid var(--black-10);
  }
  .split-left-full{width:100%;border-right:none;max-width:600px;margin:0 auto}
  .split-right{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;padding-bottom:var(--stepper-h)}

  /* ── Mobile tabs ── */
  .mobile-tabs{display:none}
  @media(max-width:900px){
    .split-left{width:100%}
    .split-right{display:none}
    .split-right.mobile-active{display:flex}
    .split-left.mobile-hidden{display:none}
    .mobile-tabs{
      display:flex;gap:0;border-bottom:1px solid var(--black-10);
      flex-shrink:0;background:var(--surface)}
    .mobile-tab{
      flex:1;border:none;background:transparent;font-family:var(--font);
      font-size:.85rem;font-weight:600;color:var(--black-65);
      padding:12px 0;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s}
    .mobile-tab.active{color:var(--primary-dark);border-bottom-color:var(--primary);font-weight:700}
  }

  /* ── Left panel sections ── */
  .panel-section{margin-bottom:24px}
  .panel-section-title{
    font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
    color:var(--black-65);margin-bottom:10px;display:flex;align-items:center;gap:6px}
  .panel-section-title::before{content:'';display:inline-block;width:3px;height:12px;
    background:var(--primary);border-radius:2px}

  /* ── Counterparty card ── */
  .counterparty-card{
    display:flex;align-items:center;gap:12px;
    background:var(--surface);border:1px solid var(--black-10);
    border-radius:12px;padding:12px 14px;margin-bottom:20px;
  }
  .cp-name{font-size:.9rem;font-weight:700}
  .cp-meta{font-size:.75rem;color:var(--black-65);display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:2px}

  /* ── Trade summary ── */
  .trade-summary{
    background:var(--surface);border:1px solid var(--black-10);border-radius:12px;
    padding:14px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .summary-item-label{font-size:.68rem;font-weight:700;text-transform:uppercase;
    letter-spacing:.05em;color:var(--black-65);margin-bottom:2px}
  .summary-item-val{font-size:.9rem;font-weight:700}
  .summary-item-sub{font-size:.72rem;color:var(--black-65);margin-top:1px}

  /* ── Action panel ── */
  .action-panel{display:flex;flex-direction:column;gap:10px}
  .action-hint{font-size:.82rem;color:var(--black-65);line-height:1.5;padding:10px 12px;
    background:var(--black-5);border-radius:8px}
  .action-btn{
    border:none;border-radius:999px;font-family:var(--font);
    font-size:.85rem;font-weight:700;padding:10px 20px;cursor:pointer;
    transition:all .15s;text-align:center}
  .action-btn-large{padding:12px 24px;font-size:.9rem}
  .action-btn-danger:hover{background:var(--error)!important;color:white!important}
  .action-btn-grad{
    background:var(--grad);color:white;border:none;border-radius:999px;
    font-family:var(--font);font-size:.9rem;font-weight:800;
    padding:12px 24px;cursor:pointer;text-align:center;
    box-shadow:0 2px 12px rgba(245,101,34,.3);transition:transform .15s,box-shadow .15s}
  .action-btn-grad:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(245,101,34,.4)}
  .action-btn-grad:disabled{opacity:.5;cursor:not-allowed;transform:none}

  /* ── Rating ── */
  .rating-btn{
    flex:1;display:flex;align-items:center;justify-content:center;gap:8px;
    border:2px solid var(--black-10);background:var(--surface);border-radius:12px;
    font-family:var(--font);font-size:.9rem;font-weight:700;color:var(--black-75);
    padding:12px;cursor:pointer;transition:all .2s}
  .rating-btn:hover{border-color:var(--primary-mild)}
  .rating-selected-good{background:var(--success-bg)!important;border-color:var(--success)!important;color:var(--success)!important}
  .rating-selected-bad{background:var(--error-bg)!important;border-color:var(--error)!important;color:var(--error)!important}

  /* ── Chat ── */
  .chat-panel{display:flex;flex-direction:column;flex:1;overflow:hidden}
  .chat-enc-notice{
    display:flex;align-items:center;gap:6px;padding:7px 18px;
    background:#F4EEEB;border-bottom:1px solid var(--black-10);
    font-size:.7rem;font-weight:600;color:var(--black-65);flex-shrink:0;font-family:monospace}
  .chat-messages{flex:1;overflow-y:auto;padding:20px 18px;display:flex;flex-direction:column;gap:10px}
  .chat-bubble-row{display:flex}
  .chat-bubble-row-me{justify-content:flex-end}
  .chat-bubble{max-width:72%;border-radius:14px;padding:9px 13px;line-height:1.5}
  .chat-bubble-me{background:linear-gradient(135deg,#FF7A50,#F56522);color:white;border-bottom-right-radius:4px}
  .chat-bubble-them{background:var(--surface);border:1px solid var(--black-10);color:var(--black);border-bottom-left-radius:4px}
  .chat-text{font-size:.85rem}
  .chat-ts{font-size:.65rem;opacity:.65;margin-top:3px;text-align:right}
  .chat-bubble-them .chat-ts{text-align:left}
  .chat-input-row{
    display:flex;align-items:flex-end;gap:10px;
    padding:12px 18px;border-top:1px solid var(--black-10);
    background:var(--surface);flex-shrink:0}
  .chat-input{
    flex:1;resize:none;font-family:var(--font);font-size:.87rem;color:var(--black);
    background:var(--bg);border:1.5px solid var(--black-10);border-radius:12px;
    padding:9px 14px;outline:none;transition:border-color .15s;max-height:100px;line-height:1.5}
  .chat-input:focus{border-color:var(--primary)}
  .chat-send-btn{
    width:38px;height:38px;border-radius:50%;border:none;
    background:var(--grad);color:white;cursor:pointer;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
    transition:transform .15s,opacity .15s;box-shadow:0 2px 8px rgba(245,101,34,.3)}
  .chat-send-btn:hover:not(:disabled){transform:scale(1.07)}

  /* ── Direction badge ── */
  .dir-buy{background:#F2F9E7;color:#65A519;border-radius:999px;padding:2px 10px;font-size:.7rem;font-weight:800}
  .dir-sell{background:#FFF0EE;color:#DF321F;border-radius:999px;padding:2px 10px;font-size:.7rem;font-weight:800}

  /* ── Badge ── */
  .badge-supertrader{background:linear-gradient(90deg,#FF4D42,#FFA24C);color:white;border-radius:999px;padding:1px 7px;font-size:.68rem;font-weight:700}
  .badge-fast{background:#FEEDE5;color:#C45104;border-radius:999px;padding:1px 7px;font-size:.68rem;font-weight:700}
  .badge-role{background:#D7F2FE;color:#037DB5;border-radius:999px;padding:2px 10px;font-size:.7rem;font-weight:700}
  .tag-method{background:var(--black-5);color:var(--black-75);border-radius:999px;padding:2px 8px;font-size:.72rem;font-weight:600}
  .tag-currency{background:var(--primary-mild);color:var(--primary-dark);border-radius:999px;padding:2px 8px;font-size:.72rem;font-weight:600}

  .chat-dispute-btn{
    display:flex;align-items:center;gap:5px;flex-shrink:0;
    border:1.5px solid #DF321F;background:white;border-radius:999px;
    font-family:var(--font);font-size:.75rem;font-weight:700;color:#DF321F;
    padding:0 12px;height:34px;cursor:pointer;white-space:nowrap;transition:all .15s}
  .chat-dispute-btn-active:hover{background:#FFF0EE;border-color:#DF321F}
  .chat-dispute-btn-inactive{opacity:.5;cursor:default;border-style:dashed}

  /* scrollbar */
  ::-webkit-scrollbar{width:5px}
  ::-webkit-scrollbar-thumb{background:var(--black-10);border-radius:3px}
  @keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
`;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function TradeExecution() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const { auth, isLoggedIn, handleLogin, handleLogout, showAvatarMenu, setShowAvatarMenu } = useAuth();
  const { get, post, patch } = useApi();

  // Redirect to trades dashboard when not logged in and no trade ID
  useEffect(() => {
    if (!auth && !routeId) navigate("/trades", { replace: true });
  }, [auth, routeId]);

  const [mobileOpen, setMobileOpen]   = useState(false);
  const [mobileTab, setMobileTab]     = useState("details");   // "details" | "chat"
  const [allPrices,           setAllPrices]           = useState({ EUR: BTC_PRICE });
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR","CHF","GBP"]);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const btcPrice = Math.round(allPrices[selectedCurrency] ?? BTC_PRICE);

  useEffect(() => {
    if (!showAvatarMenu) return;
    const close = (e) => { if (!e.target.closest(".avatar-menu-wrap")) setShowAvatarMenu(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showAvatarMenu]);

  // ── LIVE CONTRACT DATA ──
  const [liveContract, setLiveContract] = useState(null);
  const [liveMessages, setLiveMessages] = useState(null);
  const [contractLoading, setContractLoading] = useState(!!auth && !!routeId);
  const [showPostCancel, setShowPostCancel] = useState(false);
  const [chatSymKey, setChatSymKey] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [signingModal, setSigningModal] = useState(null); // { title, description, taskType } or null
  const [pendingTaskType, setPendingTaskType] = useState(null); // "release" | "refund" | "rate" | null
  const [chatPage, setChatPage] = useState(0);
  const [chatHasMore, setChatHasMore] = useState(false);
  const [chatLoadingMore, setChatLoadingMore] = useState(false);
  const [toast, setToast] = useState(null);
  const [escrowFundedAmount, setEscrowFundedAmount] = useState(null);
  const [escrowLoading, setEscrowLoading] = useState(false);
  const signingStatusRef = useRef(null); // track the tradeStatus when signing modal opened
  const sawRefundOrReviveRef = useRef(false); // once true, block regression to tradeCanceled

  // ── Restore pending task state from localStorage on mount ──
  useEffect(() => {
    if (!routeId) return;
    for (const type of ["release", "refund", "rate"]) {
      if (hasPendingTask(routeId, type)) { setPendingTaskType(type); break; }
    }
  }, [routeId]);

  // ── Fetch actual funded amount when status is fundingAmountDifferent ──
  useEffect(() => {
    const st = liveContract?.tradeStatus;
    if (st !== "fundingAmountDifferent" || !auth || !liveContract) {
      if (escrowFundedAmount != null) setEscrowFundedAmount(null);
      return;
    }
    if (escrowFundedAmount != null) return; // already fetched
    let cancelled = false;
    (async () => {
      setEscrowLoading(true);
      try {
        const offerId = String(liveContract.contract.id).split("-")[0];
        const res = await get(`/offer/${offerId}/escrow`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const amounts = data?.funding?.amounts ?? [];
          setEscrowFundedAmount(amounts.reduce((a, b) => a + b, 0));
        }
      } catch (e) {
        console.warn("[Trade] Escrow fetch failed:", e.message);
      } finally {
        if (!cancelled) setEscrowLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [liveContract?.tradeStatus, liveContract?.contract?.id]);

  // ── Auto-create escrow when status is createEscrow and address is null ──
  const escrowCreatedRef = useRef(false);
  useEffect(() => {
    const st = liveContract?.tradeStatus;
    const escrowAddr = liveContract?.contract?.escrow;
    if (st !== "createEscrow" || escrowAddr || !auth?.multisigXpub || !liveContract || escrowCreatedRef.current) return;
    if (liveContract.role !== "seller") return;
    escrowCreatedRef.current = true;
    (async () => {
      try {
        const offerId = String(liveContract.contract.id).split("-")[0];
        const pubKeyHex = deriveEscrowPubKey(auth.multisigXpub, Number(offerId));
        const returnAddress = deriveReturnAddress(auth.xpub, Number(offerId));
        const res = await post(`/offer/${offerId}/escrow`, { publicKey: pubKeyHex, returnAddress });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          console.warn("[Trade] Escrow creation failed:", err?.error || res.status);
          escrowCreatedRef.current = false;
          return;
        }
        const data = await res.json().catch(() => null);
        // Re-fetch contract to get the escrow address and updated status
        const fresh = await get(`/contract/${routeId}`);
        if (fresh.ok) {
          const c = await fresh.json();
          setLiveContract(prev => prev ? {
            ...prev,
            tradeStatus: c.tradeStatus ?? prev.tradeStatus,
            contract: { ...prev.contract, escrow: c.escrow ?? data?.escrow ?? prev.contract.escrow },
          } : prev);
        }
      } catch (e) {
        console.warn("[Trade] Escrow creation error:", e.message);
        escrowCreatedRef.current = false;
      }
    })();
  }, [liveContract?.tradeStatus, liveContract?.contract?.escrow, liveContract?.role]);

  // ── Poll contract status while signing modal is open OR a pending task exists ──
  useEffect(() => {
    if ((!signingModal && !pendingTaskType) || !auth || !routeId) return;
    signingStatusRef.current = liveContract?.tradeStatus ?? null;
    const iv = setInterval(async () => {
      try {
        const res = await get('/contract/' + routeId);
        if (!res.ok) return;
        const c = await res.json();
        // Block regression once refundOrReviveRequired has been seen
        if (sawRefundOrReviveRef.current
            && (c.tradeStatus === "tradeCanceled" || c.tradeStatus === "confirmCancelation")) return;
        if (c.tradeStatus === "refundOrReviveRequired") sawRefundOrReviveRef.current = true;
        if (c.tradeStatus && c.tradeStatus !== signingStatusRef.current) {
          setLiveContract(prev => prev ? { ...prev, tradeStatus: c.tradeStatus } : prev);
          setSigningModal(null);
          if (pendingTaskType) {
            clearPendingTask(routeId, pendingTaskType);
            setPendingTaskType(null);
          }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(iv);
  }, [signingModal, pendingTaskType, routeId]);

  // ── Poll contract status every 5s to catch external changes (e.g. escrow funded from mobile) ──
  useEffect(() => {
    if (!auth || !routeId || signingModal || !liveContract) return;
    const iv = setInterval(async () => {
      try {
        const res = await get('/contract/' + routeId);
        if (!res.ok) return;
        const c = await res.json();
        const newStatus = c.tradeStatus ?? c.status;
        if (!newStatus || newStatus === liveContract.tradeStatus) return;
        // Block regression once refundOrReviveRequired has been seen
        if (sawRefundOrReviveRef.current
            && (newStatus === "tradeCanceled" || newStatus === "confirmCancelation")) return;
        if (newStatus === "refundOrReviveRequired") sawRefundOrReviveRef.current = true;
        const isBuyer = (c.buyer?.id ?? c.buyerId) === peachId;
        setLiveContract(prev => prev ? {
          ...prev,
          tradeStatus: newStatus,
          contract: {
            ...prev.contract,
            paymentExpectedBy: c.paymentExpectedBy ? new Date(c.paymentExpectedBy).getTime() : prev.contract.paymentExpectedBy,
            escrow: c.escrow ?? prev.contract.escrow,
          },
          cancelationRequested: c.cancelationRequested ?? prev.cancelationRequested,
          canceled: c.canceled ?? prev.canceled,
          canceledBy: c.canceledBy ?? prev.canceledBy,
          paymentTimedOut: prev.paymentTimedOut || newStatus === "paymentTooLate",
          disputeActive: c.disputeActive ?? prev.disputeActive,
          disputeReason: c.disputeReason ?? prev.disputeReason,
          disputeInitiator: c.disputeInitiator ?? prev.disputeInitiator,
          disputeOutcome: c.disputeOutcome ?? prev.disputeOutcome,
          disputeWinner: c.disputeWinner ?? prev.disputeWinner,
          disputeOutcomeAcknowledgedBy: c.disputeOutcomeAcknowledgedBy ?? prev.disputeOutcomeAcknowledgedBy,
          disputeAcknowledgedByCounterParty: c.disputeAcknowledgedByCounterParty ?? prev.disputeAcknowledgedByCounterParty,
        } : prev);
        if (newStatus === "refundOrReviveRequired") setShowPostCancel(true);
      } catch {}
    }, 5000);
    return () => clearInterval(iv);
  }, [auth, routeId, signingModal, liveContract?.tradeStatus]);

  // Use live contract data — no demo fallback
  const scenario = liveContract ?? {
    role: "buyer", tradeStatus: "fundEscrow",
    contract: { id: routeId || "—", direction: "buy", amount: 0, fiat: null, currency: "EUR", premium: 0, method: "", creationDate: Date.now(), paymentExpectedBy: null, escrow: null },
    counterparty: null, paymentDetails: null, paymentDetailsError: null,
  };
  const messages = liveMessages ?? [];
  const { contract, counterparty: rawCounterparty, tradeStatus: status, role, paymentDetails, paymentDetailsError } = scenario;
  const counterparty = rawCounterparty ?? { initials: "??", color: "#7D675E", name: "Unknown", rep: 0, trades: 0, badges: [], online: false };

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

  // ── FETCH LIVE CONTRACT + CHAT ──
  const peachId = auth?.peachId;
  useEffect(() => {
    if (!auth || !routeId) return;

    async function fetchContract() {
      let symKey = null;
      // /contract/:id doesn't return refunded/newTradeId — read from sessionStorage
      // (written by dashboard from /contracts/summary which has those fields)
      let meta = null;
      try { meta = JSON.parse(sessionStorage.getItem(`contract-meta:${routeId}`)); } catch {}
      try {
        const res = await get(`/contract/${routeId}`);
        if (!res.ok) return null;
        const c = await res.json();
        const isBuyer = (c.buyer?.id ?? c.buyerId) === peachId;
        setLiveContract({
          id: c.id,
          role: isBuyer ? "buyer" : "seller",
          tradeStatus: c.tradeStatus ?? c.status ?? "fundEscrow",
          instantTrade: c.instantTrade ?? false,
          contract: {
            id: c.id,
            direction: isBuyer ? "buy" : "sell",
            amount: c.amount ?? 0,
            fiat: c.price != null ? c.price.toFixed(2) : null,
            currency: c.currency ?? "EUR",
            premium: c.premium ?? 0,
            method: c.paymentMethod ?? "",
            creationDate: c.creationDate ? new Date(c.creationDate).getTime() : Date.now(),
            paymentExpectedBy: c.paymentExpectedBy ? new Date(c.paymentExpectedBy).getTime() : null,
            escrow: c.escrow ?? null,
          },
          counterparty: (() => {
            const cp = isBuyer ? (c.seller ?? {}) : (c.buyer ?? {});
            const cpId = cp.id ?? "unknown";
            const shortHex = cpId.length > 8 ? cpId.slice(0, 8).toUpperCase() : cpId.toUpperCase();
            const short = "Peach" + shortHex;
            return {
              initials: shortHex.slice(0, 2),
              color: "#7D675E",
              name: short,
              rep: toPeaches(cp.rating ?? cp.peachRating ?? 0),
              trades: cp.trades ?? 0,
              badges: (cp.medals ?? []).map(m =>
                m === "fastTrader" ? "fast" : m === "superTrader" ? "supertrader" : m
              ),
              online: false,
            };
          })(),
          releaseAddress: c.releaseAddress ?? null,
          paymentDetails: null, // will be populated below after decryption
          paymentDetailsError: false,
          // Keep raw encrypted fields for dispute re-encryption
          paymentDataEncrypted: c.paymentDataEncrypted ?? null,
          buyerPaymentDataEncrypted: c.buyerPaymentDataEncrypted ?? null,
          // Dispute fields
          // Cancellation fields
          cancelationRequested: c.cancelationRequested ?? false,
          canceled: c.canceled ?? false,
          canceledBy: c.canceledBy ?? null,
          paymentTimedOut: (c.tradeStatus ?? c.status) === "paymentTooLate",
          // Dispute fields
          disputeActive: c.disputeActive ?? false,
          disputeReason: c.disputeReason ?? null,
          disputeInitiator: c.disputeInitiator ?? null,
          disputeOutcome: c.disputeOutcome ?? null,
          disputeWinner: c.disputeWinner ?? null,
          disputeOutcomeAcknowledgedBy: c.disputeOutcomeAcknowledgedBy ?? [],
          disputeAcknowledgedByCounterParty: c.disputeAcknowledgedByCounterParty ?? false,
          isEmailRequired: c.isEmailRequired ?? false,
          // Revive/refund guard fields — /contract/:id doesn't return these,
          // so we read from sessionStorage (written by dashboard from /contracts/summary)
          revived: !!c.newOfferId || !!meta?.newTradeId,
          refunded: !!c.refunded || !!meta?.refunded,
          newOfferId: c.newOfferId ?? meta?.newTradeId ?? null,
        });

        const isRevived = !!c.newOfferId || !!meta?.newTradeId;
        const isRefunded = !!c.refunded || !!meta?.refunded;

        // Pin refundOrReviveRequired once seen — prevents flickering from server alternation
        const initialStatus = c.tradeStatus ?? c.status;
        if (initialStatus === "refundOrReviveRequired") {
          sawRefundOrReviveRef.current = true;
          if (!isRefunded && !isRevived) setShowPostCancel(true);
        }
        // Server returns tradeCanceled for all cancelled seller contracts —
        // normalize to refundOrReviveRequired so the correct UI renders
        if (!isBuyer && (initialStatus === "tradeCanceled" || initialStatus === "confirmCancelation")) {
          sawRefundOrReviveRef.current = true;
          setLiveContract(prev => prev ? { ...prev, tradeStatus: "refundOrReviveRequired" } : prev);
          if (!isRefunded && !isRevived) setShowPostCancel(true);
        }

        // Decrypt payment data if available
        // As buyer: need seller's payment details (paymentDataEncrypted)
        // As seller: need buyer's payment details (buyerPaymentDataEncrypted)
        const encryptedPM = isBuyer ? c.paymentDataEncrypted : c.buyerPaymentDataEncrypted;
        const symKeyEnc = c.symmetricKeyEncrypted;

        // Decrypt symmetric key (needed for both PM data and chat)
        if (symKeyEnc && auth.pgpPrivKey) {
          try {
            const raw = await decryptPGPMessage(symKeyEnc, auth.pgpPrivKey);
            symKey = raw ? raw.trim() : null;
            if (symKey) setChatSymKey(symKey);
          } catch (err) {
            console.warn("[Trade] Symmetric key decryption failed:", err.message);
          }
        }

        // Decrypt payment data if available
        if (encryptedPM) {
          let pmJson = null;
          // Try symmetric decryption first (standard trade flow)
          if (symKey) {
            try { pmJson = await decryptSymmetric(encryptedPM, symKey); } catch {}
          }
          // Fallback to asymmetric decryption (mobile may encrypt with PGP public key)
          if (!pmJson && auth.pgpPrivKey) {
            try { pmJson = await decryptPGPMessage(encryptedPM, auth.pgpPrivKey); } catch {}
          }
          if (pmJson) {
            try {
              const pmData = JSON.parse(pmJson);
              setLiveContract(prev => prev ? { ...prev, paymentDetails: {
                type: pmData.type ?? c.paymentMethod ?? "",
                bank: pmData.bank ?? pmData.beneficiary ?? "",
                iban: pmData.iban ?? "",
                bic: pmData.bic ?? "",
                name: pmData.userName ?? pmData.beneficiary ?? pmData.name ?? "",
                email: pmData.email ?? "",
                phone: pmData.phone ?? "",
                reference: pmData.reference ?? `PEACH-${c.id}`,
              }} : prev);
            } catch (err) {
              console.warn("[Trade] PM JSON parse failed:", err.message);
              setLiveContract(prev => prev ? { ...prev, paymentDetailsError: true } : prev);
            }
          } else {
            setLiveContract(prev => prev ? { ...prev, paymentDetailsError: true } : prev);
          }
        }
      } catch {}
      setContractLoading(false);
      return symKey ?? null;
    }

    async function parseChatPage(rawMsgs, symKey) {
      return Promise.all(rawMsgs.map(async (m) => {
        let text = m.message ?? m.text ?? "";
        if (symKey && text.includes("-----BEGIN PGP MESSAGE-----")) {
          const decrypted = await decryptSymmetric(text, symKey);
          if (decrypted) text = decrypted;
        }
        return {
          id: m.id ?? m.date ?? Math.random(),
          from: m.from === peachId ? "me" : (m.from === "system" ? "system" : "them"),
          text,
          ts: m.date ? new Date(m.date).getTime() : Date.now(),
          readBy: m.readBy ?? [],
        };
      }));
    }

    async function fetchChat(symKey) {
      try {
        const res = await get(`/contract/${routeId}/chat?page=0`);
        if (!res.ok) return;
        const data = await res.json();
        const msgs = Array.isArray(data) ? data : (data?.messages ?? []);
        const parsed = await parseChatPage(msgs, symKey);
        setLiveMessages(parsed.sort((a, b) => a.ts - b.ts));
        setChatPage(0);
        setChatHasMore(msgs.length >= 22);
        // Mark messages as read
        const unread = msgs.filter(m => m.from !== peachId && !(m.readBy ?? []).includes(peachId));
        if (unread.length > 0) {
          post(`/contract/${routeId}/chat/received`, {
            start: unread[0].date,
            end: unread[unread.length - 1].date,
          }).catch(() => {});
        }
      } catch {}
    }

    setContractLoading(true);
    fetchContract().then(symKey => fetchChat(symKey));
  }, [routeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chat polling: fetch page 0 every 5s to pick up new messages ──
  useEffect(() => {
    if (!chatSymKey || !routeId || !auth) return;
    const interval = setInterval(async () => {
      try {
        const res = await get(`/contract/${routeId}/chat?page=0`);
        if (!res.ok) return;
        const data = await res.json();
        const msgs = Array.isArray(data) ? data : (data?.messages ?? []);
        const parsed = await Promise.all(msgs.map(async (m) => {
          let text = m.message ?? m.text ?? "";
          if (chatSymKey && text.includes("-----BEGIN PGP MESSAGE-----")) {
            const decrypted = await decryptSymmetric(text, chatSymKey);
            if (decrypted) text = decrypted;
          }
          return {
            id: m.id ?? m.date ?? Math.random(),
            from: m.from === peachId ? "me" : (m.from === "system" ? "system" : "them"),
            text,
            ts: m.date ? new Date(m.date).getTime() : Date.now(),
          };
        }));
        // Merge: deduplicate by id, keep older pages, sort chronologically
        setLiveMessages(prev => {
          if (!prev) return parsed.sort((a, b) => a.ts - b.ts);
          const byId = new Map();
          for (const m of prev) byId.set(m.id, m);
          for (const m of parsed) byId.set(m.id, m);
          return [...byId.values()].sort((a, b) => a.ts - b.ts);
        });
        // Mark unread
        const unread = msgs.filter(m => m.from !== peachId && !(m.readBy ?? []).includes(peachId));
        if (unread.length > 0) {
          post(`/contract/${routeId}/chat/received`, {
            start: unread[0].date,
            end: unread[unread.length - 1].date,
          }).catch(() => {});
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [chatSymKey, routeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load older chat messages ──
  const loadOlderChatRef = useRef(null);
  loadOlderChatRef.current = async () => {
    if (chatLoadingMore || !chatHasMore || !chatSymKey) return;
    const nextPage = chatPage + 1;
    setChatLoadingMore(true);
    try {
      const res = await get(`/contract/${routeId}/chat?page=${nextPage}`);
      if (!res.ok) return;
      const data = await res.json();
      const msgs = Array.isArray(data) ? data : (data?.messages ?? []);
      const parsed = await Promise.all(msgs.map(async (m) => {
        let text = m.message ?? m.text ?? "";
        if (chatSymKey && text.includes("-----BEGIN PGP MESSAGE-----")) {
          const decrypted = await decryptSymmetric(text, chatSymKey);
          if (decrypted) text = decrypted;
        }
        return {
          id: m.id ?? m.date ?? Math.random(),
          from: m.from === peachId ? "me" : (m.from === "system" ? "system" : "them"),
          text,
          ts: m.date ? new Date(m.date).getTime() : Date.now(),
          readBy: m.readBy ?? [],
        };
      }));
      setLiveMessages(prev => {
        const byId = new Map();
        for (const m of (prev ?? [])) byId.set(m.id, m);
        for (const m of parsed) byId.set(m.id, m);
        return [...byId.values()].sort((a, b) => a.ts - b.ts);
      });
      setChatPage(nextPage);
      setChatHasMore(msgs.length >= 22);
    } catch {} finally {
      setChatLoadingMore(false);
    }
  };
  function loadOlderChat() { loadOlderChatRef.current?.(); }

  const satsPerCur  = Math.round(SAT / btcPrice);

  // Elapsed time
  const elapsedMs = Date.now() - contract.creationDate;
  const elapsedH  = Math.floor(elapsedMs / 3600_000);
  const elapsedM  = Math.floor((elapsedMs % 3600_000) / 60_000);
  const elapsedStr = elapsedH > 0 ? `${elapsedH}h ${elapsedM}m` : `${elapsedM}m`;

  // Deadline countdown
  let deadlineStr = null;
  if (contract.paymentExpectedBy) {
    const left = contract.paymentExpectedBy - Date.now();
    const h = Math.floor(left / 3600_000);
    const m = Math.floor((left % 3600_000) / 60_000);
    deadlineStr = `${h}h ${m}m`;
  }

  // Premium color (perspective-aware)
  const premColor = role === "buyer"
    ? (contract.premium < 0 ? "#65A519" : "#DF321F")
    : (contract.premium > 0 ? "#65A519" : "#DF321F");

  const unreadCount = messages.filter(m => m.from !== "me").length;

  return (
    <>
      <style>{CSS}</style>

      {/* ── TOPBAR ── */}
      <Topbar
        onBurgerClick={() => setMobileOpen(o => !o)}
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
        active="trades"
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
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

      <div className="page-wrap">

        {/* ── Loading state (logged in, fetching contract) ── */}
        {contractLoading && (
          <div style={{
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            flex:1, gap:16, padding:"80px 0",
          }}>
            <div className="spinner" style={{ width:32, height:32, border:"3px solid #EAE3DF", borderTopColor:"var(--primary)", borderRadius:"50%" }}/>
            <span style={{ fontSize:".85rem", color:"#7D675E", fontWeight:600 }}>Loading trade…</span>
          </div>
        )}

        {!contractLoading && (
        <>
        {/* ── Trade sub-topbar ── */}
        <div className="trade-topbar">
          <button className="trade-topbar-back" title="Back to Trades" onClick={() => navigate("/trades")}><IconBack/></button>
          <span className="trade-topbar-id">{formatTradeId(contract.id)}</span>
          <span className="trade-topbar-sep">·</span>
          <span className={role === "buyer" ? "dir-buy" : "dir-sell"}>{role === "buyer" ? "BUY" : "SELL"}</span>
          <span className="trade-topbar-sep">·</span>
          <StatusChip status={status} large role={role}/>
        </div>

        {/* ── Mobile tabs ── */}
        <div className="mobile-tabs">
          <button className={`mobile-tab${mobileTab === "details" ? " active" : ""}`} onClick={() => setMobileTab("details")}>
            Trade Details
          </button>
          <button className={`mobile-tab${mobileTab === "chat" ? " active" : ""}`} onClick={() => setMobileTab("chat")}>
            Chat {unreadCount > 0 && <span style={{ background:"#DF321F", color:"white", borderRadius:999, padding:"0 6px", fontSize:".65rem", fontWeight:800, marginLeft:4 }}>{unreadCount}</span>}
          </button>
        </div>

        {/* ── Split layout ── */}
        <div className="split-layout">

          {/* ── LEFT: Trade Details ── */}
          <div className={`split-left${mobileTab === "chat" ? " mobile-hidden" : ""}`}>

            {/* Counterparty */}
            <div className="counterparty-card">
              <Avatar initials={counterparty.initials} color={counterparty.color} size={44} online={counterparty.online}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="cp-name">{counterparty.name}</div>
                <div className="cp-meta">
                  <PeachRating rep={counterparty.rep ?? 0} size={14}/>
                  <span>·</span>
                  <span>{counterparty.trades} trades</span>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                {counterparty.badges?.includes("supertrader") && <span className="badge-supertrader">🏆 Supertrader</span>}
                {counterparty.badges?.includes("fast") && <span className="badge-fast">⚡ Fast</span>}
              </div>
            </div>

            {/* Trade amounts — no deadline here anymore */}
            <div className="trade-summary">
              <div>
                <div className="summary-item-label">Amount</div>
                <div className="summary-item-val"><SatsAmount sats={contract.amount} size="lg"/></div>
              </div>
              <div>
                <div className="summary-item-label">You {role === "buyer" ? "pay" : "receive"}</div>
                <div className="summary-item-val">{contract.currency === "CHF" ? "CHF " : "€"}{contract.fiat}</div>
                <div className="summary-item-sub">{contract.currency}</div>
              </div>
              <div>
                <div className="summary-item-label">Premium</div>
                <div className="summary-item-val" style={{ color:premColor }}>
                  {contract.premium > 0 ? "+" : ""}{contract.premium.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="summary-item-label">Method</div>
                <div className="summary-item-val" style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span className="tag-method">{contract.method}</span>
                </div>
              </div>
            </div>

            {/* Escrow link — just above Actions */}
            <div style={{ padding:"0 0 4px", textAlign:"right" }}>
              <a
                href={`https://mempool.space/address/${contract.escrow}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize:".72rem", fontWeight:600, color:"#7D675E",
                  textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4,
                }}
                onMouseEnter={e => e.currentTarget.style.color="#F56522"}
                onMouseLeave={e => e.currentTarget.style.color="#7D675E"}
              >
                View escrow on mempool.space
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9L9 2M9 2H5M9 2v4"/>
                </svg>
              </a>
            </div>

            {/* ── Actions (always first, includes deadline + escrow funding) ── */}
            <div className="panel-section">
              <div className="panel-section-title">Actions</div>

              {/* Payment deadline — inside actions */}
              {/* Payment deadline pill — not shown for seller when paymentRequired (has its own merged bar) */}
              {deadlineStr && !(status === "paymentRequired" && role === "seller") && status !== "dispute" && status !== "disputeWithoutEscrowFunded" && status !== "tradeCanceled" && status !== "refundOrReviveRequired" && status !== "confirmCancelation" && status !== "fundEscrow" && status !== "createEscrow" && status !== "waitingForFunding" && status !== "escrowWaitingForConfirmation" && status !== "fundingAmountDifferent" && status !== "wrongAmountFundedOnContract" && status !== "wrongAmountFundedOnContractRefundWaiting" && (
                <div style={{
                  display:"flex", alignItems:"center", gap:12,
                  background:"#FEEDE5", border:"1.5px solid rgba(196,81,4,.2)",
                  borderRadius:12, padding:"12px 16px", marginBottom:12,
                }}>
                  <span style={{ fontSize:"1.5rem", flexShrink:0 }}>⏳</span>
                  <div>
                    <div style={{ fontSize:".72rem", fontWeight:700, color:"#C45104", textTransform:"uppercase", letterSpacing:".05em", marginBottom:1 }}>Payment deadline</div>
                    <div style={{ fontSize:"1.05rem", fontWeight:800, color:"#C45104" }}>{deadlineStr} remaining</div>
                  </div>
                </div>
              )}

              {/* Escrow funding card — inside actions for seller */}
              {role === "seller" && (status === "fundEscrow" || status === "createEscrow" || status === "waitingForFunding") && (
                <EscrowFundingCard
                  address={contract.escrow}
                  sats={contract.amount}
                  btcPrice={btcPrice}
                />
              )}

              {/* Wrong amount funded — seller */}
              {role === "seller" && (status === "fundingAmountDifferent" || status === "wrongAmountFundedOnContract" || status === "wrongAmountFundedOnContractRefundWaiting") && (
                <WrongAmountFundedCard
                  status={status}
                  expectedSats={contract.amount}
                  actualSats={escrowFundedAmount}
                  loading={escrowLoading}
                  pendingRefund={pendingTaskType === "refund"}
                  onPendingClick={() => setSigningModal({
                    title: "Refund Escrow",
                    description: "Approve the escrow refund on your Peach mobile app. A push notification has been sent to your phone.",
                    taskType: "refund",
                  })}
                  onContinueTrade={async () => {
                    setActionError(null);
                    try {
                      const offerId = String(contract.id).split("-")[0];
                      const res = await post('/offer/' + offerId + '/escrow/confirm');
                      if (res.ok) {
                        const fresh = await get('/contract/' + routeId);
                        if (fresh.ok) {
                          const c = await fresh.json();
                          setLiveContract(prev => prev ? { ...prev, tradeStatus: c.tradeStatus } : prev);
                        }
                        setToast("Trade continued with funded amount");
                        setTimeout(() => setToast(null), 4000);
                      } else {
                        const err = await res.json().catch(() => ({}));
                        setActionError("Failed to confirm escrow: " + (err.error || res.status));
                      }
                    } catch (e) {
                      setActionError("Confirm escrow error: " + e.message);
                    }
                  }}
                  onRefundEscrow={async () => {
                    setActionError(null);
                    try {
                      const offerId = String(contract.id).split("-")[0];
                      const res = await post(`/offer/${offerId}/refundPendingAction`);
                      if (!res.ok) {
                        const err = await res.json().catch(() => null);
                        throw new Error(err?.error || err?.message || `HTTP ${res.status}`);
                      }
                      savePendingTask(routeId, "refund");
                      setPendingTaskType("refund");
                      setSigningModal({
                        title: "Refund Escrow",
                        description: "Approve the escrow refund on your Peach mobile app. A push notification has been sent to your phone.",
                        taskType: "refund",
                      });
                    } catch (e) {
                      setActionError("Failed to request refund: " + e.message);
                    }
                  }}
                  onClose={() => navigate("/trades")}
                />
              )}

              {/* Buyer awaiting escrow */}
              {(status === "fundEscrow" || status === "createEscrow" || status === "waitingForFunding") && role === "buyer" && (
                <>
                  <div style={{
                    display:"flex", flexDirection:"column", alignItems:"center",
                    gap:12, padding:"20px 0", textAlign:"center",
                  }}>
                    <div style={{
                      width:48, height:48, borderRadius:"50%",
                      background:"#FEFCE5", border:"2px solid #F5CE22",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"1.4rem",
                    }}>⏳</div>
                    <div style={{ fontWeight:700, fontSize:".95rem" }}>Waiting for escrow</div>
                    <div style={{ fontSize:".83rem", color:"#7D675E", lineHeight:1.6, maxWidth:280 }}>
                      The seller is funding the escrow. Once the Bitcoin is locked in, the trade will begin and you'll be able to send payment.
                    </div>
                    <div style={{ fontSize:".85rem", fontWeight:700, color:"#7D675E" }}>No actions required for the moment.</div>
                  </div>
                </>
              )}

              {/* Wrong amount funded — buyer info */}
              {(status === "wrongAmountFundedOnContract" || status === "wrongAmountFundedOnContractRefundWaiting") && role === "buyer" && (
                <div style={{
                  display:"flex", flexDirection:"column", alignItems:"center",
                  gap:12, padding:"20px 0", textAlign:"center",
                }}>
                  <div style={{
                    width:48, height:48, borderRadius:"50%",
                    background:"#FEFCE5", border:"2px solid #F5CE22",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"1.4rem",
                  }}>⚠</div>
                  <div style={{ fontWeight:700, fontSize:".95rem" }}>Wrong Amount Funded</div>
                  <div style={{ fontSize:".83rem", color:"#7D675E", lineHeight:1.6, maxWidth:280 }}>
                    The seller funded the escrow with an incorrect amount. The trade has been cancelled and the seller will be refunded.
                  </div>
                </div>
              )}

              {/* Action error banner */}
              {actionError && (
                <div style={{
                  display:"flex", alignItems:"flex-start", gap:8,
                  background:"#FFF0EE", border:"1px solid rgba(223,50,31,.2)",
                  borderRadius:8, padding:"10px 12px", marginBottom:8,
                  fontSize:".82rem", color:"#DF321F", fontWeight:600, lineHeight:1.5,
                }}>
                  <IconAlert/>
                  <span>{actionError}</span>
                </div>
              )}

              {/* All other action states */}
              {status !== "tradeCompleted" && status !== "rateUser"
                && status !== "fundEscrow" && status !== "createEscrow" && status !== "waitingForFunding"
                && status !== "fundingAmountDifferent"
                && status !== "wrongAmountFundedOnContract"
                && status !== "wrongAmountFundedOnContractRefundWaiting" && (
                <ActionPanel scenario={scenario} showPostCancel={showPostCancel} pendingTask={pendingTaskType} onPendingClick={() => {
                  const labels = {
                    release: { title: "Release Bitcoin", description: "Approve the Bitcoin release on your Peach mobile app. A push notification has been sent to your phone." },
                    refund: { title: "Refund Escrow", description: "Approve the escrow refund on your Peach mobile app. A push notification has been sent to your phone." },
                    rate: { title: "Sign Rating", description: "Approve the rating on your Peach mobile app. A push notification has been sent to your phone." },
                  };
                  const l = labels[pendingTaskType] || labels.release;
                  setSigningModal({ ...l, taskType: pendingTaskType });
                }} onAction={async (action, arg) => {
                  if (action === "extend_time") {
                    try {
                      const res = await patch('/contract/' + contract.id + '/extendTime');
                      if (res.ok) {
                        // Refresh contract data to get new paymentExpectedBy
                        const cRes = await get('/contract/' + contract.id);
                        if (cRes.ok) {
                          const c = await cRes.json();
                          setLiveContract(prev => prev ? { ...prev, contract: { ...prev.contract, paymentExpectedBy: new Date(c.paymentExpectedBy).getTime() } } : prev);
                        }
                      } else {
                        const err = await res.json().catch(() => ({}));
                        console.warn("[Trade] Extend deadline failed:", err.error || res.status);
                      }
                    } catch (e) {
                      console.warn("[Trade] Extend deadline error:", e.message);
                    }
                  } else if (action === "cancel_trade") {
                    try {
                      const res = await post('/contract/' + contract.id + '/cancel');
                      if (res.ok) {
                        // Cancel is immediate — re-fetch to get real status
                        const fresh = await get('/contract/' + contract.id);
                        if (fresh.ok) {
                          const c = await fresh.json();
                          setLiveContract(prev => prev ? { ...prev, canceled: true, tradeStatus: c.tradeStatus ?? "tradeCanceled" } : prev);
                        } else {
                          setLiveContract(prev => prev ? { ...prev, canceled: true, tradeStatus: "tradeCanceled" } : prev);
                        }
                      } else {
                        const err = await res.json().catch(() => ({}));
                        setActionError("Cancel trade failed: " + (err.error || res.status));
                      }
                    } catch (e) {
                      console.warn("[Trade] Cancel trade error:", e.message);
                    }
                  } else if (action === "republish_offer") {
                    setActionError(null);
                    try {
                      const offerId = String(contract.id).split("-")[0];
                      const res = await post('/offer/' + offerId + '/revive');
                      if (res.ok) {
                        const data = await res.json().catch(() => ({}));
                        setLiveContract(prev => prev ? { ...prev, revived: true, newOfferId: data.newOfferId ?? null } : prev);
                        setShowPostCancel(false);
                        setToast("Offer republished" + (data.newOfferId ? ` — new offer: ${formatTradeId(data.newOfferId, "offer")}` : ""));
                        setTimeout(() => setToast(null), 4000);
                      } else {
                        const err = await res.json().catch(() => ({}));
                        setActionError("Republish failed: " + (err.error || res.status));
                      }
                    } catch (e) {
                      setActionError("Republish error: " + e.message);
                    }
                  } else if (action === "refund_escrow") {
                    setActionError(null);
                    try {
                      const offerId = String(contract.id).split("-")[0];
                      const res = await post(`/offer/${offerId}/refundPendingAction`);
                      if (!res.ok) {
                        const err = await res.json().catch(() => null);
                        throw new Error(err?.error || err?.message || `HTTP ${res.status}`);
                      }
                      savePendingTask(routeId, "refund");
                      setPendingTaskType("refund");
                      setSigningModal({ title: "Refund Escrow", description: "Approve the escrow refund on your Peach mobile app. A push notification has been sent to your phone.", taskType: "refund" });
                    } catch (e) {
                      setActionError("Failed to request signing: " + e.message);
                    }
                  } else if (action === "payment_sent") {
                    setActionError(null);
                    try {
                      const res = await post(`/contract/${contract.id}/payment/createPaymentMadePendingAction`);
                      if (!res.ok) {
                        const err = await res.json().catch(() => null);
                        throw new Error(err?.error || err?.message || `HTTP ${res.status}`);
                      }
                      savePendingTask(routeId, "confirmPayment");
                      setPendingTaskType("confirmPayment");
                      setSigningModal({ title: "Confirm Payment", description: "Please confirm your payment on the Peach mobile app. Open the trade on your phone and slide to confirm you've sent the payment.", taskType: "confirmPayment" });
                    } catch (e) {
                      setActionError("Failed to request confirmation: " + e.message);
                    }
                  } else if (action === "release_bitcoin") {
                    setActionError(null);
                    try {
                      const buyerRating = arg; // "positive" or "negative", passed from rating modal
                      const res = await post(`/contract/${contract.id}/payment/createPaymentConfirmedPendingAction`, { buyerRating });
                      if (!res.ok) {
                        const err = await res.json().catch(() => null);
                        throw new Error(err?.error || err?.message || `HTTP ${res.status}`);
                      }
                      savePendingTask(routeId, "release");
                      setPendingTaskType("release");
                      setSigningModal({ title: "Release Bitcoin", description: "Approve the Bitcoin release on your Peach mobile app. A push notification has been sent to your phone.", taskType: "release" });
                    } catch (e) {
                      setActionError("Failed to request signing: " + e.message);
                    }
                  } else if (action === "dispute_ack_email") {
                    try {
                      const res = await post('/contract/' + contract.id + '/dispute/acknowledge', { email: arg });
                      if (res.ok) {
                        setLiveContract(prev => prev ? { ...prev, isEmailRequired: false, disputeAcknowledgedByCounterParty: true } : prev);
                        return true;
                      }
                    } catch {}
                    return false;
                  } else if (action === "dispute_ack_outcome") {
                    try {
                      const res = await post('/contract/' + contract.id + '/dispute/acknowledgeOutcome');
                      if (res.ok) {
                        const myRole = scenario.role === "buyer" ? "buyer" : "seller";
                        setLiveContract(prev => prev ? { ...prev, disputeOutcomeAcknowledgedBy: [...(prev.disputeOutcomeAcknowledgedBy ?? []), myRole] } : prev);
                        return true;
                      }
                    } catch {}
                    return false;
                  } else {
                    console.log("action:", action);
                  }
                }}/>
              )}
            </div>

            {/* Payment details (buyer sees seller's payment info, or vice versa) — hidden after cancellation */}
            {paymentDetails && !["tradeCanceled", "confirmCancelation", "refundOrReviveRequired"].includes(status) && (
              <div className="panel-section">
                <div className="panel-section-title">Payment Details</div>
                {status === "paymentRequired" && role === "buyer" && (
                  <p style={{ fontSize:".83rem", color:"#7D675E", marginBottom:10 }}>
                    Send the exact fiat amount to the payment details below, then confirm using the slider.
                  </p>
                )}
                <p style={{ fontSize:".83rem", color:"#DF321F", fontWeight:600, marginBottom:10 }}>
                  {role === "buyer"
                    ? "Make sure to include the reference with your payment"
                    : "make sure the payment you'll receive comes from the provenance announced below."}
                </p>
                <PaymentDetailsCard details={paymentDetails}/>
              </div>
            )}

            {/* Payment details decryption failed — fallback message (hidden after cancellation) */}
            {!paymentDetails && paymentDetailsError && !["tradeCanceled", "confirmCancelation", "refundOrReviveRequired"].includes(status) && (
              <div className="panel-section">
                <div className="panel-section-title">Payment Details</div>
                <div style={{
                  display:"flex", alignItems:"center", gap:10,
                  background:"#FFE6E1", borderRadius:10, padding:"12px 14px",
                }}>
                  <IconAlert/>
                  <span style={{ fontSize:".83rem", color:"#DF321F", fontWeight:600, lineHeight:1.5 }}>
                    Could not decrypt payment data, ask for details in the chat if needed
                  </span>
                </div>
              </div>
            )}

            {/* Escrow address (seller, non-escrow-funding states — funding states show full funding card above) */}
            {role === "seller" && status !== "fundEscrow" && status !== "createEscrow" && status !== "waitingForFunding" && (
              <div className="panel-section">
                <div className="panel-section-title">Escrow</div>
                <EscrowAddressCard address={contract.escrow}/>
              </div>
            )}

            {/* Rating panel — buyer only (seller rates during release modal) */}
            {(status === "rateUser" || status === "tradeCompleted") && role === "buyer" && (
              <div className="panel-section">
                <RatingPanel counterparty={counterparty} pending={pendingTaskType === "rate"} onPendingClick={() => setSigningModal({ title: "Sign Rating", description: "Approve the rating on your Peach mobile app. A push notification has been sent to your phone.", taskType: "rate" })} onRate={async (r) => {
                  const rating = r === 5 ? 1 : -1;
                  try {
                    await createTask(post, "rate", { contractId: contract.id, rating });
                    savePendingTask(routeId, "rate");
                    setPendingTaskType("rate");
                    setSigningModal({ title: "Sign Rating", description: "Approve the rating on your Peach mobile app. A push notification has been sent to your phone.", taskType: "rate" });
                  } catch (e) {
                    setActionError("Failed to request signing: " + e.message);
                  }
                }}/>
              </div>
            )}
          </div>

          {/* ── RIGHT: Chat ── */}
          <div className={`split-right${mobileTab === "chat" ? " mobile-active" : ""}`}>
            <ChatPanel messages={messages} tradeId={contract.id} role={role} disabled={status === "fundEscrow" || status === "createEscrow" || status === "waitingForFunding" || status === "fundingAmountDifferent" || status === "wrongAmountFundedOnContract" || status === "wrongAmountFundedOnContractRefundWaiting"} status={status} hasMore={chatHasMore} loadingMore={chatLoadingMore} onLoadOlder={loadOlderChat} onSend={async (plaintext) => {
              if (!chatSymKey || !auth?.pgpPrivKey) return false;
              try {
                const encrypted = await encryptSymmetric(plaintext, chatSymKey);
                const signature = await signPGPMessage(plaintext, auth.pgpPrivKey);
                const res = await post('/contract/' + contract.id + '/chat', { message: encrypted, signature });
                return res.ok;
              } catch (e) {
                console.warn("[Chat] Send failed:", e.message);
                return false;
              }
            }} onDisputeSubmit={async (body) => {
              if (!chatSymKey || !auth?.pgpPrivKey) return false;
              try {
                // Get platform public key from /v1/info
                const infoRes = await get('/info');
                if (!infoRes.ok) return false;
                const info = await infoRes.json();
                const platformPubKey = info.peach?.pgpPublicKey;
                if (!platformPubKey) {
                  console.warn("[Dispute] Platform PGP key not found in /info response");
                  return false;
                }
                // Re-encrypt symmetric key for the platform
                const symmetricKeyEncrypted = await encryptForPublicKey(chatSymKey, platformPubKey);
                if (!symmetricKeyEncrypted) return false;
                // Decrypt payment data (may be symmetric or asymmetric PGP) then re-encrypt for platform
                async function decryptPMField(encrypted) {
                  const sym = await decryptSymmetric(encrypted, chatSymKey);
                  if (sym) return sym;
                  const asym = await decryptPGPMessage(encrypted, auth.pgpPrivKey);
                  if (asym) return asym;
                  return null;
                }
                let paymentDataSellerEncrypted = undefined;
                let paymentDataBuyerEncrypted = undefined;
                if (scenario.paymentDataEncrypted) {
                  try {
                    const sellerPM = await decryptPMField(scenario.paymentDataEncrypted);
                    if (sellerPM) paymentDataSellerEncrypted = await encryptForPublicKey(sellerPM, platformPubKey);
                  } catch (e) { console.warn("[Dispute] Seller PM re-encrypt failed:", e.message); }
                }
                if (scenario.buyerPaymentDataEncrypted) {
                  try {
                    const buyerPM = await decryptPMField(scenario.buyerPaymentDataEncrypted);
                    if (buyerPM) paymentDataBuyerEncrypted = await encryptForPublicKey(buyerPM, platformPubKey);
                  } catch (e) { console.warn("[Dispute] Buyer PM re-encrypt failed:", e.message); }
                }
                const res = await post('/contract/' + contract.id + '/dispute', {
                  ...body,
                  symmetricKeyEncrypted,
                  paymentDataSellerEncrypted,
                  paymentDataBuyerEncrypted,
                });
                if (res.ok) {
                  setLiveContract(prev => prev ? { ...prev, tradeStatus: "dispute" } : prev);
                  return true;
                }
                const err = await res.json().catch(() => ({}));
                console.warn("[Dispute] Submit failed:", err.error || res.status);
                return false;
              } catch (e) {
                console.warn("[Dispute] Submit error:", e.message);
                return false;
              }
            }}/>
          </div>

        </div>
        </>
        )}
      </div>

      {/* ── HORIZONTAL STEPPER (fixed bottom) ── */}
      {!contractLoading && (
      <div className="h-stepper-wrap">
        <HorizontalStepper status={status}/>
      </div>
      )}

      {/* ── MOBILE SIGNING MODAL ── */}
      <MobileSigningModal
        open={!!signingModal}
        title={signingModal?.title}
        description={signingModal?.description}
        onCancel={() => setSigningModal(null)}
      />

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)",
          background:"var(--black-85)", color:"white", padding:"10px 22px",
          borderRadius:999, fontSize:".85rem", fontWeight:700, zIndex:9999,
          boxShadow:"0 4px 18px rgba(0,0,0,.18)", whiteSpace:"nowrap",
        }}>{toast}</div>
      )}
    </>
  );
}
