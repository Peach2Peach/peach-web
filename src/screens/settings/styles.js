// ─── SETTINGS — CSS ──────────────────────────────────────────────────────────
// Extracted from peach-settings.jsx.
// ─────────────────────────────────────────────────────────────────────────────

export const CSS = `
  .settings-scroll{margin-top:var(--topbar);padding:32px 24px 80px;max-width:640px;margin-left:auto;margin-right:auto}
  .settings-page-title{font-size:1.5rem;font-weight:800;color:var(--black);margin-bottom:28px;letter-spacing:-0.02em}
  .version-footer{text-align:center;padding:20px 0 8px;font-size:.72rem;color:var(--black-25);font-weight:500}

  @media(max-width:768px){
    .topbar-price{display:none}
    .sidenav-price-slot{display:block}
    .settings-scroll{padding:24px 16px 80px}
  }
  @media(max-width:767px){
    .sidenav{width:220px;left:0;transform:translateX(-100%);
      transition:transform .25s cubic-bezier(.4,0,.2,1);z-index:500;
      align-items:flex-start;box-shadow:none}
    .sidenav.sidenav-mobile-open{transform:translateX(0);box-shadow:6px 0 28px rgba(43,25,17,.16)}
    .sidenav-item{width:calc(100% - 16px);flex-direction:row;justify-content:flex-start;gap:12px;padding:10px 14px}
    .sidenav-label{opacity:1!important;max-height:none!important;font-size:.8rem;text-transform:none;font-weight:600;letter-spacing:0}
    .burger-btn{display:flex}
    .page-wrap{margin-left:0!important}
  }
`;
