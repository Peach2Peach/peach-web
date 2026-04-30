import { IconAlert } from "../screens/trade-execution/components.jsx";

// Shared confirmation modal. Used by trade-execution (cancel trade, confirm
// payment received) and RequestedOfferPopup (undo sent trade request).
// Keyframes `modalIn` live in src/styles/global.css so it animates anywhere.
export default function ConfirmModal({ title, body, confirmLabel, onConfirm, onCancel, tone = "danger" }) {
  const isSuccess = tone === "success";
  const confirmBg = isSuccess ? "var(--success)" : "var(--error)";
  const confirmShadow = isSuccess
    ? "0 2px 10px rgba(101,165,25,.3)"
    : "0 2px 10px rgba(223,50,31,.3)";
  return (
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
        {!isSuccess && (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--error-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <IconAlert />
          </div>
        )}
        <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: 8, color: "var(--text)" }}>
          {title}
        </div>
        <div
          style={{
            fontSize: ".88rem",
            color: "var(--black-65)",
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {body}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{
              flex: 1,
              border: "1.5px solid var(--black-10)",
              background: "var(--surface)",
              borderRadius: 999,
              fontFamily: "Baloo 2, cursive",
              fontWeight: 700,
              fontSize: ".87rem",
              color: "var(--black)",
              padding: "10px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--black-10)")}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            style={{
              flex: 1,
              border: "none",
              background: confirmBg,
              borderRadius: 999,
              fontFamily: "Baloo 2, cursive",
              fontWeight: 800,
              fontSize: ".87rem",
              color: "var(--text-on-accent)",
              padding: "10px",
              cursor: "pointer",
              boxShadow: confirmShadow,
              transition: "filter .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.9)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "")}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
