import { config } from "../config.js";
import { ethers } from "ethers";

export interface WhaleTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  valueFormatted: string;
  tokenSymbol: string;
  tokenDecimal: number;
  timestamp: number;
  blockNumber: number;
  type: "buy" | "sell" | "transfer";
}

export interface WhaleData {
  recentWhaleBuys: WhaleTransaction[];
  recentWhaleSells: WhaleTransaction[];
  netFlow: string;
  largestTransaction: WhaleTransaction | null;
  totalBuyVolume: string;
  totalSellVolume: string;
  whaleCount: number;
  analysisTimeframe: string;
}

// Known DEX router addresses on BSC
const DEX_ROUTERS = new Set([
  "0x10ed43c718714eb63d5aa57b78b54704e256024e", // PancakeSwap V2
  "0x13f4ea83d0bd40e75c8222255bc855a974568dd4", // PancakeSwap V3
  "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506", // SushiSwap
  "0x05ff2b0db69458a0750badebc4f9e13add608c7f", // PancakeSwap V1
  "0xcf0febd3f17cef5b47b0cd257acf6025c5bff3b7", // ApeSwap
  "0x325e343f1de602396e256b67efd1f61c3a6b38bd", // BiSwap
  "0x3a6d8ca21d1cf76f653a67577fa0d27453350dd8", // Biswap V3
]);

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";

/**
 * Get large token transfers (whale activity) from BSCScan.
 * Uses the BSCScan API free tier.
 */
export async function getWhaleTransactions(
  tokenAddress: string,
  minValueUsd: number = 10000
): Promise<WhaleData> {
  const apiKey = config.apis.bscscanApiKey;

  const url = new URL(config.apis.bscscan);
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "tokentx");
  url.searchParams.set("contractaddress", tokenAddress);
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", "100"); // Get last 100 transfers
  url.searchParams.set("sort", "desc");
  if (apiKey) {
    url.searchParams.set("apikey", apiKey);
  }

  console.log(`[Whale] Querying BSCScan for large transfers of ${tokenAddress}`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `BSCScan API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (data.status === "0" && data.message === "NOTOK") {
    // Rate limit or API error — return empty but not throw
    console.warn(`[Whale] BSCScan API issue: ${data.result}`);
    return createEmptyWhaleData();
  }

  if (!Array.isArray(data.result)) {
    console.warn("[Whale] Unexpected BSCScan response format");
    return createEmptyWhaleData();
  }

  const transfers: WhaleTransaction[] = [];
  const decimals = data.result[0]?.tokenDecimal
    ? parseInt(data.result[0].tokenDecimal, 10)
    : 18;
  const tokenSymbol = data.result[0]?.tokenSymbol || "UNKNOWN";

  for (const tx of data.result) {
    const value = tx.value || "0";
    const tokenDecimals = parseInt(tx.tokenDecimal || "18", 10);
    const formatted = ethers.formatUnits(value, tokenDecimals);
    const numericValue = parseFloat(formatted);

    // Classify transaction type
    const fromLower = tx.from.toLowerCase();
    const toLower = tx.to.toLowerCase();
    let type: "buy" | "sell" | "transfer" = "transfer";

    if (
      DEX_ROUTERS.has(fromLower) ||
      fromLower === NULL_ADDRESS
    ) {
      type = "buy";
    } else if (
      DEX_ROUTERS.has(toLower) ||
      toLower === NULL_ADDRESS ||
      toLower === DEAD_ADDRESS
    ) {
      type = "sell";
    }

    transfers.push({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: value,
      valueFormatted: formatted,
      tokenSymbol: tx.tokenSymbol || tokenSymbol,
      tokenDecimal: tokenDecimals,
      timestamp: parseInt(tx.timeStamp || "0", 10),
      blockNumber: parseInt(tx.blockNumber || "0", 10),
      type,
    });
  }

  // Sort by value descending to identify whale transactions
  // We use raw token amounts here since we don't have price in this context
  transfers.sort(
    (a, b) => parseFloat(b.valueFormatted) - parseFloat(a.valueFormatted)
  );

  // Take top transfers as "whale" activity (top 20% by value)
  const threshold = Math.max(transfers.length * 0.2, 5);
  const whaleTransfers = transfers.slice(0, Math.ceil(threshold));

  const whaleBuys = whaleTransfers.filter((t) => t.type === "buy");
  const whaleSells = whaleTransfers.filter((t) => t.type === "sell");

  // Calculate volumes
  let totalBuyValue = BigInt(0);
  let totalSellValue = BigInt(0);

  for (const t of whaleBuys) {
    totalBuyValue += BigInt(t.value);
  }
  for (const t of whaleSells) {
    totalSellValue += BigInt(t.value);
  }

  const netFlowBigInt = totalBuyValue - totalSellValue;
  const netFlow = ethers.formatUnits(
    netFlowBigInt < 0n ? -netFlowBigInt : netFlowBigInt,
    decimals
  );

  const largest =
    whaleTransfers.length > 0 ? whaleTransfers[0] : null;

  console.log(
    `[Whale] Found ${whaleTransfers.length} whale transactions | Buys: ${whaleBuys.length}, Sells: ${whaleSells.length}`
  );

  return {
    recentWhaleBuys: whaleBuys.slice(0, 10),
    recentWhaleSells: whaleSells.slice(0, 10),
    netFlow: (netFlowBigInt >= 0n ? "+" : "-") + netFlow,
    largestTransaction: largest,
    totalBuyVolume: ethers.formatUnits(totalBuyValue, decimals),
    totalSellVolume: ethers.formatUnits(totalSellValue, decimals),
    whaleCount: new Set(whaleTransfers.map((t) => t.from)).size,
    analysisTimeframe: "last 100 transfers",
  };
}

function createEmptyWhaleData(): WhaleData {
  return {
    recentWhaleBuys: [],
    recentWhaleSells: [],
    netFlow: "0",
    largestTransaction: null,
    totalBuyVolume: "0",
    totalSellVolume: "0",
    whaleCount: 0,
    analysisTimeframe: "unavailable",
  };
}
