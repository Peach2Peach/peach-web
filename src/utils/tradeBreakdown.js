import { Transaction, NETWORK, TEST_NETWORK } from "@scure/btc-signer";
import { hex } from "@scure/base";

// @scure/btc-signer ships only NETWORK (mainnet "bc") and TEST_NETWORK
// (testnet "tb"). Regtest shares testnet's version bytes but uses the
// "bcrt" bech32 HRP, so getOutputAddress with TEST_NETWORK would encode
// regtest outputs as tb1… and never match a bcrt1… releaseAddress.
const REGTEST = { ...TEST_NETWORK, bech32: "bcrt" };

export function getTradeBreakdown({
  releaseTransaction,
  releaseAddress,
  inputAmount,
  isRegtest,
}) {
  const fallback = {
    totalAmount: inputAmount ?? 0,
    peachFee: 0,
    networkFee: 0,
    amountReceived: 0,
    ok: false,
  };
  if (!releaseTransaction || !releaseAddress || !inputAmount) return fallback;
  try {
    const net = isRegtest ? REGTEST : NETWORK;
    const tx = Transaction.fromRaw(hex.decode(releaseTransaction));

    let releaseAmount = null;
    let peachAmount = 0n;
    for (let i = 0; i < tx.outputsLength; i++) {
      const addr = tx.getOutputAddress(i, net);
      const { amount } = tx.getOutput(i);
      if (addr === releaseAddress) releaseAmount = amount ?? 0n;
      else peachAmount += amount ?? 0n;
    }
    if (releaseAmount == null) return fallback;

    const peachFee = Number(peachAmount);
    const amountReceived = Number(releaseAmount);
    return {
      totalAmount: inputAmount,
      peachFee,
      networkFee: inputAmount - peachFee - amountReceived,
      amountReceived,
      ok: true,
    };
  } catch {
    return fallback;
  }
}
