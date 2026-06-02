// Display metadata for server-driven notifications (GET /v069/selfUser/notifications).
//
// The server sends each notification as { id, type, data, read, timestamp? } where
// `type` is one of the NotificationType strings below and `data` is usually {},
// { offerId } or { contractId }. This module turns that into something renderable:
// a title, an optional body, and an icon category (the categories match the SVGs
// in ServerNotificationPanel.jsx), plus a navigation target.

// Icon categories: message | statusChange | match | tradeRequest | dispute | expiry | warning
const META = {
  // ── User ───────────────────────────────────────────────────────────────────
  "user.badge.unlocked": { title: "Badge unlocked", body: "You earned a new badge.", icon: "match" },

  // ── Mobile actions (something needs signing/funding) ─────────────────────────
  "user.mobileAction.fundEscrow.created":              { title: "Fund escrow", body: "Your escrow is ready to be funded.", icon: "warning" },
  "user.mobileAction.fundContractEscrow.created":      { title: "Fund escrow", body: "Your escrow is ready to be funded.", icon: "warning" },
  "user.mobileAction.fundMultipleEscrow.created":      { title: "Fund escrows", body: "Multiple escrows are ready to be funded.", icon: "warning" },
  "user.mobileAction.confirmPaymentBuyer.created":     { title: "Confirm payment", body: "Confirm the payment to continue.", icon: "warning" },
  "user.mobileAction.signContractRelease.created":     { title: "Release escrow", body: "Sign to release the escrow.", icon: "warning" },
  "user.mobileAction.signEscrowRefund.created":        { title: "Sign refund", body: "Sign to refund your escrow.", icon: "warning" },
  "user.mobileAction.signEscrowContractRefund.created":{ title: "Sign refund", body: "Sign to refund your escrow.", icon: "warning" },

  // ── Offers ───────────────────────────────────────────────────────────────────
  "offer.escrowFunded":            { title: "Escrow funded", body: "Your sell offer escrow is funded.", icon: "statusChange" },
  "offer.notFunded":               { title: "Escrow not funded", body: "Your sell offer escrow was not funded in time.", icon: "warning" },
  "offer.fundingAmountDifferent":  { title: "Funding amount differs", body: "The funded amount differs from the expected amount.", icon: "warning" },
  "offer.wrongFundingAmount":      { title: "Wrong funding amount", body: "The escrow was funded with the wrong amount.", icon: "warning" },
  "offer.sellOfferExpired":        { title: "Sell offer expired", body: "Your sell offer has expired.", icon: "expiry" },
  "offer.buyOfferExpired":         { title: "Buy offer expired", body: "Your buy offer has expired.", icon: "expiry" },
  "offer.matchBuyer":              { title: "New match", body: "A seller matched your buy offer.", icon: "match" },
  "offer.matchSeller":             { title: "New match", body: "A buyer matched your sell offer.", icon: "match" },
  "offer.outsideRange":            { title: "Offer outside range", body: "Your offer is outside the current price range.", icon: "warning" },
  "offer.receivedChatMessage":     { title: "New message", body: "You received a new message.", icon: "message" },
  "offer.receivedTradeRequest":    { title: "Trade request received", body: "Someone wants to trade with you.", icon: "tradeRequest" },
  "offer.newSellOfferMatchesPreferences": { title: "New sell offer", body: "A new sell offer matches your preferences.", icon: "match" },
  "offer.newBuyOfferMatchesPreferences":  { title: "New buy offer", body: "A new buy offer matches your preferences.", icon: "match" },

  // ── Express flow ──────────────────────────────────────────────────────────────
  "offer.expressSellTradeRequestReceived":            { title: "Trade request received", body: "Someone wants to buy from you.", icon: "tradeRequest" },
  "offer.expressBuyTradeRequestReceived":             { title: "Trade request received", body: "Someone wants to sell to you.", icon: "tradeRequest" },
  "offer.expressBuyTradeRequestRejected":             { title: "Trade request rejected", body: "Your trade request was rejected.", icon: "statusChange" },
  "offer.expressSellTradeRequestRejected":            { title: "Trade request rejected", body: "Your trade request was rejected.", icon: "statusChange" },
  "offer.expressBuyTradeRequestNotChosen":            { title: "Trade request not chosen", body: "Another trader was chosen.", icon: "statusChange" },
  "offer.expressSellTradeRequestNotChosen":           { title: "Trade request not chosen", body: "Another trader was chosen.", icon: "statusChange" },
  "offer.expressBuyTradeRequestRemovedAlongsideOffer":  { title: "Trade request removed", body: "The offer is no longer available.", icon: "statusChange" },
  "offer.expressSellTradeRequestRemovedAlongsideOffer": { title: "Trade request removed", body: "The offer is no longer available.", icon: "statusChange" },
  "offer.expressFlowTradeRequestChatMessageReceived": { title: "New message", body: "You received a new message.", icon: "message" },

  // ── Contracts ─────────────────────────────────────────────────────────────────
  "contract.contractCreated":                                  { title: "Trade started", body: "Your trade has started.", icon: "match" },
  "contract.contractCreatedFromExpressSell.buyer.instantTrade":{ title: "It's a match!", body: "Your trade has started.", icon: "match" },
  "contract.contractCreatedFromExpressSell.seller":            { title: "Trade started", body: "Your trade has started.", icon: "match" },
  "contract.contractCreatedFromExpressBuy.seller.instantTrade":{ title: "It's a match!", body: "Your trade has started.", icon: "match" },
  "contract.contractCreatedFromExpressBuy.buyer":              { title: "Trade started", body: "Your trade has started.", icon: "match" },
  "contract.seller.instantTrade":                              { title: "Instant trade", body: "An instant trade has started.", icon: "match" },
  "contract.escrowFunded":        { title: "Escrow funded", body: "The escrow has been funded.", icon: "statusChange" },
  "contract.escrowFunded.buyer":  { title: "Escrow funded", body: "The seller funded the escrow.", icon: "statusChange" },
  "contract.escrowFundingTimeExpiring6hLeft": { title: "Escrow funding expiring", body: "6 hours left to fund the escrow.", icon: "expiry" },
  "contract.escrowFundingTimeExpiring1hLeft": { title: "Escrow funding expiring", body: "1 hour left to fund the escrow.", icon: "expiry" },
  "contract.escrowFundingTimeExpired.buyer":  { title: "Escrow funding expired", body: "The escrow was not funded in time.", icon: "expiry" },
  "contract.escrowFundingTimeExpired.seller": { title: "Escrow funding expired", body: "The escrow was not funded in time.", icon: "expiry" },
  "contract.buyer.paymentReminderSixHours":   { title: "Payment reminder", body: "6 hours left to make the payment.", icon: "expiry" },
  "contract.buyer.paymentReminderOneHour":    { title: "Payment reminder", body: "1 hour left to make the payment.", icon: "expiry" },
  "contract.buyer.paymentTimerHasRunOut":     { title: "Payment time ran out", body: "The payment timer has run out.", icon: "expiry" },
  "contract.seller.paymentTimerHasRunOut":    { title: "Payment time ran out", body: "The buyer's payment timer ran out.", icon: "expiry" },
  "contract.buyer.paymentTimerSellerCanceled":{ title: "Trade canceled", body: "The seller canceled the trade.", icon: "statusChange" },
  "contract.buyer.paymentTimerExtended":      { title: "Payment time extended", body: "Your payment time was extended.", icon: "statusChange" },
  "contract.seller.canceledAfterEscrowExpiry":{ title: "Trade canceled", body: "Canceled after escrow expiry.", icon: "statusChange" },
  "contract.buyer.sellerCanceledBeforeFunding":{ title: "Trade canceled", body: "The seller canceled before funding.", icon: "statusChange" },
  "contract.paymentMade":         { title: "Payment made", body: "The buyer marked the payment as made.", icon: "statusChange" },
  "contract.tradeCompleted":      { title: "Trade completed", body: "Your trade is complete.", icon: "statusChange" },
  "contract.canceled":            { title: "Trade canceled", body: "The trade was canceled.", icon: "statusChange" },
  "contract.buyer.canceled":      { title: "Trade canceled", body: "The trade was canceled.", icon: "statusChange" },
  "contract.cancelationRequest":         { title: "Cancelation requested", body: "A cancelation was requested.", icon: "statusChange" },
  "contract.cancelationRequestAccepted": { title: "Cancelation accepted", body: "The cancelation request was accepted.", icon: "statusChange" },
  "contract.cancelationRequestRejected": { title: "Cancelation rejected", body: "The cancelation request was rejected.", icon: "statusChange" },
  "contract.chat":                { title: "New message", body: "You received a new message.", icon: "message" },
  "contract.wrongFundingAmount":  { title: "Wrong funding amount", body: "The escrow was funded with the wrong amount.", icon: "warning" },

  // ── Disputes ──────────────────────────────────────────────────────────────────
  "contract.buyer.disputeRaised":  { title: "Dispute opened", body: "A dispute has been opened.", icon: "dispute" },
  "contract.seller.disputeRaised": { title: "Dispute opened", body: "A dispute has been opened.", icon: "dispute" },
  "contract.disputeResolved":      { title: "Dispute resolved", body: "The dispute has been resolved.", icon: "dispute" },
  "contract.buyer.disputeWon":     { title: "Dispute won", body: "You won the dispute.", icon: "dispute" },
  "contract.seller.disputeWon":    { title: "Dispute won", body: "You won the dispute.", icon: "dispute" },
  "contract.buyer.disputeLost":    { title: "Dispute lost", body: "You lost the dispute.", icon: "dispute" },
  "contract.seller.disputeLost":   { title: "Dispute lost", body: "You lost the dispute.", icon: "dispute" },

  // ── Peach Web Tool relays ───────────────────────────────────────────────────
  "pwt.contract.chat":         { title: "New message", body: "You received a new message.", icon: "message" },
  "pwt.contract.disputeRaised":{ title: "Dispute opened", body: "A dispute has been opened.", icon: "dispute" },
  "pwt.dispute.reminder":      { title: "Dispute reminder", body: "A dispute needs your attention.", icon: "dispute" },

  // ── Plain-title broadcasts ─────────────────────────────────────────────────────
  "New Buy Offer!":  { title: "New buy offer", body: "A new buy offer is available.", icon: "match" },
  "New Sell Offer!": { title: "New sell offer", body: "A new sell offer is available.", icon: "match" },
};

