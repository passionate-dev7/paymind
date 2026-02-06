import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import type { TokenSecurityData } from "../services/security.js";
import type { TokenPriceData } from "../services/price.js";
import type { WhaleData } from "../services/whale.js";
import type { SentimentData } from "../services/sentiment.js";

export interface IntelligenceReport {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  generatedAt: string;

  // Scores
  overallRiskScore: number; // 0-100 (100 = highest risk)
  opportunityScore: number; // 0-100 (100 = best opportunity)

  // Recommendation
  recommendation: "BUY" | "HOLD" | "AVOID";
  confidence: "low" | "medium" | "high";

  // Key findings
  keyFindings: string[];

  // Detailed breakdown
  breakdown: {
    security: {
      score: number;
      summary: string;
      details: string[];
    };
    price: {
      score: number;
      summary: string;
      details: string[];
    };
    whaleActivity: {
      score: number;
      summary: string;
      details: string[];
    };
    sentiment: {
      score: number;
      summary: string;
      details: string[];
    };
  };

  // AI narrative (if Claude is available)
  aiNarrative?: string;

  // Data sources
  dataSources: string[];
  totalCost: string;
}

/**
 * Synthesize all data into a comprehensive intelligence report.
 * Uses Claude API if available; otherwise uses a rule-based scoring system.
 */
