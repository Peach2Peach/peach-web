import advcash from "./advcash.svg";
import airtelMoney from "./airtelMoney.svg";
import amazon from "./amazon.svg";
import arbitrum from "./arbitrum.svg";
import bancolombia from "./bancolombia.svg";
import base from "./base.svg";
import bitcoin from "./bitcoin.svg";
import bitcoinAmsterdam from "./bitcoinAmsterdam.svg";
import bizum from "./bizum.svg";
import blik from "./blik.svg";
import bnb from "./bnb.svg";
import chippercash from "./chippercash.svg";
import ethereum from "./ethereum.svg";
import eversend from "./eversend.svg";
import fasterPayments from "./fasterPayments.svg";
import friends24 from "./friends24.svg";
import hype from "./logo-hype-icon.svg";
import keksPay from "./keksPay.svg";
import krak from "./krak.svg";
import liquid from "./liquid.svg";
import lydia from "./lydia.svg";
import mPesa from "./m-pesa.svg";
import mbWay from "./mbWay.svg";
import meru from "./meru-logo.svg";
import mobilePay from "./mobilePay.svg";
import moov from "./moov.svg";
import mtn from "./mtn.svg";
import n26 from "./n26.svg";
import nequi from "./nequi.svg";
import neteller from "./neteller.svg";
import orangeMoney from "./orangeMoney.svg";
import papara from "./papara.svg";
import paylib from "./paylib.svg";
import paypal from "./paypal.svg";
import paysera from "./paysera.svg";
import placeholder from "./placeholder.svg";
import revolut from "./revolut.svg";
import rootstock from "./rootstock.svg";
import satispay from "./satispay.svg";
import sepa from "./sepa.svg";
import sinpeMovil from "./sinpeMovil.svg";
import skrill from "./skrill.svg";
import solana from "./solana.svg";
import strike from "./strike.svg";
import swish from "./swish.svg";
import tron from "./tron.svg";
import twint from "./twint.svg";
import vipps from "./vipps.svg";
import wave from "./wave.svg";
import wise from "./wise.svg";

export const PaymentLogos = {
  "cash.amsterdam": bitcoinAmsterdam,
  "cash.belgianEmbassy": bitcoin,
  "cash.lugano": bitcoin,
  "giftCard.amazon": amazon,
  "m-pesa": mPesa,
  accrue: placeholder,
  advcash,
  airtelMoney,
  alias: placeholder,
  amazon,
  bancolombia,
  bankera: placeholder,
  bitcoin,
  bizum,
  blik,
  cbu: placeholder,
  chippercash,
  cvu: placeholder,
  eversend,
  fasterPayments,
  friends24,
  hype,
  instantSepa: sepa,
  iris: placeholder,
  keksPay,
  klasha: placeholder,
  krak,
  liquid,
  lydia,
  mbWay,
  mercadoPago: placeholder,
  meru,
  mobilePay,
  moov,
  mtn,
  n26,
  nequi,
  neteller,
  orangeMoney,
  papara,
  payday: placeholder,
  paylib,
  paypal,
  paysera,
  pix: placeholder,
  placeholder,
  postePay: placeholder,
  rappipay: placeholder,
  rebellion: placeholder,
  revolut,
  rootstock,
  satispay,
  sepa,
  sinpe: placeholder,
  sinpeMovil,
  skrill,
  straksbetaling: placeholder,
  strike,
  swish,
  twint,
  vipps,
  wave,
  wirepay: placeholder,
  wise,
  arbitrum,
  ethereum,
  bnb,
  tron,
  base,
  solana,
};

export type PaymentLogoType = keyof typeof PaymentLogos;

// Resolve a methodId (from the API / saved PM) to a logo URL.
// Handles exact matches, gift-card country variants (`giftCard.amazon.DE` →
// `giftCard.amazon`), chain stablecoin variants (`arbitrumusdt` /
// `arbitrumusdc` → `arbitrum`),
// national-transfer country variants (`nationalTransferBG` → placeholder for
// now until flag SVGs are added), and falls back to the placeholder.
export function getPaymentLogo(methodId: string | undefined | null): string {
  if (!methodId) return placeholder;
  const logos = PaymentLogos as Record<string, string>;
  if (logos[methodId]) return logos[methodId];
  // Gift-card country variants: "giftCard.amazon.DE" → "giftCard.amazon"
  const dotIdx = methodId.lastIndexOf(".");
  if (dotIdx > 0) {
    const parent = methodId.slice(0, dotIdx);
    if (logos[parent]) return logos[parent];
  }
  // Stablecoin chain variants: "arbitrumusdt" / "arbitrumusdc" → "arbitrum"
  if (methodId.endsWith("usdt") || methodId.endsWith("usdc")) {
    const chain = methodId.slice(0, -4);
    if (logos[chain]) return logos[chain];
  }
  return placeholder;
}
