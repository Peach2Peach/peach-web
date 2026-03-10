import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const PeachIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 352 353" fill="none">
    <rect y="0.38" width="352" height="352" rx="58.13" fill="#FFF9F6"/>
    <path d="M151.8 45.5c11.2-1.2 21.1 5.35 24.2 16.02.54 1.88.82 3.89.88 5.86.13 4.2.05 8.41.05 12.62 0 .39-.33.69-.72.7-3.07.11-6.08-.02-9.02-1-9.21-3.03-15.33-11.47-15.42-21.35-.04-4-.01-8.01 0-12.01" fill="#05A85A"/>
    <path d="M205.3 64.23c.99 8.75-5.26 16.21-13.69 16.46-4.77.14-9.15-3.93-7.14-8.26.95-2.06 2.42-3.88 4.47-5.44 2.3-1.76 4.93-2.69 7.82-2.74 2.83-.04 5.66 0 8.54 0" fill="#05A85A"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M276 155.69c0 49.73-43.64 96.87-97.47 96.87-19.52 0-37.71-6.2-52.95-16.48v49.48c0 12.29-9.96 22.26-22.26 22.26s-22.26-9.97-22.26-22.26V157.39h.02c-.01-.57-.02-1.13-.02-1.7 0-43.02 32.67-72.02 76.33-68.64 14.01 1.09 28.26 1.09 42.27 0 43.67-3.39 76.34 25.62 76.34 68.64zM125.61 163.8v-.39c.1-24.1 19.36-39.92 44.44-36.17 5.13.77 10.37.77 15.49 0 25.15-3.77 44.44 12.15 44.44 36.35 0 26.64-23.36 51.89-52.19 51.89-28.75 0-52.07-25.13-52.18-51.68z" fill="url(#pg)"/>
    <defs>
      <radialGradient id="pg" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(276 88) rotate(159) scale(220 130)">
        <stop stopColor="#FFA24C"/>
        <stop offset=".5" stopColor="#FF7A50"/>
        <stop offset="1" stopColor="#FF4D42"/>
      </radialGradient>
    </defs>
  </svg>
);

// ─── MOCK QR ──────────────────────────────────────────────────────────────────
const MockQR = () => {
  const seed = [
    "111111101001101111111","100000101100101000001","101110100011101011101",
    "101110101001001011101","101110100110101011101","100000101010001000001",
    "111111101010101111111","000000001101100000000","110101110110011010110",
    "001011001001101001011","110100110100011110100","010110001011001101010",
    "101001110010110100111","000000001010001011010","111111101101110100101",
    "100000100110001010011","101110101001110110100","101110100110101001011",
    "101110111010011101100","100000101101100010010","111111101011011100111",
  ];
  const cells = [];
  seed.forEach((row,r) => [...row].forEach((ch,c) => { if(ch==="1") cells.push([r,c]); }));
  const cell=9, pad=14, sz=21, total=sz*cell+pad*2;
  return (
    <svg width={total} height={total} viewBox={`0 0 ${total} ${total}`}>
      <rect width={total} height={total} fill="white" rx="6"/>
      {cells.map(([r,c]) => (
        <rect key={`${r}-${c}`} x={pad+c*cell} y={pad+r*cell}
          width={cell} height={cell} fill="#2B1911" rx={1}/>
      ))}
    </svg>
  );
};

// ─── COUNTDOWN RING ───────────────────────────────────────────────────────────
const CountdownRing = ({ secondsLeft, total=180, size=220 }) => {
  const r=size/2-5, circ=2*Math.PI*r, off=circ*(1-secondsLeft/total);
  const urgent = secondsLeft<=30;
  return (
    <svg width={size} height={size} style={{position:"absolute",top:-8,left:-8,pointerEvents:"none"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EAE3DF" strokeWidth="3.5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={urgent?"#DF321F":"url(#rg)"} strokeWidth="3.5"
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
    padding:"10px 24px",borderBottom:"1px solid #F4EEEB"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,flex:"0 0 160px"}}>
      <div style={{width:30,height:30,borderRadius:"50%",
        background:"linear-gradient(135deg,#FF7A50,#FFA24C)",opacity:.6}}/>
      <div style={{display:"flex",flexDirection:"column",gap:3}}>
        <div style={{width:w1,height:8,borderRadius:4,background:"#EAE3DF"}}/>
        <div style={{width:40,height:6,borderRadius:4,background:"#F4EEEB"}}/>
      </div>
    </div>
    <div style={{flex:"0 0 100px",display:"flex",flexDirection:"column",gap:3}}>
      <div style={{width:w2,height:8,borderRadius:4,background:"#EAE3DF"}}/>
      <div style={{width:40,height:6,borderRadius:4,background:"#F4EEEB"}}/>
    </div>
    <div style={{flex:"0 0 60px"}}>
      <div style={{width:44,height:8,borderRadius:4,
        background:accent==="green"?"#C8E6A0":"#FFCBC4"}}/>
    </div>
    <div style={{flex:1,display:"flex",gap:4}}>
      <div style={{width:36,height:18,borderRadius:999,background:"#F4EEEB"}}/>
      <div style={{width:44,height:18,borderRadius:999,background:"#F4EEEB"}}/>
    </div>
  </div>
);

// ─── STEP ─────────────────────────────────────────────────────────────────────
const Step = ({ n, children }) => (
  <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
    <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,
      background:"linear-gradient(135deg,#FF7A50,#FF4D42)",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:".65rem",fontWeight:800,color:"white",marginTop:1}}>{n}</div>
    <div style={{fontSize:".8rem",fontWeight:600,color:"#7D675E",lineHeight:1.55}}>
      {children}
    </div>
  </div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const NAV_ROUTES = { home:"/home", market:"/market", trades:"/trades", create:"/offer/new", "payment-methods":"/payment-methods", settings:"/settings" };

