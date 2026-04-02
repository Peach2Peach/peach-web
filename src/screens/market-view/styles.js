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
    box-shadow:0 4px 20px rgba(43,25,17,.12);min-width:160px;overflow:hidden;
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

  /* ── REPUTATION DROPDOWN (single select, native-style) ── */
  .filter-select{appearance:none;border:1.5px solid var(--black-10);border-radius:8px;
    padding:5px 28px 5px 10px;font-family:var(--font);font-size:.8rem;font-weight:600;
    color:var(--black);background:var(--surface);cursor:pointer;outline:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237D675E'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 9px center;
    transition:border-color .14s}
  .filter-select:focus{border-color:var(--primary)}

  /* ── CTA ── */
  .cta-btn{margin-left:auto;padding:7px 20px;border-radius:999px;background:var(--grad);
    color:white;font-family:var(--font);font-size:.85rem;font-weight:800;border:none;
    cursor:pointer;letter-spacing:.02em;box-shadow:0 2px 12px rgba(245,101,34,.3);
    transition:transform .1s,box-shadow .1s;white-space:nowrap}
  .cta-btn:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(245,101,34,.42)}

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
  .rep-avatar{width:27px;height:27px;border-radius:50%;flex-shrink:0;background:var(--grad);
    display:flex;align-items:center;justify-content:center;font-size:.56rem;font-weight:800;color:white;
    position:relative}
  .rep-avatar .online-dot{position:absolute;bottom:0px;right:0px;width:7px;height:7px;
    border-radius:50%;background:var(--success);border:2px solid var(--surface)}
  .rep-info{display:flex;flex-direction:column;gap:2px}
  .rep-row{display:flex;align-items:center;gap:4px}
  .rep-stars{font-size:.78rem;font-weight:700;color:var(--black);display:flex;align-items:center;gap:2px}
  .rep-stars .star{color:#F7931A}
  .rep-trades{font-size:.67rem;color:var(--black-65);font-weight:500}
  .badges-row{display:flex;gap:3px;flex-wrap:wrap}
  .badge{display:inline-flex;align-items:center;padding:1px 6px;border-radius:999px;
    font-size:.62rem;font-weight:700;white-space:nowrap}
  .badge-super{background:linear-gradient(90deg,#FF4D42,#FFA24C);color:white}
  .badge-fast{background:var(--primary-mild);color:var(--primary-dark)}

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
  .refresh-btn{padding:6px 10px;min-width:0;border-radius:999px;background:var(--surface);
    border:1.5px solid var(--black-10);font-size:1rem;cursor:pointer;
    transition:border-color .14s;line-height:1}
  .refresh-btn:hover{border-color:var(--primary)}

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
  .action-cell{display:flex;align-items:center;gap:8px;justify-content:flex-end}
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

  /* ── SIDENAV ── */
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
  /* Backdrop (mobile overlay) */
  .sidenav-backdrop{
    display:none;position:fixed;inset:0;z-index:149;
    background:rgba(43,25,17,.4);
    animation:fadeIn .2s ease;
  }
  .sidenav-backdrop.open{display:block}
  /* Burger (mobile topbar) */
  .burger-btn{
    display:none;align-items:center;justify-content:center;
    width:34px;height:34px;border-radius:8px;border:none;
    background:transparent;cursor:pointer;color:var(--black-65);
    flex-shrink:0;transition:background .14s;
  }
  .burger-btn:hover{background:var(--black-5)}

  /* ── SEARCH ── */
  .search-inp{width:180px;border:1.5px solid var(--black-10);border-radius:8px;padding:5px 12px;font-family:var(--font);font-size:.8rem;font-weight:600;color:var(--black);background:var(--surface);outline:none;transition:border-color .14s}
  .search-inp:focus{border-color:var(--primary)}
  .search-inp::placeholder{color:var(--black-25);font-weight:500}

  /* ── CTA WRAP ── */
  .cta-wrap{display:flex;flex-direction:column;align-items:center;gap:3px;margin-left:auto}
  .how-to-start{font-size:.67rem;font-weight:600;color:var(--primary);cursor:pointer;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}
  .how-to-start:hover{color:var(--primary-dark)}

  /* ── REQUESTED ── */
  .requested-tag{font-size:.62rem;font-weight:800;color:#2D8048;background:#E6F5EA;border:1px solid #B6DEC1;padding:1px 7px;border-radius:999px;white-space:nowrap;letter-spacing:.03em}
  .offer-table tbody tr.requested-row td{background:rgba(101,165,25,.06)}
  .offer-table tbody tr.requested-row td:first-child{border-left:3px solid #65A519}
  .offer-table tbody tr.requested-row:hover td{background:rgba(101,165,25,.11)}
  .offer-card.requested-card{border-color:#B6DEC1;background:linear-gradient(135deg,rgba(101,165,25,.06),var(--surface))}

  @media(max-width:768px){
    .subheader{padding:10px 14px;gap:8px}
    .table-wrap{display:none}
    .cards{display:flex}
    .topbar-price{display:none}          /* hidden from topbar on mobile — shown inside sidenav instead */
    .sidenav-price-slot{display:block}   /* visible inside sidenav on mobile only */
    .cta-btn{padding:6px 14px;font-size:.78rem}
    .stat-pill.hide-mobile{display:none}
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
    .page-wrap{margin-left:0!important}
  }

  /* ── POPUP OVERLAY ── */
  .popup-overlay{
    position:fixed;inset:0;z-index:600;
    background:rgba(43,25,17,.55);
    display:flex;align-items:center;justify-content:center;
    padding:20px;
    animation:fadeIn .15s ease;
  }
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .popup-card{
    background:var(--surface);border-radius:20px;
    max-width:420px;width:100%;
    box-shadow:0 20px 60px rgba(43,25,17,.3);
    animation:popupSlide .2s cubic-bezier(.34,1.56,.64,1);
    max-height:calc(100vh - 40px);overflow-y:auto;
  }
  @keyframes popupSlide{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
  .popup-anim-card{display:flex;align-items:center;justify-content:center;min-height:220px}
  .popup-header{
    display:flex;align-items:center;justify-content:space-between;
    padding:18px 22px 0;
  }
  .popup-title{font-weight:800;font-size:1rem;color:var(--black)}
  .popup-close{
    width:30px;height:30px;border-radius:8px;border:none;background:var(--black-5);
    font-size:.9rem;cursor:pointer;color:var(--black-65);
    display:flex;align-items:center;justify-content:center;
    font-family:var(--font);transition:all .12s;
  }
  .popup-close:hover{background:var(--black-10);color:var(--black)}
  .popup-body{padding:16px 22px 8px}
  .popup-peer-row{display:flex;align-items:center;gap:12px;margin-bottom:16px}

  /* Summary rows */
  .popup-summary{
    display:flex;flex-direction:column;gap:0;
    border:1px solid var(--black-10);border-radius:12px;overflow:hidden;
  }
  .popup-row{
    display:flex;align-items:center;justify-content:space-between;
    padding:10px 14px;
    border-bottom:1px solid var(--black-5);
  }
  .popup-row:last-child{border-bottom:none}
  .popup-label{font-size:.76rem;font-weight:600;color:var(--black-65);white-space:nowrap}
  .popup-value{font-size:.82rem;font-weight:700;color:var(--black)}

  /* PM selector */
  .popup-section-label{
    font-size:.72rem;font-weight:800;text-transform:uppercase;
    letter-spacing:.07em;color:var(--black-65);margin:18px 0 10px;
  }
  .popup-pm-list{display:flex;flex-direction:column;gap:6px}
  .popup-pm-option{
    display:flex;align-items:center;gap:10px;
    padding:10px 14px;border-radius:10px;
    border:2px solid var(--black-10);background:var(--surface);
    cursor:pointer;font-family:var(--font);text-align:left;
    transition:all .12s;
  }
  .popup-pm-option:hover{border-color:var(--primary);background:rgba(245,101,34,.02)}
  .popup-pm-option.selected{border-color:var(--primary);background:var(--primary-mild)}
  .popup-pm-radio{
    width:18px;height:18px;border-radius:50%;flex-shrink:0;
    border:2px solid var(--black-25);background:var(--surface);
    display:flex;align-items:center;justify-content:center;
    transition:all .12s;
  }
  .popup-pm-radio.checked{border-color:var(--primary)}
  .popup-pm-radio-dot{
    width:10px;height:10px;border-radius:50%;
    background:var(--primary);
    animation:radioPop .15s ease;
  }
  @keyframes radioPop{from{transform:scale(0)}to{transform:scale(1)}}

  /* PM warning */
  .popup-pm-warning{
    display:flex;align-items:flex-start;gap:10px;
    padding:14px;border-radius:10px;
    background:#FFF8E1;border:1px solid #FFE082;
  }
  .popup-pm-link{
    display:inline-block;margin-top:6px;
    font-family:var(--font);font-size:.76rem;font-weight:700;
    color:var(--primary);background:none;border:none;
    cursor:pointer;text-decoration:underline;text-underline-offset:2px;
    padding:0;
  }
  .popup-pm-link:hover{color:var(--primary-dark)}

  /* Currency pills */
  .popup-currency-pills{display:flex;gap:6px;flex-wrap:wrap}
  .popup-cur-pill{
    padding:6px 16px;border-radius:8px;
    border:2px solid var(--black-10);background:var(--surface);
    font-family:var(--font);font-size:.8rem;font-weight:800;
    color:var(--black-65);cursor:pointer;
    letter-spacing:.04em;transition:all .12s;
  }
  .popup-cur-pill:hover{border-color:var(--primary);color:var(--primary-dark)}
  .popup-cur-pill.selected{border-color:var(--primary);background:var(--primary-mild);color:var(--primary-dark)}

  /* Requested state */
  .popup-requested-state{
    margin-top:16px;padding:16px;border-radius:10px;
    background:var(--success-bg);text-align:center;
  }
  .popup-requested-badge{
    font-size:.88rem;font-weight:800;color:var(--success);
  }

  /* Footer */
  .popup-footer{
    padding:12px 22px 18px;
    display:flex;gap:8px;
  }
  .popup-btn{
    flex:1;padding:12px;border-radius:999px;border:none;
    font-family:var(--font);font-size:.88rem;font-weight:800;
    cursor:pointer;letter-spacing:.02em;transition:all .14s;
  }
  .popup-btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important}
  .popup-btn-request{
    background:var(--success-bg);color:var(--success);
  }
  .popup-btn-request:not(:disabled):hover{background:var(--success);color:white;transform:translateY(-1px)}
  .popup-btn-instant{
    background:var(--grad);color:white;
    box-shadow:0 2px 12px rgba(245,101,34,.3);
  }
  .popup-btn-instant:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(245,101,34,.42)}
  .popup-btn-undo{
    background:var(--black-5);color:var(--black-65);
  }
  .popup-btn-undo:hover{background:var(--black-10);color:var(--black)}
  .popup-btn-chat{
    background:var(--primary-mild);color:var(--primary-dark);
  }
  .popup-btn-chat:hover{background:var(--primary);color:white}
  .popup-btn-edit{
    background:var(--primary-mild);color:var(--primary-dark);
  }
  .popup-btn-edit:hover{background:var(--primary);color:white}
  .popup-btn-withdraw{
    background:var(--error-bg);color:var(--error);
  }
  .popup-btn-withdraw:hover{background:var(--error);color:white}

  /* Success animation */
  .popup-success-anim{text-align:center;padding:30px 20px}
  .popup-success-circle{
    width:64px;height:64px;border-radius:50%;
    background:var(--success);
    display:inline-flex;align-items:center;justify-content:center;
    animation:successPop .35s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes successPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
  .popup-check-path{
    stroke-dasharray:40;stroke-dashoffset:40;
    animation:drawCheck .4s ease .2s forwards;
  }
  @keyframes drawCheck{to{stroke-dashoffset:0}}

  /* Undo toast */
  .undo-toast{
    position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
    z-index:650;
    background:var(--black);color:white;
    padding:10px 22px;border-radius:999px;
    font-size:.82rem;font-weight:700;
    box-shadow:0 4px 20px rgba(43,25,17,.3);
    animation:toastIn .25s ease,toastOut .3s ease .9s forwards;
  }
  @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%)}}
  @keyframes toastOut{to{opacity:0;transform:translateX(-50%) translateY(-6px)}}

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
`;
