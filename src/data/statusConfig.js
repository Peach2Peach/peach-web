// ─── TRADE STATUS CONFIGURATION ──────────────────────────────────────────────
// Single source of truth for all TradeStatus values from the Peach API.
// Used by: trade-execution, trades-dashboard
//
// Status chip colours — 3 categories:
//   Orange (var(--primary-mild) / var(--primary-dark)) = action required
//   Yellow (var(--warning-soft) / var(--warning)) = warning, attention requested
//   Grey   (var(--black-5) / var(--black-65)) = pending, no action required
// Plus: green for completed, red for disputes/cancellation
//
// All values from mobile app TradeStatus type — no invented statuses.
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_CONFIG = {
  // ── Pending (offer stage) ──
  searchingForPeer:    { label: "Waiting for Match",     bg: "var(--black-5)", color: "var(--black-65)", action: false },
  waitingForTradeRequest:{ label: "Waiting for Match",   bg: "var(--black-5)", color: "var(--black-65)", action: false },
  offerHidden:         { label: "Offer Hidden",          bg: "var(--black-5)", color: "var(--black-65)", action: false },
  offerHiddenWithMatchesAvailable: { label: "Hidden (Matches)", bg: "var(--primary-mild)", color: "var(--primary-dark)", action: true },
  hasMatchesAvailable: { label: "Select Match",           bg: "var(--primary-mild)", color: "var(--primary-dark)", action: true  },
  acceptTradeRequest:  { label: "Accept Trade Request",  bg: "var(--primary-mild)", color: "var(--primary-dark)", action: true  },

  // ── Active (contract stage) ──
  createEscrow:        { label: "Create Escrow",         bg: "var(--warning-soft)", color: "var(--warning)", action: true  },
  fundEscrow:          { label: "Fund Escrow",           bg: "var(--warning-soft)", color: "var(--warning)", action: true  },
  waitingForFunding:   { label: "Waiting for Funding",   bg: "var(--black-5)", color: "var(--black-65)", action: false },
  escrowWaitingForConfirmation: { label: "Transaction Pending", bg: "var(--black-5)", color: "var(--black-65)", action: false },
  fundingAmountDifferent:{ label: "Wrong Amount Funded",  bg: "var(--warning-soft)", color: "var(--warning)", action: true  },
  paymentRequired:     { label: "Make Payment",           bg: "var(--primary-mild)", color: "var(--primary-dark)", action: true  },
  confirmPaymentRequired:{ label: "Confirm Payment",     bg: "var(--primary-mild)", color: "var(--primary-dark)", action: true  },
  releaseEscrow:       { label: "Release Escrow",        bg: "var(--primary-mild)", color: "var(--primary-dark)", action: true  },
  paymentTooLate:      { label: "Not Paid in Time",      bg: "var(--warning-soft)", color: "var(--warning)", action: true  },
  payoutPending:       { label: "Payout Pending",        bg: "var(--black-5)", color: "var(--black-65)", action: false },
  rateUser:            { label: "Rate Counterparty",     bg: "var(--primary-mild)", color: "var(--primary-dark)", action: true  },
  dispute:             { label: "Dispute",               bg: "var(--error-bg)", color: "var(--error)", action: true  },
  disputeWithoutEscrowFunded: { label: "Dispute",        bg: "var(--error-bg)", color: "var(--error)", action: true  },
  confirmCancelation:  { label: "Cancel Requested",       bg: "var(--error-bg)", color: "var(--error)", action: true  },

  // ── Finished ──
  tradeCompleted:      { label: "Completed",             bg: "var(--success-bg)", color: "var(--success)", action: false },
  offerCanceled:       { label: "Offer Cancelled",       bg: "var(--black-5)", color: "var(--black-65)", action: false },
  tradeCanceled:       { label: "Trade Cancelled",       bg: "var(--black-5)", color: "var(--black-65)", action: false },
  fundingExpired:      { label: "Funding Expired",       bg: "var(--black-5)", color: "var(--black-65)", action: false },
  wrongAmountFundedOnContract: { label: "Wrong Amount",  bg: "var(--warning-soft)", color: "var(--warning)", action: false },
  wrongAmountFundedOnContractRefundWaiting: { label: "Refund Pending", bg: "var(--black-5)", color: "var(--black-65)", action: false },

  // ── Refund-related ──
  refundAddressRequired:     { label: "Refund Address Needed", bg: "var(--primary-mild)", color: "var(--primary-dark)", action: true  },
  refundOrReviveRequired:    { label: "Refund or Revive",      bg: "var(--warning-soft)", color: "var(--warning)", action: true  },
  refundTxSignatureRequired: { label: "Sign Refund",           bg: "var(--primary-mild)", color: "var(--primary-dark)", action: true  },
};

// Statuses that represent a finished state → Trade History tab
export const FINISHED_STATUSES = new Set([
  "tradeCompleted", "offerCanceled", "tradeCanceled", "fundingExpired",
  "wrongAmountFundedOnContract", "wrongAmountFundedOnContractRefundWaiting",
]);

// Statuses that represent a pending/open offer → Pending Offers tab
export const PENDING_STATUSES = new Set([
  "searchingForPeer", "waitingForTradeRequest",
  "hasMatchesAvailable", "acceptTradeRequest",
  "offerHidden", "offerHiddenWithMatchesAvailable",
  "escrowWaitingForConfirmation",
]);

// Trade lifecycle steps in order (used by HorizontalStepper in trade execution)
export const LIFECYCLE = [
  { id: "fundEscrow",              label: "Matched",        desc: "Offers paired, awaiting escrow" },
  { id: "paymentRequired",         label: "Escrow Funded",  desc: "Bitcoin locked in escrow" },
  { id: "confirmPaymentRequired",  label: "Payment Sent",   desc: "Buyer marked fiat as sent — seller reviewing" },
  { id: "tradeCompleted",          label: "Completed",      desc: "Bitcoin released, trade closed" },
];
