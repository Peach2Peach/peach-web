import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SatsAmount } from "../../components/BitcoinAmount.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useApi } from "../../hooks/useApi.js";
import { useCurrency } from "../../components/AppLayout.jsx";
import MobileSigningModal, {
  hasPendingTask,
  savePendingTask,
  clearPendingTask,
} from "../../components/MobileSigningModal.jsx";
import Toast from "../../components/Toast.jsx";
import {
  decryptPGPMessage,
  decryptSymmetric,
  encryptSymmetric,
  signPGPMessage,
  encryptForPublicKey,
} from "../../utils/pgp.js";
import {
  satsToFiat,
  formatTradeId,
  toPeaches,
} from "../../utils/format.js";
import { deriveEscrowPubKey, deriveReturnAddress } from "../../utils/escrow.js";
import { fetchWithSessionCheck } from "../../utils/sessionGuard.js";
import { extractCustomRefundAddressFromProfile } from "../../utils/customRefundAddressSync.js";
import { fetchSavedCustomPayoutAddress } from "../../utils/customPayoutAddressSync.js";
import { deriveDisplayStatus } from "../../data/statusConfig.js";
import Avatar from "../../components/Avatar.jsx";
import StatusChip from "../../components/StatusChip.jsx";
import PeachRating from "../../components/PeachRating.jsx";
import RepeatTraderBadge from "../../components/RepeatTraderBadge.jsx";
import { BadgesInfoPopup } from "../../components/InfoPopup.jsx";
import {
  IconBack,
  IconAlert,
  HorizontalStepper,
  PaymentDetailsCard,
  CollapsibleAddressSection,
  CollapsibleSection,
  EscrowFundingCard,
  FundingDeadlinePill,
  WrongAmountFundedCard,
  ActionPanel,
  RatingPanel,
  TradeCompleteModal,
  BatchInfoModal,
  ChatPanel,
  DisputeFlow,
  BuyerGroupHugDisplay,
  BuyerCustomAddressToggle,
  SuccessBanner,
  ActionBanner,
  IconClock,
  DisputeBanner,
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
  .trade-topbar-id{font-family:monospace;font-size:.82rem;font-weight:700;color:var(--black-65);cursor:pointer;text-decoration:underline;text-underline-offset:2px;user-select:none}
  .trade-topbar-id:hover{color:var(--primary)}
  .trade-topbar-id.is-copied{color:var(--success);text-decoration:none;cursor:default}
  .trade-topbar-sep{color:var(--black-10);font-size:1.2rem;flex-shrink:0}
  .trade-topbar-name{font-size:.9rem;font-weight:700}
  .trade-topbar-elapsed{font-size:.75rem;color:var(--black-65);display:flex;align-items:center;gap:4px}
  .trade-topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px}


  /* ── Split layout ── */
  .split-layout{display:flex;flex:1;overflow:hidden}
  .split-left{
    flex:1;min-width:320px;
    overflow-y:auto;padding:24px 24px calc(24px + var(--stepper-h));
    border-right:1px solid var(--black-10);
  }
  .split-left-full{width:100%;border-right:none;max-width:600px;margin:0 auto}
  .split-left-inner{max-width:780px;margin:0 auto}
  .split-left-inner-wide{max-width:900px;container-type:inline-size}
  .funding-two-col{display:contents}
  .funding-left-col{display:contents}
  .funding-right-col{display:contents}
  .funding-passthrough{display:contents}
  .funding-deadline-pill{margin-left:auto;margin-right:auto}
  .escrow-funding-card{margin-left:auto;margin-right:auto}
  @container (min-width: 820px){
    .funding-two-col{
      display:grid;
      grid-template-columns:1fr 530px;
      gap:24px;
      align-items:start;
    }
    .funding-left-col{display:flex;flex-direction:column;align-items:stretch}
    .funding-left-col .counterparty-card,
    .funding-left-col .trade-summary{max-width:none;margin-left:0;margin-right:0;margin-bottom:20px}
    .funding-left-col .funding-deadline-pill{margin-left:0;margin-right:0}
    .funding-right-col{display:flex;flex-direction:column}
    .funding-right-col .escrow-funding-card{margin-left:0;margin-right:0}
  }
  .split-right{flex:0 0 40%;max-width:560px;display:flex;flex-direction:column;overflow:hidden;min-width:0;padding-bottom:var(--stepper-h)}

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
  /* Hide a section title when its only following content is an empty action panel */
  .panel-section:not(:has(.panel-section-title ~ *:not(.action-panel:empty))) .panel-section-title{
    display:none}

  /* ── Counterparty card ── */
  .counterparty-card{
    display:flex;align-items:center;gap:12px;
    background:var(--surface);border:1px solid var(--black-10);
    border-radius:12px;padding:12px 14px;margin-bottom:20px;
    max-width:400px;margin-left:auto;margin-right:auto;
  }
  .cp-name{font-size:.9rem;font-weight:700}
  .cp-meta{font-size:.75rem;color:var(--black-65);display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:2px}

  /* ── Trade summary ── */
  .trade-summary{
    background:var(--surface);border:1px solid var(--black-10);border-radius:12px;
    padding:14px;margin-bottom:20px;display:grid;grid-template-columns:auto 1fr;
    row-gap:12px;column-gap:16px;align-items:center;max-width:400px;
    margin-left:auto;margin-right:auto}
  .summary-item-label{font-size:.72rem;font-weight:700;text-transform:uppercase;
    letter-spacing:.05em;color:var(--black-65)}
  .summary-item-val{font-size:.95rem;font-weight:700;justify-self:end;text-align:right}
  .summary-item-sub{font-size:.72rem;color:var(--black-65);margin-top:1px;justify-self:end}
  .summary-partner{display:flex;flex-direction:column;align-items:flex-end;gap:4px;justify-self:end}
  .summary-partner-name{font-size:.95rem;font-weight:700}
  .summary-partner-meta{font-size:.75rem;color:var(--black-65);display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
  .summary-partner-badges{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}

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
    transition:transform .15s}
  .action-btn-grad:hover{transform:translateY(-1px)}
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

  /* ── Payout pending celebration (auto-dismiss after 2s) ── */
  .payout-celeb-backdrop{
    position:fixed;inset:0;z-index:700;
    background:rgba(0,0,0,.35);
    display:flex;align-items:center;justify-content:center;padding:20px;
    pointer-events:none;
    animation:fadeIn .2s ease, payoutCelebBackdropOut .4s ease 2s forwards;
  }
  .payout-celeb-card{
    width:100%;max-width:440px;
    transform-origin:center;
    pointer-events:auto;
    filter:drop-shadow(0 24px 60px rgba(0,0,0,.35));
    animation:payoutCelebIn .35s cubic-bezier(.34,1.56,.64,1),
              payoutCelebOut .4s ease 2s forwards;
  }
  .payout-batching-link{
    background:none;border:none;padding:0;font:inherit;
    color:var(--primary-dark);text-decoration:underline;cursor:pointer;
  }
  .payout-batching-link:hover{opacity:.8}
  /* The SuccessBanner already provides marginBottom: 12 inline — drop it
     inside the modal so the card sits flush in the center. */
  .payout-celeb-card > div{margin-bottom:0!important}
  @keyframes payoutCelebIn{
    from{opacity:0;transform:scale(.7)}
    to  {opacity:1;transform:scale(1)}
  }
  @keyframes payoutCelebOut{
    from{opacity:1;transform:scale(1)}
    to  {opacity:0;transform:scale(.4)}
  }
  @keyframes payoutCelebBackdropOut{
    from{opacity:1}
    to  {opacity:0}
  }

  /* ── Trade Complete celebration modal ── */
  .tc-modal-backdrop{
    position:fixed;inset:0;z-index:700;background:rgba(0,0,0,.55);
    display:flex;align-items:center;justify-content:center;padding:20px;
    animation:fadeIn .18s ease;
  }
  .tc-modal-card{
    position:relative;background:var(--surface);
    border:1.5px solid var(--success);
    border-radius:20px;padding:36px 28px 24px;
    max-width:460px;width:100%;
    box-shadow:0 24px 70px rgba(0,0,0,.28);
    animation:modalIn .22s ease;
    text-align:center;
  }
  .tc-close{
    position:absolute;top:10px;right:12px;
    width:30px;height:30px;border-radius:50%;
    border:none;background:transparent;color:var(--black-65);
    cursor:pointer;font-size:1rem;line-height:1;
    display:flex;align-items:center;justify-content:center;
  }
  .tc-close:hover{background:var(--black-5);color:var(--black)}
  .tc-icon{
    width:72px;height:72px;margin:0 auto 12px;
    border-radius:50%;background:var(--success-bg);
    color:var(--success);font-size:2.4rem;font-weight:800;
    display:flex;align-items:center;justify-content:center;
    animation:celebrationPop .4s cubic-bezier(.34,1.56,.64,1);
  }
  .tc-headline{
    font-size:1.6rem;font-weight:800;color:var(--success);
    animation:celebrationPop .4s cubic-bezier(.34,1.56,.64,1) .05s both;
  }
  .tc-sub{font-size:.95rem;color:var(--black-65);margin-top:4px}
  .tc-divider{height:1px;background:var(--black-10);margin:20px 0 16px}
  .tc-rating-prompt{font-size:.92rem;color:var(--black-75);margin-bottom:12px}
  .tc-rating-row{display:flex;gap:12px;margin-bottom:14px}
  .tc-submit{width:100%}
  .tc-err{margin-top:10px;font-size:.8rem;color:var(--error)}
  .tc-thanks{padding:30px 0;animation:celebrationPop .4s cubic-bezier(.34,1.56,.64,1);font-weight:700;color:var(--success)}
  .tc-checkmark{font-size:2.6rem;color:var(--success);font-weight:800;margin-bottom:6px}

  /* ── Batch info (GroupHug) modal ── */
  .bi-modal-card{
    position:relative;background:var(--surface);
    border:1.5px solid var(--black-10);
    border-radius:20px;padding:30px 24px 22px;
    max-width:440px;width:100%;
    box-shadow:0 24px 70px rgba(0,0,0,.28);
    animation:modalIn .22s ease;
  }
  .bi-headline{font-size:1.1rem;font-weight:800;color:var(--success);margin-bottom:6px}
  .bi-sub{font-size:.85rem;color:var(--black-65);line-height:1.5;margin-bottom:18px}
  .bi-row{
    display:flex;justify-content:space-between;align-items:center;gap:10px;
    padding:10px 0;border-top:1px solid var(--black-10);
  }
  .bi-row-label{font-size:.78rem;color:var(--black-65);font-weight:600}
  .bi-row-value{font-size:.82rem;color:var(--black);font-weight:600}
  .bi-mono{font-family:monospace}
  .bi-addr{
    background:none;border:none;cursor:pointer;color:var(--black);
    display:inline-flex;align-items:center;gap:6px;padding:0;font:inherit;font-weight:600;
  }
  .bi-addr:hover{opacity:.75}
  .bi-copy{color:var(--primary-dark);font-size:.95rem}
  .bi-accel{
    display:block;margin-top:14px;width:100%;
    background:none;border:1.5px solid var(--primary);
    color:var(--primary-dark);
    border-radius:999px;padding:9px 14px;
    font:inherit;font-weight:700;font-size:.82rem;cursor:pointer;
  }
  .bi-accel:hover{background:var(--primary-mild)}

  /* ── Chat ── */
  .chat-panel{display:flex;flex-direction:column;flex:1;overflow:hidden}
  .chat-enc-notice{
    display:flex;align-items:center;gap:6px;padding:7px 18px;
    background:var(--black-5);border-bottom:1px solid var(--black-10);
    font-size:.7rem;font-weight:600;color:var(--black-65);flex-shrink:0;font-family:monospace}
  .chat-messages{flex:1;overflow-y:auto;padding:20px 18px;display:flex;flex-direction:column;gap:10px}
  .chat-bubble-row{display:flex}
  .chat-bubble-row-me{justify-content:flex-end}
  .chat-bubble{max-width:72%;border-radius:14px;padding:9px 13px;line-height:1.5}
  .chat-bubble-me{background:var(--grad);color:white;border-bottom-right-radius:4px}
  .chat-bubble-them{background:var(--surface);border:1px solid var(--black-10);color:var(--black);border-bottom-left-radius:4px}
  .chat-text{font-size:.85rem}
  .chat-ts{font-size:.65rem;opacity:.65;margin-top:3px;text-align:right}
  .chat-bubble-them .chat-ts{text-align:left}
  .chat-system-row{
    display:flex;flex-direction:column;align-items:center;gap:4px;
    padding:10px 14px;margin:4px auto;
    max-width:78%;border-radius:10px;
    background:rgba(245,101,34,.06);
    border:1px dashed rgba(245,101,34,.3);
    text-align:center;
  }
  .chat-system-label{
    display:inline-flex;align-items:center;gap:5px;
    font-size:.62rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
    color:var(--primary-dark,var(--primary-dark));
  }
  .chat-system-text{
    font-size:.8rem;line-height:1.5;color:var(--black,var(--black));
    white-space:pre-wrap;
  }
  .chat-system-ts{
    font-size:.62rem;color:var(--black-65,var(--black-65));opacity:.8;
  }
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
  .dir-buy{background:var(--success-bg);color:var(--success);border-radius:999px;padding:5px 14px;font-size:.8rem;font-weight:800}
  .dir-sell{background:var(--error-bg);color:var(--error);border-radius:999px;padding:5px 14px;font-size:.8rem;font-weight:800}

  /* ── Badge ── */
  .badge-supertrader{background:var(--grad);color:white;border-radius:999px;padding:1px 7px;font-size:.68rem;font-weight:700}
  .badge-fast{background:var(--primary-mild);color:var(--primary-dark);border-radius:999px;padding:1px 7px;font-size:.68rem;font-weight:700}
  .badge-role{background:#D7F2FE;color:#037DB5;border-radius:999px;padding:2px 10px;font-size:.7rem;font-weight:700}
  .tag-method{background:var(--black-5);color:var(--black-75);border-radius:999px;padding:2px 8px;font-size:.72rem;font-weight:600}
  .tag-currency{background:var(--primary-mild);color:var(--primary-dark);border-radius:999px;padding:2px 8px;font-size:.72rem;font-weight:600}

  .chat-dispute-btn{
    display:flex;align-items:center;gap:5px;flex-shrink:0;
    border:1.5px solid var(--error);background:white;border-radius:999px;
    font-family:var(--font);font-size:.75rem;font-weight:700;color:var(--error);
    padding:0 12px;height:34px;cursor:pointer;white-space:nowrap;transition:all .15s}
  .chat-dispute-btn-active:hover{background:var(--error-bg);border-color:var(--error)}
  .chat-dispute-btn-inactive{opacity:.5;cursor:default;border-style:dashed}

  /* scrollbar */
  ::-webkit-scrollbar{width:5px}
  ::-webkit-scrollbar-thumb{background:var(--black-10);border-radius:3px}
`;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function TradeExecution() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  // AppLayout owns Topbar/SideNav state. Trade-execution only needs auth/isLoggedIn.
  const { auth, isLoggedIn } = useAuth();
  const { get, post, patch } = useApi();
  const { btcPrice, selectedCurrency } = useCurrency();

  // Redirect to trades dashboard when not logged in and no trade ID
  useEffect(() => {
    if (!auth && !routeId) navigate("/trades", { replace: true });
  }, [auth, routeId]);

  const [mobileTab, setMobileTab] = useState("details"); // "details" | "chat"
  const [badgesHelpOpen, setBadgesHelpOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width:900px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width:900px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const chatVisible = !isMobile || mobileTab === "chat";
  const chatVisibleRef = useRef(chatVisible);
  chatVisibleRef.current = chatVisible;
  // Optimistic clear: when chat becomes visible, zero the badge locally.
  // Server-side mark-as-read happens via the chat GET fired by the polling
  // effect; the next contract poll will then return unreadMessages: 0.
  useEffect(() => {
    if (!chatVisible) return;
    setLiveContract((prev) =>
      prev && (prev.unreadMessages ?? 0) > 0
        ? { ...prev, unreadMessages: 0 }
        : prev,
    );
  }, [chatVisible]);
  const [copiedId, setCopiedId] = useState(false);

  // ── LIVE CONTRACT DATA ──
  const [liveContract, setLiveContract] = useState(null);
  const [liveMessages, setLiveMessages] = useState(null);
  const [contractLoading, setContractLoading] = useState(!!auth && !!routeId);
  const [chatSymKey, setChatSymKey] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [signingModal, setSigningModal] = useState(null); // { title, description, taskType } or null
  const [pendingTaskType, setPendingTaskType] = useState(null); // "release" | "refund" | "rate" | "fundEscrow" | "confirmPayment" | null
  const [fundEscrowLoading, setFundEscrowLoading] = useState(false);
  const [fundEscrowError, setFundEscrowError] = useState(null);
  // Payout-choice modal: shown when the buyer slides "I've sent the payment"
  // and the contract has no releaseAddress yet but the user has a saved
  // custom payout address. `null` means closed.
  const [payoutChoice, setPayoutChoice] = useState(null); // null | { address, signature }
  // Bumped to remount the buyer's "I've sent the payment" slider so it
  // returns to its un-slid state when the choice modal is dismissed.
  const [paymentSliderKey, setPaymentSliderKey] = useState(0);
  // Bumped to remount the refund sliders if the refund API call fails, so the
  // slider doesn't stay frozen at the right edge in awaiting-mobile state.
  const [refundSliderKey, setRefundSliderKey] = useState(0);
  // Saved custom payout address loaded from /v069/selfUser (decrypted).
  // undefined = loading, null = none saved, object = { address, bip322Signature, ... }
  const [savedCustomPayout, setSavedCustomPayout] = useState(undefined);
  // Buyer toggle: receive to custom address. Default ON once we discover the
  // user has a saved address (see effect below). Ephemeral per-trade.
  const [useCustomPayout, setUseCustomPayout] = useState(false);
  const [showSetupPayoutPopup, setShowSetupPayoutPopup] = useState(false);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [celebrationDismissed, setCelebrationDismissed] = useState(null);
  const [payoutCelebOpen, setPayoutCelebOpen] = useState(false);
  const [batchInfoOpen, setBatchInfoOpen] = useState(false);

  // Load the buyer's saved custom payout address from /v069/selfUser once
  // on mount (canonical source: PGP-encrypted blob, same as Settings reads).
  useEffect(() => {
    if (!auth?.token || !auth?.pgpPrivKey) {
      setSavedCustomPayout(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const saved = await fetchSavedCustomPayoutAddress(auth);
      if (!cancelled) setSavedCustomPayout(saved);
    })();
    return () => { cancelled = true; };
  }, [auth?.token, auth?.pgpPrivKey, auth?.baseUrl]);

  // Default the toggle ON once we discover an address is saved. Fires once
  // per load; the user can still flip it off afterwards.
  useEffect(() => {
    if (savedCustomPayout?.address) setUseCustomPayout(true);
  }, [savedCustomPayout]);

  // Re-fetch the contract and merge the mobileAction* pending-action ids into
  // liveContract so the deep-link button picks up the new id immediately
  // after a `create…PendingAction` POST (no waiting for the periodic poll).
  async function refreshContractMobileActions() {
    if (!routeId) return;
    try {
      const res = await get("/contract/" + routeId);
      if (!res.ok) return;
      const c = await res.json();
      setLiveContract((prev) => {
        if (!prev?.contract) return prev;
        return {
          ...prev,
          contract: {
            ...prev.contract,
            mobileActionFundEscrowWasTriggered:
              c.mobileActionFundEscrowWasTriggered ??
              prev.contract.mobileActionFundEscrowWasTriggered,
            mobileActionRefundWasTriggered:
              c.mobileActionRefundWasTriggered ??
              prev.contract.mobileActionRefundWasTriggered,
            mobileActionPaymentMadeWasTriggered:
              c.mobileActionPaymentMadeWasTriggered ??
              prev.contract.mobileActionPaymentMadeWasTriggered,
            mobileActionPaymentConfirmedWasTriggered:
              c.mobileActionPaymentConfirmedWasTriggered ??
              prev.contract.mobileActionPaymentConfirmedWasTriggered,
          },
        };
      });
    } catch {}
  }
  const [chatPage, setChatPage] = useState(0);
  const [chatHasMore, setChatHasMore] = useState(false);
  const [chatLoadingMore, setChatLoadingMore] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastTone, setToastTone] = useState("default"); // "default" | "error" | "orange" | "success"
  const [showDispute, setShowDispute] = useState(false);
  const [escrowFundedAmount, setEscrowFundedAmount] = useState(null);
  const [escrowLoading, setEscrowLoading] = useState(false);
  const [refundAddress, setRefundAddress] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState(null);
  const signingStatusRef = useRef(null); // track the tradeStatus when signing modal opened

  // ── Restore pending task state from localStorage on mount ──
  useEffect(() => {
    if (!routeId) return;
    for (const type of [
      "release",
      "refund",
      "fundEscrow",
      "confirmPayment",
    ]) {
      if (hasPendingTask(routeId, type)) {
        setPendingTaskType(type);
        break;
      }
    }
  }, [routeId]);

  // ── Reflect a refund pending-action triggered from the global wrong-amount
  // popup. Covers the case where this screen is already mounted when the popup
  // navigates here (same-route nav doesn't re-run the mount effect above). ──
  useEffect(() => {
    const handler = (e) => {
      if (String(e?.detail?.contractId) === String(routeId)) {
        setPendingTaskType("refund");
      }
    };
    window.addEventListener("peach:refund-pending-created", handler);
    return () => window.removeEventListener("peach:refund-pending-created", handler);
  }, [routeId]);

  // ── Seed pending task state from backend flags on contract load ──
  useEffect(() => {
    const c = liveContract?.contract ?? liveContract;
    if (!c) return;
    if (c.mobileActionRefundWasTriggered && pendingTaskType !== "refund") {
      setPendingTaskType("refund");
      if (routeId) savePendingTask(routeId, "refund");
    }
    if (
      c.mobileActionFundEscrowWasTriggered &&
      pendingTaskType !== "fundEscrow"
    ) {
      setPendingTaskType("fundEscrow");
      if (routeId) savePendingTask(routeId, "fundEscrow");
    }
    if (
      c.mobileActionPaymentMadeWasTriggered &&
      pendingTaskType !== "confirmPayment"
    ) {
      setPendingTaskType("confirmPayment");
      if (routeId) savePendingTask(routeId, "confirmPayment");
    }
    if (
      c.mobileActionPaymentConfirmedWasTriggered &&
      pendingTaskType !== "release"
    ) {
      setPendingTaskType("release");
      if (routeId) savePendingTask(routeId, "release");
    }
  }, [liveContract, routeId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    return () => {
      cancelled = true;
    };
  }, [liveContract?.tradeStatus, liveContract?.contract?.id]);

  // ── Auto-create escrow when status is createEscrow and address is null ──
  const escrowCreatedRef = useRef(false);
  useEffect(() => {
    const st = liveContract?.tradeStatus;
    const escrowAddr = liveContract?.contract?.escrow;
    if (
      st !== "createEscrow" ||
      escrowAddr ||
      !auth?.multisigXpub ||
      !liveContract ||
      escrowCreatedRef.current
    )
      return;
    if (liveContract.role !== "seller") return;
    escrowCreatedRef.current = true;
    (async () => {
      try {
        const offerId = String(liveContract.contract.id).split("-")[0];
        const pubKeyHex = deriveEscrowPubKey(
          auth.multisigXpub,
          Number(offerId),
        );
        const returnAddress = deriveReturnAddress(auth.xpub, Number(offerId));
        const res = await post(`/offer/${offerId}/escrow`, {
          publicKey: pubKeyHex,
          returnAddress,
          derivationPathVersion: 2,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          console.warn(
            "[Trade] Escrow creation failed:",
            err?.error || res.status,
          );
          escrowCreatedRef.current = false;
          return;
        }
        const data = await res.json().catch(() => null);
        // Re-fetch contract to get the escrow address and updated status
        const fresh = await get(`/contract/${routeId}`);
        if (fresh.ok) {
          const c = await fresh.json();
          setLiveContract((prev) => {
            if (!prev) return prev;
            const nextStatus =
              deriveDisplayStatus({
                tradeStatus: c.tradeStatus,
                direction: prev.contract?.direction,
                escrowFundingTimeLimitExpired: c.escrowFundingTimeLimitExpired,
              }) ?? prev.tradeStatus;
            return {
              ...prev,
              tradeStatus: nextStatus,
              contract: {
                ...prev.contract,
                escrow: c.escrow ?? data?.escrow ?? prev.contract.escrow,
              },
            };
          });
        }
      } catch (e) {
        console.warn("[Trade] Escrow creation error:", e.message);
        escrowCreatedRef.current = false;
      }
    })();
  }, [
    liveContract?.tradeStatus,
    liveContract?.contract?.escrow,
    liveContract?.role,
  ]);

  // ── Poll contract status while signing modal is open OR a pending task exists ──
  useEffect(() => {
    if ((!signingModal && !pendingTaskType) || !auth || !routeId) return;
    signingStatusRef.current = liveContract?.tradeStatus ?? null;
    const iv = setInterval(async () => {
      try {
        const res = await get("/contract/" + routeId);
        if (!res.ok) return;
        const c = await res.json();
        const isBuyer = (c.buyer?.id ?? c.buyerId) === peachId;
        const nextStatus = deriveDisplayStatus({
          tradeStatus: c.tradeStatus,
          direction: isBuyer ? "buy" : "sell",
          escrowFundingTimeLimitExpired: c.escrowFundingTimeLimitExpired,
        });
        if (nextStatus && nextStatus !== signingStatusRef.current) {
          setLiveContract((prev) =>
            prev ? { ...prev, tradeStatus: nextStatus } : prev,
          );
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
        const res = await get("/contract/" + routeId);
        if (!res.ok) return;
        const c = await res.json();
        const isBuyer = (c.buyer?.id ?? c.buyerId) === peachId;
        const newStatus = deriveDisplayStatus({
          tradeStatus: c.tradeStatus ?? c.status,
          direction: isBuyer ? "buy" : "sell",
          escrowFundingTimeLimitExpired: c.escrowFundingTimeLimitExpired,
        });
        // Always sync unreadMessages — independent of status change
        if (
          c.unreadMessages != null &&
          c.unreadMessages !== liveContract.unreadMessages
        ) {
          setLiveContract((prev) =>
            prev ? { ...prev, unreadMessages: c.unreadMessages } : prev,
          );
        }
        // Always sync batchInfo — its participants/timeRemaining tick while the
        // trade sits in payoutPending and the tradeStatus stays unchanged.
        {
          const prevBI = liveContract.contract?.batchInfo ?? null;
          const nextBI = c.batchInfo ?? null;
          const changed =
            (prevBI == null) !== (nextBI == null) ||
            (prevBI && nextBI && (
              prevBI.participants !== nextBI.participants ||
              prevBI.maxParticipants !== nextBI.maxParticipants ||
              prevBI.timeRemaining !== nextBI.timeRemaining ||
              prevBI.completed !== nextBI.completed ||
              prevBI.txId !== nextBI.txId
            ));
          if (changed) {
            setLiveContract((prev) =>
              prev
                ? { ...prev, contract: { ...prev.contract, batchInfo: nextBI } }
                : prev,
            );
          }
        }
        if (!newStatus || newStatus === liveContract.tradeStatus) return;
        setLiveContract((prev) =>
          prev
            ? {
                ...prev,
                tradeStatus: newStatus,
                contract: {
                  ...prev.contract,
                  paymentExpectedBy: c.paymentExpectedBy
                    ? new Date(c.paymentExpectedBy).getTime()
                    : prev.contract.paymentExpectedBy,
                  fundingExpectedBy: c.fundingExpectedBy
                    ? new Date(c.fundingExpectedBy).getTime()
                    : prev.contract.fundingExpectedBy,
                  escrow: c.escrow ?? prev.contract.escrow,
                  ratingBuyer: c.ratingBuyer ?? prev.contract.ratingBuyer ?? null,
                  ratingSeller: c.ratingSeller ?? prev.contract.ratingSeller ?? null,
                  // Pending-action ids (formerly booleans) — keep in sync so the
                  // "Open Peach App" deep-link button picks up server changes.
                  mobileActionFundEscrowWasTriggered:
                    c.mobileActionFundEscrowWasTriggered ??
                    prev.contract.mobileActionFundEscrowWasTriggered,
                  mobileActionRefundWasTriggered:
                    c.mobileActionRefundWasTriggered ??
                    prev.contract.mobileActionRefundWasTriggered,
                  mobileActionPaymentMadeWasTriggered:
                    c.mobileActionPaymentMadeWasTriggered ??
                    prev.contract.mobileActionPaymentMadeWasTriggered,
                  mobileActionPaymentConfirmedWasTriggered:
                    c.mobileActionPaymentConfirmedWasTriggered ??
                    prev.contract.mobileActionPaymentConfirmedWasTriggered,
                },
                cancelationRequested:
                  c.cancelationRequested ?? prev.cancelationRequested,
                canceled: c.canceled ?? prev.canceled,
                canceledBy: c.canceledBy ?? prev.canceledBy,
                paymentMade: c.paymentMade ?? prev.paymentMade,
                paymentTimedOut:
                  prev.paymentTimedOut || newStatus === "paymentTooLate",
                disputeActive: c.disputeActive ?? prev.disputeActive,
                disputeReason: c.disputeReason ?? prev.disputeReason,
                disputeInitiator: c.disputeInitiator ?? prev.disputeInitiator,
                disputeOutcome: c.disputeOutcome ?? prev.disputeOutcome,
                disputeWinner: c.disputeWinner ?? prev.disputeWinner,
                disputeOutcomeAcknowledgedBy:
                  c.disputeOutcomeAcknowledgedBy ??
                  prev.disputeOutcomeAcknowledgedBy,
                disputeAcknowledgedByCounterParty:
                  c.disputeAcknowledgedByCounterParty ??
                  prev.disputeAcknowledgedByCounterParty,
              }
            : prev,
        );
      } catch {}
    }, 5000);
    return () => clearInterval(iv);
  }, [auth, routeId, signingModal, liveContract?.tradeStatus]);

  // Use live contract data
  const scenario = liveContract ?? {
    role: "buyer",
    tradeStatus: "fundEscrow",
    contract: {
      id: routeId || "—",
      direction: "buy",
      amount: 0,
      fiat: null,
      currency: "EUR",
      premium: 0,
      method: "",
      creationDate: Date.now(),
      paymentExpectedBy: null,
      escrow: null,
    },
    counterparty: null,
    paymentDetails: null,
    paymentDetailsError: null,
    ownPaymentDetails: null,
  };
  const messages = liveMessages ?? [];
  const {
    contract,
    counterparty: rawCounterparty,
    tradeStatus: status,
    tradeStatusWithoutDispute,
    role,
    paymentDetails,
    paymentDetailsError,
    ownPaymentDetails,
  } = scenario;
  const counterparty = rawCounterparty ?? {
    initials: "??",
    color: "var(--black-65)",
    name: "Unknown",
    rep: 0,
    trades: 0,
    badges: [],
    online: false,
  };
  const isFundingStage =
    status === "fundEscrow" ||
    status === "createEscrow" ||
    status === "waitingForFunding";

  useEffect(() => {
    if (!contract?.id) return;
    if (status === "rateUser" && contract.id !== celebrationDismissed) {
      setCelebrationOpen(true);
    } else if (status !== "rateUser") {
      setCelebrationOpen(false);
    }
  }, [status, contract?.id, celebrationDismissed]);

  useEffect(() => {
    if (!contract?.id) return;
    if (status !== "payoutPending" || role !== "buyer") return;
    const key = `peach-payout-celebrated-${contract.id}`;
    try {
      if (localStorage.getItem(key) === "1") return;
    } catch {}
    setPayoutCelebOpen(true);
    const t = setTimeout(() => {
      setPayoutCelebOpen(false);
      try { localStorage.setItem(key, "1"); } catch {}
    }, 2400);
    return () => clearTimeout(t);
  }, [status, role, contract?.id]);

  const handleRate = async (r) => {
    const rating = r === 5 ? 1 : -1;
    const ratedUserId = counterparty.id;
    if (!ratedUserId || ratedUserId === "unknown") {
      throw new Error("Counterparty id is missing");
    }
    if (!auth?.pgpPrivKey) {
      throw new Error("PGP private key unavailable");
    }
    // Key order is load-bearing: backend reconstructs the
    // signed payload as contractId → rating → ratedUserId.
    const payload = {
      contractId: contract.id,
      rating,
      ratedUserId,
    };
    const pgpSignature = await signPGPMessage(
      JSON.stringify(payload),
      auth.pgpPrivKey,
    );
    if (!pgpSignature) {
      throw new Error("Failed to sign rating");
    }
    const res = await post(
      `/contract/${contract.id}/user/rate`,
      { rating, pgpSignature },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Rating failed (${res.status})${text ? ": " + text : ""}`,
      );
    }
  };

  // ── FETCH LIVE CONTRACT + CHAT ──
  const peachId = auth?.peachId;
  useEffect(() => {
    if (!auth || !routeId) return;

    async function fetchContract() {
      let symKey = null;
      // /contract/:id doesn't return refunded/newTradeId — read from sessionStorage
      // (written by dashboard from /contracts/summary which has those fields)
      let meta = null;
      try {
        meta = JSON.parse(sessionStorage.getItem(`contract-meta:${routeId}`));
      } catch {}
      try {
        const res = await get(`/contract/${routeId}`);
        if (!res.ok) return null;
        const c = await res.json();
        const isBuyer = (c.buyer?.id ?? c.buyerId) === peachId;
        const initialDisplayStatus =
          deriveDisplayStatus({
            tradeStatus: c.tradeStatus ?? c.status,
            direction: isBuyer ? "buy" : "sell",
            escrowFundingTimeLimitExpired: c.escrowFundingTimeLimitExpired,
          }) ?? "fundEscrow";
        setLiveContract({
          id: c.id,
          role: isBuyer ? "buyer" : "seller",
          tradeStatus: initialDisplayStatus,
          instantTrade: c.instantTrade ?? false,
          contract: {
            id: c.id,
            direction: isBuyer ? "buy" : "sell",
            amount: c.amount ?? 0,
            fiat: c.price != null ? c.price.toFixed(2) : null,
            currency: c.currency ?? "EUR",
            premium: c.premium ?? 0,
            method: c.paymentMethod ?? "",
            creationDate: c.creationDate
              ? new Date(c.creationDate).getTime()
              : Date.now(),
            paymentExpectedBy: c.paymentExpectedBy
              ? new Date(c.paymentExpectedBy).getTime()
              : null,
            fundingExpectedBy: c.fundingExpectedBy
              ? new Date(c.fundingExpectedBy).getTime()
              : null,
            escrow: c.escrow ?? null,
            ratingBuyer: c.ratingBuyer ?? null,
            ratingSeller: c.ratingSeller ?? null,
            buyOffer69Id: c.buyOffer69Id ?? null,
            batchInfo: c.batchInfo ?? null,
          },
          counterparty: (() => {
            const cp = isBuyer ? (c.seller ?? {}) : (c.buyer ?? {});
            const cpId = cp.id ?? "unknown";
            const shortHex =
              cpId.length > 8
                ? cpId.slice(0, 8).toUpperCase()
                : cpId.toUpperCase();
            const short = "Peach" + shortHex;
            return {
              id: cpId,
              name: short,
              rep: toPeaches(cp.rating ?? cp.peachRating ?? 0),
              trades: cp.trades ?? 0,
              badges: (cp.medals ?? []).map((m) =>
                m === "fastTrader"
                  ? "fast"
                  : m === "superTrader"
                    ? "supertrader"
                    : m,
              ),
              online: false,
            };
          })(),
          releaseAddress: c.releaseAddress ?? null,
          paymentDetails: null, // will be populated below after decryption
          paymentDetailsError: false,
          ownPaymentDetails: null, // user's own PM, populated below after decryption
          // Keep raw encrypted fields for dispute re-encryption
          paymentDataEncrypted: c.paymentDataEncrypted ?? null,
          buyerPaymentDataEncrypted: c.buyerPaymentDataEncrypted ?? null,
          // Dispute fields
          // Cancellation fields
          cancelationRequested: c.cancelationRequested ?? false,
          canceled: c.canceled ?? false,
          canceledBy: c.canceledBy ?? null,
          paymentMade: c.paymentMade ?? null,
          escrowFundingTimeLimitExpired:
            c.escrowFundingTimeLimitExpired ?? false,
          paymentTimedOut: (c.tradeStatus ?? c.status) === "paymentTooLate",
          // Dispute fields
          disputeActive: c.disputeActive ?? false,
          tradeStatusWithoutDispute: c.tradeStatusWithoutDispute ?? null,
          disputeReason: c.disputeReason ?? null,
          disputeInitiator: c.disputeInitiator ?? null,
          disputeOutcome: c.disputeOutcome ?? null,
          disputeWinner: c.disputeWinner ?? null,
          disputeOutcomeAcknowledgedBy: c.disputeOutcomeAcknowledgedBy ?? [],
          disputeAcknowledgedByCounterParty:
            c.disputeAcknowledgedByCounterParty ?? false,
          isEmailRequired: c.isEmailRequired ?? false,
          // Revive/refund guard fields — /contract/:id doesn't return these,
          // so we read from sessionStorage (written by dashboard from /contracts/summary)
          revived: !!c.newOfferId || !!meta?.newTradeId,
          refunded: !!c.refunded || !!meta?.refunded,
          newOfferId: c.newOfferId ?? meta?.newTradeId ?? null,
          unreadMessages: c.unreadMessages ?? 0,
        });

        // Decrypt payment data if available
        // paymentDataEncrypted = seller's PM; buyerPaymentDataEncrypted = buyer's PM
        const encryptedPM = isBuyer
          ? c.paymentDataEncrypted
          : c.buyerPaymentDataEncrypted;
        const ownEncryptedPM = isBuyer
          ? c.buyerPaymentDataEncrypted
          : c.paymentDataEncrypted;
        const symKeyEnc = c.symmetricKeyEncrypted;

        // Decrypt symmetric key (needed for both PM data and chat)
        if (symKeyEnc && auth.pgpPrivKey) {
          try {
            const raw = await decryptPGPMessage(symKeyEnc, auth.pgpPrivKey);
            symKey = raw ? raw.trim() : null;
            if (symKey) setChatSymKey(symKey);
          } catch (err) {
            console.warn(
              "[Trade] Symmetric key decryption failed:",
              err.message,
            );
          }
        }

        async function decryptPM(encrypted) {
          if (!encrypted) return null;
          let pmJson = null;
          if (symKey) {
            try {
              pmJson = await decryptSymmetric(encrypted, symKey);
            } catch {}
          }
          if (!pmJson && auth.pgpPrivKey) {
            try {
              pmJson = await decryptPGPMessage(encrypted, auth.pgpPrivKey);
            } catch {}
          }
          if (!pmJson) return null;
          try {
            const pmData = JSON.parse(pmJson);
            return { ...pmData, type: pmData.type ?? c.paymentMethod ?? "" };
          } catch (err) {
            console.warn("[Trade] PM JSON parse failed:", err.message);
            return undefined; // undefined = parse error, null = no data
          }
        }

        // Counterparty PM (existing behavior)
        if (encryptedPM) {
          const pmData = await decryptPM(encryptedPM);
          if (pmData) {
            setLiveContract((prev) =>
              prev ? { ...prev, paymentDetails: pmData } : prev,
            );
          } else {
            setLiveContract((prev) =>
              prev ? { ...prev, paymentDetailsError: true } : prev,
            );
          }
        }

        // User's own PM — best-effort; don't surface an error if it fails
        if (ownEncryptedPM) {
          const pmData = await decryptPM(ownEncryptedPM);
          if (pmData) {
            setLiveContract((prev) =>
              prev ? { ...prev, ownPaymentDetails: pmData } : prev,
            );
          }
        }
      } catch {}
      setContractLoading(false);
      return symKey ?? null;
    }

    async function parseChatPage(rawMsgs, symKey) {
      return Promise.all(
        rawMsgs.map(async (m) => {
          let text = m.message ?? m.text ?? "";
          if (symKey && text.includes("-----BEGIN PGP MESSAGE-----")) {
            const decrypted = await decryptSymmetric(text, symKey);
            if (decrypted) text = decrypted;
          }
          return {
            // Stable, collision-proof id. Server system messages often lack an id
            // (and multiple events can share a date), so we fall back to a content
            // fingerprint instead of Math.random() which would churn every poll.
            id:
              m.id != null
                ? String(m.id)
                : `${m.date ?? "nodate"}|${m.from ?? "anon"}|${(m.message ?? m.text ?? "").slice(0, 48)}`,
            from:
              m.from === peachId
                ? "me"
                : m.from === "system"
                  ? "system"
                  : "them",
            text,
            ts: m.date ? new Date(m.date).getTime() : Date.now(),
            readBy: m.readBy ?? [],
          };
        }),
      );
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
        const unread = msgs.filter(
          (m) => m.from !== peachId && !(m.readBy ?? []).includes(peachId),
        );
        if (unread.length > 0) {
          post(`/contract/${routeId}/chat/received`, {
            start: unread[0].date,
            end: unread[unread.length - 1].date,
          }).catch(() => {});
        }
      } catch {}
    }

    setContractLoading(true);
    fetchContract().then((symKey) => {
      // Skip initial chat fetch when chat is hidden — GET auto-marks-as-read
      // server-side, which would zero unreadMessages before the user views chat.
      if (chatVisibleRef.current) fetchChat(symKey);
    });
  }, [routeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chat polling: fetch page 0 every 5s to pick up new messages ──
  // Gated on chatVisible: GET /chat auto-marks-as-read server-side, so we only
  // poll while the chat is actually visible to the user. Fires immediately on
  // (re-)activation so switching to the chat tab on mobile doesn't wait 5s.
  useEffect(() => {
    if (!chatSymKey || !routeId || !auth || !chatVisible) return;
    let cancelled = false;
    async function fetchPage0() {
      if (cancelled) return;
      try {
        const res = await get(`/contract/${routeId}/chat?page=0`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const msgs = Array.isArray(data) ? data : (data?.messages ?? []);
        const parsed = await Promise.all(
          msgs.map(async (m) => {
            let text = m.message ?? m.text ?? "";
            if (chatSymKey && text.includes("-----BEGIN PGP MESSAGE-----")) {
              const decrypted = await decryptSymmetric(text, chatSymKey);
              if (decrypted) text = decrypted;
            }
            return {
              // Stable, collision-proof id. Server system messages often lack an id
              // (and multiple events can share a date), so we fall back to a content
              // fingerprint instead of Math.random() which would churn every poll.
              id:
                m.id != null
                  ? String(m.id)
                  : `${m.date ?? "nodate"}|${m.from ?? "anon"}|${(m.message ?? m.text ?? "").slice(0, 48)}`,
              from:
                m.from === peachId
                  ? "me"
                  : m.from === "system"
                    ? "system"
                    : "them",
              text,
              ts: m.date ? new Date(m.date).getTime() : Date.now(),
            };
          }),
        );
        if (cancelled) return;
        // Merge: deduplicate by id, keep older pages, sort chronologically
        setLiveMessages((prev) => {
          const wasInitial = prev === null;
          if (wasInitial) {
            // First load via polling — seed pagination state
            setChatHasMore(msgs.length >= 22);
            return parsed.sort((a, b) => a.ts - b.ts);
          }
          const byId = new Map();
          for (const m of prev) byId.set(m.id, m);
          for (const m of parsed) byId.set(m.id, m);
          return [...byId.values()].sort((a, b) => a.ts - b.ts);
        });
        // Mark unread
        const unread = msgs.filter(
          (m) => m.from !== peachId && !(m.readBy ?? []).includes(peachId),
        );
        if (unread.length > 0) {
          post(`/contract/${routeId}/chat/received`, {
            start: unread[0].date,
            end: unread[unread.length - 1].date,
          }).catch(() => {});
        }
      } catch {}
    }
    fetchPage0(); // immediate on (re-)activation
    const interval = setInterval(fetchPage0, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [chatSymKey, routeId, chatVisible]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const parsed = await Promise.all(
        msgs.map(async (m) => {
          let text = m.message ?? m.text ?? "";
          if (chatSymKey && text.includes("-----BEGIN PGP MESSAGE-----")) {
            const decrypted = await decryptSymmetric(text, chatSymKey);
            if (decrypted) text = decrypted;
          }
          return {
            // Stable, collision-proof id. Server system messages often lack an id
            // (and multiple events can share a date), so we fall back to a content
            // fingerprint instead of Math.random() which would churn every poll.
            id:
              m.id != null
                ? String(m.id)
                : `${m.date ?? "nodate"}|${m.from ?? "anon"}|${(m.message ?? m.text ?? "").slice(0, 48)}`,
            from:
              m.from === peachId
                ? "me"
                : m.from === "system"
                  ? "system"
                  : "them",
            text,
            ts: m.date ? new Date(m.date).getTime() : Date.now(),
            readBy: m.readBy ?? [],
          };
        }),
      );
      setLiveMessages((prev) => {
        const byId = new Map();
        for (const m of prev ?? []) byId.set(m.id, m);
        for (const m of parsed) byId.set(m.id, m);
        return [...byId.values()].sort((a, b) => a.ts - b.ts);
      });
      setChatPage(nextPage);
      setChatHasMore(msgs.length >= 22);
    } catch {
    } finally {
      setChatLoadingMore(false);
    }
  };
  function loadOlderChat() {
    loadOlderChatRef.current?.();
  }

  // Elapsed time
  const elapsedMs = Date.now() - contract.creationDate;
  const elapsedH = Math.floor(elapsedMs / 3600_000);
  const elapsedM = Math.floor((elapsedMs % 3600_000) / 60_000);
  const elapsedStr =
    elapsedH > 0 ? `${elapsedH}h ${elapsedM}m` : `${elapsedM}m`;

  // Deadline countdown — hide when the deadline has already passed
  let deadlineStr = null;
  if (contract.paymentExpectedBy) {
    const left = contract.paymentExpectedBy - Date.now();
    if (left > 0) {
      const h = Math.floor(left / 3600_000);
      const m = Math.floor((left % 3600_000) / 60_000);
      deadlineStr = `${h}h ${m}m`;
    }
  }

  // Premium color: grey within 0..9% (both sides); outside that band, perspective-aware
  const premColor = (() => {
    const p = contract.premium;
    if (p >= 0 && p <= 9) return "var(--black-65)";
    if (role === "buyer") {
      return p < 0 ? "var(--success)" : "var(--error)";
    }
    // seller
    return p < 0 ? "var(--error)" : "var(--success)";
  })();

  const unreadCount = liveContract?.unreadMessages ?? 0;

  const hasBatchInfo = !!contract?.batchInfo;
  const payoutPendingSubtitle = (
    <>
      Your sats are{" "}
      {hasBatchInfo ? (
        <button
          type="button"
          className="payout-batching-link"
          onClick={() => setBatchInfoOpen(true)}
        >
          on their way to your wallet
        </button>
      ) : (
        "on their way to your wallet"
      )}
      . This may take a few minutes, especially if you use our batching system.
      Accelerate your payout in the{" "}
      <button
        type="button"
        className="payout-batching-link"
        onClick={() =>
          navigate("/settings", { state: { openSection: "tx-batching" } })
        }
      >
        settings
      </button>{" "}
      for a small extra fee.
    </>
  );

  const counterpartyCard = (
    <div
      className="counterparty-card"
      onClick={() => counterparty.id && counterparty.id !== "unknown" && navigate(`/user/${counterparty.id}`)}
      style={{ cursor: counterparty.id && counterparty.id !== "unknown" ? "pointer" : "default" }}
      title={counterparty.id && counterparty.id !== "unknown" ? "View user profile" : undefined}
    >
      <Avatar
        peachId={counterparty.id}
        size={44}
        online={counterparty.online}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cp-name">{counterparty.name}</div>
        <div className="cp-meta">
          <PeachRating rep={counterparty.rep ?? 0} size={14} trades={counterparty.trades} />
          <span>·</span>
          <span>{counterparty.trades} trades</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
          flexShrink: 0,
        }}
      >
        {counterparty.badges?.includes("supertrader") && (
          <span className="badge-supertrader" style={{cursor:"pointer"}} onClick={() => setBadgesHelpOpen(true)}>🏆 Supertrader</span>
        )}
        {counterparty.badges?.includes("fast") && (
          <span className="badge-fast" style={{cursor:"pointer"}} onClick={() => setBadgesHelpOpen(true)}>⚡ Fast</span>
        )}
        <RepeatTraderBadge userId={counterparty.id} />
      </div>
    </div>
  );

  const tradeSummaryCard = (
    <div className="trade-summary">
      {/* Row 1: you are buying / you are selling — sats */}
      <div className="summary-item-label">
        {role === "buyer" ? "Buying" : "Selling"}
      </div>
      <div className="summary-item-val">
        <SatsAmount sats={contract.amount} size="lg" />
      </div>

      {/* Row 2: you pay / you receive — fiat */}
      <div className="summary-item-label">
        {role === "buyer" ? "Paying" : "Receiving"}
      </div>
      <div
        className="summary-item-val"
        style={{ fontSize: "1.05rem" }}
      >
        {contract.currency === "CHF" ? "CHF " : "€"}
        {contract.fiat}{" "}
        <span
          style={{
            fontSize: ".72rem",
            fontWeight: 600,
            color: "var(--black-65)",
          }}
        >
          {contract.currency}
        </span>
      </div>

      {/* Row 3: effective price — premium % (colored) + price */}
      <div className="summary-item-label">Price/BTC</div>
      <div
        className="summary-item-val"
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          justifyContent: "flex-end",
        }}
      >
        <span style={{ color: premColor }}>
          {contract.premium > 0 ? "+" : ""}
          {contract.premium.toFixed(1)}%
        </span>
        <span>
          {contract.fiat != null && contract.amount > 0 ? (
            <>
              {contract.currency === "CHF" ? "CHF " : "€"}
              {Math.round(
                (Number(contract.fiat) / contract.amount) *
                  100_000_000,
              ).toLocaleString("fr-FR")}
            </>
          ) : (
            "—"
          )}
        </span>
      </div>

      {/* Row 4: method */}
      <div className="summary-item-label">Method</div>
      <div
        className="summary-item-val"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 6,
        }}
      >
        <span className="tag-currency">{contract.currency}</span>
        <span className="tag-method">{contract.method}</span>
      </div>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>

      <div className="page-wrap">
        {/* ── Loading state (logged in, fetching contract) ── */}
        {contractLoading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              gap: 16,
              padding: "80px 0",
            }}
          >
            <div
              className="spinner"
              style={{
                width: 32,
                height: 32,
                border: "3px solid var(--black-10)",
                borderTopColor: "var(--primary)",
                borderRadius: "50%",
              }}
            />
            <span
              style={{
                fontSize: ".85rem",
                color: "var(--black-65)",
                fontWeight: 600,
              }}
            >
              Loading trade…
            </span>
          </div>
        )}

        {!contractLoading && (
          <>
            {/* ── Trade sub-topbar ── */}
            <div className="trade-topbar">
              <button
                className="trade-topbar-back"
                title="Back to Trades"
                onClick={() => navigate("/trades")}
              >
                <IconBack />
              </button>
              <span
                className={`trade-topbar-id${copiedId ? " is-copied" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const text = formatTradeId(contract.id);
                  try { navigator.clipboard.writeText(text); } catch {}
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 1500);
                }}
                title="Copy contract ID"
                role="button"
              >
                {copiedId ? "✓ Copied" : formatTradeId(contract.id)}
              </span>
              <span className="trade-topbar-sep">·</span>
              <span className={role === "buyer" ? "dir-buy" : "dir-sell"}>
                {role === "buyer" ? "BUY" : "SELL"}
              </span>
              <span className="trade-topbar-sep">·</span>
              <StatusChip status={status} large role={role} />
            </div>

            {/* ── Mobile tabs ── */}
            <div className="mobile-tabs">
              <button
                className={`mobile-tab${mobileTab === "details" ? " active" : ""}`}
                onClick={() => setMobileTab("details")}
              >
                Trade Details
              </button>
              <button
                className={`mobile-tab${mobileTab === "chat" ? " active" : ""}`}
                onClick={() => setMobileTab("chat")}
              >
                Chat{" "}
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: "var(--error)",
                      color: "white",
                      borderRadius: 999,
                      padding: "0 6px",
                      fontSize: ".65rem",
                      fontWeight: 800,
                      marginLeft: 4,
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* ── Split layout ── */}
            <div className="split-layout">
              {/* ── LEFT: Trade Details ── */}
              <div
                className={`split-left${mobileTab === "chat" ? " mobile-hidden" : ""}`}
              >
                <div className={`split-left-inner${isFundingStage ? " split-left-inner-wide" : ""}`}>
                {/* Dispute open / resolved — status banner sits above the
                    counterparty card. Inline onAction handles only the two
                    dispute API calls DisputeBanner triggers. */}
                {(status === "dispute" || status === "disputeWithoutEscrowFunded") && (
                  <div style={{ marginBottom: 12 }}>
                    <DisputeBanner
                      scenario={scenario}
                      onAction={async (action, arg) => {
                        if (action === "dispute_ack_email") {
                          try {
                            const res = await post(
                              "/contract/" + contract.id + "/dispute/acknowledge",
                              { email: arg },
                            );
                            if (res.ok) {
                              setLiveContract((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      isEmailRequired: false,
                                      disputeAcknowledgedByCounterParty: true,
                                    }
                                  : prev,
                              );
                              return true;
                            }
                          } catch {}
                          return false;
                        }
                        if (action === "dispute_ack_outcome") {
                          try {
                            const res = await post(
                              "/contract/" + contract.id + "/dispute/acknowledgeOutcome",
                            );
                            if (res.ok) {
                              const myRole =
                                scenario.role === "buyer" ? "buyer" : "seller";
                              setLiveContract((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      disputeOutcomeAcknowledgedBy: [
                                        ...(prev.disputeOutcomeAcknowledgedBy ?? []),
                                        myRole,
                                      ],
                                    }
                                  : prev,
                              );
                              return true;
                            }
                          } catch {}
                          return false;
                        }
                      }}
                    />
                  </div>
                )}

                {/* Confirm payment — buyer: waiting for seller to confirm */}
                {status === "confirmPaymentRequired" && role === "buyer" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "rgba(5,168,90,.08)",
                      border: "1px solid rgba(5,168,90,.18)",
                      borderRadius: 12,
                      padding: "10px 14px",
                      marginBottom: 12,
                      fontSize: ".85rem",
                      color: "var(--success)",
                      fontWeight: 600,
                      lineHeight: 1.5,
                    }}
                  >
                    <IconClock />
                    <span>You've sent payment. Waiting for the seller to confirm.</span>
                  </div>
                )}

                {/* Payment too late — buyer POV */}
                {status === "paymentTooLate" && role === "buyer" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--error-bg)",
                      border: "1px solid rgba(223,50,31,.15)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginBottom: 12,
                      fontSize: ".83rem",
                      color: "var(--error)",
                      fontWeight: 600,
                      lineHeight: 1.5,
                    }}
                  >
                    <IconClock />
                    <span>
                      You did not pay on time. The seller can now decide to give you
                      more time or cancel the trade. In either case, your reputation has
                      been impacted.
                    </span>
                  </div>
                )}

                {/* Payment too late — seller POV */}
                {status === "paymentTooLate" && role === "seller" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--warning-soft)",
                      border: "1px solid rgba(154,112,0,.15)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginBottom: 12,
                      fontSize: ".83rem",
                      color: "var(--warning)",
                      fontWeight: 600,
                      lineHeight: 1.5,
                    }}
                  >
                    <IconClock />
                    <span>
                      The buyer did not pay in time. You can either cancel the trade
                      without a reputation penalty, or give the buyer some more
                      time.
                    </span>
                  </div>
                )}

                {/* refundOrReviveRequired — seller POV: republish or refund */}
                {status === "refundOrReviveRequired" &&
                  role === "seller" &&
                  !scenario.revived &&
                  !scenario.refunded && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--warning-soft)",
                        border: "1px solid rgba(154,112,0,.15)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 12,
                        fontSize: ".83rem",
                        color: "var(--warning)",
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}
                    >
                      <span>
                        The trade was cancelled. You can republish your offer or
                        request a refund of the escrow.
                      </span>
                    </div>
                  )}

                {/* refundOrReviveRequired — already revived */}
                {status === "refundOrReviveRequired" && scenario.revived && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--success-bg)",
                      border: "1px solid rgba(5,168,90,.15)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginBottom: 12,
                      fontSize: ".83rem",
                      color: "var(--success)",
                      fontWeight: 600,
                      lineHeight: 1.5,
                    }}
                  >
                    <span>
                      Offer has been republished
                      {scenario.newOfferId
                        ? ` (new offer: ${formatTradeId(scenario.newOfferId, "offer")})`
                        : ""}
                      .
                    </span>
                  </div>
                )}

                {/* refundOrReviveRequired — already refunded */}
                {status === "refundOrReviveRequired" && scenario.refunded && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--black-5)",
                      border: "1px solid rgba(0,0,0,.08)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginBottom: 12,
                      fontSize: ".83rem",
                      color: "var(--black-65)",
                      fontWeight: 600,
                      lineHeight: 1.5,
                    }}
                  >
                    <span>Escrow has been refunded.</span>
                  </div>
                )}

                {/* refundTxSignatureRequired — seller must sign the refund tx from mobile */}
                {status === "refundTxSignatureRequired" && role === "seller" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--primary-mild)",
                      border: "1px solid rgba(196,81,4,.15)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginBottom: 12,
                      fontSize: ".83rem",
                      color: "var(--primary-dark)",
                      fontWeight: 600,
                      lineHeight: 1.5,
                    }}
                  >
                    <span>
                      The escrow refund is ready. Sign the refund transaction on your
                      mobile app to recover the funds.
                    </span>
                  </div>
                )}

                {/* Trade cancelled — final state */}
                {(status === "tradeCanceled" || status === "confirmCancelation") && (() => {
                  const message = (() => {
                    // Seller republished this trade — show republish copy first.
                    if (scenario.revived && role === "seller") {
                      return "You have decided to re-publish this trade. You can find the new offer below";
                    }
                    // Buyer-payment-timeout detection: prefer the live-polling
                    // signal, fall back to derived check for the case where the
                    // user navigates straight to a contract that already
                    // transitioned past `paymentTooLate`.
                    const wasBuyerPaymentTimeout =
                      scenario.paymentTimedOut ||
                      (!!scenario.canceled &&
                        !scenario.paymentMade &&
                        scenario.contract?.paymentExpectedBy != null &&
                        scenario.contract.paymentExpectedBy < Date.now() &&
                        !scenario.escrowFundingTimeLimitExpired);
                    if (wasBuyerPaymentTimeout) {
                      return role === "buyer"
                        ? "This trade has been cancelled. Your reputation has been affected."
                        : "You have decided to refund this trade to your refund wallet";
                    }
                    if (scenario.escrowFundingTimeLimitExpired) {
                      return role === "seller"
                        ? "This trade has been cancelled because you have not funded the escrow on time. Your reputation has been affected."
                        : "This trade has been cancelled because the seller did not fund the escrow on time. The seller's reputation has been affected.";
                    }
                    // Mediator auto-cancel due to escrow funding timeout — the seller is
                    // the responsible party (mediator itself has no reputation).
                    const responsibleParty =
                      scenario.canceledBy === "mediator" &&
                      scenario.escrowFundingTimeLimitExpired
                        ? "seller"
                        : scenario.canceledBy;
                    if (
                      responsibleParty === "buyer" ||
                      responsibleParty === "seller"
                    ) {
                      return responsibleParty === role
                        ? "This trade has been cancelled. Your reputation has been affected."
                        : `This trade has been cancelled. The ${responsibleParty}'s reputation has been affected.`;
                    }
                    return "This trade has been cancelled.";
                  })();
                  // Refund-decision message is informational, not an error — render yellow.
                  const isRefundDecision =
                    message === "You have decided to refund this trade to your refund wallet";
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: isRefundDecision ? "var(--warning-soft)" : "var(--error-bg)",
                        border: isRefundDecision
                          ? "1px solid rgba(154,112,0,.15)"
                          : "1px solid rgba(223,50,31,.2)",
                        borderRadius: 8,
                        padding: "12px 14px",
                        marginBottom: 12,
                        fontSize: ".83rem",
                        color: isRefundDecision ? "var(--warning)" : "var(--error)",
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}
                    >
                      <IconAlert />
                      <span>{message}</span>
                    </div>
                  );
                })()}

                {/* Payout pending — buyer: sats arriving */}
                {status === "payoutPending" && role === "buyer" && (
                  <SuccessBanner
                    title="Congrats! The seller released the escrow."
                    subtitle={payoutPendingSubtitle}
                  />
                )}

                {/* Trade complete success card */}
                {(status === "tradeCompleted" || status === "rateUser") && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: "var(--success-bg)",
                      border: "1px solid rgba(5,168,90,.2)",
                      borderRadius: 12,
                      padding: "12px 16px",
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "var(--success)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1rem",
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: "1rem",
                          fontWeight: 800,
                          color: "var(--success)",
                          marginBottom: 2,
                        }}
                      >
                        Trade Complete!{role === "buyer" ? " 🎉" : ""}
                      </div>
                      <div
                        style={{
                          fontSize: ".8rem",
                          fontWeight: 500,
                          color: "var(--black-65)",
                          lineHeight: 1.5,
                        }}
                      >
                        {role === "buyer"
                          ? "Your sats are on their way"
                          : "You've successfully sold Bitcoin"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Rating panel — both roles rate after bitcoin is released */}
                {status === "rateUser" && (
                  <RatingPanel
                    counterparty={counterparty}
                    onRate={handleRate}
                  />
                )}

                {/* Ratings exchanged on this contract */}
                {(() => {
                  const ratingGiven =
                    role === "seller"
                      ? contract.ratingBuyer
                      : contract.ratingSeller;
                  const ratingReceived =
                    role === "seller"
                      ? contract.ratingSeller
                      : contract.ratingBuyer;
                  const toLabel = role === "seller" ? "buyer" : "seller";
                  const isRated = (r) => r === 1 || r === -1;
                  const emoji = (r) => (r === 1 ? "👍" : "👎");
                  if (!isRated(ratingGiven) && !isRated(ratingReceived))
                    return null;
                  return (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        background: "var(--black-3)",
                        border: "1px solid var(--black-10)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 12,
                        fontSize: ".85rem",
                        fontWeight: 600,
                        color: "var(--black-65)",
                      }}
                    >
                      {isRated(ratingGiven) && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>Rating given to the {toLabel}</span>
                          <span>{emoji(ratingGiven)}</span>
                        </div>
                      )}
                      {isRated(ratingReceived) && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>Rating given to you</span>
                          <span>{emoji(ratingReceived)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Seller: buyer has marked payment as sent — heads-up to check bank account */}
                {(status === "confirmPaymentRequired" ||
                  status === "releaseEscrow") &&
                  role === "seller" && (
                    <ActionBanner
                      title="Payment made. Confirm if you received it."
                      subtitle="The buyer has marked the payment as sent. Check your account and confirm once the funds have arrived."
                    />
                  )}

                {/* Payment deadline pill — only meaningful while the buyer still needs to send fiat */}
                {deadlineStr &&
                  status === "paymentRequired" &&
                  role === "buyer" &&
                  !scenario.paymentTimedOut &&
                  !scenario.cancelationRequested && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        background: "var(--primary-mild)",
                        border: "1.5px solid rgba(196,81,4,.2)",
                        borderRadius: 12,
                        padding: "12px 16px",
                        marginBottom: 12,
                      }}
                    >
                      <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>
                        ⏳
                      </span>
                      <div>
                        <div
                          style={{
                            fontSize: ".72rem",
                            fontWeight: 700,
                            color: "var(--primary-dark)",
                            textTransform: "uppercase",
                            letterSpacing: ".05em",
                            marginBottom: 1,
                          }}
                        >
                          Payment deadline
                        </div>
                        <div
                          style={{
                            fontSize: "1.05rem",
                            fontWeight: 800,
                            color: "var(--primary-dark)",
                          }}
                        >
                          {deadlineStr} remaining
                        </div>
                      </div>
                    </div>
                  )}

                {/* Wrong amount funded — seller. Rendered at the top, above the
                    trade partner card, like the other warning banners. Excludes
                    wrongAmountFundedOnContract, the terminal "refund completed"
                    state — no actions to show. */}
                {role === "seller" &&
                  (status === "fundingAmountDifferent" ||
                    status === "wrongAmountFundedOnContractRefundWaiting") && (
                    <div style={{ marginBottom: 12 }}>
                      <WrongAmountFundedCard
                        status={status}
                        expectedSats={contract.amount}
                        actualSats={escrowFundedAmount}
                        loading={escrowLoading}
                        refundError={actionError}
                        refundActionId={
                          contract.mobileActionRefundWasTriggered ??
                          (pendingTaskType === "refund" ? true : null)
                        }
                        onPendingClick={() => {}}
                        onContinueTrade={async () => {
                          setActionError(null);
                          try {
                            const offerId = String(contract.id).split("-")[0];
                            const res = await post(
                              "/offer/" + offerId + "/escrow/confirm",
                            );
                            if (res.ok) {
                              const fresh = await get("/contract/" + routeId);
                              if (fresh.ok) {
                                const c = await fresh.json();
                                setLiveContract((prev) => {
                                  if (!prev) return prev;
                                  const nextStatus =
                                    deriveDisplayStatus({
                                      tradeStatus: c.tradeStatus,
                                      direction: prev.contract?.direction,
                                      escrowFundingTimeLimitExpired: c.escrowFundingTimeLimitExpired,
                                    }) ?? prev.tradeStatus;
                                  return { ...prev, tradeStatus: nextStatus };
                                });
                              }
                              setToast("Trade continued with funded amount");
                              setToastTone("success");
                              setTimeout(() => { setToast(null); setToastTone("default"); }, 4000);
                            } else {
                              const err = await res.json().catch(() => ({}));
                              setActionError(
                                "Failed to confirm escrow: " +
                                  (err.error || res.status),
                              );
                            }
                          } catch (e) {
                            setActionError(
                              "Confirm escrow error: " + e.message,
                            );
                          }
                        }}
                        onRefundEscrow={async () => {
                          setActionError(null);
                          try {
                            const res = await post(
                              `/contract/${contract.id}/createRefundEscrowContractPendingAction`,
                            );
                            if (!res.ok) {
                              const err = await res.json().catch(() => null);
                              const msg =
                                err?.error || err?.message || `HTTP ${res.status}`;
                              // FORBIDDEN here means a refund pending action already
                              // exists server-side (e.g. created via the global popup
                              // or a prior click). Treat it as "already requested" and
                              // flip the card to the pending state instead of erroring.
                              if (res.status === 403 || msg === "FORBIDDEN") {
                                savePendingTask(routeId, "refund");
                                setPendingTaskType("refund");
                                await refreshContractMobileActions();
                                return;
                              }
                              throw new Error(msg);
                            }
                            savePendingTask(routeId, "refund");
                            setPendingTaskType("refund");
                            await refreshContractMobileActions();
                          } catch (e) {
                            setActionError(
                              "Failed to request refund: " + e.message,
                            );
                          }
                        }}
                        onClose={() => navigate("/trades")}
                      />
                    </div>
                  )}

                {/* Funding-stage two-column wrapper. Outside funding stage the
                    wrappers use display:contents and disappear from layout. */}
                <div className={isFundingStage ? "funding-two-col" : "funding-passthrough"}>
                <div className={isFundingStage ? "funding-left-col" : "funding-passthrough"}>
                  {isFundingStage && (
                    <FundingDeadlinePill
                      deadline={contract.fundingExpectedBy}
                      role={role}
                    />
                  )}
                  {isFundingStage ? tradeSummaryCard : counterpartyCard}
                  {isFundingStage ? counterpartyCard : tradeSummaryCard}
                </div> {/* /funding-left-col */}

                {/* Payment details (buyer sees seller's payment info, or vice versa) — moved ABOVE the Actions panel so a buyer about to confirm can read the seller's IBAN without scrolling past the slider. Hidden after cancellation and hidden from buyer until escrow is funded. */}
                {paymentDetails &&
                  ![
                    "tradeCanceled",
                    "confirmCancelation",
                    "refundOrReviveRequired",
                  ].includes(status) &&
                  ![
                    "createEscrow",
                    "fundEscrow",
                    "waitingForFunding",
                    "escrowWaitingForConfirmation",
                  ].includes(status) && (
                    <>
                      <div className="panel-section">
                        <div className="panel-section-title">
                          {role === "seller" ? "Buyer" : "Seller"} Payment Details
                        </div>
                        {status === "paymentRequired" && role === "buyer" && (
                          <p
                            style={{
                              fontSize: ".83rem",
                              color: "var(--black-65)",
                              marginBottom: 10,
                            }}
                          >
                            Send the exact fiat amount to the payment details
                            below, then confirm using the slider.
                          </p>
                        )}
                        {status !== "tradeCompleted" && (
                          <p
                            style={{
                              fontSize: ".83rem",
                              color: "var(--error)",
                              fontWeight: 600,
                              marginBottom: 10,
                            }}
                          >
                            {role === "buyer"
                              ? "Make sure to include the reference with your payment"
                              : "Please, ensure that the origin of the payment matches with the payment data provided by your counterparty."}
                          </p>
                        )}
                        <PaymentDetailsCard
                          details={paymentDetails}
                          compact={status === "tradeCompleted"}
                        />
                      </div>
                      {ownPaymentDetails && (
                        <CollapsibleSection
                          title="Your Payment Details"
                          defaultOpen={false}
                        >
                          <PaymentDetailsCard
                            details={ownPaymentDetails}
                            compact={status === "tradeCompleted"}
                          />
                        </CollapsibleSection>
                      )}
                    </>
                  )}

                {/* ── Actions (always first, includes deadline + escrow funding) ── */}
                <div className={isFundingStage ? "funding-right-col" : "funding-passthrough"}>
                <div className="panel-section">
                  {status !== "tradeCompleted" &&
                    status !== "rateUser" &&
                    !(
                      role === "seller" &&
                      (status === "fundingAmountDifferent" ||
                        status === "wrongAmountFundedOnContractRefundWaiting")
                    ) && <div className="panel-section-title">Actions</div>}

                  {/* Escrow funding card — inside actions for seller */}
                  {role === "seller" &&
                    (status === "fundEscrow" ||
                      status === "createEscrow" ||
                      status === "waitingForFunding") && (
                      <EscrowFundingCard
                        address={contract.escrow}
                        sats={contract.amount}
                        btcPrice={btcPrice}
                        fundLoading={fundEscrowLoading}
                        fundActionId={
                          // mobileActionFundEscrowWasTriggered is now an integer id.
                          // Fall back to a truthy sentinel when only the local task flag is set.
                          contract.mobileActionFundEscrowWasTriggered ??
                          (pendingTaskType === "fundEscrow" ||
                          hasPendingTask(routeId, "fundEscrow")
                            ? true
                            : null)
                        }
                        fundError={fundEscrowError}
                        onFundViaMobile={async () => {
                          setFundEscrowError(null);
                          setFundEscrowLoading(true);
                          try {
                            const res = await post(
                              `/contract/${contract.id}/createFundEscrowContractPendingAction`,
                            );
                            if (!res.ok) {
                              const err = await res.json().catch(() => null);
                              throw new Error(
                                err?.error ||
                                  err?.message ||
                                  `HTTP ${res.status}`,
                              );
                            }
                            savePendingTask(routeId, "fundEscrow");
                            setPendingTaskType("fundEscrow");
                            await refreshContractMobileActions();
                          } catch (e) {
                            setFundEscrowError(
                              "Failed to request funding: " + e.message,
                            );
                          } finally {
                            setFundEscrowLoading(false);
                          }
                        }}
                      />
                    )}

                  {/* Buyer awaiting escrow */}
                  {(status === "fundEscrow" ||
                    status === "createEscrow" ||
                    status === "waitingForFunding") &&
                    role === "buyer" && (
                      <>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 12,
                            padding: "20px 0",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: "50%",
                              background: "var(--warning-soft)",
                              border: "2px solid var(--warning)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.4rem",
                            }}
                          >
                            ⏳
                          </div>
                          <div style={{ fontWeight: 700, fontSize: ".95rem" }}>
                            Waiting for escrow
                          </div>
                          <div
                            style={{
                              fontSize: ".83rem",
                              color: "var(--black-65)",
                              lineHeight: 1.6,
                              maxWidth: 280,
                            }}
                          >
                            The seller is funding the escrow. Once the Bitcoin
                            is locked in, the trade will begin and you'll be
                            able to send payment.
                          </div>
                          <div
                            style={{
                              fontSize: ".85rem",
                              fontWeight: 700,
                              color: "var(--black-65)",
                            }}
                          >
                            No actions required for the moment.
                          </div>
                        </div>
                      </>
                    )}

                  {/* Wrong amount funded — info block.
                    Refund-waiting: buyer only (seller sees the action card above).
                    Refund done: both roles — contract is closed, no actions. */}
                  {((status === "wrongAmountFundedOnContractRefundWaiting" &&
                    role === "buyer") ||
                    status === "wrongAmountFundedOnContract") && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 12,
                        padding: "20px 0",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: "var(--warning-soft)",
                          border: "2px solid var(--warning)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.4rem",
                        }}
                      >
                        ⚠
                      </div>
                      <div style={{ fontWeight: 700, fontSize: ".95rem" }}>
                        Wrong Amount Funded
                      </div>
                      <div
                        style={{
                          fontSize: ".83rem",
                          color: "var(--black-65)",
                          lineHeight: 1.6,
                          maxWidth: 280,
                        }}
                      >
                        {status === "wrongAmountFundedOnContract"
                          ? "The escrow was funded with an incorrect amount. The trade has been cancelled and the escrow has been refunded."
                          : "The seller funded the escrow with an incorrect amount. The trade has been cancelled and the seller will be refunded."}
                      </div>
                    </div>
                  )}

                  {/* Action error banner. For the wrong-amount statuses the error
                      is shown inside WrongAmountFundedCard (under the button that
                      created it), so suppress it here to avoid a duplicate. */}
                  {actionError &&
                    !(
                      role === "seller" &&
                      (status === "fundingAmountDifferent" ||
                        status === "wrongAmountFundedOnContractRefundWaiting")
                    ) && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        background: "var(--error-bg)",
                        border: "1px solid rgba(223,50,31,.2)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 8,
                        fontSize: ".82rem",
                        color: "var(--error)",
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}
                    >
                      <IconAlert />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* Buyer-only: GroupHug widget, just above the "I've sent the
                      payment" slider. Read-only mirror of the user's batching
                      setting (editable from Settings). */}
                  {status === "paymentRequired" &&
                    role === "buyer" &&
                    !scenario.paymentTimedOut &&
                    !scenario.cancelationRequested &&
                    pendingTaskType !== "confirmPayment" && (
                      <>
                        <BuyerGroupHugDisplay />
                        <BuyerCustomAddressToggle
                          isOn={useCustomPayout}
                          hasSavedAddress={!!savedCustomPayout?.address}
                          onToggle={() => setUseCustomPayout((v) => !v)}
                          onRequestSetup={() => setShowSetupPayoutPopup(true)}
                        />
                      </>
                    )}

                  {/* All other action states */}
                  {status !== "tradeCompleted" &&
                    status !== "rateUser" &&
                    status !== "fundEscrow" &&
                    status !== "createEscrow" &&
                    status !== "waitingForFunding" &&
                    status !== "fundingAmountDifferent" &&
                    status !== "wrongAmountFundedOnContract" &&
                    status !== "wrongAmountFundedOnContractRefundWaiting" && (
                      <ActionPanel
                        scenario={scenario}
                        pendingTask={pendingTaskType}
                        paymentSliderKey={paymentSliderKey}
                        refundSliderKey={refundSliderKey}
                        onPendingClick={() => {
                          // refund / fund-escrow / confirm-payment / release — inline pending state only, no modal.
                          if (
                            pendingTaskType === "refund" ||
                            pendingTaskType === "confirmPayment" ||
                            pendingTaskType === "release"
                          )
                            return;
                          // rate still uses the modal
                          setSigningModal({
                            title: "Sign Rating",
                            description:
                              "Approve the rating on your Peach mobile app. A push notification has been sent to your phone.",
                            taskType: "rate",
                          });
                        }}
                        onAction={async (action, arg) => {
                          if (action === "go_to_new_offer") {
                            navigate("/trades", {
                              state: { openOfferId: arg },
                            });
                            return;
                          }
                          if (action === "extend_time") {
                            try {
                              const res = await patch(
                                "/contract/" + contract.id + "/extendTime",
                              );
                              if (res.ok) {
                                // Refresh contract data to get new paymentExpectedBy
                                const cRes = await get(
                                  "/contract/" + contract.id,
                                );
                                if (cRes.ok) {
                                  const c = await cRes.json();
                                  setLiveContract((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          contract: {
                                            ...prev.contract,
                                            paymentExpectedBy: new Date(
                                              c.paymentExpectedBy,
                                            ).getTime(),
                                          },
                                        }
                                      : prev,
                                  );
                                }
                              } else {
                                const err = await res.json().catch(() => ({}));
                                console.warn(
                                  "[Trade] Extend deadline failed:",
                                  err.error || res.status,
                                );
                              }
                            } catch (e) {
                              console.warn(
                                "[Trade] Extend deadline error:",
                                e.message,
                              );
                            }
                          } else if (action === "cancel_trade") {
                            try {
                              const res = await post(
                                "/contract/" + contract.id + "/cancel",
                              );
                              if (res.ok) {
                                // Cancel is immediate — re-fetch to get real status
                                const fresh = await get(
                                  "/contract/" + contract.id,
                                );
                                if (fresh.ok) {
                                  const c = await fresh.json();
                                  setLiveContract((prev) => {
                                    if (!prev) return prev;
                                    const nextStatus =
                                      deriveDisplayStatus({
                                        tradeStatus: c.tradeStatus,
                                        direction: prev.contract?.direction,
                                        escrowFundingTimeLimitExpired: c.escrowFundingTimeLimitExpired,
                                      }) ?? "tradeCanceled";
                                    return {
                                      ...prev,
                                      canceled: true,
                                      tradeStatus: nextStatus,
                                    };
                                  });
                                } else {
                                  setLiveContract((prev) => {
                                    if (!prev) return prev;
                                    const nextStatus =
                                      deriveDisplayStatus({
                                        tradeStatus: "tradeCanceled",
                                        direction: prev.contract?.direction,
                                        escrowFundingTimeLimitExpired: prev.escrowFundingTimeLimitExpired,
                                      }) ?? "tradeCanceled";
                                    return {
                                      ...prev,
                                      canceled: true,
                                      tradeStatus: nextStatus,
                                    };
                                  });
                                }
                              } else {
                                const err = await res.json().catch(() => ({}));
                                setActionError(
                                  "Cancel trade failed: " +
                                    (err.error || res.status),
                                );
                              }
                            } catch (e) {
                              console.warn(
                                "[Trade] Cancel trade error:",
                                e.message,
                              );
                            }
                          } else if (action === "republish_offer") {
                            setActionError(null);
                            try {
                              const offerId = String(contract.id).split("-")[0];
                              const res = await post(
                                "/offer/" + offerId + "/revive",
                              );
                              if (res.ok) {
                                const data = await res.json().catch(() => ({}));
                                setLiveContract((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        revived: true,
                                        newOfferId: data.newOfferId ?? null,
                                      }
                                    : prev,
                                );
                                setToast(
                                  "Offer republished" +
                                    (data.newOfferId
                                      ? ` — new offer: ${formatTradeId(data.newOfferId, "offer")}`
                                      : ""),
                                );
                                setToastTone("success");
                                setTimeout(() => { setToast(null); setToastTone("default"); }, 4000);
                              } else {
                                const err = await res.json().catch(() => ({}));
                                setActionError(
                                  "Republish failed: " +
                                    (err.error || res.status),
                                );
                              }
                            } catch (e) {
                              setActionError("Republish error: " + e.message);
                            }
                          } else if (action === "refund_escrow") {
                            setActionError(null);
                            try {
                              const res = await post(
                                `/contract/${contract.id}/createRefundEscrowContractPendingAction`,
                              );
                              if (!res.ok) {
                                const err = await res.json().catch(() => null);
                                throw new Error(
                                  err?.error ||
                                    err?.message ||
                                    `HTTP ${res.status}`,
                                );
                              }
                              savePendingTask(routeId, "refund");
                              setPendingTaskType("refund");
                              await refreshContractMobileActions();
                            } catch (e) {
                              setActionError(
                                "Failed to request signing: " + e.message,
                              );
                              setRefundSliderKey((k) => k + 1);
                            }
                          } else if (action === "payment_sent") {
                            setActionError(null);
                            try {
                              // (1) Fast path: contract already has a release
                              // address — server finalizes without a signature.
                              if (liveContract?.releaseAddress) {
                                const res = await post(
                                  `/contract/${contract.id}/payment/confirm`,
                                );
                                if (!res.ok) {
                                  const err = await res
                                    .json()
                                    .catch(() => null);
                                  throw new Error(
                                    err?.error ||
                                      err?.message ||
                                      `HTTP ${res.status}`,
                                  );
                                }
                                await refreshContractMobileActions();
                                return;
                              }
                              // (2) No release address on contract — if the
                              // buyer has the "receive to custom address"
                              // toggle ON and a saved address is loaded, open
                              // the choice modal as a final confirmation
                              // step. Toggle OFF (or no saved address) skips
                              // this and falls through to the mobile-signing path.
                              if (
                                useCustomPayout &&
                                savedCustomPayout?.address &&
                                savedCustomPayout?.bip322Signature
                              ) {
                                setPayoutChoice({
                                  address: savedCustomPayout.address,
                                  signature: savedCustomPayout.bip322Signature,
                                });
                                return;
                              }
                              // (3) Fallback: original mobile-action flow.
                              const res = await post(
                                `/contract/${contract.id}/payment/createPaymentMadePendingAction`,
                              );
                              if (!res.ok) {
                                const err = await res.json().catch(() => null);
                                throw new Error(
                                  err?.error ||
                                    err?.message ||
                                    `HTTP ${res.status}`,
                                );
                              }
                              savePendingTask(routeId, "confirmPayment");
                              setPendingTaskType("confirmPayment");
                              await refreshContractMobileActions();
                            } catch (e) {
                              setActionError(
                                "Failed to request confirmation: " + e.message,
                              );
                            }
                          } else if (action === "release_bitcoin") {
                            setActionError(null);
                            try {
                              const res = await post(
                                `/contract/${contract.id}/payment/createPaymentConfirmedPendingAction`,
                              );
                              if (!res.ok) {
                                const err = await res.json().catch(() => null);
                                throw new Error(
                                  err?.error ||
                                    err?.message ||
                                    `HTTP ${res.status}`,
                                );
                              }
                              savePendingTask(routeId, "release");
                              setPendingTaskType("release");
                              await refreshContractMobileActions();
                            } catch (e) {
                              setActionError(
                                "Failed to request signing: " + e.message,
                              );
                            }
                          } else if (action === "dispute_ack_email") {
                            try {
                              const res = await post(
                                "/contract/" +
                                  contract.id +
                                  "/dispute/acknowledge",
                                { email: arg },
                              );
                              if (res.ok) {
                                setLiveContract((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        isEmailRequired: false,
                                        disputeAcknowledgedByCounterParty: true,
                                      }
                                    : prev,
                                );
                                return true;
                              }
                            } catch {}
                            return false;
                          } else if (action === "dispute_ack_outcome") {
                            try {
                              const res = await post(
                                "/contract/" +
                                  contract.id +
                                  "/dispute/acknowledgeOutcome",
                              );
                              if (res.ok) {
                                const myRole =
                                  scenario.role === "buyer"
                                    ? "buyer"
                                    : "seller";
                                setLiveContract((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        disputeOutcomeAcknowledgedBy: [
                                          ...(prev.disputeOutcomeAcknowledgedBy ??
                                            []),
                                          myRole,
                                        ],
                                      }
                                    : prev,
                                );
                                return true;
                              }
                            } catch {}
                            return false;
                          } else if (action === "dispute") {
                            setShowDispute(true);
                          } else {
                            console.log("action:", action);
                          }
                        }}
                      />
                    )}

                </div>
                </div> {/* /funding-right-col */}
                </div> {/* /funding-two-col */}

                {/* Payment details decryption failed — fallback message (hidden after cancellation, and hidden from buyer until escrow is funded) */}
                {!paymentDetails &&
                  paymentDetailsError &&
                  ![
                    "tradeCanceled",
                    "confirmCancelation",
                    "refundOrReviveRequired",
                  ].includes(status) &&
                  !(
                    role === "buyer" &&
                    [
                      "createEscrow",
                      "fundEscrow",
                      "waitingForFunding",
                      "escrowWaitingForConfirmation",
                    ].includes(status)
                  ) && (
                    <div className="panel-section">
                      <div className="panel-section-title">Payment Details</div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          background: "var(--error-bg)",
                          borderRadius: 10,
                          padding: "12px 14px",
                        }}
                      >
                        <IconAlert />
                        <span
                          style={{
                            fontSize: ".83rem",
                            color: "var(--error)",
                            fontWeight: 600,
                            lineHeight: 1.5,
                          }}
                        >
                          Could not decrypt payment data, ask for details in the
                          chat if needed
                        </span>
                      </div>
                    </div>
                  )}

                {/* Escrow + Refund Address (seller, non-escrow-funding states — funding states show full funding card above) */}
                {role === "seller" &&
                  status !== "fundEscrow" &&
                  status !== "createEscrow" &&
                  status !== "waitingForFunding" && (
                    <>
                      <CollapsibleAddressSection
                        title="Escrow"
                        address={contract.escrow ?? null}
                        mempoolLinkLabel="View escrow on mempool.space"
                      />
                      <CollapsibleAddressSection
                        title="Refund Address"
                        address={refundAddress}
                        loading={refundLoading}
                        error={refundError}
                        emptyLabel="Peach wallet"
                        mempoolLinkLabel="View address on mempool.space"
                        onFirstExpand={async () => {
                          if (
                            refundAddress !== null ||
                            refundLoading ||
                            !contract?.id
                          )
                            return;
                          setRefundLoading(true);
                          setRefundError(null);
                          try {
                            // The per-offer `returnAddress` is not retrievable
                            // from any API surface once the offer has been
                            // matched into a contract: /offer/:id/details
                            // strips it, /v069/sellOffer/:id 401s on own
                            // offers, /v069/user/:id/offers omits matched
                            // offers entirely, and the contract response
                            // doesn't carry it. The reliable proxy is the
                            // user's saved custom refund wallet on
                            // /v069/selfUser (the same setting offer-creation
                            // uses to default the choice). Present → custom
                            // destination; absent → Peach wallet default.
                            if (!auth?.pgpPrivKey || !auth?.baseUrl) {
                              setRefundAddress("");
                              return;
                            }
                            const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
                            const res = await fetchWithSessionCheck(
                              `${v069Base}/selfUser`,
                              { headers: { Authorization: `Bearer ${auth.token}` } },
                            );
                            const data = await res.json().catch(() => null);
                            const profile = data?.user ?? data;
                            const saved = await extractCustomRefundAddressFromProfile(
                              profile,
                              auth.pgpPrivKey,
                            );
                            setRefundAddress(saved?.address || "");
                          } catch (e) {
                            setRefundError(
                              "Could not load refund address.",
                            );
                          } finally {
                            setRefundLoading(false);
                          }
                        }}
                      />
                    </>
                  )}

                </div>
              </div>

              {/* ── RIGHT: Chat ── */}
              <div
                className={`split-right${mobileTab === "chat" ? " mobile-active" : ""}`}
              >
                <ChatPanel
                  messages={messages}
                  counterpartyPeachId={counterparty.name}
                  disabled={
                    status === "fundEscrow" ||
                    status === "createEscrow" ||
                    status === "waitingForFunding" ||
                    status === "fundingAmountDifferent" ||
                    status === "wrongAmountFundedOnContract" ||
                    status === "wrongAmountFundedOnContractRefundWaiting" ||
                    status === "escrowWaitingForConfirmation"
                  }
                  status={status}
                  hasMore={chatHasMore}
                  loadingMore={chatLoadingMore}
                  onLoadOlder={loadOlderChat}
                  onOpenDispute={() => setShowDispute(true)}
                  onSend={async (plaintext) => {
                    if (!chatSymKey || !auth?.pgpPrivKey) return false;
                    try {
                      const encrypted = await encryptSymmetric(
                        plaintext,
                        chatSymKey,
                      );
                      const signature = await signPGPMessage(
                        plaintext,
                        auth.pgpPrivKey,
                      );
                      const res = await post(
                        "/contract/" + contract.id + "/chat",
                        { message: encrypted, signature },
                      );
                      return res.ok;
                    } catch (e) {
                      console.warn("[Chat] Send failed:", e.message);
                      return false;
                    }
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── HORIZONTAL STEPPER (fixed bottom) ── */}
      {!contractLoading && (
        <div className="h-stepper-wrap">
          <HorizontalStepper
            status={status}
            statusWithoutDispute={tradeStatusWithoutDispute}
            originOfferType={
              liveContract?.contract
                ? liveContract.contract.buyOffer69Id
                  ? "buy"
                  : "sell"
                : "buy"
            }
          />
        </div>
      )}

      {/* ── MOBILE SIGNING MODAL ── */}
      <MobileSigningModal
        open={!!signingModal}
        title={signingModal?.title}
        description={signingModal?.description}
        onCancel={() => setSigningModal(null)}
      />

      {/* ── TRADE COMPLETE CELEBRATION MODAL ── */}
      {celebrationOpen && status === "rateUser" && contract?.id && (
        <TradeCompleteModal
          role={role}
          counterpartyName={counterparty.name}
          onRate={handleRate}
          onClose={() => {
            setCelebrationDismissed(contract.id);
            setCelebrationOpen(false);
          }}
        />
      )}

      {/* ── BATCH INFO (GROUPHUG) MODAL ── */}
      <BatchInfoModal
        open={batchInfoOpen}
        onClose={() => setBatchInfoOpen(false)}
        batchInfo={contract?.batchInfo}
        payoutAddress={liveContract?.releaseAddress}
        onAccelerate={() => {
          setBatchInfoOpen(false);
          navigate("/settings", { state: { openSection: "tx-batching" } });
        }}
      />

      {/* ── PAYOUT PENDING CELEBRATION (auto-dismiss after 2s) ── */}
      {payoutCelebOpen && (
        <div className="payout-celeb-backdrop" aria-hidden="true">
          <div className="payout-celeb-card">
            <SuccessBanner
              title="Congrats! The seller released the escrow."
              subtitle={payoutPendingSubtitle}
            />
          </div>
        </div>
      )}

      {/* ── CUSTOM PAYOUT ADDRESS NOT SET POPUP (buyer toggle empty state) ── */}
      {showSetupPayoutPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 700,
            background: "rgba(0,0,0,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowSetupPayoutPopup(false)}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: 16,
              padding: "28px 24px",
              maxWidth: 380,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,.25)",
              animation: "modalIn .18s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: "1.05rem",
                marginBottom: 8,
                color: "var(--text)",
              }}
            >
              Custom payout address not set
            </div>
            <div
              style={{
                fontSize: ".88rem",
                color: "var(--black-65)",
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              You haven't saved an external payout address yet. Add one in
              Settings → Custom Payout Address, then come back to enable this
              toggle.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                style={{
                  border: "none",
                  background: "var(--grad)",
                  borderRadius: 999,
                  fontFamily: "Baloo 2, cursive",
                  fontWeight: 800,
                  fontSize: ".87rem",
                  color: "white",
                  padding: "12px",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(245,101,34,.3)",
                }}
                onClick={() => {
                  setShowSetupPayoutPopup(false);
                  navigate("/settings", { state: { openSection: "payout" } });
                }}
              >
                Go to Settings
              </button>
              <button
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--black-65)",
                  fontFamily: "Baloo 2, cursive",
                  fontWeight: 700,
                  fontSize: ".82rem",
                  padding: "8px",
                  cursor: "pointer",
                  marginTop: 4,
                }}
                onClick={() => setShowSetupPayoutPopup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYOUT-CHOICE MODAL (buyer: payment_sent w/ saved address) ── */}
      {payoutChoice && contract && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 700,
            background: "rgba(0,0,0,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: 16,
              padding: "28px 24px",
              maxWidth: 380,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,.25)",
              animation: "modalIn .18s ease",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: "1.05rem",
                marginBottom: 8,
                color: "var(--text)",
              }}
            >
              Choose payout address
            </div>
            <div
              style={{
                fontSize: ".88rem",
                color: "var(--black-65)",
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              Where would you like to receive the bitcoin from this trade?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                style={{
                  border: "none",
                  background: "var(--grad)",
                  borderRadius: 999,
                  fontFamily: "Baloo 2, cursive",
                  fontWeight: 800,
                  fontSize: ".87rem",
                  color: "white",
                  padding: "12px",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(245,101,34,.3)",
                }}
                onClick={async () => {
                  setPayoutChoice(null);
                  setActionError(null);
                  try {
                    const res = await post(
                      `/contract/${contract.id}/payment/createPaymentMadePendingAction`,
                    );
                    if (!res.ok) {
                      const err = await res.json().catch(() => null);
                      throw new Error(
                        err?.error || err?.message || `HTTP ${res.status}`,
                      );
                    }
                    savePendingTask(routeId, "confirmPayment");
                    setPendingTaskType("confirmPayment");
                    await refreshContractMobileActions();
                  } catch (e) {
                    setActionError(
                      "Failed to request confirmation: " + e.message,
                    );
                    setPaymentSliderKey((k) => k + 1);
                  }
                }}
              >
                Use Peach wallet
              </button>
              <button
                style={{
                  border: "1.5px solid var(--primary)",
                  background: "var(--primary-mild)",
                  borderRadius: 999,
                  fontFamily: "Baloo 2, cursive",
                  fontWeight: 800,
                  fontSize: ".87rem",
                  color: "var(--primary)",
                  padding: "12px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  alignItems: "center",
                }}
                onClick={async () => {
                  const choice = payoutChoice;
                  setPayoutChoice(null);
                  setActionError(null);
                  try {
                    const res = await post(
                      `/contract/${contract.id}/payment/confirm`,
                      {
                        releaseAddress: choice.address,
                        releaseAddressMessageSignature: choice.signature,
                      },
                    );
                    if (!res.ok) {
                      const err = await res.json().catch(() => null);
                      throw new Error(
                        err?.error || err?.message || `HTTP ${res.status}`,
                      );
                    }
                    await refreshContractMobileActions();
                  } catch (e) {
                    setActionError(
                      "Failed to request confirmation: " + e.message,
                    );
                    setPaymentSliderKey((k) => k + 1);
                  }
                }}
              >
                <span>Use saved payout address</span>
                <span
                  style={{
                    fontSize: ".72rem",
                    fontWeight: 600,
                    color: "var(--black-65)",
                    fontFamily: "monospace",
                  }}
                >
                  {payoutChoice.address.length > 14
                    ? `${payoutChoice.address.slice(0, 8)}…${payoutChoice.address.slice(-6)}`
                    : payoutChoice.address}
                </span>
              </button>
              <button
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--black-65)",
                  fontFamily: "Baloo 2, cursive",
                  fontWeight: 700,
                  fontSize: ".82rem",
                  padding: "8px",
                  cursor: "pointer",
                  marginTop: 4,
                }}
                onClick={() => {
                  setPayoutChoice(null);
                  setPaymentSliderKey((k) => k + 1);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DISPUTE FLOW ── */}
      {showDispute && contract && (
        <DisputeFlow
          tradeId={contract.id}
          role={role}
          onClose={() => setShowDispute(false)}
          onSubmit={async (body) => {
            if (!chatSymKey || !auth?.pgpPrivKey) return false;
            try {
              const infoRes = await get("/info");
              if (!infoRes.ok) return false;
              const info = await infoRes.json();
              const platformPubKey = info.peach?.pgpPublicKey;
              if (!platformPubKey) {
                console.warn(
                  "[Dispute] Platform PGP key not found in /info response",
                );
                return false;
              }
              const symmetricKeyEncrypted = await encryptForPublicKey(
                chatSymKey,
                platformPubKey,
              );
              if (!symmetricKeyEncrypted) return false;
              async function decryptPMField(encrypted) {
                const sym = await decryptSymmetric(encrypted, chatSymKey);
                if (sym) return sym;
                const asym = await decryptPGPMessage(
                  encrypted,
                  auth.pgpPrivKey,
                );
                if (asym) return asym;
                return null;
              }
              let paymentDataSellerEncrypted = undefined;
              let paymentDataBuyerEncrypted = undefined;
              if (scenario.paymentDataEncrypted) {
                try {
                  const sellerPM = await decryptPMField(
                    scenario.paymentDataEncrypted,
                  );
                  if (sellerPM)
                    paymentDataSellerEncrypted = await encryptForPublicKey(
                      sellerPM,
                      platformPubKey,
                    );
                } catch (e) {
                  console.warn(
                    "[Dispute] Seller PM re-encrypt failed:",
                    e.message,
                  );
                }
              }
              if (scenario.buyerPaymentDataEncrypted) {
                try {
                  const buyerPM = await decryptPMField(
                    scenario.buyerPaymentDataEncrypted,
                  );
                  if (buyerPM)
                    paymentDataBuyerEncrypted = await encryptForPublicKey(
                      buyerPM,
                      platformPubKey,
                    );
                } catch (e) {
                  console.warn(
                    "[Dispute] Buyer PM re-encrypt failed:",
                    e.message,
                  );
                }
              }
              const res = await post("/contract/" + contract.id + "/dispute", {
                ...body,
                symmetricKeyEncrypted,
                paymentDataSellerEncrypted,
                paymentDataBuyerEncrypted,
              });
              if (res.ok) {
                setLiveContract((prev) =>
                  prev ? { ...prev, tradeStatus: "dispute" } : prev,
                );
                return true;
              }
              const err = await res.json().catch(() => ({}));
              console.warn("[Dispute] Submit failed:", err.error || res.status);
              return false;
            } catch (e) {
              console.warn("[Dispute] Submit error:", e.message);
              return false;
            }
          }}
        />
      )}

      {/* ── TOAST ── */}
      <Toast message={toast} tone={toastTone} bottom={80} />

      {badgesHelpOpen && <BadgesInfoPopup onClose={() => setBadgesHelpOpen(false)} />}
    </>
  );
}
