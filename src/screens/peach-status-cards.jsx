import { useState } from "react";
import { SatsAmount } from "../components/BitcoinAmount.jsx";
import PeachRating from "../components/PeachRating.jsx";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --primary:      #F56522;
    --primary-dark: #C45104;
    --primary-mild: #FCCCB6;
    --primary-bg:   #FEEDE5;
    --success:      #65A519;
    --success-bg:   #F2F9E7;
    --success-mild: #DDEFC3;
    --warning:      #F3B71A;
    --warning-bg:   #FEFCE5;
    --warning-dark: #9A6800;
    --error:        #DF321F;
    --error-bg:     #FFE6E1;
    --info:         #037DB5;
    --info-bg:      #D7F2FE;
    --black:        #2B1911;
    --black-75:     #624D44;
    --black-65:     #7D675E;
    --black-10:     #EAE3DF;
    --black-5:      #F4EEEB;
    --bg:           #FFF9F6;
    --surface:      #FFFFFF;
    --font:         'Baloo 2', cursive;
  }

  body { font-family: var(--font); background: var(--bg); color: var(--black); }

  /* ── Page layout ── */
  .page { padding: 40px 48px; max-width: 1300px; margin: 0 auto; }
  .page-title { font-size: 1.4rem; font-weight: 800; letter-spacing: -.02em; margin-bottom: 8px; }
  .page-sub   { font-size: .82rem; color: var(--black-65); margin-bottom: 40px; }

  .pov-section { margin-bottom: 56px; }
  .pov-label {
    font-size: .6rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
    color: var(--black-65); margin-bottom: 20px; padding-bottom: 8px;
    border-bottom: 1px solid var(--black-10);
  }
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    align-items: start;
  }
  .card-group { display: flex; flex-direction: column; gap: 6px; }
  .card-group-label {
    font-size: .58rem; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--black-65);
  }

  /* ── Trade Card ── */
  .sc {
    background: var(--surface); border: 1.5px solid var(--black-10);
    border-radius: 16px; overflow: hidden; cursor: pointer;
    transition: box-shadow .18s, transform .12s;
    display: flex; flex-direction: column;
  }
  .sc:hover { box-shadow: 0 6px 24px rgba(0,0,0,.1); transform: translateY(-2px); }

  /* Instant / experience header strip */
  .sc-meta-bar {
    display: grid; grid-template-columns: 1fr 1fr;
    font-size: .65rem; font-weight: 700;
    border-bottom: 1.5px solid var(--black-10);
  }
  .sc-meta-instant {
    padding: 5px 12px; background: var(--primary-bg);
    color: var(--primary-dark); border-right: 1.5px solid var(--black-10);
  }
  .sc-meta-exp {
    padding: 5px 12px; text-align: right;
    background: var(--black-5); color: var(--black-65);
  }
  .sc-meta-exp.new-users  { background: white; color: #005E89; }
  .sc-meta-exp.exp-only   { background: #FEFCE5; color: #7A5C00; }

  /* Top row: direction · ID · date · unread */
  .sc-top {
    padding: 12px 14px 9px;
    display: flex; align-items: center; gap: 7px;
  }
  .dir-badge {
    display: inline-flex; align-items: center; border-radius: 999px;
    padding: 3px 13px; font-size: .82rem; font-weight: 800;
    letter-spacing: .04em; flex-shrink: 0;
  }
  .dir-buy  { background: #F2F9E7; color: #65A519; }
  .dir-sell { background: #FFF0EE; color: #DF321F; }

  .sc-id   { font-size: .72rem; font-weight: 700; color: var(--black-65); font-family: monospace; }
  .sc-date { font-size: .68rem; color: var(--black-65); }
  .unread-badge {
    margin-left: auto; display: inline-flex; align-items: center; gap: 4px;
    background: var(--error-bg); color: var(--error);
    border-radius: 999px; padding: 3px 9px; font-size: .75rem; font-weight: 700; line-height: 1;
  }

  /* Peer row */
  .sc-peer-row {
    padding: 0 14px 10px;
    display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  }
  .sc-peer-left  { display: flex; align-items: flex-start; gap: 9px; flex: 1; min-width: 0; }
  .sc-peer-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
  .sc-peer-name  { font-size: .85rem; font-weight: 700; }
  .sc-peer-trades{ font-size: .7rem; color: var(--black-65); margin-top: 1px; }
  .sc-peer-meta  { display: flex; align-items: center; gap: 6px; }

  /* Avatar */
  .sc-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: white; flex-shrink: 0;
    position: relative;
  }
  .sc-avatar-dot {
    position: absolute; bottom: 0; right: 0;
    width: 9px; height: 9px; border-radius: 50%;
    background: #65A519; border: 2px solid white;
  }

  /* Sats/fiat/time right column */
  .sc-sats  { font-size: .88rem; font-weight: 800; color: var(--black); }
  .sc-fiat  { font-size: .78rem; font-weight: 600; color: var(--black-65); }
  .sc-prem  { font-size: .7rem; font-weight: 700; }
  .sc-time  { font-size: .67rem; color: var(--black-65); display: flex; align-items: center; gap: 3px; margin-top: 1px; }
  .sc-time.urgent { color: var(--error); }

  /* Tags */
  .sc-tags  { padding: 0 14px 10px; display: flex; gap: 5px; flex-wrap: wrap; }
  .tag      { display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 9px; font-size: .68rem; font-weight: 600; white-space: nowrap; }
  .tag-m    { background: var(--black-5); color: var(--black-75); }
  .tag-c    { background: var(--primary-bg); color: var(--primary-dark); }

  /* Status pill */
  .sc-pill {
    margin: 0 10px 10px; border-radius: 12px;
    padding: 11px 14px;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    border: none; font-family: var(--font); font-size: .85rem; font-weight: 800;
    cursor: pointer; width: calc(100% - 20px); transition: filter .15s;
  }
  .sc-pill:hover { filter: brightness(1.05); }
  .sc-pill.passive {
    border: 1.5px solid var(--black-10);
    font-weight: 600; font-size: .82rem;
  }

  /* Badge */
  .peer-badge {
    display: inline-flex; align-items: center; gap: 5px;
    border: 1.5px solid var(--primary); border-radius: 999px;
    padding: 1px 8px; font-size: .62rem; font-weight: 700;
    color: var(--primary); background: transparent; white-space: nowrap;
  }

  /* Peach rating */
  .peach-rating { display: inline-flex; align-items: center; gap: 4px; }
  .peach-rating span { font-size: .78rem; font-weight: 700; color: var(--black-75); }

  /* Icon helper */
  .ico { vertical-align: middle; display: inline-block; flex-shrink: 0; }

  /* Divider */
  .divider { height: 1px; background: var(--black-10); margin: 40px 0; }
`;

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IcoClock  = ({ s = 12 }) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="ico"><circle cx="6" cy="6" r="4.5"/><path d="M6 3.2v2.8l1.8 1.3"/></svg>;
const IcoMsg    = ({ s = 14 }) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="ico"><path d="M2 2h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8l-3 2V10H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/></svg>;
const IcoSearch = ({ s = 13 }) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="ico"><circle cx="6" cy="6" r="4"/><path d="M10 10l2.5 2.5"/></svg>;
const IcoSync   = ({ s = 13 }) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="ico"><path d="M2 7A5 5 0 0 1 12 5M12 7A5 5 0 0 1 2 9"/><path d="M10 3l2 2-2 2"/><path d="M4 11l-2-2 2-2"/></svg>;
const IcoUpload = ({ s = 13 }) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="ico"><path d="M7 2v8M4 5l3-3 3 3"/><path d="M2 11h10"/></svg>;
const IcoWallet = ({ s = 13 }) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="ico"><rect x="1.5" y="3.5" width="11" height="8" rx="1.5"/><path d="M1.5 6h11"/><circle cx="9.5" cy="8" r=".8" fill="currentColor" stroke="none"/></svg>;
const IcoDollar = ({ s = 13 }) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="ico"><path d="M7 1v12M4.5 3.5c0-.8.7-1.5 2.5-1.5s2.5.7 2.5 1.5-.7 1.5-2.5 1.5-2.5.7-2.5 1.5.7 1.5 2.5 1.5 2.5.7 2.5 1.5-.7 1.5-2.5 1.5-2.5-.7-2.5-1.5"/></svg>;
const IcoHeart  = ({ s = 13 }) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="ico"><path d="M7 11.5S1.5 8 1.5 4.5a2.5 2.5 0 0 1 5-1 2.5 2.5 0 0 1 5 1C11.5 8 7 11.5 7 11.5z"/></svg>;
const IcoAlert  = ({ s = 13 }) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="ico"><path d="M7 2L1 12h12L7 2z"/><line x1="7" y1="6" x2="7" y2="9"/><circle cx="7" cy="11" r=".5" fill="currentColor"/></svg>;
const IcoCheck  = ({ s = 13 }) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="ico"><path d="M2 7l3.5 3.5 6.5-6"/></svg>;
const IcoEye    = ({ s = 13 }) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="ico"><path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z"/><circle cx="7" cy="7" r="1.5"/><line x1="2" y1="2" x2="12" y2="12"/></svg>;
const IcoMempool= ({ s = 13 }) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="ico"><rect x="2" y="5" width="10" height="7" rx="1.5"/><path d="M5 5V3.5a2 2 0 1 1 4 0V5"/></svg>;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(n) { return n.toLocaleString("fr-FR"); }


function Badge({ label, icon }) {
  return (
    <span className="peer-badge">{label}{icon && <span>{icon}</span>}</span>
  );
}

// ─── STATUS PILL CONFIG ───────────────────────────────────────────────────────
// bg, color, label, icon component, passive (bool)
const PILLS = {
  // ── Passive ──
  looking_for_match:    { bg:"var(--primary-bg)", c:"var(--primary-dark)", label:"Looking for a match",       ico:<IcoSearch s={13}/>, passive:true },
  waiting_for_seller:   { bg:"var(--primary-bg)", c:"var(--primary-dark)", label:"Waiting for seller",         ico:<IcoClock s={13}/>,  passive:true },
  waiting_for_payment:  { bg:"var(--primary-bg)", c:"var(--primary-dark)", label:"Waiting for payment",        ico:<IcoClock s={13}/>,  passive:true },
  transaction_mempool:  { bg:"var(--primary-bg)", c:"var(--primary-dark)", label:"Transaction in mempool",     ico:<IcoMempool s={13}/>,passive:true },
  offer_hidden:         { bg:"#F4EEEB",            c:"#7D675E",            label:"surpassing trading limit",   ico:<IcoEye s={13}/>,    passive:true },
  // ── Warning ──
  not_paid_in_time:     { bg:"#FEFCE5", c:"#7A5C00", label:"Not paid in time!",          ico:<IcoClock s={13}/>,  passive:false },
  // ── Action — orange ──
  accept_trade_request: { bg:"#F56522", c:"white",   label:"Accept trade request",       ico:<IcoCheck s={13}/>,  passive:false },
  make_payment:         { bg:"#F56522", c:"white",   label:"Make Payment",               ico:<IcoDollar s={13}/>, passive:false },
  fund_escrow:          { bg:"#F56522", c:"white",   label:"Fund Escrow",                ico:<IcoUpload s={13}/>, passive:false },
  wrong_amount_funded:  { bg:"#F56522", c:"white",   label:"Wrong amount funded",        ico:<IcoAlert s={13}/>,  passive:false },
  confirm_payment:      { bg:"#F56522", c:"white",   label:"Confirm Payment",            ico:<IcoDollar s={13}/>, passive:false },
  rate_seller:          { bg:"#F56522", c:"white",   label:"Rate Seller",                ico:<IcoHeart s={13}/>,  passive:false },
  rate_buyer:           { bg:"#F56522", c:"white",   label:"Rate Buyer",                 ico:<IcoHeart s={13}/>,  passive:false },
  // ── Action — green ──
  release_escrow:       { bg:"#65A519", c:"white",   label:"Release Bitcoin",            ico:<IcoUpload s={13}/>, passive:false },
  dispute_won:          { bg:"#65A519", c:"white",   label:"Dispute won · resolve now",  ico:<IcoCheck s={13}/>,  passive:false },
  // ── Action — red ──
  dispute_started:      { bg:"#DF321F", c:"white",   label:"Dispute started",            ico:<IcoAlert s={13}/>,  passive:false },
  // ── System ──
  unknown:              { bg:"#037DB5", c:"white",   label:"Unknown · update your app!", ico:<IcoSync s={13}/>,   passive:false },
};

// ─── CARD COMPONENT ───────────────────────────────────────────────────────────
// instant: bool — show "instant" left label
// exp: null | "experienced_only" | "new_users_only"
// direction: "buy" | "sell"
// peer: object | null
// sats: number
// fiat: string
// currency: string
// premium: number | null
// time: string
// urgentTime: bool
// unread: number
// methods: string[]
// currencies: string[]
// tradeId: string
// status: key from PILLS

function StatusCard({ status, direction="buy", instant=false, exp=null,
  peer=null, sats=85000, fiat="74.32", currency="EUR",
  premium=-1.2, time="7h 49m remaining", urgentTime=false,
  unread=0, methods=["SEPA"], currencies=["EUR"], tradeId="CT1" }) {

  const pill = PILLS[status];
  const isBuy = direction === "buy";
  const showMeta = instant || exp;

  return (
    <div className="sc">

      {/* ── Meta bar (instant / experience) ── */}
      {showMeta && (
        <div className="sc-meta-bar">
          <div className="sc-meta-instant">
            {instant ? "⚡ instant" : <span style={{ opacity:0.4 }}>—</span>}
          </div>
          <div className={`sc-meta-exp${exp === "experienced_only" ? " exp-only" : exp === "new_users_only" ? " new-users" : ""}`}>
            {exp === "experienced_only" && "experienced users only"}
            {exp === "new_users_only"   && <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}><span style={{ width:6, height:6, borderRadius:"50%", background:"#037DB5", flexShrink:0, display:"inline-block" }}/> new users only</span>}
            {!exp                       && <span style={{ opacity:0.4 }}>—</span>}
          </div>
        </div>
      )}

      {/* ── Row 1: direction · ID · date · unread ── */}
      <div className="sc-top">
        <span className={`dir-badge dir-${isBuy ? "buy" : "sell"}`}>
          {isBuy ? "BUY" : "SELL"}
        </span>
        <span className="sc-id">{tradeId}</span>
        <span className="sc-date">· 26/02/2026</span>
        {unread > 0 && (
          <div className="unread-badge">
            <span>{unread}</span>
            <IcoMsg s={13}/>
          </div>
        )}
      </div>

      {/* ── Row 2: peer left | sats+fiat right ── */}
      <div className="sc-peer-row">
        <div className="sc-peer-left">
          {peer ? (
            <>
              <div className="sc-avatar" style={{ background: peer.color }}>
                {peer.initials}
                <div className="sc-avatar-dot"/>
              </div>
              <div>
                <div className="sc-peer-meta">
                  <span className="sc-peer-name">{peer.name}</span>
                  <PeachRating rep={peer.rep}/>
                </div>
                <div className="sc-peer-trades">{peer.trades} trades</div>
                {peer.badges?.length > 0 && (
                  <div style={{ display:"flex", gap:5, marginTop:4, flexWrap:"wrap" }}>
                    {peer.badges.includes("supertrader") && <Badge label="supertrader" icon="☆"/>}
                    {peer.badges.includes("fast")        && <Badge label="fast" icon="⚡"/>}
                  </div>
                )}
              </div>
            </>
          ) : (
            <span style={{ fontSize:".75rem", color:"var(--black-65)", fontStyle:"italic", paddingTop:4 }}>
              {isBuy ? "looking for seller…" : "looking for buyer…"}
            </span>
          )}
        </div>
        <div className="sc-peer-right">
          <SatsAmount sats={sats}/>
          <span className="sc-fiat">{currency === "CHF" ? "CHF " : "€"}{fiat}</span>
          {premium !== null && (
            <span className="sc-prem" style={{ color: isBuy
              ? (premium < 0 ? "#65A519" : "#DF321F")
              : (premium > 0 ? "#65A519" : "#DF321F") }}>
              {premium > 0 ? "+" : ""}{premium.toFixed(2)}%
            </span>
          )}
          <span className={`sc-time${urgentTime ? " urgent" : ""}`}>
            <IcoClock s={11}/> {time}
          </span>
        </div>
      </div>

      {/* ── Row 3: payment methods + currencies ── */}
      <div className="sc-tags">
        {methods.map(m => <span key={m} className="tag tag-m">{m}</span>)}
        {currencies.map(c => <span key={c} className="tag tag-c">{c}</span>)}
      </div>

      {/* ── Row 4: status pill ── */}
      <button className={`sc-pill${pill.passive ? " passive" : ""}`}
        style={{ background: pill.bg, color: pill.c }}>
        <span style={{ display:"flex", alignItems:"center", gap:6 }}>
          {pill.ico}{pill.label}
        </span>
      </button>

    </div>
  );
}

// ─── MOCK PEERS ──────────────────────────────────────────────────────────────
const PEER_ST = { initials:"ST", color:"#65A519", name:"Peer #2B90", rep:5.0, trades:541, badges:["supertrader"] };
const PEER_FR = { initials:"FR", color:"#DF321F", name:"Peer #D8B1", rep:3.9, trades:9,   badges:[] };
const PEER_KL = { initials:"KL", color:"#FF7A50", name:"Peer #4E2A", rep:4.8, trades:134, badges:["fast"] };
const PEER_DV = { initials:"DV", color:"#F56522", name:"Peer #A1F3", rep:4.6, trades:67,  badges:[] };

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function StatusCards() {
  return (
    <>
      <style>{STYLE}</style>
      <div className="page">
        <div className="page-title">Status Cards — All States</div>
        <div className="page-sub">Full catalogue · Buyer POV and Seller POV · with instant / experience-level variations where applicable</div>

        {/* ════════════════════════════════════════════════════════ BUYER POV */}
        <div className="pov-section">
          <div className="pov-label">Buyer POV</div>
          <div className="cards-grid">

            <div className="card-group">
              <div className="card-group-label">Looking for a match</div>
              <StatusCard status="looking_for_match" direction="buy" peer={null}
                sats={85000} fiat="74.32" premium={-1.2} time="Expires in 23h 15m" methods={["SEPA"]} currencies={["EUR"]} tradeId="P-127"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Looking for a match — instant + experienced only</div>
              <StatusCard status="looking_for_match" direction="buy" instant exp="experienced_only" peer={null}
                sats={85000} fiat="74.32" premium={-1.2} time="Expires in 23h 15m" methods={["SEPA"]} currencies={["EUR"]} tradeId="P-128"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Looking for a match — instant + new users only</div>
              <StatusCard status="looking_for_match" direction="buy" instant exp="new_users_only" peer={null}
                sats={85000} fiat="74.32" premium={-1.2} time="Expires in 23h 15m" methods={["SEPA"]} currencies={["EUR"]} tradeId="P-129"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Accept trade request</div>
              <StatusCard status="accept_trade_request" direction="buy" peer={PEER_KL}
                sats={85000} fiat="74.32" premium={-1.2} time="Just now" methods={["SEPA","Revolut"]} currencies={["EUR"]} tradeId="P-127" unread={1}/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Waiting for seller</div>
              <StatusCard status="waiting_for_seller" direction="buy" peer={PEER_KL}
                sats={85000} fiat="74.32" premium={-1.2} time="2h ago" methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-127-4EC"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Make payment</div>
              <StatusCard status="make_payment" direction="buy" peer={PEER_ST}
                sats={85000} fiat="74.32" premium={-1.2} time="7h 49m remaining" urgentTime={false} methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-127-4F1" unread={3}/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Not paid in time</div>
              <StatusCard status="not_paid_in_time" direction="buy" peer={PEER_ST}
                sats={85000} fiat="74.32" premium={-1.2} time="1h 12m remaining" urgentTime methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-127-4F1"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Rate seller</div>
              <StatusCard status="rate_seller" direction="buy" peer={PEER_ST}
                sats={85000} fiat="74.32" premium={-1.2} time="6h ago" methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-127-4F1"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Dispute started</div>
              <StatusCard status="dispute_started" direction="buy" peer={PEER_FR}
                sats={85000} fiat="74.32" premium={-1.2} time="1d ago" methods={["Revolut"]} currencies={["EUR"]} tradeId="PC-127-4F1" unread={5}/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Unknown — update your app</div>
              <StatusCard status="unknown" direction="buy" peer={null}
                sats={85000} fiat="74.32" premium={-1.2} time="—" methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-123-ABCD"/>
            </div>

          </div>
        </div>

        <div className="divider"/>

        {/* ════════════════════════════════════════════════════════ SELLER POV */}
        <div className="pov-section">
          <div className="pov-label">Seller POV</div>
          <div className="cards-grid">

            <div className="card-group">
              <div className="card-group-label">Looking for a match</div>
              <StatusCard status="looking_for_match" direction="sell" peer={null}
                sats={85000} fiat="74.32" premium={1.2} time="Expires in 22h" methods={["SEPA","Wise"]} currencies={["EUR","CHF"]} tradeId="P-ABCD"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Looking for a match — instant + experienced only</div>
              <StatusCard status="looking_for_match" direction="sell" instant exp="experienced_only" peer={null}
                sats={85000} fiat="74.32" premium={1.2} time="Expires in 22h" methods={["SEPA"]} currencies={["EUR"]} tradeId="P-ABCE"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Fund escrow</div>
              <StatusCard status="fund_escrow" direction="sell" peer={PEER_KL}
                sats={85000} fiat="74.32" premium={1.2} time="Just now" methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-ABCD-4EC"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Fund escrow — instant + experienced only</div>
              <StatusCard status="fund_escrow" direction="sell" instant exp="experienced_only" peer={PEER_KL}
                sats={85000} fiat="74.32" premium={1.2} time="Just now" methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-ABCD-4ED"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Wrong amount funded</div>
              <StatusCard status="wrong_amount_funded" direction="sell" peer={PEER_KL}
                sats={85000} fiat="74.32" premium={1.2} time="2h ago" methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-ABCD-4EE"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Accept trade request</div>
              <StatusCard status="accept_trade_request" direction="sell" peer={PEER_DV}
                sats={85000} fiat="74.32" premium={1.2} time="5m ago" methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-ABCD-4F0" unread={1}/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Confirm payment</div>
              <StatusCard status="confirm_payment" direction="sell" peer={PEER_DV}
                sats={85000} fiat="74.32" premium={1.2} time="3h ago" methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-ABCD-4F0" unread={2}/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Waiting for payment</div>
              <StatusCard status="waiting_for_payment" direction="sell" peer={PEER_DV}
                sats={85000} fiat="74.32" premium={1.2} time="8h 10m remaining" methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-ABCD-4F0"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Not paid in time</div>
              <StatusCard status="not_paid_in_time" direction="sell" peer={PEER_DV}
                sats={85000} fiat="74.32" premium={1.2} time="0h 30m remaining" urgentTime methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-ABCD-4F0"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Release Bitcoin</div>
              <StatusCard status="release_escrow" direction="sell" peer={PEER_DV}
                sats={85000} fiat="74.32" premium={1.2} time="6h ago" methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-ABCD-4F0"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Rate buyer</div>
              <StatusCard status="rate_buyer" direction="sell" peer={PEER_DV}
                sats={85000} fiat="74.32" premium={1.2} time="6h ago" methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-ABCD-4F0"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Transaction in mempool</div>
              <StatusCard status="transaction_mempool" direction="sell" peer={PEER_DV}
                sats={85000} fiat="74.32" premium={1.2} time="10m ago" methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-ABCD-4F0"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Offer hidden</div>
              <StatusCard status="offer_hidden" direction="sell" peer={null}
                sats={85000} fiat="74.32" premium={1.2} time="Expires in 20h" methods={["SEPA"]} currencies={["EUR"]} tradeId="P-ABCD"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Dispute started</div>
              <StatusCard status="dispute_started" direction="sell" peer={PEER_FR}
                sats={85000} fiat="74.32" premium={1.2} time="1d ago" methods={["Revolut"]} currencies={["EUR"]} tradeId="PC-ABCD-4F1" unread={5}/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Dispute won — resolve now</div>
              <StatusCard status="dispute_won" direction="sell" peer={PEER_FR}
                sats={85000} fiat="74.32" premium={1.2} time="2d ago" methods={["Revolut"]} currencies={["EUR"]} tradeId="PC-ABCD-4F1"/>
            </div>

            <div className="card-group">
              <div className="card-group-label">Unknown — update your app</div>
              <StatusCard status="unknown" direction="sell" peer={null}
                sats={85000} fiat="74.32" premium={1.2} time="—" methods={["SEPA"]} currencies={["EUR"]} tradeId="PC-123-ABCD"/>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
