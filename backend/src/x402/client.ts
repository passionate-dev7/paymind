import { ethers } from "ethers";
import { config } from "../config.js";
import { signPaymentAuthorization, getAgentAddress } from "../blockchain/wallet.js";
import {
  encodePaymentHeader,
  type PaymentProof,
  type PaymentRequirement,
} from "./facilitator.js";

/**
 * x402 Payment Client — used by the AI agent to pay for data.
 *
 * Flow:
 * 1. First request to a protected endpoint
 * 2. If 402 received, parse payment requirement
 * 3. Sign payment authorization
 * 4. Retry with payment proof header
 * 5. Return data
 */

interface PayAndFetchResult<T = any> {
  data: T;
  paid: boolean;
  paymentAmount: string;
  paymentProof?: PaymentProof;
}

/**
 * Fetch a URL with automatic x402 payment handling.
 * If the server returns 402 Payment Required, the agent signs a payment
 * and retries the request.
 */
export async function payAndFetch<T = any>(
  url: string,
  amount?: string
): Promise<PayAndFetchResult<T>> {
  console.log(`[x402-Client] Fetching: ${url}`);

  // First attempt — may return 402
  const firstResponse = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  // If not 402, return directly
  if (firstResponse.status !== 402) {
    if (!firstResponse.ok) {
      throw new Error(
        `Request failed: ${firstResponse.status} ${firstResponse.statusText}`
      );
    }
    const data = (await firstResponse.json()) as T;
    return { data, paid: false, paymentAmount: "0" };
  }

  // Parse 402 response for payment requirements
  console.log("[x402-Client] Received 402 Payment Required — preparing payment");

  let requirement: PaymentRequirement;
  try {
    const body = await firstResponse.json();
    requirement = body.paymentRequirement || body;
  } catch {
    throw new Error("Could not parse 402 payment requirement from server");
  }

  const paymentAmount = amount || requirement.amount;

  // Sign the payment authorization
  const agentAddress = getAgentAddress();
  const nonce = requirement.nonce || Math.floor(Math.random() * 1000000);
  const expiry = requirement.expiry || Math.floor(Date.now() / 1000) + 300;

  const signature = await signPaymentAuthorization({
    to: requirement.receiver,
    amount: paymentAmount,
    resource: requirement.resource,
    nonce,
    expiry,
  });

  const proof: PaymentProof = {
    signature,
    from: agentAddress,
    to: requirement.receiver,
    amount: paymentAmount,
    resource: requirement.resource,
    nonce,
    expiry,
  };

  const encodedPayment = encodePaymentHeader(proof);

  // Retry with payment header
  console.log(
    `[x402-Client] Sending payment: ${paymentAmount} wei for ${requirement.resource}`
  );

  const paidResponse = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-402-Payment": encodedPayment,
    },
  });

  if (!paidResponse.ok) {
    const errorBody = await paidResponse.text();
    throw new Error(
      `Paid request failed: ${paidResponse.status} — ${errorBody}`
    );
  }

  const data = (await paidResponse.json()) as T;

  console.log(`[x402-Client] Payment successful, data received`);

  return {
    data,
    paid: true,
    paymentAmount,
    paymentProof: proof,
  };
}

/**
 * Create a pre-signed payment proof for a specific resource
 * (useful when the agent knows the cost upfront).
 */
export async function createPaymentProof(
  resource: string,
  receiver: string,
  amount: string
): Promise<{ proof: PaymentProof; encoded: string }> {
  const agentAddress = getAgentAddress();
  const nonce = Math.floor(Math.random() * 1000000);
  const expiry = Math.floor(Date.now() / 1000) + 300;

  const signature = await signPaymentAuthorization({
    to: receiver,
    amount,
    resource,
    nonce,
    expiry,
  });

  const proof: PaymentProof = {
    signature,
    from: agentAddress,
    to: receiver,
    amount,
    resource,
    nonce,
    expiry,
  };

  return {
    proof,
    encoded: encodePaymentHeader(proof),
  };
}
