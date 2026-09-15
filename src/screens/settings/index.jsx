// ─── SETTINGS — MAIN COMPONENT ───────────────────────────────────────────────
// Split from peach-settings.jsx.
// Sub-screens live in screens.jsx, shared UI in components.jsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { CSS } from "./styles.js";
import { SettingsRow, SettingsSection } from "./components.jsx";
import { IS_REGTEST } from "../../utils/network.js";
import {
  ProfileSubScreen, ReferralsSubScreen, BackupsSubScreen,
  NetworkFeesSubScreen, TxBatchingSubScreen,
  PayoutWalletSubScreen, BlockUsersSubScreen,
  NotificationsSubScreen,
  LanguageSubScreen, NodeSubScreen, ContactSubScreen, AboutSubScreen,
} from "./screens.jsx";

export default function SettingsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState("main");

  // Reset to main view when sidenav "Settings" is clicked (same-route navigation).
  // When the avatar's "Profile" shortcut sets state.openProfile, jump straight to that sub-view.
  // state.openSection ("payout", "tx-batching", etc.) is a generic deep-link into any sub-view.
  useEffect(() => {
    if (location.state?.openProfile) setCurrentView("profile");
    else if (location.state?.openSection) setCurrentView(location.state.openSection);
    else setCurrentView("main");
  }, [location.key]);

  // ── AUTH STATE ──
  // AppLayout owns Topbar/SideNav state. Settings only needs isLoggedIn for the auth popup.
  const { isLoggedIn, handleLogin } = useAuth();

  const sideMargin = 68;

  function renderContent() {
    if (currentView === "profile")      return <ProfileSubScreen     onBack={() => setCurrentView("main")}/>;
    if (currentView === "referrals")    return <ReferralsSubScreen   onBack={() => setCurrentView("main")}/>;
    if (currentView === "backups")      return <BackupsSubScreen     onBack={() => setCurrentView("main")}/>;
    if (currentView === "network-fees") return <NetworkFeesSubScreen onBack={() => setCurrentView("main")}/>;
    if (currentView === "tx-batching")  return <TxBatchingSubScreen  onBack={() => setCurrentView("main")}/>;
    if (currentView === "payout")       return <PayoutWalletSubScreen  onBack={() => setCurrentView("main")}/>;
    if (currentView === "block-users")  return <BlockUsersSubScreen  onBack={() => setCurrentView("main")}/>;
    if (currentView === "notifications")    return <NotificationsSubScreen    onBack={() => setCurrentView("main")}/>;
    if (currentView === "language")         return <LanguageSubScreen         onBack={() => setCurrentView("main")}/>;
    if (currentView === "node")             return <NodeSubScreen             onBack={() => setCurrentView("main")}/>;
    if (currentView === "contact")          return <ContactSubScreen          onBack={() => setCurrentView("main")}/>;
    if (currentView === "about")            return <AboutSubScreen            onBack={() => setCurrentView("main")}/>;

    return (
      <div className="settings-scroll">
        <h1 className="settings-page-title">Settings</h1>

        <SettingsSection title="Account">
          <SettingsRow icon="👤" label="My Profile"
            description="Reputation, badges, and trading history"
            onClick={() => setCurrentView("profile")}/>
          <SettingsRow icon="🎁" label="Referrals"
            description="Invite friends and earn rewards"
            onClick={() => setCurrentView("referrals")}/>
          <SettingsRow icon="💾" label="Backups"
            description="Back up your account on the mobile app"
            warning={true}
            onClick={() => setCurrentView("backups")}/>
          <SettingsRow icon="🚫" label="Block Users"
            description="Block a user from sending trade requests on your offers"
            onClick={() => setCurrentView("block-users")}
            noBorder/>
        </SettingsSection>

        <SettingsSection title="Trading & Bitcoin">
          <SettingsRow icon="💳" label="Payment Methods"
            description="Add or manage your accepted payment methods"
            onClick={() => navigate("/payment-methods")}/>
          <SettingsRow icon="⛏️" label="Network Fees"
            description="Set your preferred on-chain fee rate"
            onClick={() => setCurrentView("network-fees")}/>
          <SettingsRow icon="📦" label="Transaction Batching"
            description="Combine payouts to save on fees"
            onClick={() => setCurrentView("tx-batching")}/>
          <SettingsRow icon="📤" label="Custom Payout Address"
            description="Send your sats to an external wallet automatically"
            onClick={() => setCurrentView("payout")}
            noBorder/>
        </SettingsSection>

        <SettingsSection title="App & Notifications">
          <SettingsRow icon="🔔" label="Notifications"
            description="Trade updates, trade requests, and alerts"
            onClick={() => setCurrentView("notifications")}/>
          <SettingsRow icon="🌐" label="Language"
            description="English"
            onClick={() => setCurrentView("language")}
            noBorder/>
        </SettingsSection>

        <SettingsSection title="Advanced & Support">
          <SettingsRow icon="🖧" label="Use Your Own Node"
            description="Connect to a custom Bitcoin node"
            onClick={() => setCurrentView("node")}/>
          <SettingsRow icon="💬" label="Contact Peach"
            description="Get help from the Peach team"
            onClick={() => setCurrentView("contact")}/>
          <SettingsRow icon="ℹ️" label="About Peach"
            description="Version, licenses, and legal info"
            onClick={() => setCurrentView("about")}
            noBorder/>
        </SettingsSection>

        {/* Developer Tools — gated by VITE_DEV_TOOLS=1 AND VITE_BITCOIN_NETWORK=REGTEST. */}
        {/* Both literals are inlined by Vite, so the whole section is dead code in mainnet builds. */}
        {import.meta.env.VITE_DEV_TOOLS === "1" && IS_REGTEST && (
          <SettingsSection title="Developer Tools (regtest)">
            <SettingsRow icon="🛠️" label="BIP322 Message Signer"
              description="Sign a payout-flow message with a regtest seed"
              onClick={() => navigate("/dev-tools/bip322")}
              noBorder/>
          </SettingsSection>
        )}

        <div className="version-footer">🍑 Peach Web · v0.1.0 · Made in Switzerland 🇨🇭</div>
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>
        <div className="page-wrap" style={{ marginLeft: sideMargin }}>
          {renderContent()}
        </div>

        {/* ── AUTH POPUP (when logged out) ── */}
        {!isLoggedIn && (
          <div className="auth-screen-overlay">
            <div className="auth-popup">
              <div className="auth-popup-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><rect x="5" y="12" width="18" height="13" rx="3"/><path d="M9 12V9a5 5 0 0 1 10 0v3"/><circle cx="14" cy="19" r="1.5" fill="var(--primary)"/></svg>
              </div>
              <div className="auth-popup-title">Authentication required</div>
              <div className="auth-popup-sub">Please authenticate to access your settings and preferences</div>
              <button className="auth-popup-btn" onClick={handleLogin}>Log in</button>
            </div>
          </div>
        )}
    </>
  );
}
