import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useQRAuth } from "../hooks/useQRAuth.js";
import { SideNav, Topbar, PeachIcon, NAV_ROUTES } from "../components/Navbars.jsx";
import { IcoBtc } from "../components/BitcoinAmount.jsx";

// ─── QR CODE DISPLAY ─────────────────────────────────────────────────────────
const QRDisplay = ({ qrPayload, size = 189 }) => {
  if (!qrPayload) {
    return (
      <div style={{width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center",
        background:"white",borderRadius:6}}>
        <div style={{width:32,height:32,borderRadius:"50%",border:"3px solid var(--black-10)",
          borderTopColor:"var(--primary)",animation:"spin .8s linear infinite"}}/>
      </div>
    );
  }
  return <QRCodeSVG value={qrPayload} size={size} level="L" bgColor="#ffffff" fgColor="#2B1911"/>;
};

// ─── COUNTDOWN RING ───────────────────────────────────────────────────────────
const CountdownRing = ({ secondsLeft, total=30, size=220 }) => {
  const r=size/2-5, circ=2*Math.PI*r, off=circ*(1-secondsLeft/total);
  const urgent = secondsLeft<=10;
  return (
    <svg width={size} height={size} style={{position:"absolute",top:-8,left:-8,pointerEvents:"none"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--black-10)" strokeWidth="3.5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={urgent?"var(--error)":"url(#rg)"} strokeWidth="3.5"
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:"stroke-dashoffset 1s linear, stroke .4s"}}/>
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2={size} y2={size} gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFA24C"/><stop offset="1" stopColor="#FF4D42"/>
        </linearGradient>
      </defs>
    </svg>
  );
};

// ─── GHOST MARKET ROWS ────────────────────────────────────────────────────────
const GhostRow = ({ w1, w2, accent }) => (
  <div style={{display:"flex",alignItems:"center",gap:12,
    padding:"10px 24px",borderBottom:"1px solid var(--black-5)"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,flex:"0 0 160px"}}>
      <div style={{width:30,height:30,borderRadius:"50%",
        background:"var(--grad)",opacity:.6}}/>
      <div style={{display:"flex",flexDirection:"column",gap:3}}>
        <div style={{width:w1,height:8,borderRadius:4,background:"var(--black-10)"}}/>
        <div style={{width:40,height:6,borderRadius:4,background:"var(--black-5)"}}/>
      </div>
    </div>
    <div style={{flex:"0 0 100px",display:"flex",flexDirection:"column",gap:3}}>
      <div style={{width:w2,height:8,borderRadius:4,background:"var(--black-10)"}}/>
      <div style={{width:40,height:6,borderRadius:4,background:"var(--black-5)"}}/>
    </div>
    <div style={{flex:"0 0 60px"}}>
      <div style={{width:44,height:8,borderRadius:4,
        background:accent==="green"?"var(--success-mild)":"var(--error-bg)"}}/>
    </div>
    <div style={{flex:1,display:"flex",gap:4}}>
      <div style={{width:36,height:18,borderRadius:999,background:"var(--black-5)"}}/>
      <div style={{width:44,height:18,borderRadius:999,background:"var(--black-5)"}}/>
    </div>
  </div>
);

