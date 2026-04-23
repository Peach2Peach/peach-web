// ─── PAYMENT METHOD METADATA ─────────────────────────────────────────────────
// Display names, category buckets, per-field rendering hints, and helpers for
// consuming `GET /info/paymentMethods`.
//
// Ported from the mobile app:
//   - PM_NAMES       → peach-app/src/i18n/paymentMethod/en.json
//   - PM_CATEGORIES  → peach-app/src/paymentMethods.ts (PAYMENTCATEGORIES)
//
// The API returns PaymentMethodInfo[] with id + currencies + fields schema but
// no display name or category — those live here. If mobile adds a new method,
// the web still shows it (with a humanized id as the label) until someone ports
// the entry.
// ─────────────────────────────────────────────────────────────────────────────

import {
  validateIBAN,
  validateHolder,
  validateBIC,
  validateEmail,
  validateUKSortCode,
  validateUKBankAccount,
  validateAccountNumber,
  validateUsername,
  validateAdvcashWallet,
  validatePaymentReference,
  validateEthereumAddress,
  validateTronAddress,
  validateSolanaAddress,
} from "../peach-validators.js";

// ─── DISPLAY NAMES ──────────────────────────────────────────────────────────
export const PM_NAMES = {
  accrue: "Accrue",
  advcash: "ADV Cash",
  airtelMoney: "Airtel Money",
  alias: "Alias",
  apaym: "Apaym",
  applePay: "Apple Pay",
  arbitrumusdt: "Arbitrum USDT",
  bancolombia: "Bancolombia",
  bankera: "Bankera",
  baseusdt: "Base USDT",
  bizum: "Bizum",
  blik: "Blik",
  bnbusdt: "BNB USDT",
  cash: "Cash",
  cashDepositCanada: "Cash Deposit Canada",
  cbu: "CBU",
  chileBankTransfer: "Chile Bank Transfer",
  chippercash: "Chippercash",
  cvu: "CVU",
  dana: "Dana",
  daviPlata: "DaviPlata",
  djamo: "Djamo",
  dollaronchain: "Dollar on Chain",
  ethereumusdt: "Ethereum USDT",
  eversend: "Eversend",
  fasterPayments: "Faster Payments",
  friends24: "Friends 24",
  furicomi: "Furikomi",
  gcash: "GCash",
  "giftCard.amazon": "Amazon Gift Card",
  "giftCard.amazon.DE": "Amazon Gift Card (DE)",
  "giftCard.amazon.ES": "Amazon Gift Card (ES)",
  "giftCard.amazon.FR": "Amazon Gift Card (FR)",
  "giftCard.amazon.IT": "Amazon Gift Card (IT)",
  "giftCard.amazon.NL": "Amazon Gift Card (NL)",
  "giftCard.amazon.PT": "Amazon Gift Card (PT)",
  "giftCard.amazon.SE": "Amazon Gift Card (SE)",
  "giftCard.amazon.UK": "Amazon Gift Card (UK)",
  "giftCard.steam": "Steam Gift Card",
  goPay: "GoPay",
  guatemalaBankDeposit: "Guatemala Bank Deposit",
  imps: "IMPS",
  instantSepa: "SEPA instant",
  instaPay: "InstaPay",
  interac: "Interac",
  iris: "Iris",
  kcbBankKenya: "KCB Bank Kenya",
  keksPay: "KEKS Pay",
  klasha: "Klasha",
  liquid: "Liquid",
  lnurl: "LNURL BTC swap",
  lydia: "Lydia",
  "m-pesa": "M-Pesa",
  mbWay: "MB Way",
  mercadoPago: "Mercado Pago",
  mobilePay: "Mobile Pay",
  moov: "Moov",
  mpesa: "M-Pesa",
  mtn: "MTN",
  mtnMobileMoney: "MTN Mobile Money",
  n26: "N26",
  nationalTransferBG: "National transfer Bulgaria",
  nationalTransferCH: "National transfer Switzerland",
  nationalTransferCZ: "National transfer Czech Republic",
  nationalTransferDK: "National transfer Denmark",
  nationalTransferHU: "National transfer Hungary",
  nationalTransferIS: "National transfer Iceland",
  nationalTransferNO: "National transfer Norway",
  nationalTransferNZ: "National Transfer New Zealand",
  nationalTransferPL: "National transfer Poland",
  nationalTransferRO: "National transfer Romania",
  nationalTransferSA: "National Transfer Saudi Arabia",
  nationalTransferSE: "National transfer Sweden",
  nationalTransferSG: "National transfer Singapore",
  nationalTransferTR: "National transfer Turkey",
  nationalTransferUY: "National Transfer Uruguay",
  nationalTransferZA: "National Transfer South Africa",
  nequi: "Nequi",
  neteller: "Neteller",
  orangeMoney: "Orange Money",
  osko: "Osko",
  ovo: "OVO",
  papara: "Papara",
  paraguayBankTransfer: "Paraguay Bank Transfer",
  payday: "Payday",
  payeer: "Payeer",
  payID: "PayID",
  payLah: "PayLah!",
  paylib: "Paylib",
  paypal: "PayPal",
  paysera: "Paysera",
  paytm: "Paytm",
  perfectMoney: "Perfect Money",
  peruBankDeposit: "Peru Bank Deposit",
  philippineBankTransfer: "Philippine Bank Transfer",
  pix: "Pix",
  postePay: "PostePay",
  rappipay: "Rappipay",
  rebellion: "Rebellion",
  revolut: "Revolut",
  rootstockusdt: "Rootstock USDT",
  sadaPay: "SadaPay",
  satispay: "Satispay",
  sepa: "SEPA",
  sinpe: "SINPE",
  sinpeMovil: "SINPE móvil",
  skrill: "Skrill",
  solanausdt: "Solana USDT",
  spei: "SPEI",
  stp: "STP",
  straksbetaling: "Straksbetaling",
  strike: "Strike",
  swish: "Swish",
  tether: "Tether",
  tigoMoneyElSalvador: "Tigo Money El Salvador",
  tigoMoneyGuatemala: "Tigo Money Guatemala",
  tigoMoneyHonduras: "Tigo Money Honduras",
  tigoMoneyParaguay: "Tigo Money Paraguay",
  tigoPesa: "Tigo Pesa",
  tronusdt: "TRON USDT",
  twint: "Twint",
  uaeBankTransfer: "UAE Bank Transfer",
  UPI: "UPI",
  vipps: "Vipps",
  vodafoneCash: "Vodafone Cash",
  wave: "Wave",
  weChat: "WeChat Pay",
  wero: "Wero",
  westernUnion: "Western Union",
  wirepay: "Wirepay",
  wise: "Wise",
  ziraat: "Ziraat Bank",
};

