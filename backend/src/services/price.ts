import { config } from "../config.js";

export interface TokenPriceData {
  priceUsd: string;
  priceChange24h: number;
  priceChange1h: number;
  priceChange6h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  fdv: number;
  pairAddress: string;
  dexName: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  pairCreatedAt: number | null;
  txns24h: {
    buys: number;
    sells: number;
  };
  url: string;
}

/**
 * Get token price and market data from DexScreener.
 * This is a FREE public API — no authentication required.
 * Docs: https://docs.dexscreener.com/api/reference
 */
export async function getTokenPrice(
  tokenAddress: string
): Promise<TokenPriceData> {
  const url = `${config.apis.dexscreener}/tokens/${tokenAddress}`;

  console.log(`[Price] Querying DexScreener for ${tokenAddress}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `DexScreener API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.pairs || data.pairs.length === 0) {
    throw new Error(
      `No trading pairs found for token ${tokenAddress} on DexScreener. Token may not be listed or have no liquidity.`
    );
  }

  // Find the best pair on BSC (highest liquidity)
  const bscPairs = data.pairs.filter(
    (p: any) => p.chainId === "bsc"
  );

  // Use BSC pairs if available, otherwise use all pairs
  const relevantPairs = bscPairs.length > 0 ? bscPairs : data.pairs;

  // Sort by liquidity (USD) descending and take the best one
  const bestPair = relevantPairs.sort(
    (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
  )[0];

  const priceChange = bestPair.priceChange || {};
  const txns = bestPair.txns?.h24 || { buys: 0, sells: 0 };

  const result: TokenPriceData = {
    priceUsd: bestPair.priceUsd || "0",
    priceChange24h: priceChange.h24 || 0,
    priceChange1h: priceChange.h1 || 0,
    priceChange6h: priceChange.h6 || 0,
    volume24h: bestPair.volume?.h24 || 0,
    liquidity: bestPair.liquidity?.usd || 0,
    marketCap: bestPair.marketCap || 0,
    fdv: bestPair.fdv || 0,
    pairAddress: bestPair.pairAddress || "",
    dexName: bestPair.dexId || "unknown",
    baseToken: {
      address: bestPair.baseToken?.address || "",
      name: bestPair.baseToken?.name || "",
      symbol: bestPair.baseToken?.symbol || "",
    },
    quoteToken: {
      address: bestPair.quoteToken?.address || "",
      name: bestPair.quoteToken?.name || "",
      symbol: bestPair.quoteToken?.symbol || "",
    },
    pairCreatedAt: bestPair.pairCreatedAt || null,
    txns24h: {
      buys: txns.buys || 0,
      sells: txns.sells || 0,
    },
    url: bestPair.url || "",
  };

  console.log(
    `[Price] ${result.baseToken.symbol}: $${result.priceUsd} | 24h: ${result.priceChange24h}% | Vol: $${result.volume24h.toLocaleString()} | Liq: $${result.liquidity.toLocaleString()}`
  );

  return result;
}
