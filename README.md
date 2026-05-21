# Peach Bitcoin — Web Prototype

Frontend-only web companion app for [Peach Bitcoin](https://peachbitcoin.com), a peer-to-peer Bitcoin exchange. React 18 + Vite 6. All data comes from the existing Peach REST API — there is no backend in this repo.

## Configuration

The app reads two build-time env vars (Vite inlines them into the bundle):

| Variable | Required | Values | Meaning |
|----------|----------|--------|---------|
| `VITE_API_URL` | yes | full origin, no `/v1` suffix | Where every API call is sent. The browser fetches it directly — the upstream must allow your origin via CORS. |
| `VITE_BITCOIN_NETWORK` | yes | `BITCOIN` \| `REGTEST` | Governs address validation and the mobile-app deeplink scheme. Independent from `VITE_API_URL`. |

`VITE_API_URL` and `VITE_BITCOIN_NETWORK` are independent on purpose. Pointing at a regtest API while choosing `BITCOIN` (or vice versa) is a configuration mistake the codebase honors as if it were intentional.

Copy `.env.example` to `.env` and edit if needed.

## Run locally

**Prerequisites:** Node 20+ (see `.nvmrc`) and npm.

```bash
git clone <repo-url> peach-web
cd peach-web
nvm use         # optional, picks up .nvmrc
npm install
cp .env.example .env   # adjust VITE_API_URL / VITE_BITCOIN_NETWORK
npm run dev
```

Then open **http://localhost:5173/** in your browser. To sign in, scan the QR code with the Peach mobile app.

### Other commands

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm test          # run the vitest suite once
npm run test:watch
```

---

## Deploy with Docker

The included `Dockerfile` produces an nginx image serving the static build at port 80. Both env vars are baked in at build time, so build one image per environment.

```bash
# Build (mainnet example)
docker build \
  --build-arg VITE_API_URL=https://api.peachbitcoin.com \
  --build-arg VITE_BITCOIN_NETWORK=BITCOIN \
  -t peach-web .

# Run
docker run --rm -p 8080:80 -d peach-web
# → http://localhost:8080
```

Or via Docker Compose (reads `VITE_API_URL` and `VITE_BITCOIN_NETWORK` from your shell or a `.env` file):

```bash
docker compose up --build
```

The image makes API calls **directly** from the browser to `VITE_API_URL`. The upstream API must allow your deployment origin via CORS — there is no proxy in front.

## Deploy to GitHub Pages

The repo also ships with a GitHub Actions workflow under `.github/workflows/`. To use it on a fork hosted at a subpath:

```bash
BASE_PATH=/your-repo-name/ npm run build
```

`vite.config.js` reads `BASE_PATH` (defaults to `/`). The legacy Cloudflare Worker proxy in `cloudflare/` is no longer wired into the app — leave it or delete it as you prefer.

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