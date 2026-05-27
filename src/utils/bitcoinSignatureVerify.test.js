// Parity tests for isValidBitcoinSignature.
// Vectors copied verbatim from the mobile app's
// peach-app/src/utils/validation/isValidBitcoinSignature.spec.ts so that any
// future drift between web and mobile verification is caught immediately.

import { describe, it, expect } from "vitest";
import { isValidBitcoinSignature } from "./bitcoinSignatureVerify.js";

describe("isValidBitcoinSignature — mobile parity vectors", () => {
  // Vector 1: regtest P2WPKH BIP-137 signature
  const address  = "bcrt1qj8f2z28wvqtamu7khkmhw7z025gdwr7e7n6e2n";
  const message  = "I confirm that only I, peach033110c3, control the address bcrt1qj8f2z28wvqtamu7khkmhw7z025gdwr7e7n6e2n";
  const signature = "H2i3dzh/dYWjpsRJmrl1C9ZKMkg1PitsM/zdh7RIQ6PrLTaYa4Wmm0fKRsLAhaDIqwg1C51StxG5JMj3sF6Yqkc=";

  const wrongAddress   = "bcrt1q58rkxe3ls4aequhcs9897r82x4kfrsz4fr4ezayluql4l55937wsmq5ck0";
  const wrongMessage   = "I confirm that only I, peach022334c5, control the address bcrt1qj8f2z28wvqtamu7khkmhw7z025gdwr7e7n6e2n";
  const wrongSignature = "H2i3dzh/dO0jpsRJmrl1C9ZKMkg1PitsM/zdh7RIQ6PrLTaOa40mm0fKRsLAhaDIq0g1C51StxG5JMj3sF6Oqkc=";

  it("accepts a valid P2WPKH signature", () => {
    expect(isValidBitcoinSignature({ message, address, signature })).toBe(true);
  });

  it("rejects when the message is altered", () => {
    expect(isValidBitcoinSignature({ message: wrongMessage, address, signature })).toBe(false);
  });

  it("rejects when the address is wrong", () => {
    expect(isValidBitcoinSignature({ message, address: wrongAddress, signature })).toBe(false);
  });

  it("rejects when the signature is tampered", () => {
    expect(isValidBitcoinSignature({ message, address, signature: wrongSignature })).toBe(false);
  });

  it("rejects when all three fields are wrong", () => {
    expect(isValidBitcoinSignature({ message: wrongMessage, address: wrongAddress, signature: wrongSignature })).toBe(false);
  });

  it("rejects empty message", () => {
    expect(isValidBitcoinSignature({ message: "", address, signature })).toBe(false);
  });

  it("rejects empty address", () => {
    expect(isValidBitcoinSignature({ message, address: "", signature })).toBe(false);
  });

  it("rejects empty signature", () => {
    expect(isValidBitcoinSignature({ message, address, signature: "" })).toBe(false);
  });

  it("rejects all-empty input", () => {
    expect(isValidBitcoinSignature({ message: "", address: "", signature: "" })).toBe(false);
  });

  // Vector 2: testnet taproot (P2TR) BIP-322 signature
  it("accepts a valid taproot BIP-322 signature", () => {
    const taprootAddress   = "tb1ps4kv5rdvrl4k8axvc06ty0tp7hper2arwz6gy7cldjj9ppx40a9s7m9l63";
    const taprootMessage   = "I confirm that only I, peach024118ae, control the address tb1ps4kv5rdvrl4k8axvc06ty0tp7hper2arwz6gy7cldjj9ppx40a9s7m9l63";
    const taprootSignature = "AUFdGjkDS0GfTFaUTuyn8rNDXFlunGJu0Ljnx6vmXlFoZxoSKMUQk57ChLIphMYbzNH9Rc8Mu8qkr0PFdn/dJCdfAQ==";
    expect(isValidBitcoinSignature({
      message: taprootMessage,
      address: taprootAddress,
      signature: taprootSignature,
    })).toBe(true);
  });
});