// Turn an unknown / TODO type into something readable, e.g.
// "contract.escrowFundingTimeExpiring6hLeft" → "Escrow Funding Time Expiring6h Left".
function humanize(type) {
  if (typeof type !== "string" || !type) return "Notification";
  const last = type.split(".").pop();
  const spaced = last
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._]/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Returns { title, body, icon } for a stored notification. */
export function describeNotif(n) {
  const meta = META[n?.type];
  if (meta) return meta;
  return { title: humanize(n?.type), body: "", icon: "statusChange" };
}

/**
 * Navigation target for a notification, mirroring the legacy bell's routing:
 *   data.contractId → /trade/:id
 *   data.offerId    → /trades (opening that offer), unless a contract already
 *                     exists for it, in which case jump to the contract.
 * Returns { to, state? } or null when there's nothing useful to open.
 */
export function getNotifTarget(n) {
  const data = n?.data ?? {};
  const type = n?.type ?? "";

  if (data.contractId) return { to: `/trade/${data.contractId}` };

  if (data.offerId != null) {
    const offerIdStr = String(data.offerId);
    const contracts = window.__PEACH_CONTRACTS__?.data ?? [];
    const contract = contracts.find(c => String(c.id).split("-").includes(offerIdStr));
    if (contract) return { to: `/trade/${contract.id}` };

    const isExpiry = type.includes("Expired") || type.includes("expired");
    const isRequestLike = type.includes("TradeRequest") || type.includes("chat") || type.includes("Chat") || type.includes("match");
    return {
      to: "/trades",
      state: {
        openOfferId: data.offerId,
        tab: isExpiry ? "history" : "pending",
        intent: isRequestLike ? "tradeRequest" : undefined,
      },
    };
  }

  if (type === "user.badge.unlocked") return { to: "/settings", state: { openProfile: true } };
  return { to: "/trades" };
}