export async function synthesizeReport(
  tokenAddress: string,
  securityData: TokenSecurityData | null,
  priceData: TokenPriceData | null,
  whaleData: WhaleData | null,
  sentimentData: SentimentData | null
): Promise<IntelligenceReport> {
  const tokenSymbol = priceData?.baseToken?.symbol || "UNKNOWN";
  const tokenName = priceData?.baseToken?.name || "Unknown Token";

  console.log(`[Analyzer] Synthesizing report for ${tokenSymbol} (${tokenAddress})`);

  // --- Rule-based scoring ---
  const securityBreakdown = analyzeSecurityScore(securityData);
  const priceBreakdown = analyzePriceScore(priceData);
  const whaleBreakdown = analyzeWhaleScore(whaleData);
  const sentimentBreakdown = analyzeSentimentScore(sentimentData);

  // Weighted overall scores
  const riskWeights = { security: 0.4, price: 0.2, whale: 0.2, sentiment: 0.2 };
  const opportunityWeights = {
    security: 0.2,
    price: 0.3,
    whale: 0.25,
    sentiment: 0.25,
  };

  const overallRiskScore = Math.round(
    securityBreakdown.score * riskWeights.security +
      priceBreakdown.riskScore * riskWeights.price +
      whaleBreakdown.riskScore * riskWeights.whale +
      sentimentBreakdown.riskScore * riskWeights.sentiment
  );

  const opportunityScore = Math.round(
    (100 - securityBreakdown.score) * opportunityWeights.security +
      priceBreakdown.opportunityScore * opportunityWeights.price +
      whaleBreakdown.opportunityScore * opportunityWeights.whale +
      sentimentBreakdown.opportunityScore * opportunityWeights.sentiment
  );

  // Determine recommendation
  let recommendation: "BUY" | "HOLD" | "AVOID";
  let confidence: "low" | "medium" | "high";

  if (overallRiskScore >= 70 || (securityData?.isHoneypot)) {
    recommendation = "AVOID";
    confidence = overallRiskScore >= 85 ? "high" : "medium";
  } else if (opportunityScore >= 65 && overallRiskScore < 40) {
    recommendation = "BUY";
    confidence = opportunityScore >= 80 ? "high" : "medium";
  } else {
    recommendation = "HOLD";
    confidence =
      Math.abs(opportunityScore - 50) < 10 ? "low" : "medium";
  }

  // Collect key findings
  const keyFindings: string[] = [];
  if (securityData?.isHoneypot)
    keyFindings.push("CRITICAL: Token is a honeypot — selling is impossible");
  if (securityData?.ownerChangeBalance)
    keyFindings.push("CRITICAL: Owner can modify holder balances");
  if (securityData?.riskLevel === "critical")
    keyFindings.push("Security analysis shows critical risk level");
  if (securityData?.riskLevel === "low")
    keyFindings.push("Token passes security audit with low risk");

  if (priceData) {
    if (priceData.priceChange24h > 20)
      keyFindings.push(`Strong rally: ${priceData.priceChange24h.toFixed(1)}% in 24h`);
    if (priceData.priceChange24h < -20)
      keyFindings.push(`Sharp decline: ${priceData.priceChange24h.toFixed(1)}% in 24h`);
    if (priceData.liquidity < 10000)
      keyFindings.push("Very low liquidity — high slippage and manipulation risk");
    if (priceData.liquidity > 1000000)
      keyFindings.push(`Deep liquidity: $${(priceData.liquidity / 1000000).toFixed(2)}M`);
  }

  if (whaleData) {
    if (whaleData.recentWhaleBuys.length > whaleData.recentWhaleSells.length * 2)
      keyFindings.push("Whale accumulation detected — more large buys than sells");
    if (whaleData.recentWhaleSells.length > whaleData.recentWhaleBuys.length * 2)
      keyFindings.push("Whale distribution detected — more large sells than buys");
  }

  if (sentimentData) {
    if (sentimentData.score > 50)
      keyFindings.push(`Strong bullish sentiment (score: ${sentimentData.score})`);
    if (sentimentData.score < -50)
      keyFindings.push(`Strong bearish sentiment (score: ${sentimentData.score})`);
  }

  if (keyFindings.length === 0) {
    keyFindings.push("No extreme signals detected — standard risk profile");
  }

  // Build report
  const report: IntelligenceReport = {
    tokenAddress,
    tokenSymbol,
    tokenName,
    generatedAt: new Date().toISOString(),
    overallRiskScore,
    opportunityScore,
    recommendation,
    confidence,
    keyFindings,
    breakdown: {
      security: {
        score: securityBreakdown.score,
        summary: securityBreakdown.summary,
        details: securityBreakdown.details,
      },
      price: {
        score: priceBreakdown.opportunityScore,
        summary: priceBreakdown.summary,
        details: priceBreakdown.details,
      },
      whaleActivity: {
        score: whaleBreakdown.opportunityScore,
        summary: whaleBreakdown.summary,
        details: whaleBreakdown.details,
      },
      sentiment: {
        score: sentimentBreakdown.opportunityScore,
        summary: sentimentBreakdown.summary,
        details: sentimentBreakdown.details,
      },
    },
    dataSources: [
      securityData ? "GoPlus Security API" : null,
      priceData ? "DexScreener API" : null,
      whaleData ? "BSCScan API" : null,
      sentimentData ? "Sentiment Analysis Engine" : null,
    ].filter(Boolean) as string[],
    totalCost: calculateTotalCost(securityData, priceData, whaleData, sentimentData),
  };

  // Try to generate AI narrative with Claude
  if (config.anthropic.apiKey) {
    try {
      report.aiNarrative = await generateAINarrative(report, securityData, priceData, whaleData, sentimentData);
    } catch (error) {
      console.error("[Analyzer] Claude API failed, skipping AI narrative:", error);
    }
  }

  console.log(
    `[Analyzer] Report complete: ${tokenSymbol} | Risk: ${overallRiskScore} | Opportunity: ${opportunityScore} | Rec: ${recommendation}`
  );

  return report;
}

// ─── Scoring Functions ───

function analyzeSecurityScore(data: TokenSecurityData | null): {
  score: number;
  summary: string;
  details: string[];
} {
  if (!data) {
    return {
      score: 50,
      summary: "Security data unavailable",
      details: ["Could not fetch security data from GoPlus"],
    };
  }

  let score = 0;

  if (data.isHoneypot) score += 40;
  if (data.ownerChangeBalance) score += 25;
  if (data.selfdestruct) score += 20;
  if (data.ownerCanMint) score += 15;
  if (data.hasProxyContract) score += 10;
  if (data.canTakeBackOwnership) score += 10;
  if (data.hiddenOwner) score += 10;
  if (!data.isOpenSource) score += 10;
  if (data.buyTax > 10) score += Math.min(data.buyTax, 20);
  if (data.sellTax > 10) score += Math.min(data.sellTax, 20);

  score = Math.min(100, score);

  let summary: string;
  if (score >= 70) summary = "Critical security risks detected";
  else if (score >= 40) summary = "Significant security concerns";
  else if (score >= 20) summary = "Moderate security issues";
  else summary = "Token appears relatively safe";

  return { score, summary, details: data.details };
}

