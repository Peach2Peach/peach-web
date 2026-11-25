import { useEffect, useRef } from "react";
import { submitInstantTradeSignature } from "../utils/instantTradeSignature.js";

/**
 * The instant trade declaration is normally submitted right after the offer is
 * created. If that failed (the server returns `instantTradeSignature: null`),
 * submit it here, at most once per offer while the calling screen is mounted.
 * An absent field (`undefined`) means the server doesn't support it, so
 * nothing is sent.
 *
 * @param {Array<{ id: string|number, instantTradeSignature?: string|null, paymentData?: object } | null | undefined>} sellOffers
 *   Offers without `paymentData` are fetched before signing.
 */
export function useSubmitMissingInstantTradeSignature(sellOffers) {
  const attempted = useRef(new Set());
  const missing = (sellOffers ?? []).filter(
    (offer) => offer?.id != null && offer.instantTradeSignature === null,
  );
  const missingKey = missing.map((offer) => String(offer.id)).join(",");

  useEffect(() => {
    missing.forEach((offer) => {
      const id = String(offer.id);
      if (attempted.current.has(id)) return;
      attempted.current.add(id);
      submitInstantTradeSignature({ id, paymentData: offer.paymentData });
    });
    // only re-run when the set of offers missing a signature changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey]);
}
