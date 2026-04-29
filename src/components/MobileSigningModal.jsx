const css = `
.msm-overlay{
  position:fixed;inset:0;z-index:500;
  background:rgba(43,25,17,.55);
  display:flex;align-items:center;justify-content:center;
  padding:20px;
}
.msm-card{
  background:var(--surface);border-radius:16px;padding:32px 28px;
  max-width:380px;width:100%;text-align:center;
  box-shadow:0 20px 60px rgba(0,0,0,.25);
  animation:modalIn .18s ease;
}
.msm-icon-wrap{
  width:64px;height:64px;border-radius:50%;
  background:var(--primary-mild);display:flex;align-items:center;justify-content:center;
  margin:0 auto 18px;
}
.msm-title{
  font-weight:800;font-size:1.1rem;color:var(--black);margin-bottom:6px;
}
.msm-desc{
  font-size:.88rem;color:var(--black-65);line-height:1.6;margin-bottom:24px;
}
.msm-spinner{
  width:28px;height:28px;border:3px solid var(--black-10);
  border-top-color:var(--primary);border-radius:50%;
  animation:spin .8s linear infinite;
  margin:0 auto 20px;
}
.msm-cancel{
  border:1.5px solid var(--black-10);background:var(--surface);
  border-radius:999px;font-family:"Baloo 2",cursive;
  font-weight:700;font-size:.87rem;color:var(--black);
  padding:10px 28px;cursor:pointer;transition:border-color .15s;
}
.msm-cancel:hover{border-color:var(--primary)}
`;

function PhoneIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12" y2="18.01"/>
    </svg>
  );
}

// ── Pending task persistence (localStorage) ──
const PENDING_KEY = "peach_pending_tasks";

function getPendingTasks() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "{}"); }
  catch { return {}; }
}

/** Check if a pending task exists for a given id + action type. */
export function hasPendingTask(id, type) {
  return !!getPendingTasks()[`${id}:${type}`];
}

/** Save a pending task (called when user creates a task or dismisses the modal). */
export function savePendingTask(id, type, meta = {}) {
  const tasks = getPendingTasks();
  tasks[`${id}:${type}`] = { id, type, ts: Date.now(), ...meta };
  localStorage.setItem(PENDING_KEY, JSON.stringify(tasks));
}

/** Clear a pending task (called when contract status changes). */
export function clearPendingTask(id, type) {
  const tasks = getPendingTasks();
  delete tasks[`${id}:${type}`];
  localStorage.setItem(PENDING_KEY, JSON.stringify(tasks));
}

export default function MobileSigningModal({ open, title, description, onCancel }) {
  if (!open) return null;
  return (
    <>
      <style>{css}</style>
      <div className="msm-overlay" onClick={onCancel}>
        <div className="msm-card" onClick={e => e.stopPropagation()}>
          <div className="msm-icon-wrap">
            <PhoneIcon />
          </div>
          <div className="msm-title">{title || "Approve on Mobile"}</div>
          <div className="msm-desc">
            {description || "Open your Peach mobile app to approve this action. A push notification has been sent to your phone."}
          </div>
          <div className="msm-spinner" />
          <button className="msm-cancel" onClick={onCancel}>Confirm later in mobile</button>
        </div>
      </div>
    </>
  );
}