function analyzePriceScore(data: TokenPriceData | null): {
  riskScore: number;
  opportunityScore: number;
  summary: string;
  details: string[];
} {
  if (!data) {
    return {
      riskScore: 50,
      opportunityScore: 50,
      summary: "Price data unavailable",
      details: ["Could not fetch price data from DexScreener"],
    };
  }

  const details: string[] = [];
  let riskScore = 30; // Base risk
  let opportunityScore = 50; // Base opportunity

  // Liquidity analysis
  if (data.liquidity < 10000) {
    riskScore += 30;
    opportunityScore -= 20;
    details.push(`Very low liquidity: $${data.liquidity.toFixed(0)}`);
  } else if (data.liquidity < 100000) {
    riskScore += 15;
    details.push(`Low liquidity: $${(data.liquidity / 1000).toFixed(1)}K`);
  } else if (data.liquidity > 1000000) {
    riskScore -= 15;
    opportunityScore += 10;
    details.push(`Strong liquidity: $${(data.liquidity / 1000000).toFixed(2)}M`);
  }

  // Price momentum
  if (data.priceChange24h > 20) {
    opportunityScore += 15;
    details.push(`Strong positive momentum: +${data.priceChange24h.toFixed(1)}% 24h`);
  } else if (data.priceChange24h < -20) {
    riskScore += 15;
    details.push(`Sharp decline: ${data.priceChange24h.toFixed(1)}% 24h`);
  }

  // Volume analysis
  if (data.volume24h > 1000000) {
    opportunityScore += 10;
    details.push(`High volume: $${(data.volume24h / 1000000).toFixed(2)}M 24h`);
  } else if (data.volume24h < 1000) {
    riskScore += 10;
    details.push(`Very low volume: $${data.volume24h.toFixed(0)} 24h`);
  }

  // Buy/sell ratio
  const total = data.txns24h.buys + data.txns24h.sells;
  if (total > 0) {
    const buyRatio = data.txns24h.buys / total;
    if (buyRatio > 0.6) {
      opportunityScore += 10;
      details.push(`Buy-heavy: ${data.txns24h.buys} buys / ${data.txns24h.sells} sells`);
    } else if (buyRatio < 0.4) {
      riskScore += 10;
      details.push(`Sell-heavy: ${data.txns24h.buys} buys / ${data.txns24h.sells} sells`);
    }
  }

  details.push(`Price: $${data.priceUsd}`);
  details.push(`24h Volume: $${data.volume24h.toLocaleString()}`);

  const summary = `${data.baseToken.symbol} at $${data.priceUsd} | 24h: ${data.priceChange24h > 0 ? "+" : ""}${data.priceChange24h.toFixed(1)}% | Vol: $${data.volume24h.toLocaleString()}`;

  return {
    riskScore: Math.max(0, Math.min(100, riskScore)),
    opportunityScore: Math.max(0, Math.min(100, opportunityScore)),
    summary,
    details,
  };
}

function analyzeWhaleScore(data: WhaleData | null): {
  riskScore: number;
  opportunityScore: number;
  summary: string;
  details: string[];
} {
  if (!data || data.analysisTimeframe === "unavailable") {
    return {
      riskScore: 50,
      opportunityScore: 50,
      summary: "Whale data unavailable",
      details: ["Could not fetch whale activity from BSCScan"],
    };
  }

  const details: string[] = [];
  let riskScore = 30;
  let opportunityScore = 50;

  const buys = data.recentWhaleBuys.length;
  const sells = data.recentWhaleSells.length;

  if (buys > sells * 2) {
    opportunityScore += 20;
    riskScore -= 10;
    details.push(`Whale accumulation: ${buys} large buys vs ${sells} large sells`);
  } else if (sells > buys * 2) {
    riskScore += 20;
    opportunityScore -= 10;
    details.push(`Whale distribution: ${sells} large sells vs ${buys} large buys`);
  } else {
    details.push(`Balanced whale activity: ${buys} buys, ${sells} sells`);
  }

  details.push(`Net flow: ${data.netFlow}`);
  details.push(`Unique whale addresses: ${data.whaleCount}`);
  details.push(`Timeframe: ${data.analysisTimeframe}`);

  if (data.largestTransaction) {
    details.push(
      `Largest transaction: ${data.largestTransaction.valueFormatted} ${data.largestTransaction.tokenSymbol} (${data.largestTransaction.type})`
    );
  }

  const summary = `${buys} whale buys, ${sells} whale sells | Net flow: ${data.netFlow}`;

  return {
    riskScore: Math.max(0, Math.min(100, riskScore)),
    opportunityScore: Math.max(0, Math.min(100, opportunityScore)),
    summary,
    details,
  };
}

