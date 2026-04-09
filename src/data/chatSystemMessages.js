// ─── CHAT SYSTEM MESSAGES ────────────────────────────────────────────────────
// Dictionary of system message i18n keys → English strings.
// The Peach API stores chat system messages as i18n keys from the mobile app
// (e.g. "chat.systemMessage.mediatorWillJoinSoon"). The web app resolves them
// here so they render as readable text instead of raw keys.
//
// Keys and English strings are mirrored from the mobile app at:
//   peach-app/peach-app/src/i18n/chat/en.json
//
// Some messages contain a `$0` placeholder — the counterparty's PeachID.
// `resolveSystemMessage` substitutes this at render time.
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_MESSAGES = {
  "chat.systemMessage": "Peach system message",

  // ── Mediator lifecycle ──
  "chat.systemMessage.mediatorWillJoinSoon": "A Peach mediator will join the chat soon",
  "chat.systemMessage.noLongerMediated": "Your Peach mediator has left the chat.",
  "chat.systemMessage.provideMoreInformation":
    "In the meantime, feel free to provide more information about the dispute. If you have screenshots or documents to provide, send them to dispute@peachbitcoin.com.\n\nPlease put [Dispute $0] in the subject line.",

  // ── Dispute started ──
  "chat.systemMessage.disputeStarted":
    "Dispute started",
  "chat.systemMessage.disputeStarted.buyer.abusive":
    "A dispute has been started by the seller $0 for the following reason: 'abusive behaviour'",
  "chat.systemMessage.disputeStarted.buyer.noPayment.seller":
    "A dispute has been started by the seller $0 for the following reason: 'payment not received'",
  "chat.systemMessage.disputeStarted.buyer.other":
    "A dispute has been started by the seller $0 for the following reason: 'something else'",
  "chat.systemMessage.disputeStarted.buyer.unresponsive.seller":
    "A dispute has been started by the seller $0 for the following reason: 'buyer unresponsive'",
  "chat.systemMessage.disputeStarted.seller.abusive":
    "A dispute has been started by the buyer $0 for the following reason: 'abusive behaviour'",
  "chat.systemMessage.disputeStarted.seller.noPayment.buyer":
    "A dispute has been started by the buyer $0 for the following reason: 'bitcoin not received'",
  "chat.systemMessage.disputeStarted.seller.other":
    "A dispute has been started by the buyer $0 for the following reason: 'something else'",
  "chat.systemMessage.disputeStarted.seller.unresponsive.buyer":
    "A dispute has been started by the buyer $0 for the following reason: 'seller unresponsive'",

  // ── Dispute outcome ──
  "chat.systemMessage.dispute.outcome.buyerWins":
    "The dispute has been settled in favour of the buyer, and the seller's reputation has been impacted.",
  "chat.systemMessage.dispute.outcome.sellerWins":
    "The dispute has been settled in favour of the seller, and the buyer's reputation has been impacted.",
  "chat.systemMessage.dispute.outcome.cancelTrade":
    "The dispute has been canceled, so your reputation has not been impacted.",
  "chat.systemMessage.dispute.outcome.none":
    "The dispute has been resolved, and the trade will continue as normal. Your reputation has not been impacted.",
  "chat.systemMessage.dispute.outcome.payoutBuyer":
    "The dispute has been canceled, so your reputation has not been impacted. The seller has been asked to release the funds.",
};

// Identifies whether a raw message text is a known system message i18n key.
export function isSystemMessageKey(text) {
  if (typeof text !== "string") return false;
  return text.startsWith("chat.systemMessage");
}

// Resolves a chat system message i18n key to its English string.
//
// The server delivers system messages as `<key>::<param0>::<param1>…` where
// params are substituted into `$0`, `$1`, … in the English template. Example:
//   "chat.systemMessage.disputeStarted.seller.unresponsive.buyer::peach03cf9e9a"
// → template "A dispute has been started by the buyer $0 …"
// → "A dispute has been started by the buyer peach03cf9e9a …"
//
// If the key is unknown, the raw text is returned (so missing translations
// are visible during development).
// `counterpartyPeachId` is used as a fallback for `$0` when the server did
// not inline a param (older system messages).
export function resolveSystemMessage(text, { counterpartyPeachId } = {}) {
  if (typeof text !== "string") return text;
  const [key, ...params] = text.split("::");
  const template = SYSTEM_MESSAGES[key];
  if (!template) return text;
  // Substitute $0, $1, … from inline params; fall back to counterpartyPeachId for $0.
  return template.replace(/\$(\d+)/g, (match, idx) => {
    const i = Number(idx);
    if (params[i] != null) return params[i];
    if (i === 0 && counterpartyPeachId) return counterpartyPeachId;
    return "";
  });
}
