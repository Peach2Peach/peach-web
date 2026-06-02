import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useServerNotifications } from "../hooks/useServerNotifications.js";
import { describeNotif, getNotifTarget } from "../data/notificationConfig.js";

const TONE_COLOR = {
  message:      "var(--primary)",
  statusChange: "var(--black-50, var(--black-65))",
  match:        "var(--success)",
  tradeRequest: "var(--success)",
  dispute:      "var(--error)",
  expiry:       "var(--black-50)",
  warning:      "var(--warning)",
};

const TOAST_MS = 5_000;

function NotifToast({ notif, onClick, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, TOAST_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const { title, body, icon } = describeNotif(notif);
  return (
    <div className="notif-toast" onClick={onClick} role="button" tabIndex={0}>
      <span className="notif-toast-bar" style={{ background: TONE_COLOR[icon] || "var(--primary)" }} />
      <div className="notif-toast-body">
        <div className="notif-toast-title">{title}</div>
        {body && <div className="notif-toast-desc">{body}</div>}
      </div>
      <button
        className="notif-toast-close"
        aria-label="Dismiss"
        onClick={e => { e.stopPropagation(); onDismiss(); }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>
      </button>
    </div>
  );
}

export default function NotificationToasts() {
  const { toasts, dismissToast } = useServerNotifications();
  const navigate = useNavigate();

  if (!toasts.length) return null;

  return (
    <div className="notif-toast-stack">
      {toasts.map(n => (
        <NotifToast
          key={n.id}
          notif={n}
          onDismiss={() => dismissToast(n.id)}
          onClick={() => {
            dismissToast(n.id);
            const target = getNotifTarget(n);
            if (target?.to) navigate(target.to, target.state ? { state: target.state } : undefined);
          }}
        />
      ))}
    </div>
  );
}