// ─── CATEGORY LOOKUP ────────────────────────────────────────────────────────
// Ported from mobile's PAYMENTCATEGORIES. `nationalOption` is renamed to
// `national` to match the web's existing CATEGORY_META slots. `cash` and
// `global` buckets map to `onlineWallet` — the web doesn't have dedicated
// category slots for them yet, and they render fine as wallet-like.
const MOBILE_CATEGORIES = {
  bankTransfer: [
    "alias",
    "bancolombia",
    "guatemalaBankDeposit",
    "peruBankDeposit",
    "cashDepositCanada",
    "chileBankTransfer",
    "cbu",
    "cvu",
    "fasterPayments",
    "furicomi",
    "kcbBankKenya",
    "instantSepa",
    "interac",
    "sadaPay",
    "sepa",
    "sinpe",
    "straksbetaling",
    "nationalTransferBG",
    "nationalTransferCH",
    "nationalTransferCZ",
    "nationalTransferDK",
    "nationalTransferHU",
    "nationalTransferIS",
    "nationalTransferNO",
    "nationalTransferNZ",
    "nationalTransferPL",
    "nationalTransferRO",
    "nationalTransferSA",
    "nationalTransferSE",
    "nationalTransferSG",
    "nationalTransferTR",
    "nationalTransferUY",
    "nationalTransferZA",
    "paraguayBankTransfer",
    "philippineBankTransfer",
    "spei",
    "stp",
    "uaeBankTransfer",
  ],
  onlineWallet: [
    "accrue",
    "advcash",
    "airtelMoney",
    "apaym",
    "bankera",
    "blik",
    "chippercash",
    "dana",
    "daviPlata",
    "djamo",
    "eversend",
    "friends24",
    "gcash",
    "goPay",
    "klasha",
    "imps",
    "instaPay",
    "m-pesa",
    "mercadoPago",
    "moov",
    "mpesa",
    "mtn",
    "mtnMobileMoney",
    "n26",
    "nequi",
    "neteller",
    "orangeMoney",
    "osko",
    "ovo",
    "papara",
    "payday",
    "payeer",
    "payID",
    "payLah",
    "paypal",
    "paysera",
    "paytm",
    "perfectMoney",
    "pix",
    "rappipay",
    "revolut",
    "sinpeMovil",
    "skrill",
    "strike",
    "swish",
    "tigoMoneyElSalvador",
    "tigoMoneyGuatemala",
    "tigoMoneyHonduras",
    "tigoMoneyParaguay",
    "tigoPesa",
    "twint",
    "UPI",
    "vipps",
    "vodafoneCash",
    "wave",
    "weChat",
    "westernUnion",
    "wirepay",
    "wise",
    "ziraat",
  ],
  giftCard: [
    "giftCard.steam",
    "giftCard.amazon",
    "giftCard.amazon.DE",
    "giftCard.amazon.FR",
    "giftCard.amazon.IT",
    "giftCard.amazon.ES",
    "giftCard.amazon.NL",
    "giftCard.amazon.UK",
    "giftCard.amazon.SE",
    "giftCard.amazon.PT",
  ],
  national: [
    "bizum",
    "iris",
    "keksPay",
    "lydia",
    "mbWay",
    "mobilePay",
    "postePay",
    "rebellion",
    "satispay",
    "wero",
  ],
  // Mobile also has `cash` (dynamic) and `global` (crypto-ish). The web
  // routes both into onlineWallet for now.
};

