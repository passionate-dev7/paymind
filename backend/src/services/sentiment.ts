import { getTokenPrice, type TokenPriceData } from "./price.js";

export interface SentimentData {
  score: number; // -100 to 100
  signal: "bullish" | "bearish" | "neutral";
  reasoning: string;
  indicators: {
    priceAction: number;
    volumeTrend: number;
    buyPressure: number;
    liquidityHealth: number;
    momentum: number;
  };
}

/**
 * Calculate sentiment based on price momentum, volume, and trading patterns
 * from DexScreener data. This is a real heuristic-based analysis, not mocked.
 *
 * The score ranges from -100 (extremely bearish) to +100 (extremely bullish).
 */
export async function getBasicSentiment(
  tokenAddress: string,
  existingPriceData?: TokenPriceData
): Promise<SentimentData> {
  console.log(`[Sentiment] Analyzing sentiment for ${tokenAddress}`);

  // Use existing price data if passed to avoid duplicate API call
  const priceData = existingPriceData || (await getTokenPrice(tokenAddress));

  const indicators = {
    priceAction: 0,
    volumeTrend: 0,
    buyPressure: 0,
    liquidityHealth: 0,
    momentum: 0,
  };

  const reasons: string[] = [];

  // --- 1. Price Action Score (-25 to +25) ---
  const change24h = priceData.priceChange24h;
  const change1h = priceData.priceChange1h;
  const change6h = priceData.priceChange6h;

  if (change24h > 20) {
    indicators.priceAction = 25;
    reasons.push(`Strong 24h rally: +${change24h.toFixed(1)}%`);
  } else if (change24h > 5) {
    indicators.priceAction = 15;
    reasons.push(`Positive 24h price action: +${change24h.toFixed(1)}%`);
  } else if (change24h > 0) {
    indicators.priceAction = 5;
    reasons.push(`Slight 24h gain: +${change24h.toFixed(1)}%`);
  } else if (change24h > -5) {
    indicators.priceAction = -5;
    reasons.push(`Slight 24h decline: ${change24h.toFixed(1)}%`);
  } else if (change24h > -20) {
    indicators.priceAction = -15;
    reasons.push(`Negative 24h price action: ${change24h.toFixed(1)}%`);
  } else {
    indicators.priceAction = -25;
    reasons.push(`Sharp 24h drop: ${change24h.toFixed(1)}%`);
  }

  // --- 2. Volume Trend Score (-20 to +20) ---
  const volume = priceData.volume24h;
  const liquidity = priceData.liquidity;

  if (liquidity > 0) {
    const volumeToLiquidity = volume / liquidity;
    if (volumeToLiquidity > 2) {
      indicators.volumeTrend = 20;
      reasons.push(
        `Extremely high volume/liquidity ratio: ${volumeToLiquidity.toFixed(1)}x`
      );
    } else if (volumeToLiquidity > 0.5) {
      indicators.volumeTrend = 10;
      reasons.push(
        `Healthy trading volume relative to liquidity: ${volumeToLiquidity.toFixed(2)}x`
      );
    } else if (volumeToLiquidity > 0.1) {
      indicators.volumeTrend = 0;
      reasons.push("Moderate trading volume");
    } else {
      indicators.volumeTrend = -10;
      reasons.push("Low trading volume relative to liquidity");
    }
  } else {
    indicators.volumeTrend = -20;
    reasons.push("No liquidity data available");
  }

  // --- 3. Buy Pressure Score (-20 to +20) ---
  const totalTxns = priceData.txns24h.buys + priceData.txns24h.sells;
  if (totalTxns > 0) {
    const buyRatio = priceData.txns24h.buys / totalTxns;
    if (buyRatio > 0.65) {
      indicators.buyPressure = 20;
      reasons.push(
        `Strong buy pressure: ${(buyRatio * 100).toFixed(0)}% buys (${priceData.txns24h.buys}B/${priceData.txns24h.sells}S)`
      );
    } else if (buyRatio > 0.55) {
      indicators.buyPressure = 10;
      reasons.push(
        `Moderate buy pressure: ${(buyRatio * 100).toFixed(0)}% buys`
      );
    } else if (buyRatio > 0.45) {
      indicators.buyPressure = 0;
      reasons.push("Balanced buy/sell activity");
    } else if (buyRatio > 0.35) {
      indicators.buyPressure = -10;
      reasons.push(
        `Sell pressure building: ${((1 - buyRatio) * 100).toFixed(0)}% sells`
      );
    } else {
      indicators.buyPressure = -20;
      reasons.push(
        `Heavy sell pressure: ${((1 - buyRatio) * 100).toFixed(0)}% sells`
      );
    }
  } else {
    indicators.buyPressure = -15;
    reasons.push("No transaction data available");
  }

  // --- 4. Liquidity Health Score (-15 to +15) ---
  if (liquidity > 1000000) {
    indicators.liquidityHealth = 15;
    reasons.push(`Deep liquidity: $${(liquidity / 1000000).toFixed(2)}M`);
  } else if (liquidity > 100000) {
    indicators.liquidityHealth = 10;
    reasons.push(`Adequate liquidity: $${(liquidity / 1000).toFixed(0)}K`);
  } else if (liquidity > 10000) {
    indicators.liquidityHealth = 0;
    reasons.push(`Low liquidity: $${(liquidity / 1000).toFixed(1)}K`);
  } else {
    indicators.liquidityHealth = -15;
    reasons.push(
      `Very low liquidity: $${liquidity.toFixed(0)} — high slippage risk`
    );
  }

  // --- 5. Momentum Score (-20 to +20) ---
  // Compare short-term vs long-term price action
  if (change1h > 0 && change6h > 0 && change24h > 0) {
    indicators.momentum = 20;
    reasons.push("Consistent upward momentum across all timeframes");
  } else if (change1h > 0 && change24h > 0) {
    indicators.momentum = 10;
    reasons.push("Generally positive momentum");
  } else if (change1h < 0 && change6h < 0 && change24h < 0) {
    indicators.momentum = -20;
    reasons.push("Consistent downward momentum across all timeframes");
  } else if (change1h < 0 && change24h < 0) {
    indicators.momentum = -10;
    reasons.push("Generally negative momentum");
  } else if (change1h > 0 && change24h < 0) {
    indicators.momentum = 5;
    reasons.push("Short-term recovery from 24h decline — possible reversal");
  } else if (change1h < 0 && change24h > 0) {
    indicators.momentum = -5;
    reasons.push("Short-term pullback after 24h gain — possible correction");
  } else {
    indicators.momentum = 0;
    reasons.push("Mixed momentum signals");
  }

  // --- Calculate Total Score ---
  const totalScore =
    indicators.priceAction +
    indicators.volumeTrend +
    indicators.buyPressure +
    indicators.liquidityHealth +
    indicators.momentum;

  // Clamp to [-100, 100]
  const clampedScore = Math.max(-100, Math.min(100, totalScore));

  let signal: "bullish" | "bearish" | "neutral";
  if (clampedScore > 20) signal = "bullish";
  else if (clampedScore < -20) signal = "bearish";
  else signal = "neutral";

  const reasoning = reasons.join(". ") + ".";

  console.log(
    `[Sentiment] Score: ${clampedScore} | Signal: ${signal} | ${priceData.baseToken.symbol}`
  );

  return {
    score: clampedScore,
    signal,
    reasoning,
    indicators,
  };
}
