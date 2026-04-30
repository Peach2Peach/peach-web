// ─── PAYMENT METHODS — CSS ───────────────────────────────────────────────────
// Extracted from peach-payment-methods.jsx.
// ─────────────────────────────────────────────────────────────────────────────

export const CSS = `
  /* Page layout */
  .page-wrap{margin-top:var(--topbar);margin-left:68px;padding:32px 28px;min-height:calc(100vh - 56px)}
  @media(max-width:767px){.page-wrap{margin-left:0;padding:20px 16px;overflow-x:hidden}}

  .page-header{display:flex;align-items:flex-start;gap:16px;margin-bottom:28px;flex-wrap:wrap}
  .page-title{font-size:1.5rem;font-weight:800;letter-spacing:-.02em}
  .page-subtitle{font-size:.85rem;color:var(--black-65);margin-top:2px}
  .header-right{margin-left:auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap}

  .btn-cta{background:var(--grad);color:white;border:none;border-radius:999px;
    font-family:var(--font);font-size:.85rem;font-weight:800;
    padding:8px 20px;cursor:pointer;white-space:nowrap;
    transition:transform .15s}
  .btn-cta:hover{transform:translateY(-1px)}

  /* ── Empty state ── */
  .pm-empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:60px 20px;gap:12px}
  .pm-empty-icon{font-size:3rem;opacity:.35}
  .pm-empty-title{font-size:1.1rem;font-weight:800;color:var(--black)}
  .pm-empty-desc{font-size:.82rem;color:var(--black-65);line-height:1.6;max-width:380px}

  /* ── Saved methods list ── */
  .pm-list{display:flex;flex-direction:column;gap:24px;max-width:680px}
  .pm-group{}
  .pm-group-header{display:flex;align-items:center;gap:8px;margin-bottom:10px}
  .pm-group-label{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--black-65)}
  .pm-group-count{background:var(--black-10);color:var(--black-65);font-size:.62rem;font-weight:800;
    padding:1px 7px;border-radius:999px}

  .pm-card{display:flex;align-items:center;gap:14px;background:var(--surface);
    border:1.5px solid var(--black-10);border-radius:14px;padding:14px 16px;
    transition:border-color .15s,box-shadow .15s}
  .pm-card:hover{border-color:var(--primary);box-shadow:0 2px 12px rgba(245,101,34,.08)}
  .pm-card.pm-card-error{background:var(--error-bg);border-color:var(--error);
    color:var(--error);font-weight:700;font-size:.88rem;text-align:center;
    justify-content:center;padding:18px 16px}
  .pm-card+.pm-card{margin-top:8px}
  .pm-card-logo{width:36px;height:36px;object-fit:contain;flex-shrink:0;border-radius:8px;
    background:var(--black-5);padding:4px}
  .pm-card-left{flex:1;min-width:0}
  .pm-card-name{font-size:.92rem;font-weight:700;color:var(--black);margin-bottom:2px}
  .pm-card-custom-name{font-size:.76rem;font-weight:600;color:var(--black-65);margin-bottom:4px}
  .pm-card-detail{font-size:.78rem;color:var(--black-65);font-family:monospace;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:6px}
  .pm-card-currencies{display:flex;gap:4px;flex-wrap:wrap}
  .pm-card-curr-tag{padding:1px 7px;border-radius:5px;font-size:.62rem;font-weight:800;
    background:var(--primary-mild);color:var(--primary-dark)}

  .pm-card-actions{display:flex;gap:6px;flex-shrink:0}
  .pm-action-btn{width:32px;height:32px;border-radius:8px;border:1.5px solid var(--black-10);
    background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;
    color:var(--black-65);transition:all .15s}
  .pm-action-btn:hover{border-color:var(--primary);color:var(--primary);background:var(--primary-mild)}
  .pm-action-delete:hover{border-color:var(--error);color:var(--error);background:var(--error-bg)}

  /* ── Info box ── */
  .pm-info-box{display:flex;gap:10px;align-items:flex-start;background:var(--surface);
    border:1px solid var(--black-10);border-radius:12px;padding:14px 16px;
    margin-top:28px;max-width:680px}

  /* ── Modal ── */
  .modal-overlay{position:fixed;inset:0;z-index:500;background:rgba(43,25,17,.45);
    display:flex;align-items:center;justify-content:center;padding:20px;
    animation:fadeIn .2s ease}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .modal-card{background:var(--surface);border-radius:20px;width:100%;max-width:480px;
    max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(43,25,17,.2);
    animation:slideUp .25s ease}
  @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
  .modal-header{display:flex;align-items:center;justify-content:space-between;
    padding:18px 22px 0}
  .modal-title{font-size:1.05rem;font-weight:800;color:var(--black)}
  .modal-close{min-width:30px;height:30px;border-radius:8px;border:none;background:var(--black-5);
    cursor:pointer;font-size:.95rem;color:var(--black-65);display:flex;align-items:center;
    justify-content:center;transition:background .14s;padding:0 8px;gap:0}
  .modal-close:hover{background:var(--black-10)}
  .modal-cancel-text{font-size:.78rem;font-weight:600;color:var(--black-65);margin-right:6px}
  .modal-back{width:30px;height:30px;border-radius:8px;border:none;background:var(--black-5);
    cursor:pointer;color:var(--black-65);display:flex;align-items:center;
    justify-content:center;transition:background .14s;flex-shrink:0}
  .modal-back:hover{background:var(--black-10)}
  .modal-body{padding:16px 22px 22px}

  /* ── Progress bar ── */
  .pm-progress{margin-bottom:8px}
  .pm-progress-track{height:4px;background:var(--black-10);border-radius:3px;overflow:hidden;margin-bottom:10px}
  .pm-progress-fill{height:100%;background:var(--grad);border-radius:3px;transition:width .3s ease}
  .pm-progress-labels{display:flex;justify-content:space-between}
  .pm-progress-label{display:flex;align-items:center;gap:4px;font-size:.62rem;font-weight:700;
    color:var(--black-25);text-transform:uppercase;letter-spacing:.03em;transition:color .2s}
  .pm-progress-label.active{color:var(--primary-dark)}
  .pm-progress-label.current{color:var(--primary)}
  .pm-step-num{width:16px;height:16px;border-radius:50%;background:var(--black-10);
    display:flex;align-items:center;justify-content:center;font-size:.56rem;font-weight:800;
    color:var(--black-65);transition:all .2s}
  .pm-progress-label.active .pm-step-num{background:var(--primary);color:white}
  .pm-progress-label.current .pm-step-num{background:var(--primary);color:white;
    box-shadow:0 0 0 3px rgba(245,101,34,.2)}
  .pm-step-text{display:none}
  @media(min-width:420px){.pm-step-text{display:inline}}

  /* ── Step 0: Currency grid ── */
  .region-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px;margin-top:4px}
  .region-tab{background:none;border:1.5px solid var(--black-10);border-radius:999px;
    padding:4px 12px;font-family:var(--font);font-size:.72rem;font-weight:700;
    color:var(--black-65);cursor:pointer;transition:all .15s;white-space:nowrap}
  .region-tab:hover{border-color:var(--primary);color:var(--primary-dark)}
  .region-tab.active{background:var(--primary-mild);border-color:var(--primary);color:var(--primary-dark)}

  .pm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:8px;margin-top:8px}
  .pm-option-card{border:1.5px solid var(--black-10);border-radius:10px;padding:12px 8px;
    background:var(--surface);cursor:pointer;text-align:center;font-family:var(--font);
    transition:all .15s}
  .pm-option-card:hover{border-color:var(--primary);background:var(--primary-mild)}
  .pm-option-card.selected{border-color:var(--primary);background:var(--primary-mild);
    box-shadow:0 0 0 2px rgba(245,101,34,.15)}
  .pm-option-name{font-size:.88rem;font-weight:800;color:var(--black)}

  /* ── Step 1: Category list / Step 2: Method list ── */
  .pm-cat-list{display:flex;flex-direction:column;gap:8px;margin-top:8px}
  .pm-cat-card{display:flex;align-items:center;gap:14px;border:1.5px solid var(--black-10);
    border-radius:12px;padding:14px 16px;background:var(--surface);cursor:pointer;
    font-family:var(--font);transition:all .15s;text-align:left;width:100%}
  .pm-cat-card:hover{border-color:var(--primary);background:var(--error-bg)}
  .pm-cat-card.selected{border-color:var(--primary);background:var(--primary-mild)}
  .pm-cat-icon{width:40px;height:40px;border-radius:10px;background:var(--primary-mild);
    display:flex;align-items:center;justify-content:center;color:var(--primary-dark);flex-shrink:0}
  .pm-cat-text{flex:1;min-width:0}
  .pm-cat-label{display:block;font-size:.88rem;font-weight:700;color:var(--black)}
  .pm-cat-desc{display:block;font-size:.72rem;font-weight:500;color:var(--black-65);margin-top:1px}
  .pm-cat-arrow{font-size:1rem;color:var(--black-25);flex-shrink:0;transition:color .15s}
  .pm-cat-card:hover .pm-cat-arrow{color:var(--primary)}

  .pm-empty-msg{text-align:center;padding:24px;font-size:.85rem;color:var(--black-65)}

  /* ── Step 3: Details ── */
  .pm-detail-header{display:flex;align-items:center;gap:8px;margin-bottom:16px}
  .pm-detail-tag{background:var(--primary-mild);color:var(--primary-dark);font-size:.78rem;
    font-weight:700;padding:3px 12px;border-radius:999px}
  .pm-detail-curr{background:var(--black-5);color:var(--black-65);font-size:.72rem;
    font-weight:700;padding:3px 10px;border-radius:999px}

  .field-label{display:block;font-size:.7rem;font-weight:700;text-transform:uppercase;
    letter-spacing:.04em;color:var(--black-65);margin-bottom:6px}
  .modal-input{width:100%;border:1.5px solid var(--black-10);border-radius:10px;padding:10px 14px;
    font-family:var(--font);font-size:.88rem;font-weight:500;color:var(--black);
    background:var(--surface);transition:border-color .15s;outline:none}
  .modal-input:focus{border-color:var(--primary)}
  .modal-input::placeholder{color:var(--black-25)}

  .curr-check-grid{display:flex;gap:6px;flex-wrap:wrap}
  .curr-check-btn{border:1.5px solid var(--black-10);border-radius:8px;padding:6px 14px;
    font-family:var(--font);font-size:.78rem;font-weight:700;color:var(--black-65);
    background:var(--surface);cursor:pointer;transition:all .15s}
  .curr-check-btn:hover{border-color:var(--primary);color:var(--primary-dark)}
  .curr-check-btn.on{border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark)}

  .pm-summary-box{background:var(--black-5);border-radius:12px;padding:12px 14px;margin-top:10px;margin-bottom:16px}
  .pm-summary-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0}
  .pm-summary-row+.pm-summary-row{border-top:1px solid var(--black-10)}
  .pm-summary-label{font-size:.72rem;font-weight:600;color:var(--black-65)}
  .pm-summary-value{font-size:.78rem;font-weight:700;color:var(--black);text-align:right;
    max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  .btn-save-pm{width:100%;background:var(--grad);color:white;border:none;border-radius:12px;
    font-family:var(--font);font-size:.92rem;font-weight:800;padding:12px;cursor:pointer;
    transition:transform .15s,opacity .15s}
  .btn-save-pm:hover{transform:translateY(-1px)}
  .btn-save-pm:disabled{opacity:.4;cursor:not-allowed;transform:none}

  /* ── Delete modal ── */
  .btn-cancel{flex:1;background:var(--black-5);color:var(--black-75);border:none;border-radius:10px;
    font-family:var(--font);font-size:.85rem;font-weight:700;padding:10px;cursor:pointer;
    transition:background .14s}
  .btn-cancel:hover{background:var(--black-10)}
  .btn-delete{flex:1;background:var(--error);color:white;border:none;border-radius:10px;
    font-family:var(--font);font-size:.85rem;font-weight:700;padding:10px;cursor:pointer;
    transition:background .14s}
  .btn-delete:hover{background:var(--error)}

  /* Animations */
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}

  /* ── Payment reference ── */
  .payref-row{display:flex;gap:8px;align-items:center}
  .payref-input{flex:1}
  .payref-type-btn{display:flex;align-items:center;gap:5px;background:var(--black-5);
    border:1.5px solid var(--black-10);border-radius:8px;padding:8px 12px;
    font-family:var(--font);font-size:.75rem;font-weight:700;color:var(--primary-dark);
    cursor:pointer;white-space:nowrap;flex-shrink:0;transition:border-color .15s}
  .payref-type-btn:hover{border-color:var(--primary)}

  .payref-picker-overlay{position:fixed;inset:0;z-index:600;background:rgba(43,25,17,.3);
    display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .15s ease}
  .payref-picker{background:var(--surface);border-radius:20px 20px 0 0;width:100%;max-width:480px;
    padding-bottom:env(safe-area-inset-bottom,12px);animation:slideUp .25s ease}
  .payref-picker-header{display:flex;align-items:center;justify-content:space-between;
    padding:18px 22px 12px}
  .payref-picker-title{font-size:1.05rem;font-weight:800;color:var(--black)}
  .payref-option{display:flex;align-items:center;justify-content:space-between;width:100%;
    padding:14px 22px;border:none;background:none;cursor:pointer;font-family:var(--font);
    font-size:.88rem;font-weight:600;color:var(--black-75);transition:background .12s;text-align:left}
  .payref-option:hover{background:var(--black-5)}
  .payref-option.selected{color:var(--primary)}
  .payref-option-label{flex:1}
  .payref-radio{width:22px;height:22px;border-radius:50%;border:2px solid var(--black-10);
    display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:border-color .15s}
  .payref-radio.on{border-color:var(--primary)}
  .payref-radio-dot{width:12px;height:12px;border-radius:50%;background:var(--primary)}
`;