function analyzeSentimentScore(data: SentimentData | null): {
  riskScore: number;
  opportunityScore: number;
  summary: string;
  details: string[];
} {
  if (!data) {
    return {
      riskScore: 50,
      opportunityScore: 50,
      summary: "Sentiment data unavailable",
      details: ["Sentiment analysis was not performed"],
    };
  }

  // Convert sentiment score (-100 to +100) to our scales
  const normalizedScore = (data.score + 100) / 200; // 0 to 1
  const opportunityScore = Math.round(normalizedScore * 100);
  const riskScore = Math.round((1 - normalizedScore) * 100);

  const details: string[] = [
    `Sentiment score: ${data.score}/100 (${data.signal})`,
    data.reasoning,
  ];

  return {
    riskScore,
    opportunityScore,
    summary: `${data.signal.toUpperCase()} (score: ${data.score})`,
    details,
  };
}

function calculateTotalCost(
  security: TokenSecurityData | null,
  price: TokenPriceData | null,
  whale: WhaleData | null,
  sentiment: SentimentData | null
): string {
  let total = BigInt(0);
  if (security) total += BigInt(config.x402.securityQueryCost);
  if (price) total += BigInt(config.x402.priceQueryCost);
  if (whale) total += BigInt(config.x402.whaleQueryCost);
  if (sentiment) total += BigInt(config.x402.sentimentQueryCost);
  return total.toString();
}

// ─── Claude AI Narrative Generation ───

async function generateAINarrative(
  report: IntelligenceReport,
  securityData: TokenSecurityData | null,
  priceData: TokenPriceData | null,
  whaleData: WhaleData | null,
  sentimentData: SentimentData | null
): Promise<string> {
  const client = new Anthropic({ apiKey: config.anthropic.apiKey });

  const prompt = `You are PayMind, an AI blockchain intelligence agent. Analyze this token data and provide a concise, actionable intelligence briefing (3-5 paragraphs).

Token: ${report.tokenName} (${report.tokenSymbol})
Address: ${report.tokenAddress}

SECURITY DATA:
${securityData ? JSON.stringify(securityData, null, 2) : "Unavailable"}

PRICE DATA:
${priceData ? JSON.stringify({ priceUsd: priceData.priceUsd, priceChange24h: priceData.priceChange24h, volume24h: priceData.volume24h, liquidity: priceData.liquidity, marketCap: priceData.marketCap, txns24h: priceData.txns24h }, null, 2) : "Unavailable"}

WHALE ACTIVITY:
${whaleData ? JSON.stringify({ recentWhaleBuys: whaleData.recentWhaleBuys.length, recentWhaleSells: whaleData.recentWhaleSells.length, netFlow: whaleData.netFlow, whaleCount: whaleData.whaleCount }, null, 2) : "Unavailable"}

SENTIMENT:
${sentimentData ? JSON.stringify(sentimentData, null, 2) : "Unavailable"}

COMPUTED SCORES:
- Risk Score: ${report.overallRiskScore}/100
- Opportunity Score: ${report.opportunityScore}/100
- Recommendation: ${report.recommendation}

Write a professional intelligence briefing. Be specific with numbers. Highlight critical risks first, then opportunities. End with your recommendation and reasoning.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "AI narrative generation failed.";
}
