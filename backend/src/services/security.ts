import { config } from "../config.js";

export interface TokenSecurityData {
  isHoneypot: boolean;
  hasProxyContract: boolean;
  ownerCanMint: boolean;
  buyTax: number;
  sellTax: number;
  holderCount: number;
  lpHolderCount: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  isOpenSource: boolean;
  canTakeBackOwnership: boolean;
  ownerChangeBalance: boolean;
  hiddenOwner: boolean;
  externalCall: boolean;
  selfdestruct: boolean;
  details: string[];
  raw: Record<string, any>;
}

/**
 * Analyze token security using the GoPlus Security API.
 * This is a FREE public API — no authentication required.
 * Docs: https://docs.gopluslabs.io/
 */
export async function analyzeTokenSecurity(
  tokenAddress: string
): Promise<TokenSecurityData> {
  const url = `${config.apis.goplus}/token_security/56?contract_addresses=${tokenAddress.toLowerCase()}`;

  console.log(`[Security] Querying GoPlus for ${tokenAddress}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `GoPlus API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (data.code !== 1) {
    throw new Error(`GoPlus returned error code: ${data.code} — ${data.message}`);
  }

  const tokenData = data.result?.[tokenAddress.toLowerCase()];
  if (!tokenData) {
    throw new Error(
      `No security data found for token ${tokenAddress} on BSC. Token may not exist or not be verified.`
    );
  }

  // Parse GoPlus response fields
  const isHoneypot = tokenData.is_honeypot === "1";
  const hasProxyContract = tokenData.is_proxy === "1";
  const ownerCanMint = tokenData.is_mintable === "1";
  const isOpenSource = tokenData.is_open_source === "1";
  const canTakeBackOwnership = tokenData.can_take_back_ownership === "1";
  const ownerChangeBalance = tokenData.owner_change_balance === "1";
  const hiddenOwner = tokenData.hidden_owner === "1";
  const externalCall = tokenData.external_call === "1";
  const selfdestruct = tokenData.selfdestruct_contains === "1";

  const buyTax = parseFloat(tokenData.buy_tax || "0") * 100;
  const sellTax = parseFloat(tokenData.sell_tax || "0") * 100;
  const holderCount = parseInt(tokenData.holder_count || "0", 10);
  const lpHolderCount = parseInt(tokenData.lp_holder_count || "0", 10);

  // Build risk details
  const details: string[] = [];
  if (isHoneypot) details.push("CRITICAL: Token is a honeypot — cannot sell");
  if (hasProxyContract) details.push("WARNING: Proxy contract detected — logic can be changed");
  if (ownerCanMint) details.push("WARNING: Owner can mint new tokens");
  if (!isOpenSource) details.push("WARNING: Contract is not open source");
  if (canTakeBackOwnership) details.push("WARNING: Ownership can be reclaimed");
  if (ownerChangeBalance) details.push("CRITICAL: Owner can modify balances");
  if (hiddenOwner) details.push("WARNING: Hidden owner detected");
  if (externalCall) details.push("INFO: Contract makes external calls");
  if (selfdestruct) details.push("CRITICAL: Contract contains selfdestruct");
  if (buyTax > 10) details.push(`WARNING: High buy tax: ${buyTax.toFixed(1)}%`);
  if (sellTax > 10) details.push(`WARNING: High sell tax: ${sellTax.toFixed(1)}%`);
  if (holderCount < 100) details.push(`INFO: Low holder count: ${holderCount}`);

  // Calculate risk level
  let riskScore = 0;
  if (isHoneypot) riskScore += 50;
  if (ownerChangeBalance) riskScore += 30;
  if (selfdestruct) riskScore += 25;
  if (ownerCanMint) riskScore += 15;
  if (hasProxyContract) riskScore += 10;
  if (canTakeBackOwnership) riskScore += 10;
  if (hiddenOwner) riskScore += 10;
  if (!isOpenSource) riskScore += 10;
  if (buyTax > 10) riskScore += 10;
  if (sellTax > 10) riskScore += 10;
  if (holderCount < 50) riskScore += 5;

  let riskLevel: "low" | "medium" | "high" | "critical";
  if (riskScore >= 50) riskLevel = "critical";
  else if (riskScore >= 30) riskLevel = "high";
  else if (riskScore >= 15) riskLevel = "medium";
  else riskLevel = "low";

  if (details.length === 0) {
    details.push("No significant security issues detected");
  }

  console.log(
    `[Security] Analysis complete: riskLevel=${riskLevel}, honeypot=${isHoneypot}, buyTax=${buyTax}%, sellTax=${sellTax}%`
  );

  return {
    isHoneypot,
    hasProxyContract,
    ownerCanMint,
    buyTax,
    sellTax,
    holderCount,
    lpHolderCount,
    riskLevel,
    isOpenSource,
    canTakeBackOwnership,
    ownerChangeBalance,
    hiddenOwner,
    externalCall,
    selfdestruct,
    details,
    raw: tokenData,
  };
}
