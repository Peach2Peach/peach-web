// ─── MARKET VIEW STYLES ──────────────────────────────────────────────────────
// Extracted from peach-market-view.jsx — screen-specific CSS rules.
// ─────────────────────────────────────────────────────────────────────────────

export const CSS = `
  /* ── SUBHEADER ── */
  .subheader{display:flex;align-items:center;gap:10px;flex-wrap:wrap;
    padding:12px 24px;background:var(--surface);border-bottom:1px solid var(--black-10);
    position:sticky;top:var(--topbar);z-index:100}

  /* ── TABS ── */
  .tabs{display:flex;gap:2px;background:var(--black-5);padding:3px;border-radius:10px}
  .tab{padding:6px 20px;border-radius:7px;font-size:.85rem;font-weight:700;cursor:pointer;
    border:none;background:transparent;color:var(--black-65);transition:all .14s;
    letter-spacing:.02em;font-family:var(--font)}
  .tab.active-buy{background:var(--surface);color:var(--success);box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .tab.active-sell{background:var(--surface);color:var(--error);box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .tab:hover:not(.active-buy):not(.active-sell){background:var(--black-10);color:var(--black)}

  /* ── STAT PILLS ── */
  .stat-pill{display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:999px;
    font-size:.76rem;font-weight:600;background:var(--black-5);color:var(--black-65);
    white-space:nowrap}
  .stat-pill strong{color:var(--black)}
  .stat-sep{color:var(--black-25);margin:0 2px}

  /* ── MULTI-SELECT DROPDOWN ── */
  .ms-wrap{position:relative}
  .ms-trigger{
    display:flex;align-items:center;gap:6px;
    border:1.5px solid var(--black-10);border-radius:8px;
    padding:5px 10px;font-family:var(--font);font-size:.8rem;font-weight:600;
    color:var(--black);background:var(--surface);cursor:pointer;
    transition:border-color .14s;white-space:nowrap;user-select:none;min-width:110px
  }
  .ms-trigger:hover,.ms-trigger.open{border-color:var(--primary)}
  .ms-trigger-label{flex:1}
  .ms-count{background:var(--primary);color:white;font-size:.62rem;font-weight:800;
    padding:1px 5px;border-radius:999px;line-height:1.4}
  .ms-arrow{font-size:.6rem;color:var(--black-65);transition:transform .14s}
  .ms-arrow.open{transform:rotate(180deg)}
  .ms-panel{
    position:absolute;top:calc(100% + 4px);left:0;z-index:300;
    background:var(--surface);border:1.5px solid var(--black-10);border-radius:10px;
    box-shadow:0 4px 20px rgba(43,25,17,.12);min-width:160px;
    max-height:min(60vh,360px);overflow-y:auto;overscroll-behavior:contain;
    animation:dropIn .12s ease
  }
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes dropIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
  .ms-option{
    display:flex;align-items:center;gap:9px;padding:8px 12px;
    font-size:.82rem;font-weight:600;cursor:pointer;
    transition:background .1s;color:var(--black)
  }
  .ms-option:hover{background:var(--black-5)}
  .ms-option.selected{color:var(--primary-dark)}
  .ms-option-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ms-option-count{font-size:.74rem;font-weight:600;color:var(--black-65);
    font-variant-numeric:tabular-nums;flex-shrink:0}
  .ms-checkbox{
    width:15px;height:15px;border-radius:4px;flex-shrink:0;
    border:1.5px solid var(--black-25);background:var(--surface);
    display:flex;align-items:center;justify-content:center;
    font-size:.65rem;font-weight:800;color:var(--primary-dark);
    transition:all .1s
  }
  .ms-checkbox.checked{background:var(--primary-mild);border-color:var(--primary)}
  .ms-clear{
    display:flex;align-items:center;justify-content:center;
    padding:6px 12px;font-size:.73rem;font-weight:700;color:var(--black-65);
    cursor:pointer;border-top:1px solid var(--black-5);
    transition:color .1s
  }
  .ms-clear:hover{color:var(--error)}
  .ms-search-wrap{
    position:sticky;top:0;z-index:1;background:var(--surface);
    padding:8px 8px 6px;border-bottom:1px solid var(--black-5)
  }
  .ms-search{
    width:100%;box-sizing:border-box;
    border:1.5px solid var(--black-10);border-radius:7px;
    padding:5px 10px;font-family:var(--font);font-size:.78rem;font-weight:600;
    color:var(--black);background:var(--surface);outline:none;
    transition:border-color .14s
  }
  .ms-search:focus{border-color:var(--primary)}
  .ms-search::placeholder{color:var(--black-25);font-weight:500}
  .ms-empty{
    padding:10px 12px;font-size:.78rem;font-weight:600;
    color:var(--black-25);text-align:center
  }

  /* ── CTA ── */
  .cta-btn{margin-left:auto;padding:7px 20px;border-radius:999px;background:var(--grad);
    color:white;font-family:var(--font);font-size:.85rem;font-weight:800;border:none;
    cursor:pointer;letter-spacing:.02em;
    transition:transform .1s;white-space:nowrap}
  .cta-btn:hover{transform:translateY(-1px)}

  /* ── TABLE ── */
  .table-wrap{padding:12px 20px 110px;flex:1;overflow-x:auto}
  .offer-table{width:100%;border-collapse:separate;border-spacing:0 5px;min-width:720px}
  .offer-table thead tr{border-bottom:none}
  .offer-table th{text-align:left;padding:4px 12px 8px;font-size:.67rem;font-weight:700;
    text-transform:uppercase;letter-spacing:.09em;color:var(--black-65);
    white-space:nowrap;cursor:pointer;user-select:none}
  .offer-table th:hover{color:var(--primary)}
  .th-sort{display:inline-flex;align-items:center;gap:4px}
  .sort-arrow{font-size:.58rem;opacity:.45}
  .sort-arrow.active{opacity:1;color:var(--primary)}
  .offer-table tbody tr{transition:box-shadow .1s}
  .offer-table tbody tr:hover td{background:var(--black-5)}
  .offer-table tbody tr:hover{box-shadow:0 2px 12px rgba(43,25,17,.09)}
  .offer-table td{
    padding:12px 12px;vertical-align:middle;font-size:.875rem;
    background:var(--surface);
    border-top:1px solid var(--black-10);border-bottom:1px solid var(--black-10);
  }
  .offer-table td:first-child{border-left:1px solid var(--black-10);border-radius:10px 0 0 10px}
  .offer-table td:last-child{border-right:1px solid var(--black-10);border-radius:0 10px 10px 0}

  /* ── REP ── */
  .rep-cell{display:flex;flex-direction:column;gap:2px}
  .rep-info{display:flex;flex-direction:column;gap:2px}
  .rep-row{display:flex;align-items:center;gap:4px}
  .rep-stars{font-size:.78rem;font-weight:700;color:var(--black);display:flex;align-items:center;gap:2px}
  .rep-stars .star{color:var(--btc)}
  .rep-trades{font-size:.67rem;color:var(--black-65);font-weight:500}
  .badges-row{display:flex;gap:3px;flex-wrap:wrap}
  .badge{display:inline-flex;align-items:center;padding:1px 6px;border-radius:999px;
    font-size:.62rem;font-weight:700;white-space:nowrap}
  .badge-super{background:var(--grad);color:white}
  .badge-fast{background:var(--primary-mild);color:var(--primary-dark)}
  .badge-ambassador{background:var(--btc, #f7931a);color:white}

  /* ── AUTO BADGE ── */
  .auto-badge{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;
    border-radius:999px;background:var(--grad);color:white;font-size:.68rem;font-weight:800;
    white-space:nowrap;box-shadow:0 1px 6px rgba(245,101,34,.28)}
  .exp-badge{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;
    border-radius:999px;background:var(--primary-mild);color:var(--primary-dark);
    font-size:.68rem;font-weight:700;white-space:nowrap;border:1.5px solid var(--primary)}

  .offer-table tbody tr.own-row td{background:rgba(245,101,34,.05)}
  .offer-table tbody tr.own-row td:first-child{border-left:3px solid var(--primary)}
  .offer-table tbody tr.own-row:hover td{background:rgba(245,101,34,.09)}
  .own-label{font-size:.62rem;font-weight:800;color:var(--primary-dark);
    background:var(--primary-mild);border:1px solid rgba(245,101,34,.25);
    padding:1px 7px;border-radius:999px;white-space:nowrap;letter-spacing:.03em}
  .offer-id-label{font-size:.62rem;font-weight:600;color:var(--black-50);
    font-family:inherit;white-space:nowrap;letter-spacing:.02em;margin-bottom:-2px}
  .user-peach-id{font-size:.82rem;font-weight:800;color:var(--black-65);
    font-family:inherit;white-space:nowrap;letter-spacing:.04em;line-height:1.2}
  .my-offer-badge{display:inline-flex;align-items:center;justify-content:center;
    padding:6px 18px;border-radius:999px;background:var(--primary-mild);
    color:var(--primary-dark);font-size:.8rem;font-weight:800;letter-spacing:.02em;
    border:1.5px solid rgba(245,101,34,.25);white-space:nowrap;align-self:flex-start}
  .rep-cell-own{display:flex;flex-direction:column;gap:6px;align-items:flex-start}
  .offer-id-copy{display:inline-flex;align-items:baseline;gap:4px;cursor:pointer;
    font-size:.7rem;user-select:none;line-height:1.2;white-space:nowrap}
  .offer-id-copy-label{color:var(--black-65);font-weight:600}
  .offer-id-copy-value{color:var(--primary);font-weight:700;
    text-decoration:underline;text-underline-offset:2px;letter-spacing:.01em}
  .offer-id-copy:hover .offer-id-copy-value{color:var(--primary-dark)}
  .offer-id-copy-value.is-copied{color:var(--success);text-decoration:none}
  /* mobile own card */
  .offer-card.own-card{border-left:3px solid var(--primary);background:linear-gradient(135deg,rgba(245,101,34,.04),var(--surface))}
  .my-offers-check{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;
    border-radius:999px;background:var(--surface);border:1.5px solid var(--black-10);
    font-family:var(--font);font-size:.85rem;font-weight:700;color:var(--black);
    cursor:pointer;white-space:nowrap;transition:border-color .14s,color .14s;
    user-select:none;letter-spacing:.02em}
  .my-offers-check:hover{border-color:var(--primary);color:var(--primary-dark)}
  .my-offers-check input{position:absolute;opacity:0;pointer-events:none}
  .my-offers-check-box{width:16px;height:16px;border-radius:4px;border:2px solid var(--black-25);
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
    transition:background .14s,border-color .14s}
  .my-offers-check input:checked~.my-offers-check-box{background:var(--primary);border-color:var(--primary)}
  .my-offers-check input:checked~.my-offers-check-box::after{content:"✓";color:white;font-size:.7rem;font-weight:800}
  .my-offers-check-disabled{opacity:.45;cursor:not-allowed}
  .my-offers-check-disabled:hover{border-color:var(--black-10);color:var(--black)}
  .my-offers-wrap{position:relative;display:inline-flex;align-items:center;gap:4px}
  .info-dot{width:18px;height:18px;border-radius:50%;border:1.5px solid var(--black-25);
    display:inline-flex;align-items:center;justify-content:center;
    font-size:.7rem;font-weight:800;font-style:italic;color:var(--black-50);
    cursor:pointer;transition:border-color .14s,color .14s;flex-shrink:0;
    font-family:serif;user-select:none}
  .info-dot:hover{border-color:var(--primary);color:var(--primary-dark)}
  .info-popup{position:absolute;top:calc(100% + 8px);left:0;z-index:200;
    background:var(--surface);border:1px solid var(--black-10);border-radius:12px;
    box-shadow:0 4px 20px rgba(0,0,0,.12);padding:14px 16px;width:280px;
    font-size:.82rem;font-weight:500;color:var(--black);line-height:1.45}
  .info-popup strong{display:block;margin-bottom:6px;font-size:.85rem}
  .info-popup p{margin:0 0 6px}
  .info-popup ul{margin:0 0 6px;padding-left:18px}
  .info-popup li{margin-bottom:3px}

  /* ── AMOUNT ── */
  .amount-cell{display:flex;flex-direction:column;gap:4px}
  .amount-sats{font-size:1rem;font-weight:800;color:var(--black)}
  .amount-fiat{font-size:.78rem;font-weight:500;color:var(--black-65)}

  /* ── PRICE CELL ── */
  .price-cell{display:flex;flex-direction:column;gap:2px}
  .price-eur{font-size:.9rem;font-weight:700;color:var(--black)}
  .price-rate{font-size:.9rem;font-weight:700;color:var(--black);white-space:nowrap}

  /* ── INFO SENTENCE ── */
  .info-sentence{
    display:inline-block;
    font-size:.8rem;font-weight:500;color:var(--black-65);
    background:var(--primary-mild);border:1px solid rgba(245,101,34,.18);
    border-radius:8px;padding:7px 14px;
    margin:0 20px 4px;
  }
  .info-sentence.collapsible{
    display:flex;align-items:center;gap:8px;cursor:pointer;
  }
  .info-sentence.collapsible.collapsed{white-space:nowrap}
  .info-sentence.collapsible.collapsed .info-sentence-text{
    overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;display:block;
  }
  .info-sentence-chev{
    flex-shrink:0;font-size:.7rem;color:var(--primary);font-weight:800;
  }

  /* ── PREMIUM — colors depend on perspective ── */
  /* buy tab: negative = good (green), positive = bad (red) */
  .prem-good{color:var(--success);font-weight:700}
  .prem-bad {color:var(--error);  font-weight:700}
  .prem-zero{color:var(--black-65);font-weight:600}

  /* ── METHODS ── */
  .methods{display:flex;gap:4px;flex-wrap:wrap}
  .method-chip{padding:2px 7px;border-radius:999px;font-size:.69rem;font-weight:600;
    background:var(--black-5);color:var(--black-65);border:1px solid var(--black-10)}

  /* ── CURRENCIES ── */
  .currencies{display:grid;grid-template-columns:repeat(2,auto);gap:3px;justify-content:start}
  .currency-chip{padding:2px 7px;border-radius:4px;font-size:.69rem;font-weight:700;
    background:var(--primary-mild);color:var(--primary-dark);letter-spacing:.04em}

  /* ── ACTION ── */
  .action-cell{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
  .action-cell-badges{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
  .action-btn{padding:6px 18px;border-radius:999px;font-family:var(--font);font-size:.8rem;
    font-weight:800;border:none;cursor:pointer;letter-spacing:.02em;transition:all .12s;white-space:nowrap}
  .action-buy{background:var(--success-bg);color:var(--success)}
  .action-sell{background:var(--error-bg);color:var(--error)}
  .action-buy:hover{background:var(--success);color:white;transform:translateY(-1px)}
  .action-sell:hover{background:var(--error);color:white;transform:translateY(-1px)}
  .edit-btn{background:var(--primary-mild);color:var(--primary-dark)}
  .edit-btn:hover{background:var(--primary);color:white;transform:translateY(-1px)}

  /* ── EMPTY ── */
  .empty{text-align:center;padding:60px 20px;color:var(--black-65)}
  .empty-icon{font-size:2.2rem;margin-bottom:12px}
  .empty-title{font-size:1rem;font-weight:700;margin-bottom:6px;color:var(--black)}
  .empty-sub{font-size:.85rem}

  /* ── MOBILE CARDS ── */
  .cards{display:none;flex-direction:column;gap:10px;padding:14px 14px 110px}
  .offer-card{background:var(--surface);border-radius:14px;border:1px solid var(--black-10);
    padding:14px 16px;display:flex;flex-direction:column;gap:10px}
  .card-top{display:flex;align-items:flex-start;gap:10px}
  .offer-card .action-cell{margin-top:2px}
  .offer-card .amount-cell{align-items:flex-end}
  .offer-card .amount-sats{font-size:1.15rem}
  .offer-card .amount-fiat{font-size:.82rem}

  /* ── SEARCH ── */
  .search-inp{width:180px;border:1.5px solid var(--black-10);border-radius:8px;padding:5px 12px;font-family:var(--font);font-size:.8rem;font-weight:600;color:var(--black);background:var(--surface);outline:none;transition:border-color .14s}
  .search-inp:focus{border-color:var(--primary)}
  .search-inp::placeholder{color:var(--black-25);font-weight:500}
  .search-inp.search-inp-full{width:100%;box-sizing:border-box}

  /* ── REFRESH BUTTON ── */
  .refresh-btn{
    display:inline-flex;align-items:center;justify-content:center;
    width:34px;height:34px;border-radius:8px;border:1.5px solid var(--black-10);
    background:var(--surface);color:var(--black-65);
    font-family:var(--font);font-size:1rem;font-weight:700;cursor:pointer;
    transition:border-color .14s,color .14s;
  }
  .refresh-btn:hover{border-color:var(--primary);color:var(--primary-dark)}
  .refresh-btn:disabled{cursor:not-allowed}

  /* ── MOBILE FILTERS / SORT PILL BUTTONS ── */
  .filters-btn,.sort-btn{
    display:none;align-items:center;gap:6px;
    border:1.5px solid var(--black-10);border-radius:999px;
    background:var(--surface);color:var(--black);
    font-family:var(--font);font-size:.82rem;font-weight:700;
    padding:7px 14px;cursor:pointer;
    transition:border-color .14s,color .14s;white-space:nowrap;
  }
  .filters-btn:hover,.sort-btn:hover{border-color:var(--primary);color:var(--primary-dark)}
  .filters-btn-count{
    background:var(--primary);color:white;font-size:.62rem;font-weight:800;
    padding:1px 6px;border-radius:999px;line-height:1.4;
  }
  .filters-btn-arrow,.sort-btn-arrow{font-size:.6rem;color:var(--black-65)}

  /* ── BOTTOM SHEET ── */
  .sheet-backdrop{
    position:fixed;inset:0;background:rgba(43,25,17,.45);
    z-index:550;animation:fadeIn .15s ease;
  }
  .filter-sheet{
    position:fixed;left:0;right:0;bottom:0;z-index:551;
    background:var(--surface);
    border-top-left-radius:18px;border-top-right-radius:18px;
    height:75vh;display:flex;flex-direction:column;
    box-shadow:0 -8px 28px rgba(43,25,17,.18);
    animation:sheetUp .22s cubic-bezier(.34,1.2,.64,1);
  }
  .mobile-filter-row{display:flex;gap:8px;flex-basis:100%;flex-wrap:wrap}
  @keyframes sheetUp{from{transform:translateY(100%)}to{transform:none}}
  .sheet-handle{
    width:38px;height:4px;border-radius:999px;background:var(--black-10);
    margin:8px auto 4px;
  }
  .sheet-header{
    display:flex;align-items:center;justify-content:space-between;
    padding:6px 18px 10px;
    font-size:.95rem;font-weight:800;color:var(--black);
  }
  .sheet-close{
    width:30px;height:30px;border-radius:8px;border:none;background:var(--black-5);
    color:var(--black-65);cursor:pointer;font-family:var(--font);font-size:1rem;
    display:flex;align-items:center;justify-content:center;transition:background .12s;
  }
  .sheet-close:hover{background:var(--black-10);color:var(--black)}
  .sheet-body{
    flex:1;min-height:0;
    display:flex;flex-direction:column;gap:12px;
    padding:8px 18px 16px;overflow-y:auto;
  }
  .sheet-body .ms-wrap{width:100%}
  .sheet-body .ms-trigger{width:100%;min-width:0;padding:10px 14px;font-size:.88rem}
  .sheet-body .ms-panel{width:100%;left:0;right:0;max-height:50vh}
  .sheet-footer{
    display:flex;gap:10px;padding:12px 18px 18px;
    border-top:1px solid var(--black-10);
  }
  .sheet-clear{
    flex:1;padding:11px;border-radius:999px;
    background:var(--black-5);color:var(--black-65);border:none;
    font-family:var(--font);font-size:.85rem;font-weight:800;cursor:pointer;
    transition:background .12s,color .12s;
  }
  .sheet-clear:hover{background:var(--black-10);color:var(--black)}
  .sheet-done{
    flex:2;padding:11px;border-radius:999px;
    background:var(--grad);color:white;border:none;
    font-family:var(--font);font-size:.85rem;font-weight:800;cursor:pointer;
    transition:transform .1s;
  }
  .sheet-done:hover{transform:translateY(-1px)}

  /* ── SORT ROWS (inside sheet) ── */
  .sort-row{
    display:flex;align-items:center;justify-content:space-between;
    padding:14px 18px;border-radius:10px;
    background:var(--surface);border:1.5px solid var(--black-10);
    cursor:pointer;font-family:var(--font);font-size:.88rem;font-weight:600;
    color:var(--black);transition:border-color .12s,background .12s;
  }
  .sort-row:hover{border-color:var(--primary)}
  .sort-row.selected{
    border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark);font-weight:800;
  }
  .sort-row-check{color:var(--primary-dark);font-weight:800}

  /* ── PULL TO REFRESH ── */
  .ptr-host{position:relative;will-change:transform}
  .ptr-indicator{
    position:absolute;left:0;right:0;top:-46px;height:46px;
    display:flex;align-items:center;justify-content:center;
    pointer-events:none;
  }
  .ptr-spinner{
    width:24px;height:24px;border-radius:50%;
    border:2.5px solid var(--black-10);border-top-color:var(--primary);
  }
  .ptr-spinner.ptr-spin{animation:refresh-indicator-spin .8s linear infinite}

  /* ── CTA WRAP ── */
  .cta-wrap{display:flex;flex-direction:column;align-items:center;gap:3px;margin-left:auto}
  .how-to-start{font-size:.67rem;font-weight:600;color:var(--primary);cursor:pointer;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}
  .how-to-start:hover{color:var(--primary-dark)}

  /* ── REQUESTED ── */
  .requested-tag{font-size:.62rem;font-weight:800;color:var(--success);background:var(--success-bg);border:1px solid var(--success-mild);padding:1px 7px;border-radius:999px;white-space:nowrap;letter-spacing:.03em}
  .offer-table tbody tr.requested-row td{background:rgba(101,165,25,.06)}
  .offer-table tbody tr.requested-row td:first-child{border-left:3px solid var(--success)}
  .offer-table tbody tr.requested-row:hover td{background:rgba(101,165,25,.11)}
  .offer-card.requested-card{border-color:var(--success-mild);background:linear-gradient(135deg,rgba(101,165,25,.06),var(--surface))}

  /* ── MOBILE COLLAPSIBLE CONTROLS ── */
  .subheader-collapsible{display:contents}
  .subheader-collapsible.is-collapsed{display:none}
  .controls-toggle{margin-left:auto;background:transparent;border:none;padding:6px 4px;
    color:var(--primary);text-decoration:underline;text-underline-offset:2px;
    font-family:var(--font);font-weight:600;font-size:.85rem;
    display:none;align-items:center;gap:4px;cursor:pointer;white-space:nowrap}
  .controls-toggle:hover{color:var(--primary-dark)}
  .controls-toggle-chev{font-size:.7rem;transition:transform .15s ease}
  .controls-toggle-chev.open{transform:rotate(180deg)}

  @media(max-width:768px){
    .subheader{padding:10px 14px;gap:8px}
    .table-wrap{display:none}
    .cards{display:flex}
    .cta-btn{padding:6px 14px;font-size:.78rem}
    .stat-pill.hide-mobile{display:none}
    .filters-desktop{display:none}
    .filters-btn,.sort-btn{display:inline-flex}
    .refresh-btn{display:none}
    .controls-toggle{display:inline-flex}
  }
  @media(max-width:767px){
    .page-wrap{margin-left:0!important}
  }

  /* Offer detail popup styles live in src/styles/global.css now */

  /* Undo row/card flash */
  .offer-table tbody tr.undo-row td{
    animation:undoFlash 1.2s ease;
  }
  .offer-card.undo-card{
    animation:undoFlash 1.2s ease;
  }
  @keyframes undoFlash{
    0%{background:rgba(101,165,25,.15)}
    50%{background:rgba(101,165,25,.08)}
    100%{background:var(--surface)}
  }

  /* Newly published offers — temporary highlight after returning from offer creation */
  .offer-table tbody tr.new-offer-row td{
    animation:newOfferRowFlash 1.4s ease-in-out 0s 3;
  }
  .offer-table tbody tr.new-offer-row td:first-child{
    box-shadow:inset 3px 0 0 var(--success);
  }
  @keyframes newOfferRowFlash{
    0%,100%{background:rgba(111,207,142,.06)}
    50%    {background:rgba(111,207,142,.22)}
  }
  .offer-card.new-offer-card{
    outline:2px solid var(--success);
    outline-offset:2px;
    border-radius:12px;
    animation:newOfferCardPulse 1.4s ease-in-out 0s 3;
  }
  @keyframes newOfferCardPulse{
    0%,100%{box-shadow:0 0 0 0 rgba(111,207,142,0)}
    50%    {box-shadow:0 0 18px 4px rgba(111,207,142,.55)}
  }
`;
