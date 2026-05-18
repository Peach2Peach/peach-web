// ─── SETTINGS — CSS ──────────────────────────────────────────────────────────
// Extracted from peach-settings.jsx.
// ─────────────────────────────────────────────────────────────────────────────

export const CSS = `
  .settings-scroll{margin-top:var(--topbar);padding:32px 28px 80px;max-width:640px}
  .settings-page-title{font-size:1.5rem;font-weight:800;color:var(--black);margin-bottom:28px;letter-spacing:-0.02em}
  .version-footer{text-align:center;padding:20px 0 8px;font-size:.72rem;color:var(--black-25);font-weight:500}

  @media(max-width:768px){
    .settings-scroll{padding:24px 16px 80px}
  }
  @media(max-width:767px){
    .page-wrap{margin-left:0!important}
  }
`;
