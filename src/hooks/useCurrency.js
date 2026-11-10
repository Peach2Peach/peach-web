import { createContext, useContext } from "react";

// Lives in its own module (not AppLayout.jsx) so the context object keeps the
// same identity across Vite hot reloads. When it was exported from
// AppLayout.jsx, any edit to AppLayout or its imports re-created the context,
// leaving already-loaded screens reading a stale copy and throwing
// "useCurrency must be used inside <AppLayout>" until a full page reload.
export const CurrencyContext = createContext(null);

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <AppLayout>");
  return ctx;
}
