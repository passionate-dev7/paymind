import { Hono } from "hono";
import type { Context, Next } from "hono";
import { config } from "../config.js";
import { getAgentAddress } from "../blockchain/wallet.js";
import {
  createPaymentRequirement,
  parsePaymentHeader,
  verifyPaymentProof,
} from "./facilitator.js";
import { analyzeTokenSecurity } from "../services/security.js";
import { getTokenPrice } from "../services/price.js";
import { getWhaleTransactions } from "../services/whale.js";

/**
 * x402-protected data service endpoints.
 * These simulate a real x402 payment flow:
 *   1. Client requests data
 *   2. If no valid payment header -> 402 with payment requirement
 *   3. If valid payment header -> serve data
 */

type X402Variables = {
  Variables: {
    x402_payer: string;
    x402_amount: string;
  };
};

const x402App = new Hono<X402Variables>();

// The data provider address (in a real deployment this would be a separate service)
const DATA_PROVIDER = getAgentAddress();

/**
 * x402 Payment Middleware
 * Checks for X-402-Payment header, verifies it, or returns 402.
 */
function x402Middleware(resource: string, amount: string) {
  return async (c: Context<X402Variables>, next: Next) => {
    const paymentHeader = c.req.header("X-402-Payment");

    if (!paymentHeader) {
      // No payment — return 402 with requirements
      const requirement = createPaymentRequirement(
        resource,
        amount,
        DATA_PROVIDER || "0x0000000000000000000000000000000000000000"
      );

      return c.json(
        {
          error: "Payment Required",
          code: 402,
          paymentRequirement: requirement,
          message: `This endpoint requires an x402 micropayment of ${amount} wei. Include a signed X-402-Payment header.`,
        },
        402
      );
    }

    // Parse and verify payment
    const proof = parsePaymentHeader(paymentHeader);
    if (!proof) {
      return c.json(
        {
          error: "Invalid Payment",
          code: 400,
          message:
            "Could not parse X-402-Payment header. Expected base64-encoded JSON.",
        },
        400
      );
    }

    const verification = verifyPaymentProof(proof, resource, amount);
    if (!verification.valid) {
      return c.json(
        {
          error: "Payment Rejected",
          code: 402,
          reason: verification.reason,
          paymentRequirement: createPaymentRequirement(
            resource,
            amount,
            DATA_PROVIDER || "0x0000000000000000000000000000000000000000"
          ),
        },
        402
      );
    }

    // Payment verified — attach info to context and proceed
    c.set("x402_payer", verification.signer);
    c.set("x402_amount", proof.amount);
    await next();
  };
}

// ─── x402-Protected Endpoints ───

/**
 * GET /api/x402/security/:token
 * Returns GoPlus security analysis. Requires x402 payment.
 */
x402App.get(
  "/security/:token",
  async (c, next) => {
    const token = c.req.param("token");
    const resource = `/api/x402/security/${token}`;
    const mw = x402Middleware(resource, config.x402.securityQueryCost);
    return mw(c, next);
  },
  async (c) => {
    const token = c.req.param("token");
    try {
      const data = await analyzeTokenSecurity(token);
      return c.json({
        success: true,
        data,
        payment: {
          payer: c.get("x402_payer"),
          amount: c.get("x402_amount"),
          service: "security",
        },
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  }
);

/**
 * GET /api/x402/price/:token
 * Returns DexScreener price data. Requires x402 payment.
 */
x402App.get(
  "/price/:token",
  async (c, next) => {
    const token = c.req.param("token");
    const resource = `/api/x402/price/${token}`;
    const mw = x402Middleware(resource, config.x402.priceQueryCost);
    return mw(c, next);
  },
  async (c) => {
    const token = c.req.param("token");
    try {
      const data = await getTokenPrice(token);
      return c.json({
        success: true,
        data,
        payment: {
          payer: c.get("x402_payer"),
          amount: c.get("x402_amount"),
          service: "price",
        },
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  }
);

/**
 * GET /api/x402/whale/:token
 * Returns BSCScan whale activity. Requires x402 payment.
 */
x402App.get(
  "/whale/:token",
  async (c, next) => {
    const token = c.req.param("token");
    const resource = `/api/x402/whale/${token}`;
    const mw = x402Middleware(resource, config.x402.whaleQueryCost);
    return mw(c, next);
  },
  async (c) => {
    const token = c.req.param("token");
    try {
      const data = await getWhaleTransactions(token);
      return c.json({
        success: true,
        data,
        payment: {
          payer: c.get("x402_payer"),
          amount: c.get("x402_amount"),
          service: "whale",
        },
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  }
);

export { x402App };
