import { ethers } from "ethers";
import { config } from "../config.js";

/**
 * AEON x402 Facilitator Integration for BSC.
 *
 * The x402 protocol enables HTTP 402 (Payment Required) flows where:
 * 1. Server responds with 402 + payment details
 * 2. Client signs a payment authorization
 * 3. Client retries request with payment proof in headers
 * 4. Server (or facilitator) verifies payment and serves data
 *
 * For the hackathon demo, we implement a simplified but real EIP-712
 * signature-based verification flow.
 */

export interface PaymentRequirement {
  amount: string; // in wei
  currency: string; // token address (e.g., USDT)
  receiver: string; // data provider address
  resource: string; // the endpoint being accessed
  network: string; // e.g., "bsc"
  chainId: number;
  nonce: number;
  expiry: number; // unix timestamp
}

export interface PaymentProof {
  signature: string;
  from: string;
  to: string;
  amount: string;
  resource: string;
  nonce: number;
  expiry: number;
}

// Domain for EIP-712 typed data
const PAYMENT_DOMAIN = {
  name: "PayMind-x402",
  version: "1",
  chainId: config.bsc.chainId,
};

const PAYMENT_TYPES = {
  PaymentAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "resource", type: "string" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
  ],
};

// Track used nonces to prevent replay attacks
const usedNonces = new Set<string>();

/**
 * Create a 402 Payment Required response payload.
 */
export function createPaymentRequirement(
  resource: string,
  amount: string,
  receiver: string
): PaymentRequirement {
  return {
    amount,
    currency: config.contracts.usdt,
    receiver,
    resource,
    network: "bsc",
    chainId: config.bsc.chainId,
    nonce: Math.floor(Math.random() * 1000000),
    expiry: Math.floor(Date.now() / 1000) + 300, // 5 minutes
  };
}

/**
 * Verify an x402 payment proof header.
 * Returns the verified signer address or throws an error.
 */
export function verifyPaymentProof(
  proof: PaymentProof,
  expectedResource: string,
  expectedAmount: string
): { valid: boolean; signer: string; reason?: string } {
  try {
    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (proof.expiry < now) {
      return { valid: false, signer: "", reason: "Payment proof expired" };
    }

    // Check nonce hasn't been used (prevent replay)
    const nonceKey = `${proof.from}-${proof.nonce}`;
    if (usedNonces.has(nonceKey)) {
      return { valid: false, signer: "", reason: "Nonce already used" };
    }

    // Check amount is sufficient
    if (BigInt(proof.amount) < BigInt(expectedAmount)) {
      return {
        valid: false,
        signer: "",
        reason: `Insufficient payment: ${proof.amount} < ${expectedAmount}`,
      };
    }

    // Check resource matches
    if (proof.resource !== expectedResource) {
      return {
        valid: false,
        signer: "",
        reason: `Resource mismatch: ${proof.resource} !== ${expectedResource}`,
      };
    }

    // Verify EIP-712 signature
    const value = {
      from: proof.from,
      to: proof.to,
      amount: proof.amount,
      resource: proof.resource,
      nonce: proof.nonce,
      expiry: proof.expiry,
    };

    const recoveredAddress = ethers.verifyTypedData(
      PAYMENT_DOMAIN,
      PAYMENT_TYPES,
      value,
      proof.signature
    );

    if (recoveredAddress.toLowerCase() !== proof.from.toLowerCase()) {
      return {
        valid: false,
        signer: recoveredAddress,
        reason: "Signature does not match claimed sender",
      };
    }

    // Mark nonce as used
    usedNonces.add(nonceKey);

    console.log(
      `[Facilitator] Payment verified: ${proof.from} -> ${proof.to} | ${proof.amount} | ${proof.resource}`
    );

    return { valid: true, signer: recoveredAddress };
  } catch (error: any) {
    return {
      valid: false,
      signer: "",
      reason: `Verification error: ${error.message}`,
    };
  }
}

/**
 * Parse the X-402-Payment header from a request.
 */
export function parsePaymentHeader(header: string): PaymentProof | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(header, "base64").toString("utf-8")
    );

    if (
      !parsed.signature ||
      !parsed.from ||
      !parsed.to ||
      !parsed.amount ||
      !parsed.resource ||
      parsed.nonce === undefined ||
      !parsed.expiry
    ) {
      return null;
    }

    return parsed as PaymentProof;
  } catch {
    return null;
  }
}

/**
 * Encode a payment proof into a header value.
 */
export function encodePaymentHeader(proof: PaymentProof): string {
  return Buffer.from(JSON.stringify(proof)).toString("base64");
}
