// Compute the next BIP84 change-chain index (m/84'/coin'/0'/1/{index}) to use
// for a Peach-wallet return / refund address.
//
// Return addresses must stay contiguous from index 0 and within the wallet's
// gap limit (GAP_LIMIT = 25, see utils/wallet.js). A refund sent to an address
// past the gap is still seed-derivable, but the watch-only scanner in useWallet
// stops after 25 consecutive unused addresses and would never discover it — so
// deriving at a large index (e.g. the raw offer/contract id) effectively strands
// the funds from the wallet's point of view.
//
// We reconstruct the next free index by counting the user's past sell offers
// whose returnAddress derives from this xpub. Saved / external refund addresses
// don't occupy an `m/84'/.../1/N` slot, so isReturnAddressFromXpub filters them
// out. This is the same accounting sell-offer creation uses, so the
// offer-creation and contract-escrow paths draw from one contiguous range.
//
// Errors from the offer fetches are allowed to propagate — the caller decides
// whether to abort or retry; deriving from a wrong/guessed index is worse than
// not deriving at all.

import { fetchWithSessionCheck } from "./sessionGuard.js";
import { isReturnAddressFromXpub } from "./escrow.js";

export async function computeReturnAddressBaseIndex(auth, get) {
  const v069Base = auth.baseUrl.replace(/\/v1$/, "/v069");
  const hdrs = { Authorization: `Bearer ${auth.token}` };
  const [ownOffersRes, historySellRes] = await Promise.all([
    fetchWithSessionCheck(`${v069Base}/user/${auth.peachId}/offers`, { headers: hdrs }),
    get("/offers/summary"),
  ]);
  const ownOffersData = await ownOffersRes.json().catch(() => ({}));
  const historySell = await historySellRes.json().catch(() => []);
  const activeSell = ownOffersData?.sellOffers ?? [];
  const allPastSellOffers = [
    ...activeSell,
    ...(Array.isArray(historySell) ? historySell.filter((o) => o.type === "ask") : []),
  ];
  if (allPastSellOffers.some((o) => o?.returnAddress)) {
    return allPastSellOffers.reduce((n, o) => {
      const addr = o?.returnAddress;
      return addr && isReturnAddressFromXpub(auth.xpub, addr, 1000) ? n + 1 : n;
    }, 0);
  }
  console.warn(
    "[ReturnAddr] No returnAddress on past offers — falling back to total count",
  );
  return allPastSellOffers.length;
}
