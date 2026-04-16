# Peach Bitcoin — Web Prototype

Frontend-only web companion app for [Peach Bitcoin](https://peachbitcoin.com), a peer-to-peer Bitcoin exchange. React 18 + Vite 6. All data comes from the existing Peach REST API — there is no backend in this repo.

## Run locally

**Prerequisites:** Node 20+ (see `.nvmrc`) and npm.

```bash
git clone <repo-url> peach-web
cd peach-web
nvm use         # optional, picks up .nvmrc
npm install
npm run dev
```

Then open **http://localhost:5173/peach-web/** in your browser.

The Vite dev server automatically proxies `/api` → `https://api.peachbitcoin.com/v1` (see `vite.config.js`), so no API keys or environment setup are required to browse the app. To sign in, scan the QR code on the landing page with the Peach mobile app.

### Other commands

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm test          # run the vitest suite once
npm run test:watch
```

---

## Deploy to GitHub Pages

The repo is already wired for GitHub Actions deployment to GitHub Pages. Every push to `main` triggers a build and deploys automatically via `.github/workflows/`.

If you fork this into a new repo:

1. Update `base` in `vite.config.js` to match your repo name: `base: '/your-repo-name/'`.
2. Push to GitHub.
3. In the repo: Settings → Pages → Source → **GitHub Actions**.

Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`.

Because GitHub Pages is static, production API calls go through a Cloudflare Worker proxy (see `cloudflare/` and `.env.production`) to work around CORS. You do **not** need to touch this to run the app locally.

---

## Project structure

```
src/
├── screens/
│   ├── trade-execution/      # Split into folder
│   │   ├── index.jsx         # Main component + CSS
│   │   └── components.jsx    # Sub-components (stepper, cards, panels, etc.)
│   ├── trades-dashboard/     # Split into folder
│   │   ├── index.jsx         # Main component + CSS
│   │   ├── components.jsx    # TradeCard, HistoryTable, filters, etc.
│   │   └── MatchesPopup.jsx  # Match list/detail/confirm popup
│   ├── offer-creation/       # Split into folder
│   │   ├── index.jsx         # Main component
│   │   ├── components.jsx    # LivePreview, AmountSlider, PMModal
│   │   └── styles.js         # CSS block
│   ├── peach-home.jsx
│   ├── peach-market-view.jsx
│   ├── peach-auth.jsx
│   ├── peach-settings.jsx
│   └── peach-payment-methods.jsx
├── components/           # Shared UI components
│   ├── Navbars.jsx       # SideNav, Topbar, PeachIcon
│   ├── BitcoinAmount.jsx # SatsAmount, IcoBtc
│   ├── Avatar.jsx        # Shared avatar component
│   └── StatusChip.jsx    # Trade status chip
├── hooks/                # Shared logic
│   ├── useAuth.js        # Auth state management
│   └── useApi.js         # Fetch helpers with auto auth headers
├── styles/
│   └── global.css        # Shared tokens, reset, topbar, sidenav, keyframes
├── utils/
│   ├── pgp.js            # PGP encrypt/decrypt helpers
│   └── format.js         # Number/date formatting helpers
├── data/
│   └── statusConfig.js   # Trade status configuration (31 statuses)
├── App.jsx               # Router
├── main.jsx              # Entry point
└── peach-validators.js   # Input validation helpers
```

---

## Screens

| Route | Screen | File |
|-------|--------|------|
| `/` | Auth / Landing | `peach-auth.jsx` |
| `/home` | Home Dashboard | `peach-home.jsx` |
| `/market` | Market View | `peach-market-view.jsx` |
| `/offer/new` | Offer Creation | `offer-creation/index.jsx` |
| `/trades` | Trades Dashboard | `trades-dashboard/index.jsx` |
| `/trade/:id` | Trade Execution | `trade-execution/index.jsx` |
| `/settings` | Settings | `peach-settings.jsx` |
| `/payment-methods` | Payment Methods | `peach-payment-methods.jsx` |

###