export default function PeachAuth() {
  const navigate = useNavigate();
  const TOTAL = 180;
  const [phase,     setPhase]     = useState("waiting"); // waiting|scanning|success|expired
  const [secsLeft,  setSecsLeft]  = useState(TOTAL);
  const [allPrices,           setAllPrices]           = useState({ EUR: 87432 });
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR","CHF","GBP"]);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const btcPrice = Math.round(allPrices[selectedCurrency] ?? 87432);
  const [isMobile,  setIsMobile]  = useState(false);

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

  // Mobile paste flow
  const [pasteVal,  setPasteVal]  = useState("");
  const [pastePhase,setPastePhase]= useState("idle"); // idle|error|success
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState("qr"); // "qr" | "paste"
  const [desktopShowCode, setDesktopShowCode] = useState(false);
  const [desktopPasteVal, setDesktopPasteVal] = useState("");
  const [desktopPastePhase, setDesktopPastePhase] = useState("idle"); // idle|error|validating|success
  // ─── DEV AUTH (regtest) ────────────────────────────────────────────────────
  const [devAuthOpen, setDevAuthOpen] = useState(false);
  const [devAuthJson, setDevAuthJson] = useState("");
  const [devAuthPhase, setDevAuthPhase] = useState("idle"); // idle|validating|success|error
  const [devAuthError, setDevAuthError] = useState("");
  const [devAuthProfile, setDevAuthProfile] = useState(null);

  async function handleDevAuth() {
    setDevAuthPhase("validating");
    setDevAuthError("");
    try {
      let parsed;
      try { parsed = JSON.parse(devAuthJson); }
      catch { throw new Error("Invalid JSON — paste the full response from /nuxDesktopAuth"); }
      const token = parsed.token;
      if (!token) throw new Error("No 'token' field found in JSON");

      const res = await fetch("https://api-regtest.peachbitcoin.com/v1/user/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`API ${res.status}${errBody ? ": " + errBody.slice(0, 120) : ""}`);
      }
      const profile = await res.json();

      // Store auth globally so other screens can pick it up
      window.__PEACH_AUTH__ = {
        token,
        pgpPrivKey: parsed.pgpPrivKey || null,
        peachId: profile.id || profile.publicKey || null,
        baseUrl: "https://api-regtest.peachbitcoin.com/v1",
        profile
      };

      setDevAuthProfile(profile);
      setDevAuthPhase("success");
      try { localStorage.setItem("peach_logged_in", "true"); } catch {}
      setTimeout(() => { setPhase("success"); }, 1200);
      setTimeout(() => { navigate("/home"); }, 2200);
    } catch (err) {
      setDevAuthError(err.message);
      setDevAuthPhase("error");
    }
  }

  function resetDevAuth() {
    setDevAuthPhase("idle");
    setDevAuthError("");
    setDevAuthProfile(null);
    setDevAuthJson("");
    window.__PEACH_AUTH__ = null;
  }

  const MOCK_AUTH_CODE = "PEACH-A3F7-B2D9-4E1C-8K6M";
  const [codeCopied, setCodeCopied] = useState(false);
  function handleCopyCode() {
    navigator.clipboard.writeText(MOCK_AUTH_CODE).catch(()=>{});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }
  const timerRef = useRef(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // QR countdown (desktop only)
  useEffect(() => {
    if (isMobile) return;
    if (phase!=="waiting" && phase!=="scanning") return;
    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s<=1) { setPhase("expired"); clearInterval(timerRef.current); return 0; }
        return s-1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, isMobile]);

  // Price is fetched via the API useEffect above

  function resetQR() { clearInterval(timerRef.current); setSecsLeft(TOTAL); setPhase("waiting"); }

  function handleDesktopCodeSubmit() {
    if (!desktopPasteVal.trim()) { setDesktopPastePhase("error"); return; }
    setDesktopPastePhase("validating");
    setTimeout(() => {
      if (desktopPasteVal.trim().toUpperCase().startsWith("ERR")) setDesktopPastePhase("error");
      else { setDesktopPastePhase("success"); try { localStorage.setItem("peach_logged_in", "true"); } catch {} setTimeout(() => navigate("/home"), 1500); }
    }, 1200);
  }

  // Demo: click QR cycles states
  function handleQRClick() {
    if (phase==="waiting")  { setPhase("scanning"); return; }
    if (phase==="scanning") { setPhase("success"); try { localStorage.setItem("peach_logged_in", "true"); } catch {} setTimeout(() => navigate("/home"), 500); return; }
    if (phase==="success")  { resetQR();             return; }
    if (phase==="expired")  { resetQR();             return; }
  }

  // Mobile paste submit
  function handlePaste(e) { setPasteVal(e.target.value); setPastePhase("idle"); }
  function handleSubmit() {
    if (!pasteVal.trim()) { setPastePhase("error"); return; }
    // Simulate: any non-empty input "works" for demo
    setPastePhase("validating");
    setTimeout(() => {
      // Mock: codes starting with "ERR" fail
      if (pasteVal.trim().toUpperCase().startsWith("ERR")) setPastePhase("error");
      else { setPastePhase("success"); try { localStorage.setItem("peach_logged_in", "true"); } catch {} setTimeout(() => navigate("/home"), 1500); }
    }, 1200);
  }
  function handlePasteReset() { setPasteVal(""); setPastePhase("idle"); }

  const mins   = String(Math.floor(secsLeft/60)).padStart(2,"0");
  const secs   = String(secsLeft%60).padStart(2,"0");
  const urgent = secsLeft<=30 && (phase==="waiting"||phase==="scanning");

  // ─── SHARED TOPBAR ────────────────────────────────────────────────────────
  const Topbar = () => (
    <header style={{
      position:"fixed",top:0,left:0,right:0,height:56,
      background:"#FFFFFF",borderBottom:"1px solid #EAE3DF",
      display:"flex",alignItems:"center",padding:"0 20px",gap:12,zIndex:200
    }}>
      <button className="burger-btn" onClick={() => setSidebarMobileOpen(o => !o)}
        style={{display:"flex",alignItems:"center",justifyContent:"center",
          width:34,height:34,borderRadius:8,border:"none",
          background:"transparent",cursor:"pointer",color:"#7D675E",flexShrink:0}}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="2" y1="4.5" x2="16" y2="4.5"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="13.5" x2="16" y2="13.5"/>
        </svg>
      </button>
      <PeachIcon size={28}/>
      <span style={{
        fontSize:"1.22rem",fontWeight:800,letterSpacing:"-.02em",
        background:"linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C)",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"
      }}>Peach</span>
      {!isMobile && (
        <div style={{display:"flex",alignItems:"center",gap:8,background:"linear-gradient(90deg,#FFBFA8,#FFD5BF)",borderRadius:999,padding:"5px 6px 5px 10px",fontSize:".78rem",fontWeight:600,color:"#2B1911",flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{flexShrink:0}}>
            <circle cx="16" cy="16" r="16" fill="#F7931A"/>
            <path d="M22.2 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.6-1.6-.4-.7 2.7c-.3-.1-.7-.2-1-.3l-2.1-.5-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8.9l-.8 3.3c.1 0 .2 0 .3.1-.1 0-.2-.1-.3-.1L11.4 20c-.1.3-.4.7-1 .5 0 0-1.2-.3-1.2-.3l-.8 1.8 2 .5c.4.1.7.2 1.1.3l-.7 2.7 1.6.4.7-2.7c.4.1.9.2 1.4.3l-.7 2.7 1.6.4.7-2.7c2.8.5 4.9.3 5.8-2.2.7-2-.03-3.2-1.5-3.9 1.1-.25 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2-3.9.9-5 .6l.9-3.5c1.1.3 4.6.8 4.1 2.9zm.5-5.3c-.45 1.8-3.3.9-4.2.7l.8-3.2c.9.2 3.8.6 3.4 2.5z" fill="white"/>
          </svg>
          <span style={{fontWeight:800,whiteSpace:"nowrap"}}>{btcPrice.toLocaleString("fr-FR")} {selectedCurrency}</span>
          <span style={{fontWeight:500,color:"#7D675E",whiteSpace:"nowrap"}}>{Math.round(100_000_000/btcPrice).toLocaleString()} sats / {selectedCurrency.toLowerCase()}</span>
          <div style={{position:"relative",display:"flex",alignItems:"center",background:"rgba(255,255,255,0.45)",borderRadius:999,padding:"2px 9px",cursor:"pointer",gap:4}}>
            <span style={{fontSize:".76rem",fontWeight:800,color:"#2B1911",pointerEvents:"none"}}>{selectedCurrency}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="#7D675E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents:"none",flexShrink:0}}><polyline points="1,1 5,5 9,1"/></svg>
            <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)}
              style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",fontSize:".78rem",width:"100%"}}>
              {availableCurrencies.map(cur => <option key={cur} value={cur}>{cur}</option>)}
            </select>
          </div>
        </div>
      )}
      <div style={{marginLeft:"auto"}}>
        <span style={{fontSize:".75rem",fontWeight:600,color:"#C4B5AE"}}>Sign in to trade</span>
      </div>
    </header>
  );

  // ─── MOBILE VIEW ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap');
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
          html{font-size:120%}
          body{font-family:'Baloo 2',cursive;background:#FFF9F6;color:#2B1911}
          @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
          @keyframes fadeIn{from{opacity:0}to{opacity:1}}
          @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          @keyframes successPop{
            0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}
          }
          @keyframes shake{
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-6px)}60%{transform:translateX(6px)}80%{transform:translateX(-3px)}
          }
          .sidenav{
            position:fixed;top:56px;left:0;bottom:0;
            width:220px;background:#FFFFFF;border-right:1px solid #EAE3DF;
            z-index:500;display:flex;flex-direction:column;align-items:flex-start;
            padding:8px 0;gap:2px;
            transform:translateX(-100%);
            transition:transform .25s cubic-bezier(.4,0,.2,1);
            box-shadow:none;
          }
          .sidenav.sidenav-mobile-open{transform:translateX(0);box-shadow:6px 0 28px rgba(43,25,17,.16)}
          .sidenav-item{
            width:calc(100% - 16px);display:flex;flex-direction:row;align-items:center;
            justify-content:flex-start;gap:12px;padding:10px 14px;border-radius:10px;margin:0 8px;
            border:none;background:transparent;cursor:pointer;color:#7D675E;
            font-family:'Baloo 2',cursive;transition:all .14s;flex-shrink:0;
          }
          .sidenav-item:hover{background:#F4EEEB;color:#2B1911}
          .sidenav-icon{display:flex;align-items:center;justify-content:center;height:22px;flex-shrink:0}
          .sidenav-label{
            font-size:.8rem;font-weight:600;letter-spacing:0;
            white-space:nowrap;overflow:hidden;
          }
          .sidenav-backdrop{
            display:none;position:fixed;inset:0;z-index:499;
            background:rgba(43,25,17,.4);animation:fadeIn .2s ease;
          }
          .sidenav-backdrop.open{display:block}
          .burger-btn{display:flex}
        `}</style>
        <Topbar/>

        {/* Mobile sidebar */}
        <div className={`sidenav-backdrop${sidebarMobileOpen?" open":""}`} onClick={() => setSidebarMobileOpen(false)}/>
        <nav className={`sidenav${sidebarMobileOpen?" sidenav-mobile-open":""}`}>
          {[
            {id:"home",    label:"Home",    icon:<PeachIcon size={20}/>},
            {id:"market",  label:"Market",  icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,14 7,9 11,12 18,5"/><polyline points="13,5 18,5 18,10"/></svg>},
            {id:"trades",  label:"Trades",  icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 7h10M13 4l3 3-3 3"/><path d="M15 13H5M7 10l-3 3 3 3"/></svg>},
            {id:"create",  label:"Create",  icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6.5" x2="10" y2="13.5"/><line x1="6.5" y1="10" x2="13.5" y2="10"/></svg>},
            {id:"payment-methods",label:"Payments",icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="18" height="13" rx="2"/><line x1="1" y1="9" x2="19" y2="9"/><line x1="5" y1="14" x2="8" y2="14"/></svg>},
            {id:"settings",label:"Settings",icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>},
          ].map(({id,label,icon})=>(
            <button key={id} className="sidenav-item"
              onClick={() => { setSidebarMobileOpen(false); const route = NAV_ROUTES[id]; if (route) navigate(route); }}>
              <span className="sidenav-icon">{icon}</span>
              <span className="sidenav-label">{label}</span>
            </button>
          ))}
        </nav>

        <div style={{
          minHeight:"100vh",paddingTop:56,
          display:"flex",flexDirection:"column",
          background:"#FFF9F6"
        }}>
          <div style={{flex:1,display:"flex",flexDirection:"column",
            padding:"28px 20px 32px",gap:24,animation:"fadeUp .4s ease both"}}>

            {pastePhase !== "success" ? (
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
                      background:"linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C)",
                      WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"
                    }}>start trading.</span>
                  </h1>
                </div>

                {/* Tab toggle */}
                <div style={{display:"flex",background:"#F4EEEB",borderRadius:10,padding:3,gap:2}}>
                  {[["qr","📷 Scan QR"],["paste","🔑 Auth code"]].map(([id,label])=>(
                    <button key={id} onClick={()=>setMobileTab(id)} style={{
                      flex:1,padding:"8px 0",borderRadius:8,border:"none",
                      fontFamily:"'Baloo 2',cursive",fontSize:".8rem",fontWeight:700,
                      cursor:"pointer",transition:"all .15s",
                      background: mobileTab===id ? "#FFFFFF" : "transparent",
                      color: mobileTab===id ? "#2B1911" : "#7D675E",
                      boxShadow: mobileTab===id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
                    }}>{label}</button>
                  ))}
                </div>

                {mobileTab === "qr" ? (<>
                  {/* QR panel */}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
                    <div style={{position:"relative",display:"inline-flex",cursor:"pointer"}}
                         onClick={handleQRClick}>
                      <div style={{borderRadius:16,overflow:"hidden",border:"1px solid #EAE3DF",
                        opacity:phase==="expired"?.25:1,transition:"opacity .3s"}}>
                        <MockQR/>
                      </div>
                      <CountdownRing secondsLeft={phase==="expired"?0:secsLeft} total={TOTAL} size={220}/>
                      {phase==="expired" && (
                        <div style={{position:"absolute",inset:0,display:"flex",
                          flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                          <span style={{fontSize:".82rem",fontWeight:800,color:"#DF321F"}}>Expired</span>
                          <span style={{fontSize:".7rem",fontWeight:600,color:"#7D675E"}}>Tap to refresh</span>
                        </div>
                      )}
                      {phase==="success" && (
                        <div style={{position:"absolute",inset:0,display:"flex",
                          alignItems:"center",justifyContent:"center",
                          background:"rgba(255,249,246,.85)",borderRadius:16}}>
                          <span style={{fontSize:"2.5rem"}}>✓</span>
                        </div>
                      )}
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:".88rem",fontWeight:700,marginBottom:2,
                        color:phase==="expired"?"#DF321F":phase==="success"?"#65A519":"#2B1911"}}>
                        {phase==="expired" ? "Code expired" : phase==="success" ? "Signed in!" : "Scan with Peach"}
                      </div>
                      <div style={{fontSize:".72rem",color:"#7D675E",fontWeight:500}}>
                        {phase==="expired" ? "Tap to generate a new code"
                          : phase==="success" ? "Redirecting…"
                          : `${mins}:${secs} remaining · tap to demo`}
                      </div>
                    </div>
                  </div>
                  {/* Steps */}
                  <div style={{display:"flex",flexDirection:"column",gap:10,
                    background:"#FFFFFF",borderRadius:14,border:"1px solid #EAE3DF",padding:"16px 14px"}}>
                    <Step n="1"><strong style={{color:"#2B1911"}}>Open</strong> the Peach app on another device</Step>
                    <Step n="2">Tap the <strong style={{color:"#2B1911"}}>QR icon</strong> in the app's top nav</Step>
                    <Step n="3"><strong style={{color:"#2B1911"}}>Scan</strong> this code to sign in instantly</Step>
                  </div>
                </>) : (<>
                  {/* Auth code panel */}
                  <div style={{display:"flex",flexDirection:"column",gap:12,
                    background:"#FFFFFF",borderRadius:14,border:"1px solid #EAE3DF",padding:"18px 16px"}}>
                    <Step n="1"><strong style={{color:"#2B1911"}}>Copy</strong> the auth code below</Step>
                    <Step n="2"><strong style={{color:"#2B1911"}}>Open</strong> the Peach app on this phone</Step>
                    <Step n="3">Go to <strong style={{color:"#2B1911"}}>Settings → Connect web browser</strong></Step>
                    <Step n="4"><strong style={{color:"#2B1911"}}>Paste</strong> the code into the app to sign in</Step>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <label style={{fontSize:".78rem",fontWeight:700,color:"#624D44",
                      letterSpacing:".02em",textTransform:"uppercase"}}>Your auth code</label>
                    <div style={{
                      display:"flex",alignItems:"center",justifyContent:"space-between",
                      padding:"14px 16px",borderRadius:12,
                      background:"#F4EEEB",border:"1.5px solid #EAE3DF",gap:10
                    }}>
                      <span style={{
                        fontFamily:"monospace",fontSize:".95rem",fontWeight:700,
                        color:"#2B1911",letterSpacing:".08em",wordBreak:"break-all"
                      }}>{MOCK_AUTH_CODE}</span>
                      <button onClick={handleCopyCode} style={{
                        flexShrink:0,padding:"8px 14px",borderRadius:999,
                        background: codeCopied ? "#65A519" : "linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C)",
                        color:"white",border:"none",cursor:"pointer",
                        fontFamily:"'Baloo 2',cursive",fontSize:".78rem",fontWeight:800,
                        letterSpacing:".02em",transition:"background .2s",
                        display:"flex",alignItems:"center",gap:6
                      }}>
                        {codeCopied ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </>)}

                {/* Security note */}
                <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",
                  borderRadius:12,background:"#F4EEEB",border:"1px solid #EAE3DF"}}>
                  <span style={{fontSize:".95rem",flexShrink:0}}>🔒</span>
                  <span style={{fontSize:".72rem",color:"#7D675E",fontWeight:500,lineHeight:1.5}}>
                    {mobileTab==="qr"
                      ? <><strong style={{color:"#2B1911"}}>QR codes</strong> are single-use and expire after <strong style={{color:"#2B1911"}}>3 minutes</strong>. Your keys never leave your device.</>
                      : <><strong style={{color:"#2B1911"}}>Auth codes</strong> are single-use and expire after <strong style={{color:"#2B1911"}}>3 minutes</strong>. Copy it and paste it into your Peach app to sign in.</>}
                  </span>
                </div>

                {/* New to Peach — mobile */}
                <div style={{borderTop:"1px solid #EAE3DF",paddingTop:18}}>
                  <div style={{fontSize:"1.1rem",fontWeight:800,color:"#2B1911",
                    letterSpacing:"-.02em",marginBottom:8}}>New to Peach?</div>
                  <p style={{fontSize:".78rem",color:"#7D675E",fontWeight:500,lineHeight:1.55,marginBottom:12}}>
                    Peach accounts are created on the mobile app — your Bitcoin keys are generated and stored securely on your phone. Download it first, then come back here to sign in.
                  </p>
                  <div style={{display:"flex",gap:8}}>
                    <a href="https://testflight.apple.com/join/wfSPFEWG" target="_blank" rel="noreferrer"
                      style={{
                        flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                        padding:"10px 12px",borderRadius:10,textDecoration:"none",
                        border:"1.5px solid #EAE3DF",background:"#FFFFFF",
                        fontSize:".75rem",fontWeight:700,color:"#2B1911"
                      }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#2B1911">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      App Store
                    </a>
                    <a href="https://play.google.com/store/apps/details?id=com.peachbitcoin.peach.mainnet" target="_blank" rel="noreferrer"
                      style={{
                        flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                        padding:"10px 12px",borderRadius:10,textDecoration:"none",
                        border:"1.5px solid #EAE3DF",background:"#FFFFFF",
                        fontSize:".75rem",fontWeight:700,color:"#2B1911"
                      }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#2B1911">
                        <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/>
                      </svg>
                      Google Play
                    </a>
                  </div>
                </div>

                {/* Dev Login (regtest) — mobile */}
                <div style={{borderTop:"1px dashed #EAE3DF",paddingTop:14}}>
                  <button onClick={() => setDevAuthOpen(o => !o)} style={{
                    background:"none",border:"none",cursor:"pointer",
                    display:"flex",alignItems:"center",gap:6,
                    fontFamily:"'Baloo 2',cursive",fontSize:".73rem",fontWeight:700,
                    color:"#C4B5AE",padding:0,transition:"color .15s"
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{transform:devAuthOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s"}}>
                      <polyline points="4,2 8,6 4,10"/>
                    </svg>
                    🔧 Dev Login (regtest)
                  </button>

                  {devAuthOpen && (
                    <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:10,
                      animation:"fadeIn .2s ease both",padding:14,borderRadius:12,
                      background:"#FFF7ED",border:"1.5px dashed #FFD5BF"}}>
                      <div style={{fontSize:".7rem",color:"#7D675E",fontWeight:500,lineHeight:1.5}}>
                        Paste the JSON from <strong style={{color:"#2B1911",fontFamily:"monospace"}}>/nuxDesktopAuth</strong>.
                      </div>

                      {devAuthPhase === "success" ? (
                        <div style={{display:"flex",flexDirection:"column",gap:8,animation:"fadeIn .2s ease both"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:24,height:24,borderRadius:"50%",background:"#65A519",
                              display:"flex",alignItems:"center",justifyContent:"center",
                              fontSize:".7rem",color:"white",fontWeight:800}}>✓</div>
                            <span style={{fontSize:".8rem",fontWeight:700,color:"#65A519"}}>Authenticated!</span>
                          </div>
                          {devAuthProfile && (
                            <div style={{fontSize:".65rem",color:"#7D675E",fontFamily:"monospace",
                              background:"#F4EEEB",padding:"8px 10px",borderRadius:8,
                              maxHeight:100,overflowY:"auto",lineHeight:1.6,wordBreak:"break-all"}}>
                              <div><strong>PeachID:</strong> {devAuthProfile.id || devAuthProfile.publicKey || "—"}</div>
                              {devAuthProfile.rating != null && <div><strong>Rating:</strong> {devAuthProfile.rating}</div>}
                              {devAuthProfile.trades != null && <div><strong>Trades:</strong> {devAuthProfile.trades}</div>}
                            </div>
                          )}
                          <button onClick={resetDevAuth} style={{
                            alignSelf:"flex-start",padding:"5px 14px",borderRadius:999,
                            border:"1.5px solid #EAE3DF",background:"white",cursor:"pointer",
                            fontFamily:"'Baloo 2',cursive",fontSize:".72rem",fontWeight:700,
                            color:"#7D675E"
                          }}>Reset</button>
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={devAuthJson}
                            onChange={e => { setDevAuthJson(e.target.value); if (devAuthPhase === "error") setDevAuthPhase("idle"); }}
                            placeholder='{"token":"eyJ...","pgpPrivKey":"..."}'
                            spellCheck={false}
                            style={{
                              width:"100%",minHeight:64,padding:"10px 12px",borderRadius:8,
                              border:`1.5px solid ${devAuthPhase === "error" ? "#DF321F" : "#EAE3DF"}`,
                              fontFamily:"monospace",fontSize:".62rem",color:"#2B1911",
                              background:"white",resize:"vertical",lineHeight:1.5,outline:"none"
                            }}
                          />
                          {devAuthPhase === "error" && (
                            <div style={{fontSize:".68rem",color:"#DF321F",fontWeight:600,
                              animation:"shake .3s ease"}}>
                              {devAuthError}
                            </div>
                          )}
                          <button onClick={handleDevAuth} disabled={devAuthPhase === "validating" || !devAuthJson.trim()}
                            style={{
                              alignSelf:"flex-start",padding:"8px 18px",borderRadius:999,
                              background: devAuthPhase === "validating"
                                ? "#EAE3DF"
                                : "linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C)",
                              color:"white",border:"none",cursor: devAuthPhase === "validating" ? "wait" : "pointer",
                              fontFamily:"'Baloo 2',cursive",fontSize:".76rem",fontWeight:800,
                              opacity: !devAuthJson.trim() ? 0.5 : 1,
                              display:"flex",alignItems:"center",gap:8
                            }}>
                            {devAuthPhase === "validating" && (
                              <div style={{width:14,height:14,borderRadius:"50%",
                                border:"2px solid rgba(255,255,255,.3)",borderTopColor:"white",
                                animation:"spin .8s linear infinite"}}/>
                            )}
                            {devAuthPhase === "validating" ? "Validating…" : "Connect"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ── Mobile success ── */
              <div style={{flex:1,display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",gap:20,
                animation:"fadeUp .4s ease both"}}>
                <div style={{
                  width:88,height:88,borderRadius:"50%",
                  background:"linear-gradient(135deg,#8DC33B,#65A519)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:"2.2rem",color:"white",
                  animation:"successPop .4s cubic-bezier(.175,.885,.32,1.275) both",
                  boxShadow:"0 8px 32px rgba(101,165,25,.3)"
                }}>✓</div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:"1.4rem",fontWeight:800,color:"#65A519",marginBottom:6}}>Signed in!</div>
                  <div style={{fontSize:".85rem",color:"#7D675E",fontWeight:500}}>Redirecting to the market…</div>
                </div>
                <span style={{fontSize:".72rem",color:"#C4B5AE",cursor:"pointer",marginTop:8}}
                      onClick={handlePasteReset}>(tap to reset demo)</span>
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
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Baloo 2',cursive;background:#FFF9F6;color:#2B1911;min-height:100vh}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
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
        .sidenav{
          position:fixed;top:56px;left:0;bottom:0;
          width:68px;background:#FFFFFF;border-right:1px solid #EAE3DF;
          z-index:150;display:flex;flex-direction:column;align-items:center;
          padding:8px 0;gap:2px;
          transition:width .2s cubic-bezier(.4,0,.2,1);overflow:hidden;
        }
        .sidenav-collapsed{width:44px}
        .sidenav-toggle{
          width:100%;height:32px;display:flex;align-items:center;justify-content:flex-end;
          padding-right:10px;border:none;background:transparent;cursor:pointer;
          color:#C4B5AE;flex-shrink:0;transition:color .14s;margin-bottom:4px;
        }
        .sidenav-toggle:hover{color:#7D675E}
        .sidenav-item{
          width:calc(100% - 16px);display:flex;flex-direction:column;align-items:center;
          justify-content:center;gap:3px;padding:8px 4px;border-radius:10px;
          border:none;background:transparent;cursor:pointer;color:#7D675E;
          font-family:'Baloo 2',cursive;transition:all .14s;flex-shrink:0;
        }
        .sidenav-item:hover{background:#F4EEEB;color:#2B1911}
        .sidenav-icon{display:flex;align-items:center;justify-content:center;height:22px;flex-shrink:0}
        .sidenav-label{
          font-size:.57rem;font-weight:700;letter-spacing:.02em;
          text-transform:uppercase;white-space:nowrap;overflow:hidden;
          transition:opacity .15s,max-height .2s;max-height:20px;opacity:1;
        }
        .sidenav-collapsed .sidenav-label{opacity:0;max-height:0;pointer-events:none}
        .sidenav-backdrop{
          display:none;position:fixed;inset:0;z-index:149;
          background:rgba(43,25,17,.4);animation:fadeIn .2s ease;
        }
        .sidenav-backdrop.open{display:block}
        .burger-btn{
          display:none;align-items:center;justify-content:center;
          width:34px;height:34px;border-radius:8px;border:none;
          background:transparent;cursor:pointer;color:#7D675E;
          flex-shrink:0;transition:background .14s;
        }
        .burger-btn:hover{background:#F4EEEB}
        @media(max-width:767px){
          .sidenav{
            width:220px;transform:translateX(-100%);
            transition:transform .25s cubic-bezier(.4,0,.2,1);
            z-index:500;align-items:flex-start;box-shadow:none;
          }
          .sidenav-collapsed{width:220px}
          .sidenav.sidenav-mobile-open{transform:translateX(0);box-shadow:6px 0 28px rgba(43,25,17,.16)}
          .sidenav-item{width:calc(100% - 16px);flex-direction:row;justify-content:flex-start;gap:12px;padding:10px 14px}
          .sidenav-collapsed .sidenav-item{width:calc(100% - 16px)}
          .sidenav-label,.sidenav-collapsed .sidenav-label{opacity:1!important;max-height:none!important;font-size:.8rem;text-transform:none;font-weight:600;letter-spacing:0}
          .sidenav-toggle{display:none}
          .sidenav-backdrop.open{display:block}
          .burger-btn{display:flex}
        }
      `}</style>
      <Topbar/>
      {/* Sidebar */}
      <div className={`sidenav-backdrop${sidebarMobileOpen?" open":""}`} onClick={() => setSidebarMobileOpen(false)}/>
      <nav className={`sidenav${sidebarCollapsed?" sidenav-collapsed":""}${sidebarMobileOpen?" sidenav-mobile-open":""}`}>
        <button className="sidenav-toggle" onClick={() => setSidebarCollapsed(c => !c)}>
          {sidebarCollapsed
            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="5,2 10,7 5,12"/></svg>
            : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,2 4,7 9,12"/></svg>
          }
        </button>
        {[
          {id:"home",    label:"Home",    icon:<PeachIcon size={20}/>},
          {id:"market",  label:"Market",  icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,14 7,9 11,12 18,5"/><polyline points="13,5 18,5 18,10"/></svg>},
          {id:"trades",  label:"Trades",  icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 7h10M13 4l3 3-3 3"/><path d="M15 13H5M7 10l-3 3 3 3"/></svg>},
          {id:"create",  label:"Create",  icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6.5" x2="10" y2="13.5"/><line x1="6.5" y1="10" x2="13.5" y2="10"/></svg>},
          {id:"payment-methods",label:"Payments",icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="18" height="13" rx="2"/><line x1="1" y1="9" x2="19" y2="9"/><line x1="5" y1="14" x2="8" y2="14"/></svg>},
          {id:"settings",label:"Settings",icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>},
        ].map(({id,label,icon})=>(
          <button key={id} className="sidenav-item"
            onClick={() => { const route = NAV_ROUTES[id]; if (route) navigate(route); }}>
            <span className="sidenav-icon">{icon}</span>
            <span className="sidenav-label">{label}</span>
          </button>
        ))}
      </nav>

      {/* Ghost market */}
      <div style={{position:"fixed",top:56,left:sidebarCollapsed?44:68,right:0,bottom:0,
        overflow:"hidden",pointerEvents:"none",userSelect:"none"}}>
        <div style={{padding:"12px 24px",background:"#FFFFFF",
          borderBottom:"1px solid #EAE3DF",display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",gap:2,background:"#F4EEEB",padding:3,borderRadius:10}}>
            <div style={{padding:"6px 20px",borderRadius:7,background:"#FFFFFF",
              fontSize:".85rem",fontWeight:700,color:"#65A519"}}>Buy BTC</div>
            <div style={{padding:"6px 20px",borderRadius:7,
              fontSize:".85rem",fontWeight:700,color:"#7D675E"}}>Sell BTC</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",
            borderRadius:999,background:"#F4EEEB",fontSize:".76rem",fontWeight:600,color:"#7D675E"}}>
            7 offers · Avg <span style={{color:"#65A519",fontWeight:700,marginLeft:3}}>−0.4%</span>
            <span style={{color:"#C4B5AE",margin:"0 4px"}}>·</span>
            Best <span style={{color:"#65A519",fontWeight:700,marginLeft:3}}>−1.2%</span>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            {[90,110,80].map(w=>(
              <div key={w} style={{width:w,height:33,borderRadius:8,background:"#EAE3DF"}}/>
            ))}
            <div style={{width:100,height:33,borderRadius:999,
              background:"linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C)",opacity:.5}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:12,padding:"8px 24px",
          borderBottom:"2px solid #EAE3DF",background:"#FFFFFF"}}>
          {["REPUTATION","AMOUNT","PREMIUM","PAYMENT","CURRENCIES",""].map((h,i)=>(
            <div key={i} style={{flex:i===5?0:1,minWidth:i===5?60:0,
              fontSize:".67rem",fontWeight:700,color:"#C4B5AE",letterSpacing:".09em"}}>{h}</div>
          ))}
        </div>
        {[{w1:70,w2:60,accent:"green"},{w1:55,w2:80,accent:"green"},
          {w1:80,w2:55,accent:"red"},{w1:60,w2:70,accent:"green"},
          {w1:75,w2:50,accent:"red"},{w1:50,w2:65,accent:"green"},
          {w1:65,w2:75,accent:"red"},{w1:70,w2:58,accent:"green"}
        ].map((r,i)=><GhostRow key={i} {...r}/>)}
        <div style={{position:"absolute",inset:0,
          background:"linear-gradient(to bottom,rgba(255,249,246,.55) 0%,rgba(255,249,246,.92) 100%)"}}/>
      </div>

      {/* Auth card */}
      <div style={{position:"fixed",top:56,left:sidebarCollapsed?44:68,right:0,bottom:0,
        display:"flex",alignItems:"center",justifyContent:"center",zIndex:10,padding:20}}>
        <div style={{
          background:"#FFFFFF",border:"1px solid #EAE3DF",borderRadius:20,
          boxShadow:"0 8px 48px rgba(43,25,17,.12),0 2px 12px rgba(43,25,17,.06)",
          padding:"36px 40px",display:"flex",gap:48,alignItems:"center",
          maxWidth:780,width:"100%",animation:"fadeUp .5s ease both"
        }}>
          {/* Left: copy + steps */}
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:20}}>
            <div>
              <h1 style={{fontSize:"1.7rem",fontWeight:800,letterSpacing:"-.03em",
                lineHeight:1.2,color:"#2B1911",marginBottom:10}}>
                Sign in to<br/>
                <span style={{
                  background:"linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C)",
                  WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"
                }}>start trading.</span>
              </h1>
              <p style={{fontSize:".85rem",color:"#7D675E",lineHeight:1.65,fontWeight:500}}>
                Use your Peach mobile app to scan the QR code and link your account. Your keys stay on your phone — always.
              </p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Step n="1"><strong style={{color:"#2B1911"}}>Open</strong> the Peach app on your phone</Step>
              <Step n="2"><strong style={{color:"#2B1911"}}>Tap</strong> the QR icon in the top navigation bar</Step>
              <Step n="3"><strong style={{color:"#2B1911"}}>Scan</strong> the code — you'll be signed in instantly</Step>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
              borderRadius:10,background:"#F4EEEB",border:"1px solid #EAE3DF"}}>
              <span style={{fontSize:"1rem"}}>🔒</span>
              <span style={{fontSize:".73rem",color:"#7D675E",fontWeight:500,lineHeight:1.5}}>
                Session tokens expire after <strong style={{color:"#2B1911"}}>60 minutes</strong>. Your keypair never leaves your device.
              </span>
            </div>

            {/* New to Peach */}
            <div style={{borderTop:"1px solid #EAE3DF",paddingTop:18}}>
              <div style={{fontSize:"1.1rem",fontWeight:800,color:"#2B1911",
                letterSpacing:"-.02em",marginBottom:8}}>New to Peach?</div>
              <p style={{fontSize:".78rem",color:"#7D675E",fontWeight:500,lineHeight:1.55,marginBottom:12}}>
                Peach accounts are created on the mobile app — your Bitcoin keys are generated and stored securely on your phone. Download it first, then come back here to sign in.
              </p>
              <div style={{display:"flex",gap:8}}>
                <a href="https://testflight.apple.com/join/wfSPFEWG" target="_blank" rel="noreferrer"
                  style={{
                    flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                    padding:"9px 12px",borderRadius:10,textDecoration:"none",
                    border:"1.5px solid #EAE3DF",background:"#F4EEEB",
                    fontSize:".75rem",fontWeight:700,color:"#2B1911",transition:"border-color .15s"
                  }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="#F56522"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="#EAE3DF"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#2B1911">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  App Store
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.peachbitcoin.peach.mainnet" target="_blank" rel="noreferrer"
                  style={{
                    flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                    padding:"9px 12px",borderRadius:10,textDecoration:"none",
                    border:"1.5px solid #EAE3DF",background:"#F4EEEB",
                    fontSize:".75rem",fontWeight:700,color:"#2B1911",transition:"border-color .15s"
                  }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="#F56522"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="#EAE3DF"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#2B1911">
                    <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/>
                  </svg>
                  Google Play
                </a>
              </div>
            </div>

            {/* Dev Login (regtest) */}
            <div style={{borderTop:"1px dashed #EAE3DF",paddingTop:14}}>
              <button onClick={() => setDevAuthOpen(o => !o)} style={{
                background:"none",border:"none",cursor:"pointer",
                display:"flex",alignItems:"center",gap:6,
                fontFamily:"'Baloo 2',cursive",fontSize:".73rem",fontWeight:700,
                color:"#C4B5AE",padding:0,transition:"color .15s"
              }}
                onMouseEnter={e=>e.currentTarget.style.color="#7D675E"}
                onMouseLeave={e=>e.currentTarget.style.color="#C4B5AE"}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{transform:devAuthOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s"}}>
                  <polyline points="4,2 8,6 4,10"/>
                </svg>
                🔧 Dev Login (regtest)
              </button>

              {devAuthOpen && (
                <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:10,
                  animation:"fadeIn .2s ease both",padding:14,borderRadius:12,
                  background:"#FFF7ED",border:"1.5px dashed #FFD5BF"}}>
                  <div style={{fontSize:".7rem",color:"#7D675E",fontWeight:500,lineHeight:1.5}}>
                    Paste the JSON response from <strong style={{color:"#2B1911",fontFamily:"monospace"}}>/nuxDesktopAuth</strong>. This validates the token against the regtest API.
                  </div>

                  {devAuthPhase === "success" ? (
                    <div style={{display:"flex",flexDirection:"column",gap:8,animation:"fadeIn .2s ease both"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:24,height:24,borderRadius:"50%",background:"#65A519",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:".7rem",color:"white",fontWeight:800}}>✓</div>
                        <span style={{fontSize:".8rem",fontWeight:700,color:"#65A519"}}>Authenticated!</span>
                      </div>
                      {devAuthProfile && (
                        <div style={{fontSize:".68rem",color:"#7D675E",fontFamily:"monospace",
                          background:"#F4EEEB",padding:"8px 10px",borderRadius:8,
                          maxHeight:120,overflowY:"auto",lineHeight:1.6,wordBreak:"break-all"}}>
                          <div><strong>PeachID:</strong> {devAuthProfile.id || devAuthProfile.publicKey || "—"}</div>
                          {devAuthProfile.rating != null && <div><strong>Rating:</strong> {devAuthProfile.rating}</div>}
                          {devAuthProfile.trades != null && <div><strong>Trades:</strong> {devAuthProfile.trades}</div>}
                          {devAuthProfile.pgpPublicKey && <div><strong>PGP:</strong> {devAuthProfile.pgpPublicKey.slice(0, 40)}…</div>}
                        </div>
                      )}
                      <button onClick={resetDevAuth} style={{
                        alignSelf:"flex-start",padding:"5px 14px",borderRadius:999,
                        border:"1.5px solid #EAE3DF",background:"white",cursor:"pointer",
                        fontFamily:"'Baloo 2',cursive",fontSize:".72rem",fontWeight:700,
                        color:"#7D675E",transition:"border-color .15s"
                      }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="#F56522"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor="#EAE3DF"}
                      >Reset</button>
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={devAuthJson}
                        onChange={e => { setDevAuthJson(e.target.value); if (devAuthPhase === "error") setDevAuthPhase("idle"); }}
                        placeholder='{"token":"eyJ...","pgpPrivKey":"-----BEGIN PGP..."}'
                        spellCheck={false}
                        style={{
                          width:"100%",minHeight:72,padding:"10px 12px",borderRadius:8,
                          border:`1.5px solid ${devAuthPhase === "error" ? "#DF321F" : "#EAE3DF"}`,
                          fontFamily:"monospace",fontSize:".68rem",color:"#2B1911",
                          background:"white",resize:"vertical",lineHeight:1.5,
                          outline:"none",transition:"border-color .15s"
                        }}
                        onFocus={e => e.target.style.borderColor = devAuthPhase === "error" ? "#DF321F" : "#F56522"}
                        onBlur={e => e.target.style.borderColor = devAuthPhase === "error" ? "#DF321F" : "#EAE3DF"}
                      />
                      {devAuthPhase === "error" && (
                        <div style={{fontSize:".7rem",color:"#DF321F",fontWeight:600,
                          animation:"shake .3s ease"}}>
                          {devAuthError}
                        </div>
                      )}
                      <button onClick={handleDevAuth} disabled={devAuthPhase === "validating" || !devAuthJson.trim()}
                        style={{
                          alignSelf:"flex-start",padding:"8px 20px",borderRadius:999,
                          background: devAuthPhase === "validating"
                            ? "#EAE3DF"
                            : "linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C)",
                          color:"white",border:"none",cursor: devAuthPhase === "validating" ? "wait" : "pointer",
                          fontFamily:"'Baloo 2',cursive",fontSize:".78rem",fontWeight:800,
                          letterSpacing:".02em",opacity: !devAuthJson.trim() ? 0.5 : 1,
                          display:"flex",alignItems:"center",gap:8,transition:"opacity .15s"
                        }}>
                        {devAuthPhase === "validating" && (
                          <div style={{width:14,height:14,borderRadius:"50%",
                            border:"2px solid rgba(255,255,255,.3)",borderTopColor:"white",
                            animation:"spin .8s linear infinite"}}/>
                        )}
                        {devAuthPhase === "validating" ? "Validating…" : "Connect to regtest"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{width:1,alignSelf:"stretch",background:"#EAE3DF",flexShrink:0}}/>

          {/* Right: QR */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,flexShrink:0}}>
            {phase!=="success" && (
              <>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:".92rem",fontWeight:800,color:"#2B1911",marginBottom:4}}>
                    {phase==="expired" ? "Code expired" : "Scan with Peach"}
                  </div>
                  <div style={{fontSize:".73rem",color:"#C4B5AE",fontWeight:500}}>
                    {phase==="expired" ? "Tap to generate a new code" : "Valid for 3 minutes"}
                  </div>
                </div>

                <div style={{position:"relative",cursor:"pointer"}} onClick={handleQRClick}
                     title="Click to demo states">
                  <CountdownRing secondsLeft={phase==="expired"?0:secsLeft} total={TOTAL} size={220}/>
                  <div style={{width:204,height:204,borderRadius:14,overflow:"hidden",
                    position:"relative",boxShadow:"0 4px 24px rgba(43,25,17,.1)",
                    opacity:phase==="expired"?.25:1,transition:"opacity .3s"}}>
                    <MockQR/>
                    {phase==="scanning" && (
                      <div style={{position:"absolute",inset:0,background:"rgba(255,249,246,.85)",
                        display:"flex",flexDirection:"column",alignItems:"center",
                        justifyContent:"center",gap:10,animation:"fadeIn .2s ease",borderRadius:14}}>
                        <div style={{width:32,height:32,borderRadius:"50%",
                          border:"3px solid #EAE3DF",borderTopColor:"#F56522",
                          animation:"spin .8s linear infinite"}}/>
                        <span style={{fontSize:".78rem",fontWeight:700,color:"#624D44"}}>Connecting…</span>
                      </div>
                    )}
                  </div>
                  {phase==="expired" && (
                    <div style={{position:"absolute",inset:0,borderRadius:14,
                      background:"rgba(255,249,246,.7)",display:"flex",flexDirection:"column",
                      alignItems:"center",justifyContent:"center",gap:8,animation:"fadeIn .3s ease"}}>
                      <span style={{fontSize:"1.6rem"}}>⏰</span>
                      <span style={{fontSize:".75rem",fontWeight:700,color:"#7D675E",textAlign:"center"}}>
                        Tap to refresh
                      </span>
                    </div>
                  )}
                </div>

                {(phase==="waiting"||phase==="scanning") && (
                  <div style={{display:"flex",alignItems:"center",gap:6,fontSize:".73rem",
                    fontWeight:600,color:urgent?"#DF321F":"#C4B5AE",transition:"color .3s"}}>
                    <span>Expires in</span>
                    <span style={{fontWeight:800,fontSize:".82rem",fontVariantNumeric:"tabular-nums",
                      letterSpacing:".04em",color:urgent?"#DF321F":"#7D675E"}}>{mins}:{secs}</span>
                  </div>
                )}
                {phase==="expired" && (
                  <button onClick={resetQR} style={{
                    background:"linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C)",
                    color:"white",border:"none",cursor:"pointer",
                    fontFamily:"'Baloo 2',cursive",fontSize:".82rem",fontWeight:800,
                    padding:"8px 22px",borderRadius:999,letterSpacing:".02em",
                    boxShadow:"0 2px 12px rgba(245,101,34,.35)",animation:"pulse 2s infinite"
                  }}>↻ New QR Code</button>
                )}
              </>
            )}

            {phase==="success" && (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",
                gap:16,animation:"fadeUp .4s ease both"}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:".92rem",fontWeight:800,color:"#65A519"}}>Signed in!</div>
                  <div style={{fontSize:".73rem",color:"#C4B5AE",fontWeight:500,marginTop:4}}>
                    Redirecting to the market…
                  </div>
                </div>
                <div style={{width:204,height:204,borderRadius:14,background:"#F2F9E7",
                  border:"1.5px solid #C8E6A0",display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",gap:10}}>
                  <div style={{width:56,height:56,borderRadius:"50%",background:"#65A519",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"1.6rem",color:"white",
                    animation:"successPop .4s cubic-bezier(.175,.885,.32,1.275) both"}}>✓</div>
                  <div style={{fontSize:".8rem",fontWeight:700,color:"#65A519"}}>Account linked</div>
                </div>
                <span style={{fontSize:".7rem",color:"#C4B5AE",cursor:"pointer"}}
                      onClick={resetQR}>(click to reset demo)</span>
              </div>
            )}

            {/* Auth code fallback — always shown except on success */}
            {phase !== "success" && (
              <div style={{width:"100%",borderTop:"1px solid #EAE3DF",paddingTop:14}}>
                <button onClick={() => setDesktopShowCode(c => !c)} style={{
                  background:"none",border:"none",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:5,
                  fontFamily:"'Baloo 2',cursive",fontSize:".73rem",fontWeight:700,
                  color:"#C4B5AE",padding:0,transition:"color .15s"
                }}
                  onMouseEnter={e=>e.currentTarget.style.color="#7D675E"}
                  onMouseLeave={e=>e.currentTarget.style.color="#C4B5AE"}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{transform:desktopShowCode?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s"}}>
                    <polyline points="4,2 8,6 4,10"/>
                  </svg>
                  Can't scan? Use auth code instead
                </button>

                {desktopShowCode && (
                  <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8,
                    animation:"fadeIn .2s ease both"}}>
                    <div style={{fontSize:".7rem",color:"#7D675E",fontWeight:500,lineHeight:1.5}}>
                      Copy this code and paste it into your Peach app under <strong style={{color:"#2B1911"}}>Settings → Connect web browser</strong>.
                    </div>
                    <div style={{
                      display:"flex",alignItems:"center",justifyContent:"space-between",
                      padding:"12px 14px",borderRadius:10,
                      background:"#F4EEEB",border:"1.5px solid #EAE3DF",gap:10
                    }}>
                      <span style={{
                        fontFamily:"monospace",fontSize:".88rem",fontWeight:700,
                        color:"#2B1911",letterSpacing:".08em",wordBreak:"break-all"
                      }}>{MOCK_AUTH_CODE}</span>
                      <button onClick={handleCopyCode} style={{
                        flexShrink:0,padding:"7px 14px",borderRadius:999,
                        background: codeCopied ? "#65A519" : "linear-gradient(90deg,#FF4D42,#FF7A50,#FFA24C)",
                        color:"white",border:"none",cursor:"pointer",
                        fontFamily:"'Baloo 2',cursive",fontSize:".78rem",fontWeight:800,
                        letterSpacing:".02em",transition:"background .2s",
                        display:"flex",alignItems:"center",gap:6
                      }}>
                        {codeCopied ? "✓ Copied" : "Copy"}
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
