import { analyzeTokenSecurity, type TokenSecurityData } from "../services/security.js";
import { getTokenPrice, type TokenPriceData } from "../services/price.js";
import { getWhaleTransactions, type WhaleData } from "../services/whale.js";
import { getBasicSentiment, type SentimentData } from "../services/sentiment.js";
import { synthesizeReport, type IntelligenceReport } from "./analyzer.js";
import { logPayment } from "../blockchain/ledger.js";
import { config } from "../config.js";
import { ethers } from "ethers";

export interface AnalysisResult {
  success: boolean;
  report?: IntelligenceReport;
  error?: string;
  timing: {
    totalMs: number;
    securityMs: number;
    priceMs: number;
    whaleMs: number;
    sentimentMs: number;
    analysisMs: number;
  };
  payments: {
    total: string;
    breakdown: {
      service: string;
      amount: string;
      success: boolean;
    }[];
  };
}

/**
 * Main AI Agent orchestrator.
 * Executes the full token analysis pipeline:
 *   1. Plan data sources
 *   2. Fetch all data in parallel
 *   3. Log payments to the ledger
 *   4. Synthesize report
 */
export async function analyzeToken(
  tokenAddress: string
): Promise<AnalysisResult> {
  const startTime = Date.now();

  // Validate address
  if (!ethers.isAddress(tokenAddress)) {
    return {
      success: false,
      error: `Invalid token address: ${tokenAddress}`,
      timing: { totalMs: 0, securityMs: 0, priceMs: 0, whaleMs: 0, sentimentMs: 0, analysisMs: 0 },
      payments: { total: "0", breakdown: [] },
    };
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[Agent] Starting analysis for ${tokenAddress}`);
  console.log(`${"=".repeat(60)}`);

  // --- Step 1: Plan data queries ---
  console.log("[Agent] Step 1: Planning data sources...");
  const dataSources = planDataSources(tokenAddress);
  console.log(`[Agent] Will query: ${dataSources.join(", ")}`);

  // --- Step 2: Execute all queries in parallel ---
  console.log("[Agent] Step 2: Executing parallel data queries...");

  let securityData: TokenSecurityData | null = null;
  let priceData: TokenPriceData | null = null;
  let whaleData: WhaleData | null = null;
  let sentimentData: SentimentData | null = null;

  const timings = {
    securityMs: 0,
    priceMs: 0,
    whaleMs: 0,
    sentimentMs: 0,
    analysisMs: 0,
  };

  const paymentBreakdown: { service: string; amount: string; success: boolean }[] = [];

  // Execute all API calls in parallel
  const [securityResult, priceResult, whaleResult] = await Promise.allSettled([
    timedCall("security", () => analyzeTokenSecurity(tokenAddress)),
    timedCall("price", () => getTokenPrice(tokenAddress)),
    timedCall("whale", () => getWhaleTransactions(tokenAddress)),
  ]);

  // Process security result
  if (securityResult.status === "fulfilled") {
    securityData = securityResult.value.data;
    timings.securityMs = securityResult.value.ms;
    console.log(`[Agent] Security data received (${timings.securityMs}ms)`);
  } else {
    console.error("[Agent] Security query failed:", securityResult.reason);
    timings.securityMs = 0;
  }

  // Process price result
  if (priceResult.status === "fulfilled") {
    priceData = priceResult.value.data;
    timings.priceMs = priceResult.value.ms;
    console.log(`[Agent] Price data received (${timings.priceMs}ms)`);
  } else {
    console.error("[Agent] Price query failed:", priceResult.reason);
    timings.priceMs = 0;
  }

  // Process whale result
  if (whaleResult.status === "fulfilled") {
    whaleData = whaleResult.value.data;
    timings.whaleMs = whaleResult.value.ms;
    console.log(`[Agent] Whale data received (${timings.whaleMs}ms)`);
  } else {
    console.error("[Agent] Whale query failed:", whaleResult.reason);
    timings.whaleMs = 0;
  }

  // Sentiment analysis (uses price data, so runs after price is available)
  const sentimentStart = Date.now();
  try {
    sentimentData = await getBasicSentiment(tokenAddress, priceData || undefined);
    timings.sentimentMs = Date.now() - sentimentStart;
    console.log(`[Agent] Sentiment data received (${timings.sentimentMs}ms)`);
  } catch (error) {
    console.error("[Agent] Sentiment analysis failed:", error);
    timings.sentimentMs = Date.now() - sentimentStart;
  }

  // --- Step 3: Log payments to ledger ---
  console.log("[Agent] Step 3: Logging payments to ledger...");

  const PROVIDER_ADDRESS = "0x0000000000000000000000000000000000000001"; // Placeholder for data providers

  if (securityData) {
    const payment = await logPayment(
      PROVIDER_ADDRESS,
      config.x402.securityQueryCost,
      "security",
      `security-${tokenAddress}-${Date.now()}`
    );
    paymentBreakdown.push({
      service: "security",
      amount: config.x402.securityQueryCost,
      success: payment.success,
    });
  }

  if (priceData) {
    const payment = await logPayment(
      PROVIDER_ADDRESS,
      config.x402.priceQueryCost,
      "price",
      `price-${tokenAddress}-${Date.now()}`
    );
    paymentBreakdown.push({
      service: "price",
      amount: config.x402.priceQueryCost,
      success: payment.success,
    });
  }

  if (whaleData) {
    const payment = await logPayment(
      PROVIDER_ADDRESS,
      config.x402.whaleQueryCost,
      "whale",
      `whale-${tokenAddress}-${Date.now()}`
    );
    paymentBreakdown.push({
      service: "whale",
      amount: config.x402.whaleQueryCost,
      success: payment.success,
    });
  }

  if (sentimentData) {
    const payment = await logPayment(
      PROVIDER_ADDRESS,
      config.x402.sentimentQueryCost,
      "sentiment",
      `sentiment-${tokenAddress}-${Date.now()}`
    );
    paymentBreakdown.push({
      service: "sentiment",
      amount: config.x402.sentimentQueryCost,
      success: payment.success,
    });
  }

  const totalPayment = paymentBreakdown.reduce(
    (sum, p) => sum + BigInt(p.amount),
    BigInt(0)
  );

  // --- Step 4: Synthesize report ---
  console.log("[Agent] Step 4: Synthesizing intelligence report...");
  const analysisStart = Date.now();

  let report: IntelligenceReport;
  try {
    report = await synthesizeReport(
      tokenAddress,
      securityData,
      priceData,
      whaleData,
      sentimentData
    );
    timings.analysisMs = Date.now() - analysisStart;
  } catch (error: any) {
    console.error("[Agent] Report synthesis failed:", error);
    return {
      success: false,
      error: `Analysis failed: ${error.message}`,
      timing: {
        totalMs: Date.now() - startTime,
        ...timings,
        analysisMs: Date.now() - analysisStart,
      },
      payments: {
        total: totalPayment.toString(),
        breakdown: paymentBreakdown,
      },
    };
  }

  const totalMs = Date.now() - startTime;
  console.log(`\n[Agent] Analysis complete in ${totalMs}ms`);
  console.log(
    `[Agent] ${report.tokenSymbol}: Risk=${report.overallRiskScore} Opportunity=${report.opportunityScore} Rec=${report.recommendation}`
  );
  console.log(`${"=".repeat(60)}\n`);

  return {
    success: true,
    report,
    timing: { totalMs, ...timings },
    payments: {
      total: totalPayment.toString(),
      breakdown: paymentBreakdown,
    },
  };
}

/**
 * Determine which data sources to query for a token.
 */
function planDataSources(tokenAddress: string): string[] {
  // For now, query all available sources
  // In the future, this could be smarter (e.g., skip whale tracking for brand-new tokens)
  return ["GoPlus Security", "DexScreener Price", "BSCScan Whales", "Sentiment Engine"];
}

/**
 * Utility: time an async call and return both the result and elapsed time.
 */
async function timedCall<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ data: T; ms: number }> {
  const start = Date.now();
  const data = await fn();
  return { data, ms: Date.now() - start };
}
