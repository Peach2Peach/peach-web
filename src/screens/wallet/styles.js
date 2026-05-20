export const CSS = `
  /* Page layout — same shell as payment-methods. */
  .page-wrap{margin-top:var(--topbar);margin-left:68px;padding:32px 28px;min-height:calc(100vh - 56px)}
  @media(max-width:767px){.page-wrap{margin-left:0;padding:20px 16px;overflow-x:hidden}}

  .page-header{display:flex;align-items:flex-start;gap:16px;margin-bottom:24px;flex-wrap:wrap}
  .page-title{font-size:1.5rem;font-weight:800;letter-spacing:-.02em}
  .page-title-row{display:flex;align-items:center;gap:10px}
  .page-title-icon{display:inline-flex;align-items:center;justify-content:center;
    background:none;border:none;padding:0;cursor:default;line-height:0}
  .page-title-icon.is-button{cursor:pointer;border-radius:50%;transition:transform .15s,opacity .15s}
  .page-title-icon.is-button:hover{transform:scale(1.08)}
  .page-subtitle{font-size:.85rem;color:var(--black-65);margin-top:2px}
  .header-right{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-left:auto}

  .w-refresh{display:flex;align-items:center;gap:6px;background:var(--surface);
    border:1.5px solid var(--black-10);border-radius:999px;
    font-family:var(--font);font-size:.78rem;font-weight:700;color:var(--black-65);
    padding:6px 14px;cursor:pointer;transition:all .15s}
  .w-refresh:hover:not(:disabled){border-color:var(--primary);color:var(--primary)}
  .w-refresh:disabled{opacity:.6;cursor:default}
  .w-refresh-secondary{display:inline-flex;align-items:center;gap:4px;background:none;
    border:none;font-family:var(--font);font-size:.7rem;font-weight:600;
    color:var(--black-65);padding:2px 6px;cursor:pointer;transition:color .15s;text-decoration:underline;
    text-decoration-color:transparent;text-underline-offset:3px}
  .w-refresh-secondary:hover:not(:disabled){color:var(--primary);text-decoration-color:currentColor}
  .w-refresh-secondary:disabled{opacity:.5;cursor:default}
  .w-refresh-icon{display:inline-flex;align-items:center;justify-content:center}
  .w-refresh-icon.spinning{animation:wspin 1s linear infinite}
  @keyframes wspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  .w-updated{font-size:.7rem;color:var(--black-65)}

  /* ── Cap-hit hint ── */
  .w-caphint{display:flex;gap:10px;align-items:flex-start;background:#fff7e8;
    border:1px solid #f0c060;border-radius:12px;padding:12px 14px;
    margin-bottom:20px;max-width:680px}

  /* ── Privacy banner ── */
  .w-privacy{display:flex;gap:10px;align-items:flex-start;background:var(--primary-mild);
    border:1px solid var(--primary);border-radius:12px;padding:12px 14px;
    margin-bottom:20px;max-width:680px}
  .w-privacy-icon{font-size:1rem;flex-shrink:0;margin-top:1px}
  .w-privacy-body{flex:1;min-width:0}
  .w-privacy-title{font-weight:800;font-size:.82rem;color:var(--primary-dark);margin-bottom:3px}
  .w-privacy-text{font-size:.76rem;color:var(--black);line-height:1.55}
  .w-privacy-close{background:none;border:none;cursor:pointer;color:var(--primary-dark);
    font-size:1rem;line-height:1;padding:0 4px;font-weight:700}

  /* ── Hero row: balance card + illustration side-by-side ── */
  /* align-items:flex-start so the card stays tight to its content rather than
     stretching to match the (taller, square) illustration. */
  .w-hero-row{display:flex;align-items:flex-start;gap:20px;margin-bottom:24px;max-width:680px}
  .w-hero-illustration{flex:0 0 220px;display:flex;align-items:center;justify-content:center;
    border-radius:18px;overflow:hidden}
  .w-hero-illustration img{width:100%;height:auto;display:block}
  .w-hero-illustration-placeholder{width:100%;aspect-ratio:1/1;border:1.5px dashed var(--black-10);
    border-radius:18px;display:flex;align-items:center;justify-content:center;
    font-size:.7rem;color:var(--black-65);text-align:center;padding:14px;line-height:1.4}
  @media(max-width:640px){
    .w-hero-row{flex-direction:column}
    .w-hero-illustration{flex:0 0 auto;max-width:240px;align-self:flex-start}
  }

  /* ── Balance hero ── */
  .w-hero{background:var(--surface);border:1.5px solid var(--black-10);border-radius:18px;
    padding:24px 26px;flex:1 1 360px;min-width:0}
  .w-hero-label{font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
    color:var(--black-65);margin-bottom:10px}
  .w-hero-amount{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px}
  .w-hero-fiat{font-size:1rem;font-weight:700;color:var(--black-65)}
  .w-hero-pending{display:flex;align-items:center;gap:6px;font-size:.8rem;color:var(--black-65);
    margin-top:8px}
  .w-hero-pending-label{font-weight:700;color:var(--warn,#c47e15)}

  /* ── Sections ── */
  .w-section{margin-bottom:28px;max-width:680px}
  .w-section-title{display:flex;align-items:center;gap:8px;margin-bottom:12px}
  .w-section-title-text{font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;
    color:var(--black-65)}
  .w-count-tag{background:var(--black-10);color:var(--black-65);font-size:.62rem;font-weight:800;
    padding:1px 8px;border-radius:999px}

  /* ── Fresh receive card ── */
  .w-fresh-card{background:var(--surface);border:1.5px solid var(--primary);border-radius:14px;
    padding:16px 18px;margin-bottom:12px;box-shadow:0 2px 10px rgba(245,101,34,.06)}
  .w-fresh-label{font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
    color:var(--primary-dark);margin-bottom:8px}
  .w-fresh-row{display:flex;align-items:center;gap:10px}
  .w-addr{flex:1;min-width:0;font-family:monospace;font-size:.82rem;color:var(--black);
    word-break:break-all}
  .w-addr-actions{display:flex;gap:6px;flex-shrink:0}
  .w-icon-btn{width:34px;height:34px;border-radius:9px;border:1.5px solid var(--black-10);
    background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;
    color:var(--black-65);transition:all .15s;flex-shrink:0}
  .w-icon-btn:hover{border-color:var(--primary);color:var(--primary);background:var(--primary-mild)}
  .w-fresh-path{font-size:.7rem;color:var(--black-65);margin-top:8px;font-family:monospace}

  /* ── Used address list ── */
  .w-used-list{display:flex;flex-direction:column;gap:6px}
  .w-used-row{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface);
    border:1px solid var(--black-10);border-radius:10px}
  .w-used-row:hover{border-color:var(--primary-mild)}
  .w-used-idx{font-size:.7rem;font-weight:700;color:var(--black-65);font-family:monospace;
    min-width:38px;flex-shrink:0}
  .w-used-addr{flex:1;min-width:0;font-family:monospace;font-size:.78rem;color:var(--black);
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .w-used-amt{font-size:.78rem;flex-shrink:0}

  /* Collapsible used-addresses */
  .w-collapse{background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;
    font-family:var(--font);font-size:.76rem;font-weight:700;color:var(--black-65);padding:4px 0;
    margin-bottom:6px}
  .w-collapse:hover{color:var(--primary)}

  /* ── Tx history ── */
  .w-tx-list{display:flex;flex-direction:column;gap:6px}
  .w-tx-row{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface);
    border:1px solid var(--black-10);border-radius:10px}
  .w-tx-row:hover{border-color:var(--primary-mild)}
  .w-tx-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;
    flex-shrink:0;font-size:1rem;font-weight:800}
  .w-tx-in{background:#e8f7e3;color:#3d8b1f}
  .w-tx-out{background:#fde8e8;color:#c93030}
  .w-tx-body{flex:1;min-width:0}
  .w-tx-amt{font-size:.88rem;font-weight:700}
  .w-tx-meta{font-size:.7rem;color:var(--black-65);margin-top:2px;
    display:flex;flex-wrap:wrap;gap:10px;align-items:center}
  .w-tx-meta-sep{opacity:.4}
  .w-tx-link{color:var(--black-65);text-decoration:none;display:inline-flex;align-items:center;gap:3px}
  .w-tx-link:hover{color:var(--primary)}
  .w-tx-unconf{color:var(--warn,#c47e15);font-weight:700}

  /* ── Loading / empty ── */
  .w-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:40px 20px;gap:10px}
  .w-empty-icon{font-size:2.4rem;opacity:.35}
  .w-empty-title{font-size:1rem;font-weight:800;color:var(--black)}
  .w-empty-desc{font-size:.78rem;color:var(--black-65);line-height:1.55;max-width:380px}
  .w-progress{display:flex;align-items:center;gap:8px;font-size:.76rem;color:var(--black-65);
    margin-bottom:16px;padding:10px 14px;background:var(--black-5);border-radius:10px;max-width:680px}
  .w-error-banner{background:var(--error-bg);border:1.5px solid var(--error);color:var(--error);
    padding:12px 16px;border-radius:12px;font-size:.85rem;font-weight:700;margin-bottom:16px;
    max-width:680px;display:flex;align-items:center;gap:10px}

  /* ── QR popup ── */
  .w-qr-overlay{position:fixed;inset:0;z-index:600;background:rgba(43,25,17,.45);
    display:flex;align-items:center;justify-content:center;padding:20px}
  .w-qr-card{background:var(--surface);border-radius:18px;padding:24px;max-width:340px;
    box-shadow:0 20px 60px rgba(43,25,17,.2);display:flex;flex-direction:column;align-items:center;
    gap:14px}
  .w-qr-frame{background:#ffffff;padding:12px;border-radius:12px}
  .w-qr-addr{font-family:monospace;font-size:.76rem;text-align:center;word-break:break-all;
    color:var(--black);padding:0 4px}
  .w-qr-close{align-self:stretch;background:var(--black-5);border:none;border-radius:10px;
    font-family:var(--font);font-size:.85rem;font-weight:700;color:var(--black);
    padding:10px 16px;cursor:pointer}
  .w-qr-close:hover{background:var(--black-10)}
`;
