// ─── OFFER CREATION — CSS ──────────────────────────────────────────────────
// Extracted from peach-offer-creation.jsx (purely mechanical — 451 lines of CSS)
// ─────────────────────────────────────────────────────────────────────────────
export const CSS = `
  :root{--error-bg:#FFE6E1}


  .back-btn{display:flex;align-items:center;gap:6px;font-size:.82rem;font-weight:700;
    color:var(--black-65);cursor:pointer;padding:6px 12px;border-radius:8px;
    border:none;background:none;font-family:var(--font);transition:all .12s}
  .back-btn:hover{background:var(--black-5);color:var(--black)}
  .topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px}

  /* Sidenav */
  .sidenav{
    position:fixed;top:var(--topbar);left:0;bottom:0;
    width:68px;background:var(--surface);border-right:1px solid var(--black-10);
    z-index:150;display:flex;flex-direction:column;align-items:center;
    padding:8px 0;gap:2px;
    overflow:hidden;
  }
  .sidenav-item{
    width:calc(100% - 16px);display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:3px;padding:8px 4px;border-radius:10px;
    border:none;background:transparent;cursor:pointer;color:var(--black-65);
    font-family:var(--font);transition:all .14s;flex-shrink:0;
  }
  .sidenav-item:hover{background:var(--black-5);color:var(--black)}
  .sidenav-active{background:var(--primary-mild)!important;color:var(--primary-dark)!important}
  .sidenav-icon{display:flex;align-items:center;justify-content:center;height:22px;flex-shrink:0}
  .sidenav-label{
    font-size:.57rem;font-weight:700;letter-spacing:.02em;
    text-transform:uppercase;white-space:nowrap;overflow:hidden;
    transition:opacity .15s, max-height .2s;
    max-height:20px;opacity:1;
  }
  .sidenav-backdrop{
    display:none;position:fixed;inset:0;z-index:149;
    background:rgba(43,25,17,.4);
    animation:fadeIn .2s ease;
  }
  .sidenav-backdrop.open{display:block}
  .burger-btn{
    display:none;align-items:center;justify-content:center;
    width:34px;height:34px;border-radius:8px;border:none;
    background:transparent;cursor:pointer;color:var(--black-65);
    flex-shrink:0;transition:background .14s;
  }
  .burger-btn:hover{background:var(--black-5)}
  /* ── AUTH POPUP (protected screen — scoped to content area) ── */
  .auth-screen-overlay{
    position:fixed;top:var(--topbar);left:68px;right:0;bottom:0;z-index:100;
    display:flex;align-items:flex-start;justify-content:center;
    padding-top:20vh;
    background:rgba(255,249,246,.7);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  }
  @media(max-width:767px){.auth-screen-overlay{left:0}}
  .auth-popup{
    background:var(--surface);border:1px solid var(--black-10);border-radius:20px;
    box-shadow:0 12px 40px rgba(43,25,17,.15);
    padding:36px 40px;display:flex;flex-direction:column;align-items:center;gap:16px;
    max-width:360px;width:90%;animation:popIn .2s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes popIn{from{opacity:0;transform:scale(.92) translateY(8px)}to{opacity:1;transform:none}}
  .auth-popup-icon{width:56px;height:56px;border-radius:50%;background:var(--primary-mild);
    display:flex;align-items:center;justify-content:center}
  .auth-popup-title{font-size:1.1rem;font-weight:800;color:var(--black);text-align:center}
  .auth-popup-sub{font-size:.85rem;font-weight:500;color:var(--black-65);text-align:center;line-height:1.5}
  .auth-popup-btn{
    padding:10px 28px;border-radius:999px;background:var(--grad);color:white;
    font-family:var(--font);font-size:.88rem;font-weight:800;border:none;cursor:pointer;
    box-shadow:0 2px 12px rgba(245,101,34,.3);transition:transform .1s,box-shadow .1s;margin-top:4px;
  }
  .auth-popup-btn:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(245,101,34,.42)}

  /* Layout */
  .layout{display:grid;grid-template-columns:1fr 340px;
    min-height:calc(100vh - var(--topbar));margin-top:var(--topbar)}
  .wizard{display:flex;flex-direction:column;padding:36px 48px;
    border-right:1px solid var(--black-10);min-width:0;gap:0}

  /* Wizard header */
  .wizard-header{display:flex;align-items:center;justify-content:space-between;
    margin-bottom:28px;flex-wrap:wrap;gap:12px}
  .wizard-title{font-size:1.5rem;font-weight:800;letter-spacing:-.025em;color:var(--black)}

  /* Type toggle */
  .type-toggle{display:flex;gap:2px;background:var(--black-5);
    padding:3px;border-radius:10px}
  .type-btn{padding:7px 22px;border-radius:8px;font-size:.85rem;font-weight:800;
    cursor:pointer;border:none;background:transparent;color:var(--black-65);
    transition:all .14s;font-family:var(--font)}
  .type-btn.buy-on{background:var(--surface);color:var(--success);box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .type-btn.sell-on{background:var(--surface);color:var(--error);box-shadow:0 1px 4px rgba(0,0,0,.08)}

  /* Step indicator (simplified: Configure → Review → Escrow) */
  .step-bar{display:flex;align-items:flex-start;margin-bottom:28px;gap:0}
  .sb-item{display:flex;flex-direction:column;align-items:center;gap:5px}
  .sb-dot{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;font-size:.68rem;font-weight:800;transition:all .22s;flex-shrink:0}
  .sb-dot.done{background:var(--grad);color:white}
  .sb-dot.active{background:var(--black);color:white;box-shadow:0 0 0 4px rgba(43,25,17,.1)}
  .sb-dot.todo{background:var(--black-5);color:var(--black-25);border:1.5px solid var(--black-10)}
  .sb-label{font-size:.62rem;font-weight:700;text-transform:uppercase;
    letter-spacing:.07em;white-space:nowrap;transition:color .2s}
  .sb-label.done{color:var(--primary-dark)}.sb-label.active{color:var(--black)}.sb-label.todo{color:var(--black-25)}
  .sb-line{height:2px;flex:1;margin:13px 4px 0;min-width:16px;transition:background .22s}
  .sb-line.done{background:var(--primary)}.sb-line.todo{background:var(--black-10)}

  /* Config card */
  .config-card{background:var(--surface);border:1px solid var(--black-10);
    border-radius:18px;overflow:hidden;box-shadow:0 2px 16px rgba(43,25,17,.06)}

  /* Section inside card */
  .card-section{padding:22px 24px;border-bottom:1px solid var(--black-5)}
  .card-section:last-child{border-bottom:none}
  .section-header{display:flex;align-items:center;gap:10px;margin-bottom:16px}
  .section-num{width:22px;height:22px;border-radius:50%;background:var(--black-5);
    border:1.5px solid var(--black-10);display:flex;align-items:center;
    justify-content:center;font-size:.65rem;font-weight:800;color:var(--black-65);flex-shrink:0}
  .section-num.filled{background:var(--primary-mild);border-color:var(--primary-mild2);
    color:var(--primary-dark)}
  .section-title{font-size:.88rem;font-weight:800;color:var(--black)}
  .section-done{font-size:.7rem;font-weight:700;color:var(--success);
    background:var(--success-bg);padding:2px 8px;border-radius:999px;margin-left:auto}

  /* Inputs */
  .field-label{font-size:.7rem;font-weight:700;text-transform:uppercase;
    letter-spacing:.07em;color:var(--black-65);margin-bottom:6px;display:block}
  .field-input{width:100%;font-family:var(--font);font-size:.95rem;font-weight:700;
    padding:10px 14px;border:2px solid var(--black-10);border-radius:10px;
    background:var(--bg);color:var(--black);outline:none;transition:border-color .15s}
  .field-input:focus{border-color:var(--primary)}
  .field-input.err{border-color:var(--error)}
  .fiat-hint{font-size:.7rem;color:var(--black-65);font-weight:500;margin-top:4px;min-height:16px}
  .fiat-hint.warn{color:var(--error)}
  .row-2{display:flex;gap:12px}
  .row-2>*{flex:1}

  /* Chips */
  .chip-grid{display:flex;flex-wrap:wrap;gap:7px}
  .method-chip{padding:6px 14px;border-radius:999px;font-size:.8rem;font-weight:700;
    cursor:pointer;border:2px solid var(--black-10);background:var(--surface);
    color:var(--black-65);transition:all .12s;font-family:var(--font)}
  .method-chip:hover{border-color:var(--primary);color:var(--primary-dark)}
  .method-chip.sel{border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark)}
  .badge-chip{display:inline-flex;align-items:center;padding:6px 14px;border-radius:999px;
    font-size:.78rem;font-weight:700;cursor:pointer;border:2px solid var(--black-10);
    background:var(--surface);color:var(--black-65);transition:all .12s;font-family:var(--font);
    user-select:none}
  .badge-chip:hover{border-color:var(--primary);color:var(--primary-dark)}
  .badge-chip.sel{border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark)}
  .curr-chip{padding:4px 11px;border-radius:6px;font-size:.73rem;font-weight:800;
    cursor:pointer;border:2px solid var(--black-10);background:var(--surface);
    color:var(--black-65);transition:all .12s;letter-spacing:.04em;font-family:var(--font)}
  .curr-chip:hover{border-color:var(--primary);color:var(--primary-dark)}
  .curr-chip.sel{border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark)}

  /* Amount slider */
  .amt-slider-wrap{position:relative;height:28px;display:flex;align-items:center;margin:8px 0 2px}
  .amt-slider-track{position:absolute;left:0;right:0;height:6px;border-radius:3px;
    background:var(--black-10);pointer-events:none}
  .amt-slider-fill{position:absolute;height:6px;border-radius:3px;
    background:var(--primary);pointer-events:none}
  .amt-slider{-webkit-appearance:none;appearance:none;position:absolute;
    width:100%;height:6px;background:transparent;outline:none;
    cursor:pointer;pointer-events:all}
  .amt-slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;
    border-radius:50%;background:white;border:2.5px solid var(--primary);
    box-shadow:0 2px 8px rgba(245,101,34,.35);cursor:grab;transition:transform .1s}
  .amt-slider::-webkit-slider-thumb:hover{transform:scale(1.15)}
  .amt-slider::-webkit-slider-thumb:active{cursor:grabbing;transform:scale(1.1)}
  .amt-slider::-moz-range-thumb{width:22px;height:22px;border-radius:50%;
    background:white;border:2.5px solid var(--primary);cursor:grab;
    box-shadow:0 2px 8px rgba(245,101,34,.35)}
  .amt-labels{display:flex;justify-content:space-between;font-size:.65rem;
    color:var(--black-65);font-weight:600;margin-bottom:12px}
  .amt-display{display:flex;align-items:baseline;gap:8px;margin-bottom:10px;flex-wrap:wrap}
  .amt-display-val{font-size:1.6rem;font-weight:800;letter-spacing:-.03em;color:var(--black)}
  .amt-display-fiat{font-size:.82rem;color:var(--black-65);font-weight:600}
  .amt-sep{font-size:1.1rem;color:var(--black-25);font-weight:500}

  /* Amount pills (editable sats + fiat display) */
  .amt-pills{display:flex;gap:8px;margin-bottom:10px;align-items:center}
  .amt-pill{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;
    border:2px solid var(--black-10);border-radius:999px;background:var(--bg);
    transition:border-color .15s;cursor:text;overflow:hidden}
  .amt-pill.focused{border-color:var(--primary)}
  .fiat-pill{cursor:default}
  .amt-pill-display{display:inline-flex;align-items:center;gap:5px;
    white-space:nowrap;cursor:text;width:100%}
  .amt-pill-grey{color:#C4B5AE;font-weight:700;font-size:.88rem}
  .amt-pill-black{color:var(--black);font-weight:800;font-size:.88rem}
  .amt-pill-input{border:none;background:transparent;outline:none;
    font-family:var(--font);font-size:.92rem;font-weight:800;
    color:var(--black);padding:0}
  .amt-pill-fiat{font-size:.82rem;color:var(--black-65);font-weight:600;
    white-space:nowrap}

  /* Limit warning */
  .limit-warn{display:flex;gap:9px;align-items:flex-start;background:#FFFBEB;
    border:1px solid #F5CE22;border-radius:10px;padding:10px 12px;
    font-size:.76rem;font-weight:600;color:#7A5F00;line-height:1.55;margin-top:10px}

  /* Limit bar */
  .limit-bar-wrap{margin-top:10px}
  .limit-bar-label{display:flex;justify-content:space-between;
    font-size:.65rem;font-weight:600;color:var(--black-65);margin-bottom:4px}
  .limit-bar-track{height:5px;border-radius:999px;background:var(--black-10);overflow:hidden}
  .limit-bar-fill{height:100%;border-radius:999px;transition:width .3s,background .3s}


  /* Payment method chips (saved) */
  .pm-chip{display:flex;align-items:center;gap:8px;padding:8px 14px;
    border-radius:12px;font-size:.8rem;font-weight:700;cursor:pointer;
    border:2px solid var(--black-10);background:var(--surface);
    color:var(--black-65);transition:all .12s;font-family:var(--font);
    text-align:left}
  .pm-chip:hover{border-color:var(--primary);color:var(--primary-dark)}
  .pm-chip.sel{border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark)}
  .pm-chip-type{font-size:.65rem;font-weight:800;text-transform:uppercase;
    letter-spacing:.06em;background:var(--black-5);border-radius:4px;
    padding:2px 6px;color:var(--black-65);flex-shrink:0}
  .pm-chip.sel .pm-chip-type{background:rgba(245,101,34,.15);color:var(--primary-dark)}
  .pm-chip-check{margin-left:auto;font-size:.75rem;flex-shrink:0;
    color:var(--primary-dark);opacity:0;transition:opacity .1s}
  .pm-chip.sel .pm-chip-check{opacity:1}

  /* Empty state */
  .pm-empty{display:flex;flex-direction:column;align-items:center;gap:10px;
    padding:28px 16px;text-align:center;border:2px dashed var(--black-10);
    border-radius:14px;color:var(--black-25)}

  /* Edit PM button */
  .btn-edit-pm{padding:3px 9px;border-radius:6px;border:1.5px solid var(--black-10);
    background:transparent;color:var(--black-65);font-family:var(--font);
    font-size:.68rem;font-weight:700;cursor:pointer;transition:all .12s;
    flex-shrink:0;white-space:nowrap}
  .btn-edit-pm:hover{border-color:var(--primary);color:var(--primary-dark);
    background:var(--primary-mild)}

  /* Currency checkboxes in modal */
  .curr-check-grid{display:flex;flex-wrap:wrap;gap:6px}
  .curr-check-btn{padding:5px 12px;border-radius:7px;font-size:.76rem;font-weight:800;
    cursor:pointer;border:2px solid var(--black-10);background:var(--surface);
    color:var(--black-65);transition:all .12s;letter-spacing:.04em;font-family:var(--font)}
  .curr-check-btn:hover{border-color:var(--primary);color:var(--primary-dark)}
  .curr-check-btn.on{border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark)}

  /* Summary box in modal */
  .modal-summary{background:var(--black-5);border-radius:12px;
    border:1px solid var(--black-10);overflow:hidden}
  .modal-summary-row{display:flex;justify-content:space-between;align-items:center;
    padding:9px 14px;border-bottom:1px solid var(--black-10);font-size:.82rem}
  .modal-summary-row:last-child{border-bottom:none}
  .msk{font-weight:600;color:var(--black-65)}
  .msv{font-weight:800;color:var(--black);text-align:right;max-width:60%;word-break:break-all}

  /* Add button (section header) */
  .btn-add-pm{display:flex;align-items:center;gap:5px;padding:4px 12px;
    border-radius:999px;border:1.5px solid var(--primary);background:var(--primary-mild);
    color:var(--primary-dark);font-family:var(--font);font-size:.76rem;font-weight:800;
    cursor:pointer;transition:all .12s;flex-shrink:0}
  .btn-add-pm:hover{background:var(--primary);color:white}

  /* Modal overlay */
  .modal-overlay{position:fixed;inset:0;background:rgba(43,25,17,.45);
    backdrop-filter:blur(3px);z-index:400;display:flex;align-items:center;
    justify-content:center;padding:20px;animation:fadeIn .15s ease}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .modal-card{background:var(--surface);border-radius:20px;width:100%;max-width:460px;
    box-shadow:0 24px 64px rgba(43,25,17,.22);overflow:hidden;
    animation:slideUp .2s cubic-bezier(.16,1,.3,1)}
  @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
  .modal-header{display:flex;align-items:center;justify-content:space-between;
    padding:20px 22px 0}
  .modal-title{font-size:1.05rem;font-weight:800;color:var(--black)}
  .modal-close{width:30px;height:30px;border-radius:50%;border:none;background:var(--black-5);
    cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;
    color:var(--black-65);transition:all .12s;font-family:var(--font)}
  .modal-close:hover{background:var(--black-10);color:var(--black)}
  .modal-body{padding:18px 22px 22px;display:flex;flex-direction:column;gap:14px}
  .modal-select{width:100%;font-family:var(--font);font-size:.9rem;font-weight:600;
    padding:10px 12px;border:2px solid var(--black-10);border-radius:10px;
    background:var(--bg);color:var(--black);outline:none;transition:border-color .15s;
    appearance:none;cursor:pointer}
  .modal-select:focus{border-color:var(--primary)}
  .select-wrap{position:relative}
  .select-wrap::after{content:"▾";position:absolute;right:12px;top:50%;
    transform:translateY(-50%);pointer-events:none;color:var(--black-65);font-size:.8rem}
  .modal-steps{display:flex;gap:6px;margin-bottom:4px}
  .modal-step-dot{height:3px;border-radius:999px;flex:1;transition:background .2s}
  .modal-foot{display:flex;gap:8px;padding:0 22px 22px}
  .modal-btn-back{flex:1;padding:10px;border-radius:999px;border:1.5px solid var(--black-10);
    background:transparent;color:var(--black-65);font-family:var(--font);
    font-size:.88rem;font-weight:700;cursor:pointer;transition:all .12s}
  .modal-btn-back:hover{border-color:var(--black-25);color:var(--black)}
  .modal-btn-next{flex:2;padding:10px;border-radius:999px;background:var(--grad);color:white;
    font-family:var(--font);font-size:.88rem;font-weight:800;border:none;
    cursor:pointer;box-shadow:0 2px 10px rgba(245,101,34,.3);transition:all .12s}
  .modal-btn-next:disabled{background:var(--black-10);color:var(--black-25);
    box-shadow:none;cursor:not-allowed}
  .modal-btn-next:not(:disabled):hover{transform:translateY(-1px);
    box-shadow:0 4px 16px rgba(245,101,34,.4)}

  .prem-slider{-webkit-appearance:none;appearance:none;width:100%;height:6px;
    border-radius:3px;outline:none;cursor:pointer}
  .prem-slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;
    border-radius:50%;background:white;border:2.5px solid var(--primary);
    box-shadow:0 2px 8px rgba(245,101,34,.3);cursor:pointer;transition:transform .1s}
  .prem-slider::-webkit-slider-thumb:hover{transform:scale(1.15)}
  .slider-labels{display:flex;justify-content:space-between;font-size:.68rem;
    color:var(--black-65);font-weight:600;margin-top:5px}
  .slider-val{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;
    text-align:center;margin-bottom:6px;transition:color .2s}

  /* Sub-row for slider + type input */
  .prem-row{display:flex;gap:16px;align-items:flex-start}
  .prem-slider-wrap{flex:1;padding-top:4px}
  .prem-input-wrap{width:90px;flex-shrink:0}
  .prem-input{width:100%;font-family:var(--font);font-size:.95rem;font-weight:800;
    padding:10px 10px;border:2px solid var(--black-10);border-radius:10px;
    background:var(--bg);color:var(--black);outline:none;text-align:center;
    transition:border-color .15s}
  .prem-input:focus{border-color:var(--primary)}

  /* Escrow callout */
  .callout{border-radius:12px;padding:12px 14px;
    display:flex;gap:10px;align-items:flex-start;font-size:.78rem;
    font-weight:600;line-height:1.55}
  .callout-orange{background:var(--primary-mild);border:1px solid var(--primary-mild2);
    color:var(--primary-dark)}
  .callout-info{background:var(--black-5);border:1px solid var(--black-10);
    color:var(--black-65)}

  /* Instant match row */
  .check-row{display:flex;align-items:center;gap:10px;cursor:pointer;
    padding:8px 0;user-select:none}
  .check-box{width:20px;height:20px;border-radius:5px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    font-size:.68rem;font-weight:800;color:var(--primary-dark);transition:all .12s}

  /* Nav */
  .oc-nav{display:flex;justify-content:space-between;align-items:center;
    padding-top:24px;margin-top:24px;border-top:1px solid var(--black-5)}
  .btn-back-nav{padding:10px 22px;border-radius:999px;border:1.5px solid var(--black-10);
    background:transparent;color:var(--black-65);font-family:var(--font);
    font-size:.88rem;font-weight:700;cursor:pointer;transition:all .12s}
  .btn-back-nav:hover{border-color:var(--black-25);color:var(--black)}
  .btn-next{padding:10px 28px;border-radius:999px;background:var(--grad);color:white;
    font-family:var(--font);font-size:.88rem;font-weight:800;border:none;
    cursor:pointer;box-shadow:0 2px 12px rgba(245,101,34,.3);
    transition:all .12s;letter-spacing:.01em}
  .btn-next:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 18px rgba(245,101,34,.42)}
  .btn-next:disabled{background:var(--black-10);color:var(--black-25);
    box-shadow:none;cursor:not-allowed;transform:none}
  .btn-publish-buy{background:linear-gradient(90deg,#4F910C,#65A519);
    box-shadow:0 2px 12px rgba(101,165,25,.3)}
  .btn-publish-sell{background:linear-gradient(90deg,#B01807,#DF321F);
    box-shadow:0 2px 12px rgba(223,50,31,.3)}

  /* Review */
  .review-card{background:var(--surface);border:1px solid var(--black-10);
    border-radius:14px;padding:16px 20px;max-width:480px;margin-left:auto;margin-right:auto}
  .review-row{display:flex;justify-content:space-between;align-items:center;
    padding:10px 0;border-bottom:1px solid var(--black-5)}
  .review-row:last-child{border-bottom:none}
  .rk{font-size:.78rem;font-weight:600;color:var(--black-65)}
  .rv{font-size:.86rem;font-weight:800;color:var(--black);text-align:right;max-width:60%}

  /* Escrow */
  .escrow-addr{font-family:monospace;font-size:.76rem;background:var(--black-5);
    border:1px solid var(--black-10);border-radius:10px;padding:11px 13px;
    word-break:break-all;color:var(--black-75);line-height:1.6;
    cursor:pointer;transition:background .12s;user-select:all}
  .escrow-addr:hover{background:var(--primary-mild)}
  .escrow-amt{font-size:1.9rem;font-weight:800;letter-spacing:-.03em;
    background:var(--grad);-webkit-background-clip:text;
    -webkit-text-fill-color:transparent;background-clip:text}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes dots{0%{content:''}33%{content:'.'}66%{content:'..'}100%{content:'...'}}
  .wait-dot::after{content:'';animation:dots 1.4s infinite}

  /* Preview panel */
  .preview-panel{background:var(--black-5);padding:28px 22px;
    display:flex;flex-direction:column;gap:16px;
    position:sticky;top:var(--topbar);height:calc(100vh - var(--topbar));overflow-y:auto}
  .preview-label{font-size:.64rem;font-weight:700;text-transform:uppercase;
    letter-spacing:.1em;color:var(--black-65);margin-bottom:4px}
  .prev-card{background:var(--surface);border-radius:14px;
    border:1px solid var(--black-10);padding:14px 16px;
    box-shadow:0 2px 12px rgba(43,25,17,.06)}
  .prev-card.buy-top{border-top:3px solid var(--success)}
  .prev-card.sell-top{border-top:3px solid var(--error)}
  .prev-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
  .prev-avatar{width:32px;height:32px;border-radius:50%;background:var(--grad);
    display:flex;align-items:center;justify-content:center;font-size:.68rem;
    font-weight:800;color:white;position:relative;flex-shrink:0}
  .prev-dot{position:absolute;bottom:0;right:0;width:8px;height:8px;
    border-radius:50%;background:var(--success);border:2px solid var(--surface)}
  .pt{padding:2px 7px;border-radius:999px;font-size:.63rem;font-weight:700;
    border:1.5px solid currentColor}
  .pt-m{color:var(--black-65);border-color:var(--black-10);background:var(--black-5)}
  .pt-c{background:var(--primary-mild);color:var(--primary-dark);
    border-color:transparent;border-radius:4px;letter-spacing:.04em}
  .pt-g{color:var(--success);border-color:var(--success-mild);background:var(--success-bg)}
  .pt-r{color:var(--error);border-color:#FFD1CA;background:var(--error-bg)}
  .pt-n{color:var(--black-65);border-color:var(--black-10);background:var(--black-5)}
  .info-box{background:var(--surface);border-radius:12px;
    border:1px solid var(--black-10);padding:11px 13px}
  .ir{display:flex;justify-content:space-between;padding:6px 0;
    border-bottom:1px solid var(--black-5)}
  .ir:last-child{border-bottom:none}
  .ik{font-size:.7rem;font-weight:600;color:var(--black-65)}
  .iv{font-size:.76rem;font-weight:800;color:var(--black)}
  .placeholder{display:flex;flex-direction:column;align-items:center;gap:8px;
    padding:24px 16px;text-align:center;border:2px dashed var(--black-10);
    border-radius:14px;color:var(--black-25)}

  /* Success */
  @keyframes stepFwd{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  @keyframes successPop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
  .success-icon{width:76px;height:76px;border-radius:50%;background:var(--success);
    display:flex;align-items:center;justify-content:center;font-size:2rem;
    color:white;box-shadow:0 8px 32px rgba(101,165,25,.3);
    animation:successPop .5s cubic-bezier(.175,.885,.32,1.275) both}
  .step-anim{animation:stepFwd .22s ease both}

  /* Divider */
  .divider{height:1px;background:var(--black-5);margin:16px 0}

  /* ── Multi-offer control ── */
  .multi-counter{display:flex;align-items:center;gap:0}
  .multi-counter-btn{
    width:30px;height:30px;border-radius:50%;border:1.5px solid var(--black-10);
    background:var(--surface);color:var(--black-65);font-family:var(--font);
    font-size:1rem;font-weight:800;cursor:pointer;display:flex;
    align-items:center;justify-content:center;transition:all .12s;
  }
  .multi-counter-btn:hover:not(:disabled){border-color:var(--primary);color:var(--primary-dark);background:var(--primary-mild)}
  .multi-counter-btn:disabled{opacity:.3;cursor:not-allowed}
  .multi-counter-val{
    min-width:40px;text-align:center;font-size:1rem;font-weight:800;color:var(--black);
  }

  /* ── Multi-escrow funding screen ── */
  .multi-escrow-qr{display:flex;flex-direction:column;align-items:center;margin-bottom:20px}
  .multi-escrow-qr-label{font-size:.72rem;font-weight:700;color:var(--black-65);margin-top:8px}

  .multi-escrow-list{display:flex;flex-direction:column;gap:6px;margin-bottom:20px}
  .multi-escrow-row{
    display:flex;align-items:center;gap:8px;padding:10px 14px;
    border-radius:12px;border:2px solid var(--black-10);background:var(--surface);
    cursor:pointer;transition:all .12s;font-family:var(--font);
  }
  .multi-escrow-row:hover{border-color:var(--primary)}
  .multi-escrow-row.selected{border-color:var(--primary);background:var(--primary-mild)}
  .multi-escrow-row.funded{opacity:.65;border-color:var(--success);background:#E8F5E9}

  .multi-escrow-radio{
    width:16px;height:16px;border-radius:50%;border:2px solid var(--black-10);
    flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .12s;
  }
  .multi-escrow-row.selected .multi-escrow-radio{border-color:var(--primary)}
  .multi-escrow-row.selected .multi-escrow-radio::after{
    content:'';width:8px;height:8px;border-radius:50%;background:var(--primary);
  }
  .multi-escrow-row.funded .multi-escrow-radio{border-color:var(--success)}
  .multi-escrow-row.funded .multi-escrow-radio::after{
    content:'✓';font-size:.55rem;font-weight:800;color:var(--success);
  }

  .multi-escrow-id{
    font-size:.72rem;font-weight:800;color:var(--black-65);flex-shrink:0;
  }
  .multi-escrow-addr{
    font-family:monospace;font-size:.68rem;color:var(--black-75);
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;
  }

  .multi-escrow-status{
    font-size:.65rem;font-weight:800;padding:2px 8px;border-radius:999px;
    flex-shrink:0;text-transform:uppercase;letter-spacing:.04em;
  }
  .multi-escrow-status.waiting{background:var(--black-5);color:var(--black-65)}
  .multi-escrow-status.mempool{background:#E8F5E9;color:var(--success)}
  .multi-escrow-status.funded{background:var(--success);color:white}
  .multi-escrow-status.error{background:var(--error-bg);color:var(--error)}

  .multi-escrow-actions{display:flex;gap:4px;flex-shrink:0;margin-left:auto}
  .multi-escrow-copy-btn{
    padding:4px 10px;border-radius:6px;border:1.5px solid var(--black-10);
    background:transparent;color:var(--black-65);font-family:var(--font);
    font-size:.65rem;font-weight:700;cursor:pointer;transition:all .12s;white-space:nowrap;
  }
  .multi-escrow-copy-btn:hover{border-color:var(--primary);color:var(--primary-dark);background:var(--primary-mild)}

  .btn-send-mobile{
    padding:12px 32px;border-radius:999px;background:var(--grad);
    color:white;font-family:var(--font);font-size:.88rem;font-weight:800;
    border:none;cursor:pointer;box-shadow:0 2px 12px rgba(245,101,34,.3);
    transition:all .12s;
  }
  .btn-send-mobile:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 18px rgba(245,101,34,.42)}
  .btn-send-mobile:disabled{background:var(--black-10);color:var(--black-25);box-shadow:none;cursor:not-allowed}
  .btn-send-mobile.sent{background:var(--success)}

  /* Publishing progress bar */
  .multi-publish-progress{margin-bottom:16px}
  .multi-publish-bar{height:6px;border-radius:3px;background:var(--black-10);overflow:hidden}
  .multi-publish-fill{height:100%;border-radius:3px;background:var(--grad);transition:width .3s}
  .multi-publish-text{font-size:.72rem;font-weight:700;color:var(--black-65);margin-top:4px;text-align:center}

  /* Retry button for partial failures */
  .btn-retry{padding:8px 20px;border-radius:999px;border:1.5px solid var(--error);background:var(--error-bg);color:var(--error);font-family:var(--font);font-size:.82rem;font-weight:700;cursor:pointer;transition:all .12s}
  .btn-retry:hover{background:var(--error);color:white}

  @media(max-width:900px){
    .layout{grid-template-columns:1fr}
    .preview-panel{display:none}
    .wizard{padding:20px 16px}
  }
  @media(max-width:767px){
    .sidenav{
      width:220px;left:0;
      transform:translateX(-100%);
      transition:transform .25s cubic-bezier(.4,0,.2,1);
      z-index:500;
      align-items:flex-start;
      box-shadow:none;
    }
    .sidenav.sidenav-mobile-open{
      transform:translateX(0);
      box-shadow:6px 0 28px rgba(43,25,17,.16);
    }
    .sidenav-item{
      width:calc(100% - 16px);flex-direction:row;justify-content:flex-start;
      gap:12px;padding:10px 14px;
    }
    .sidenav-label{
      opacity:1!important;max-height:none!important;
      font-size:.8rem;text-transform:none;font-weight:600;letter-spacing:0;
    }
    .burger-btn{display:flex}
    .topbar-price{display:none}
    .price-pill{display:none}
    .sidenav-price-slot{display:block}
    .layout{margin-left:0!important}
  }
`;