// ─── STEP ─────────────────────────────────────────────────────────────────────
const Step = ({ n, children }) => (
  <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
    <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,
      background:"var(--grad)",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:".65rem",fontWeight:800,color:"white",marginTop:1}}>{n}</div>
    <div style={{fontSize:".8rem",fontWeight:600,color:"var(--black-65)",lineHeight:1.55}}>
      {children}
    </div>
  </div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function PeachAuth() {
  const navigate = useNavigate();
  const TOTAL = 30;
  const [allPrices,           setAllPrices]           = useState(null);
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR","CHF","GBP"]);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const pricesLoaded = allPrices !== null;
  const btcPrice = Math.round(allPrices?.[selectedCurrency] ?? 87432);
  const [isMobile,  setIsMobile]  = useState(false);

  // ─── QR AUTH (real handshake) ──────────────────────────────────────────────
  const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const regtestBase = isLocal ? "/api-regtest" : (import.meta.env.VITE_API_BASE || "") + "/regtest";
  const { phase: qrPhase, qrPayload, connectionId, secsLeft, error: qrError, profile: qrProfile, restart: qrRestart } = useQRAuth({ baseUrl: regtestBase });

  // Map hook phases to UI display
  const phase = qrPhase === "success" ? "success"
    : (qrPhase === "decrypting" || qrPhase === "validating" || qrPhase === "verifying") ? "scanning"
    : qrPhase === "error" ? "error"
    : "waiting";

  // Navigate to home on successful QR auth
  useEffect(() => {
    if (qrPhase === "success") {
      const timer = setTimeout(() => navigate("/home"), 1500);
      return () => clearTimeout(timer);
    }
  }, [qrPhase, navigate]);

  // Connection ID copy state
  const [connIdCopied, setConnIdCopied] = useState(false);
  function handleCopyConnId() {
    if (!connectionId) return;
    navigator.clipboard.writeText(connectionId).catch(()=>{});
    setConnIdCopied(true);
    setTimeout(() => setConnIdCopied(false), 2000);
  }

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/market/prices`);
        const data = await res.json();
        if (data && typeof data === "object") {
          setAllPrices(data);
          setAvailableCurrencies(Object.keys(data).sort());
        }
      } catch {}
    }
    fetchPrices();
    const iv = setInterval(fetchPrices, 30000);
    return () => clearInterval(iv);
  }, []);

  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [desktopShowCode, setDesktopShowCode] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const mins   = String(Math.floor(secsLeft/60)).padStart(2,"0");
  const secs_  = String(secsLeft%60).padStart(2,"0");
  const urgent = secsLeft<=10 && phase==="waiting";

  const satsPerCur = btcPrice > 0 ? Math.round(100_000_000 / btcPrice) : 0;

  // ─── MOBILE VIEW ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <style>{`
          @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
          @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          @keyframes successPop{
            0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}
          }
          @keyframes shake{
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-6px)}60%{transform:translateX(6px)}80%{transform:translateX(-3px)}
          }
        `}</style>
        <Topbar
          onBurgerClick={() => setSidebarMobileOpen(o => !o)}
          isLoggedIn={false}
          handleLogin={() => {}}
          handleLogout={() => {}}
          showAvatarMenu={false}
          setShowAvatarMenu={() => {}}
          btcPrice={btcPrice}
          pricesLoaded={pricesLoaded}
          selectedCurrency={selectedCurrency}
          availableCurrencies={availableCurrencies}
          onCurrencyChange={c => setSelectedCurrency(c)}
        />
        <SideNav
          mobileOpen={sidebarMobileOpen}
          onClose={() => setSidebarMobileOpen(false)}
          onNavigate={navigate}
          mobilePriceSlot={
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}>
              <IcoBtc size={16}/>
              <div style={{display:"flex",flexDirection:"column"}}>
                <span style={{fontSize:".78rem",fontWeight:800,color:"var(--black)"}}>{pricesLoaded ? btcPrice.toLocaleString("fr-FR") : "?"} {selectedCurrency}</span>
                <span style={{fontSize:".65rem",fontWeight:500,color:"var(--black-65)"}}>{pricesLoaded ? satsPerCur.toLocaleString() : "?"} sats / {selectedCurrency.toLowerCase()}</span>
              </div>
            </div>
          }
        />

        <div style={{
          minHeight:"100vh",paddingTop:56,
          display:"flex",flexDirection:"column",
          background:"var(--bg)"
        }}>
          <div style={{flex:1,display:"flex",flexDirection:"column",
            padding:"28px 20px 32px",gap:24,animation:"fadeUp .4s ease both"}}>

            {phase !== "success" ? (
              <>
                {/* Header */}
                <div style={{textAlign:"center"}}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
                    <PeachIcon size={52}/>
                  </div>
                  <h1 style={{fontSize:"1.55rem",fontWeight:800,letterSpacing:"-.03em",
                    lineHeight:1.2,marginBottom:10}}>
                    Sign in to<br/>
                    <span style={{
                      background:"var(--grad)",
                      WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"
                    }}>start trading.</span>
                  </h1>
                </div>

                {/* Instructions — connect from mobile app */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
                  <div style={{width:56,height:56,borderRadius:"50%",
                    background:"var(--grad)",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="1" width="14" height="22" rx="3"/>
                      <line x1="12" y1="18" x2="12" y2="18.01"/>
                    </svg>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:".95rem",fontWeight:800,color:"var(--black)",marginBottom:4}}>
                      Connect from your Peach app
                    </div>
                    <div style={{fontSize:".76rem",color:"var(--black-65)",fontWeight:500,lineHeight:1.55}}>
                      Since you're on mobile, open the Peach app directly to connect your web session.
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div style={{display:"flex",flexDirection:"column",gap:10,
                  background:"var(--surface)",borderRadius:14,border:"1px solid var(--black-10)",padding:"16px 14px"}}>
                  <Step n="1"><strong style={{color:"var(--black)"}}>Open</strong> the Peach app</Step>
                  <Step n="2">Go to <strong style={{color:"var(--black)"}}>Settings → Desktop Connection</strong></Step>
                  <Step n="3"><strong style={{color:"var(--black)"}}>Follow</strong> the instructions to link your session</Step>
                </div>

                {/* Connection ID (if available) */}
                {connectionId && (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <label style={{fontSize:".78rem",fontWeight:700,color:"var(--black-75)",
                      letterSpacing:".02em",textTransform:"uppercase"}}>Connection ID</label>
                    <div style={{
                      display:"flex",alignItems:"center",justifyContent:"space-between",
                      padding:"14px 16px",borderRadius:12,
                      background:"var(--black-5)",border:"1.5px solid var(--black-10)",gap:10
                    }}>
                      <span style={{
                        fontFamily:"monospace",fontSize:".95rem",fontWeight:700,
                        color:"var(--black)",letterSpacing:".08em",wordBreak:"break-all"
                      }}>{connectionId}</span>
                      <button onClick={handleCopyConnId} style={{
                        flexShrink:0,padding:"8px 14px",borderRadius:999,
                        background: connIdCopied ? "var(--success)" : "var(--grad)",
                        color:"white",border:"none",cursor:"pointer",
                        fontFamily:"'Baloo 2',cursive",fontSize:".78rem",fontWeight:800,
                        letterSpacing:".02em",transition:"background .2s",
                        display:"flex",alignItems:"center",gap:6
                      }}>
                        {connIdCopied ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Error state */}
                {qrPhase === "error" && (
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,
                    padding:"16px 14px",borderRadius:12,background:"var(--error-bg)",border:"1.5px solid var(--error-bg)"}}>
                    <span style={{fontSize:".8rem",fontWeight:700,color:"var(--error)"}}>{qrError || "Connection failed"}</span>
                    <button onClick={qrRestart} style={{
                      padding:"8px 18px",borderRadius:999,
                      background:"var(--grad)",
                      color:"white",border:"none",cursor:"pointer",
                      fontFamily:"'Baloo 2',cursive",fontSize:".76rem",fontWeight:800
                    }}>Try again</button>
                  </div>
                )}

                {/* Security note */}
                <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",
                  borderRadius:12,background:"var(--black-5)",border:"1px solid var(--black-10)"}}>
                  <span style={{fontSize:".95rem",flexShrink:0}}>🔒</span>
                  <span style={{fontSize:".72rem",color:"var(--black-65)",fontWeight:500,lineHeight:1.5}}>
                    <strong style={{color:"var(--black)"}}>Connection codes</strong> are single-use and expire after <strong style={{color:"var(--black)"}}>30 seconds</strong>. Your keys never leave your device.
                  </span>
                </div>

                {/* New to Peach — mobile */}
                <div style={{borderTop:"1px solid var(--black-10)",paddingTop:18}}>
                  <div style={{fontSize:"1.1rem",fontWeight:800,color:"var(--black)",
                    letterSpacing:"-.02em",marginBottom:8}}>New to Peach?</div>
                  <p style={{fontSize:".78rem",color:"var(--black-65)",fontWeight:500,lineHeight:1.55,marginBottom:12}}>
                    Peach accounts are created on the mobile app — your Bitcoin keys are generated and stored securely on your phone. Download it first, then come back here to sign in.
                  </p>
                  <div style={{display:"flex",gap:8}}>
                    <a href="https://testflight.apple.com/join/wfSPFEWG" target="_blank" rel="noreferrer"
                      style={{
                        flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                        padding:"10px 12px",borderRadius:10,textDecoration:"none",
                        border:"1.5px solid var(--black-10)",background:"var(--surface)",
                        fontSize:".75rem",fontWeight:700,color:"var(--black)"
                      }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--black)">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      App Store
                    </a>
                    <a href="https://play.google.com/store/apps/details?id=com.peachbitcoin.peach.mainnet" target="_blank" rel="noreferrer"
                      style={{
                        flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                        padding:"10px 12px",borderRadius:10,textDecoration:"none",
                        border:"1.5px solid var(--black-10)",background:"var(--surface)",
                        fontSize:".75rem",fontWeight:700,color:"var(--black)"
                      }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--black)">
                        <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/>
                      </svg>
                      Google Play
                    </a>
                  </div>
                </div>

              </>
            ) : (
              /* ── Mobile success ── */
              <div style={{flex:1,display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",gap:20,
                animation:"fadeUp .4s ease both"}}>
                <div style={{
                  width:88,height:88,borderRadius:"50%",
                  background:"linear-gradient(135deg,var(--success),var(--success))",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:"2.2rem",color:"white",
                  animation:"successPop .4s cubic-bezier(.175,.885,.32,1.275) both",
                  boxShadow:"0 8px 32px rgba(101,165,25,.3)"
                }}>✓</div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:"1.4rem",fontWeight:800,color:"var(--success)",marginBottom:6}}>Signed in!</div>
                  <div style={{fontSize:".85rem",color:"var(--black-65)",fontWeight:500}}>Redirecting to the market…</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── DESKTOP VIEW ─────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes successPop{
          0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}
        }
        @keyframes pulse{
          0%,100%{box-shadow:0 0 0 0 rgba(245,101,34,.35)}
          60%{box-shadow:0 0 0 10px rgba(245,101,34,0)}
        }
        @keyframes shake{
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-6px)}60%{transform:translateX(6px)}80%{transform:translateX(-3px)}
        }
      `}</style>
      <Topbar
        onBurgerClick={() => setSidebarMobileOpen(o => !o)}
        isLoggedIn={false}
        handleLogin={() => {}}
        handleLogout={() => {}}
        showAvatarMenu={false}
        setShowAvatarMenu={() => {}}
        btcPrice={btcPrice}
        pricesLoaded={pricesLoaded}
        selectedCurrency={selectedCurrency}
        availableCurrencies={availableCurrencies}
        onCurrencyChange={c => setSelectedCurrency(c)}
      />
      <SideNav
        mobileOpen={sidebarMobileOpen}
        onClose={() => setSidebarMobileOpen(false)}
        onNavigate={navigate}
      />

      {/* Ghost market */}
      <div style={{position:"fixed",top:56,left:68,right:0,bottom:0,
        overflow:"hidden",pointerEvents:"none",userSelect:"none"}}>
        <div style={{padding:"12px 24px",background:"var(--surface)",
          borderBottom:"1px solid var(--black-10)",display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",gap:2,background:"var(--black-5)",padding:3,borderRadius:10}}>
            <div style={{padding:"6px 20px",borderRadius:7,background:"var(--surface)",
              fontSize:".85rem",fontWeight:700,color:"var(--success)"}}>Buy BTC</div>
            <div style={{padding:"6px 20px",borderRadius:7,
              fontSize:".85rem",fontWeight:700,color:"var(--black-65)"}}>Sell BTC</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",
            borderRadius:999,background:"var(--black-5)",fontSize:".76rem",fontWeight:600,color:"var(--black-65)"}}>
            7 offers · Avg <span style={{color:"var(--success)",fontWeight:700,marginLeft:3}}>−0.4%</span>
            <span style={{color:"var(--black-25)",margin:"0 4px"}}>·</span>
            Best <span style={{color:"var(--success)",fontWeight:700,marginLeft:3}}>−1.2%</span>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            {[90,110,80].map(w=>(
              <div key={w} style={{width:w,height:33,borderRadius:8,background:"var(--black-10)"}}/>
            ))}
            <div style={{width:100,height:33,borderRadius:999,
              background:"var(--grad)",opacity:.5}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:12,padding:"8px 24px",
          borderBottom:"2px solid var(--black-10)",background:"var(--surface)"}}>
          {["REPUTATION","AMOUNT","PREMIUM","PAYMENT","CURRENCIES",""].map((h,i)=>(
            <div key={i} style={{flex:i===5?0:1,minWidth:i===5?60:0,
              fontSize:".67rem",fontWeight:700,color:"var(--black-25)",letterSpacing:".09em"}}>{h}</div>
          ))}
        </div>
        {[{w1:70,w2:60,accent:"green"},{w1:55,w2:80,accent:"green"},
          {w1:80,w2:55,accent:"red"},{w1:60,w2:70,accent:"green"},
          {w1:75,w2:50,accent:"red"},{w1:50,w2:65,accent:"green"},
          {w1:65,w2:75,accent:"red"},{w1:70,w2:58,accent:"green"}
        ].map((r,i)=><GhostRow key={i} {...r}/>)}
        <div style={{position:"absolute",inset:0,
          background:"linear-gradient(to bottom,color-mix(in srgb,var(--bg) 55%,transparent) 0%,color-mix(in srgb,var(--bg) 92%,transparent) 100%)"}}/>
      </div>

      {/* Auth card */}
      <div style={{position:"fixed",top:56,left:68,right:0,bottom:0,
        display:"flex",alignItems:"center",justifyContent:"center",zIndex:10,padding:20}}>
        <div style={{
          background:"var(--surface)",border:"1px solid var(--black-10)",borderRadius:20,
          boxShadow:"0 8px 48px rgba(43,25,17,.12),0 2px 12px rgba(43,25,17,.06)",
          padding:"36px 40px",display:"flex",gap:48,alignItems:"center",
          maxWidth:780,width:"100%",overflow:"hidden",animation:"fadeUp .5s ease both"
        }}>
          {/* Left: copy + steps */}
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:20}}>
            <div>
              <h1 style={{fontSize:"1.7rem",fontWeight:800,letterSpacing:"-.03em",
                lineHeight:1.2,color:"var(--black)",marginBottom:10}}>
                Sign in to<br/>
                <span style={{
                  background:"var(--grad)",
                  WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"
                }}>start trading.</span>
              </h1>
              <p style={{fontSize:".85rem",color:"var(--black-65)",lineHeight:1.65,fontWeight:500}}>
                Use your Peach mobile app to scan the QR code and link your account. Your keys stay on your phone — always.
              </p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Step n="1"><strong style={{color:"var(--black)"}}>Open</strong> the Peach app on your phone</Step>
              <Step n="2"><strong style={{color:"var(--black)"}}>Tap</strong> "connect to desktop" in the settings</Step>
              <Step n="3"><strong style={{color:"var(--black)"}}>Scan</strong> the code — you'll be signed in instantly</Step>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
              borderRadius:10,background:"var(--black-5)",border:"1px solid var(--black-10)"}}>
              <span style={{fontSize:"1rem"}}>🔒</span>
              <span style={{fontSize:".73rem",color:"var(--black-65)",fontWeight:500,lineHeight:1.5}}>
                Session tokens expire after <strong style={{color:"var(--black)"}}>120 minutes</strong>. Your keypair never leaves your device.
              </span>
            </div>

            {/* New to Peach */}
            <div style={{borderTop:"1px solid var(--black-10)",paddingTop:18}}>
              <div style={{fontSize:"1.1rem",fontWeight:800,color:"var(--black)",
                letterSpacing:"-.02em",marginBottom:8}}>New to Peach?</div>
              <p style={{fontSize:".78rem",color:"var(--black-65)",fontWeight:500,lineHeight:1.55,marginBottom:12}}>
                Peach accounts are created on the mobile app — your Bitcoin keys are generated and stored securely on your phone. Download it first, then come back here to sign in.
              </p>
              <div style={{display:"flex",gap:8}}>
                <a href="https://testflight.apple.com/join/wfSPFEWG" target="_blank" rel="noreferrer"
                  style={{
                    flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                    padding:"9px 12px",borderRadius:10,textDecoration:"none",
                    border:"1.5px solid var(--black-10)",background:"var(--black-5)",
                    fontSize:".75rem",fontWeight:700,color:"var(--black)",transition:"border-color .15s"
                  }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--primary)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--black-10)"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--black)">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  App Store
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.peachbitcoin.peach.mainnet" target="_blank" rel="noreferrer"
                  style={{
                    flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                    padding:"9px 12px",borderRadius:10,textDecoration:"none",
                    border:"1.5px solid var(--black-10)",background:"var(--black-5)",
                    fontSize:".75rem",fontWeight:700,color:"var(--black)",transition:"border-color .15s"
                  }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--primary)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--black-10)"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--black)">
                    <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/>
                  </svg>
                  Google Play
                </a>
              </div>
            </div>

          </div>
          <div style={{width:1,alignSelf:"stretch",background:"var(--black-10)",flexShrink:0}}/>

          {/* Right: QR */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,flexShrink:0,width:320}}>
            {phase!=="success" && (
              <>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:".92rem",fontWeight:800,color:"var(--black)",marginBottom:4}}>
                    {qrPhase==="error" ? "Connection failed" : "Scan with Peach Mobile App"}
                  </div>
                  <div style={{fontSize:".73rem",color:"var(--black-25)",fontWeight:500}}>
                    {qrPhase==="error" ? "Something went wrong" : "Valid for 30 seconds"}
                  </div>
                </div>

                {qrPhase === "error" ? (
                  <div style={{width:204,height:204,borderRadius:14,
                    background:"var(--error-bg)",border:"1.5px solid var(--error-bg)",
                    display:"flex",flexDirection:"column",alignItems:"center",
                    justifyContent:"center",gap:12,padding:20}}>
                    <span style={{fontSize:".8rem",fontWeight:700,color:"var(--error)",textAlign:"center"}}>
                      {qrError || "Connection failed"}
                    </span>
                    <button onClick={qrRestart} style={{
                      padding:"8px 20px",borderRadius:999,
                      background:"var(--grad)",
                      color:"white",border:"none",cursor:"pointer",
                      fontFamily:"'Baloo 2',cursive",fontSize:".78rem",fontWeight:800,
                      letterSpacing:".02em"
                    }}>Try again</button>
                  </div>
                ) : (
                  <div style={{position:"relative"}}>
                    <CountdownRing secondsLeft={secsLeft} total={TOTAL} size={320}/>
                    <div style={{width:304,height:304,borderRadius:14,overflow:"hidden",
                      position:"relative",boxShadow:"0 4px 24px rgba(43,25,17,.1)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      background:"#ffffff"}}>
                      <QRDisplay qrPayload={qrPayload} size={288}/>
                      {phase==="scanning" && (
                        <div style={{position:"absolute",inset:0,background:"color-mix(in srgb,var(--bg) 85%,transparent)",
                          display:"flex",flexDirection:"column",alignItems:"center",
                          justifyContent:"center",gap:10,animation:"fadeIn .2s ease",borderRadius:14}}>
                          <div style={{width:32,height:32,borderRadius:"50%",
                            border:"3px solid var(--black-10)",borderTopColor:"var(--primary)",
                            animation:"spin .8s linear infinite"}}/>
                          <span style={{fontSize:".78rem",fontWeight:700,color:"var(--black-75)"}}>Connecting…</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(phase==="waiting"||phase==="scanning") && qrPhase !== "error" && (
                  <div style={{display:"flex",alignItems:"center",gap:6,fontSize:".73rem",
                    fontWeight:600,color:urgent?"var(--error)":"var(--black-25)",transition:"color .3s"}}>
                    <span>Expires in</span>
                    <span style={{fontWeight:800,fontSize:".82rem",fontVariantNumeric:"tabular-nums",
                      letterSpacing:".04em",color:urgent?"var(--error)":"var(--black-65)"}}>{mins}:{secs_}</span>
                  </div>
                )}
              </>
            )}

            {phase==="success" && (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",
                gap:16,animation:"fadeUp .4s ease both"}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:".92rem",fontWeight:800,color:"var(--success)"}}>Signed in!</div>
                  <div style={{fontSize:".73rem",color:"var(--black-25)",fontWeight:500,marginTop:4}}>
                    Redirecting to the market…
                  </div>
                </div>
                <div style={{width:204,height:204,borderRadius:14,background:"var(--success-bg)",
                  border:"1.5px solid var(--success-mild)",display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",gap:10}}>
                  <div style={{width:56,height:56,borderRadius:"50%",background:"var(--success)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"1.6rem",color:"white",
                    animation:"successPop .4s cubic-bezier(.175,.885,.32,1.275) both"}}>✓</div>
                  <div style={{fontSize:".8rem",fontWeight:700,color:"var(--success)"}}>Account linked</div>
                </div>
              </div>
            )}

            {/* Connection ID fallback — always shown except on success */}
            {phase !== "success" && qrPhase !== "error" && (
              <div style={{width:"100%",borderTop:"1px solid var(--black-10)",paddingTop:14}}>
                <button onClick={() => setDesktopShowCode(c => !c)} style={{
                  background:"none",border:"none",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:5,
                  fontFamily:"'Baloo 2',cursive",fontSize:".73rem",fontWeight:700,
                  color:"var(--black-25)",padding:0,transition:"color .15s"
                }}
                  onMouseEnter={e=>e.currentTarget.style.color="var(--black-65)"}
                  onMouseLeave={e=>e.currentTarget.style.color="var(--black-25)"}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{transform:desktopShowCode?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s"}}>
                    <polyline points="4,2 8,6 4,10"/>
                  </svg>
                  Can't scan? Use connection ID instead
                </button>

                {desktopShowCode && (
                  <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8,
                    animation:"fadeIn .2s ease both"}}>
                    <div style={{fontSize:".7rem",color:"var(--black-65)",fontWeight:500,lineHeight:1.5}}>
                      Copy this code and paste it into your Peach app under <strong style={{color:"var(--black)"}}>Settings → Connect web browser</strong>.
                    </div>
                    <div style={{
                      display:"flex",alignItems:"center",justifyContent:"space-between",
                      padding:"12px 14px",borderRadius:10,
                      background:"var(--black-5)",border:"1.5px solid var(--black-10)",gap:10
                    }}>
                      <span style={{
                        fontFamily:"monospace",fontSize:".88rem",fontWeight:700,
                        color:"var(--black)",letterSpacing:".08em",wordBreak:"break-all",
                        minWidth:0
                      }}>{connectionId || "..."}</span>
                      <button onClick={handleCopyConnId} style={{
                        flexShrink:0,padding:"7px 14px",borderRadius:999,
                        background: connIdCopied ? "var(--success)" : "var(--grad)",
                        color:"white",border:"none",cursor:"pointer",
                        fontFamily:"'Baloo 2',cursive",fontSize:".78rem",fontWeight:800,
                        letterSpacing:".02em",transition:"background .2s",
                        display:"flex",alignItems:"center",gap:6
                      }}>
                        {connIdCopied ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