export const PM_CATEGORIES = {};
for (const [cat, ids] of Object.entries(MOBILE_CATEGORIES)) {
  for (const id of ids) PM_CATEGORIES[id] = cat;
}
// Global/crypto methods → onlineWallet slot on the web.
for (const id of [
  "liquid",
  "lnurl",
  "dollaronchain",
  "ethereumusdt",
  "tronusdt",
  "rootstockusdt",
  "arbitrumusdt",
  "baseusdt",
  "bnbusdt",
  "solanausdt",
]) {
  PM_CATEGORIES[id] = "onlineWallet";
}

// ─── PHONE PREFIX PER METHOD ────────────────────────────────────────────────
// When a method is fundamentally a national phone-based service, its phone
// field should be pre-constrained to the country prefix.
export const PHONE_PREFIX_MAP = {
  bizum: "+34",
  twint: "+41",
  swish: "+46",
  mobilePay: "+45",
  vipps: "+47",
  satispay: "+39",
  mbWay: "+351",
  iris: "+30",
  paylib: "+33",
  verse: "+34",
  blik: "+48",
};

// ─── FIELD METADATA ─────────────────────────────────────────────────────────
// Per-field-id rendering hints. Used by PMDetailsForm to turn an API field id
// (like "iban") into a labelled input with the right placeholder/validator.
// Fields the web doesn't explicitly know fall through to a humanized label
// with required-only validation.
export const PM_FIELD_META = {
  // Identity
  beneficiary: {
    label: "Account holder name",
    placeholder: "Full name",
    validator: validateHolder,
  },
  accountHolder: {
    label: "Account holder name",
    placeholder: "Full name",
    validator: validateHolder,
  },
  holder: {
    label: "Account holder name",
    placeholder: "Full name",
    validator: validateHolder,
  },
  name: { label: "Name", placeholder: "Full name" },
  // Digital identity
  email: {
    label: "Email",
    placeholder: "you@example.com",
    validator: validateEmail,
  },
  userName: {
    label: "Username",
    placeholder: "@username",
    validator: validateUsername,
  },
  username: {
    label: "Username",
    placeholder: "@username",
    validator: validateUsername,
  },
  phone: {
    label: "Phone number",
    placeholder: "+34 612 345 678",
    validatorWithPrefix: true,
  },
  phoneNumber: {
    label: "Phone number",
    placeholder: "+34 612 345 678",
    validatorWithPrefix: true,
  },
  mpesa_phone: {
    label: "M-Pesa number",
    placeholder: "+254 7…",
    validatorWithPrefix: true,
  },
  mpesa_name: {
    label: "Account holder name",
    placeholder: "Full name",
    validator: validateHolder,
  },
  // Bank
  iban: {
    label: "IBAN",
    placeholder: "DE89 3704 0044 0532 0130 00",
    validator: validateIBAN,
  },
  bic: {
    label: "BIC",
    placeholder: "COBADEFFXXX",
    validator: validateBIC,
  },
  swiftCode: {
    label: "SWIFT code",
    placeholder: "COBADEFFXXX",
    validator: validateBIC,
  },
  bankAccountNumber: { label: "Account number", placeholder: "12345678" },
  accountNumber: {
    label: "Account number",
    placeholder: "12345678",
    validator: validateAccountNumber,
  },
  bankCode: { label: "Bank code", placeholder: "123456" },
  sortCode: {
    label: "Sort code",
    placeholder: "12-34-56",
    validator: validateUKSortCode,
  },
  ukSortCode: {
    label: "Sort code",
    placeholder: "12-34-56",
    validator: validateUKSortCode,
  },
  ukBankAccount: {
    label: "Account number",
    placeholder: "12345678",
    validator: validateUKBankAccount,
  },
  reference: {
    label: "Reference",
    placeholder: "Reference",
    validator: validatePaymentReference,
  },
  // Crypto
  address: { label: "Wallet address", placeholder: "Address" },
  wallet: {
    label: "Wallet ID",
    placeholder: "U/E/G + 12 chars",
    validator: validateAdvcashWallet,
  },
  network: { label: "Network", placeholder: "Ethereum, Tron, …" },
  lnurlAddress: {
    label: "LNURL or Lightning address",
    placeholder: "LNURL1... or user@domain.com",
    validator: validateEmail,
  },
  receiveAddressEthereum: {
    label: "Ethereum address",
    placeholder: "0x…",
    validator: validateEthereumAddress,
  },
  receiveAddressTron: {
    label: "Tron address",
    placeholder: "T…",
    validator: validateTronAddress,
  },
  receiveAddressSolana: {
    label: "Solana address",
    placeholder: "Solana wallet address",
    validator: validateSolanaAddress,
  },
  // Latin America
  pixAlias: {
    label: "PIX key",
    placeholder: "CPF, email, phone, or random key",
  },
  cbu: { label: "CBU", placeholder: "2850590940090418135201" },
  cvu: { label: "CVU", placeholder: "0000003100000000000000" },
  // National / mobile
  mpesa: { label: "M-Pesa number", placeholder: "+254 7…" },
  "m-pesa": { label: "M-Pesa number", placeholder: "+254 7…" },
  upi: { label: "UPI ID", placeholder: "name@upi" },
  UPI: { label: "UPI ID", placeholder: "name@upi" },
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

// Split camelCase + dot-separated ids into a readable label.
// "perfectMoney"       → "Perfect Money"
// "giftCard.amazon"    → "Gift Card Amazon"
// "nationalTransferBG" → "National Transfer BG"
export function humanizeId(id) {
  if (!id) return "";
  return String(id)
    .replace(/\./g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export function methodDisplayName(id) {
  return PM_NAMES[id] || humanizeId(id);
}

export function getMethodMeta(id) {
  return {
    name: PM_NAMES[id] || humanizeId(id),
    category: PM_CATEGORIES[id] || "onlineWallet",
  };
}

export function getFieldMeta(fieldId) {
  return (
    PM_FIELD_META[fieldId] || {
      label: humanizeId(fieldId),
      placeholder: "",
    }
  );
}

// Override map for tab labels, keyed by the first field id of the tab's
// alternative. Mirrors the mobile i18n strings so tabs read "username" /
// "m-pesa" / "account number" instead of "user_name" / "mpesa_name".
// Extend this when new methods land with awkward field ids.
export const TAB_LABEL_OVERRIDES = {
  userName: "username",
  user_name: "username",
  phone: "phone",
  phoneNumber: "phone",
  email: "email",
  mpesa: "m-pesa",
  mpesa_name: "m-pesa",
  mpesaName: "m-pesa",
  iban: "IBAN",
  accountNumber: "account number",
  account_number: "account number",
  ukBankAccount: "UK bank",
  ukSortCode: "UK bank",
  lnurlAddress: "lightning",
};

// Short lowercase label for a details-form tab, derived from the first field
// id in that tab's group. Matches the mobile style ("username", "phone",
// "m-pesa").
export function getTabLabel(group) {
  const first = firstFieldInGroup(group);
  if (!first) return "option";
  if (TAB_LABEL_OVERRIDES[first]) return TAB_LABEL_OVERRIDES[first];
  // PM_NAMES sometimes has a nicer label (e.g. mpesa → M-Pesa). Prefer that
  // if available, otherwise lowercase the humanized form.
  if (PM_NAMES[first]) return PM_NAMES[first].toLowerCase();
  return humanizeId(first).replace(/_/g, " ").toLowerCase();
}

// Flatten one tab's inner structure into a unique list of field ids. The API
// shape is `string[][]` per tab (alternative field groups, any one of which
// satisfies the tab), but every real method in production uses a single group
// per tab. We take the union to be safe.
export function fieldsForTab(tabGroups) {
  const out = [];
  const seen = new Set();
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === "string" && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  };
  walk(tabGroups);
  return out;
}

// Walks `fields.mandatory` (shape: string[][][]) and returns a list of
// sections. Each outer element is a section; sections with more than one
// alternative render as a tab strip, sections with a single alternative render
// inline. Mirrors mobile's PaymentMethodForm logic.
//
// Returns: [{ sectionIdx, alternatives: string[][], altFields: string[][] }]
// where `altFields[i]` is the flat, deduped list of field ids for alternative i.
export function parseSections(mandatory) {
  if (!Array.isArray(mandatory)) return [];
  return mandatory.map((section, sectionIdx) => {
    const alternatives = Array.isArray(section) ? section : [];
    const altFields = alternatives.map((alt) => fieldsForTab(alt));
    return { sectionIdx, alternatives, altFields };
  });
}

function firstFieldInGroup(tabGroups) {
  let found = null;
  const walk = (v) => {
    if (found) return;
    if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === "string") found = v;
  };
  walk(tabGroups);
  return found;
}

// ─── INVERSE LOOKUPS (for market-view chip filters) ─────────────────────────
export const METHOD_ID_BY_DISPLAY = Object.fromEntries(
  Object.entries(PM_NAMES).map(([id, name]) => [name, id]),
);

export function getMethodsByCategory(catId) {
  return Object.entries(PM_CATEGORIES)
    .filter(([, c]) => c === catId)
    .map(([id]) => id);
}

// ─── API NORMALIZATION ──────────────────────────────────────────────────────
// Turn `GET /info/paymentMethods` response into the dict shape the AddPMFlow
// picker consumes: { [id]: { name, currencies, category, fields, countries,
// anonymous } }.
export function normalizeApiPaymentMethods(apiArray) {
  if (!Array.isArray(apiArray)) return {};
  const out = {};
  for (const m of apiArray) {
    if (!m || typeof m !== "object" || !m.id) continue;
    const meta = getMethodMeta(m.id);
    out[m.id] = {
      name: meta.name,
      category: meta.category,
      currencies: Array.isArray(m.currencies) ? m.currencies : [],
      fields: m.fields || { mandatory: [], optional: [] },
      countries: m.countries || [],
      anonymous: !!m.anonymous,
    };
  }
  return out;
}
