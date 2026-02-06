import type {
  IntelligenceReport,
  PaymentRecord,
  AgentStats,
  AgentBalance,
} from '@/types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4021';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Parse a detail string like "WARNING: Owner can mint" */
function parseSecurityDetails(details: string[]): {
  isHoneypot: boolean;
  ownerCanMint: boolean;
  hasProxyContract: boolean;
  buyTax: string;
  sellTax: string;
  holderCount: number;
  riskLevel: string;
} {
  const text = details.join(' ').toLowerCase();
  return {
    isHoneypot: text.includes('honeypot'),
    ownerCanMint: text.includes('mint'),
    hasProxyContract: text.includes('proxy'),
    buyTax: details.find(d => d.toLowerCase().includes('buy tax'))?.match(/[\d.]+/)?.[0] || '0',
    sellTax: details.find(d => d.toLowerCase().includes('sell tax'))?.match(/[\d.]+/)?.[0] || '0',
    holderCount: parseInt(details.find(d => d.toLowerCase().includes('holder'))?.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0'),
    riskLevel: text.includes('critical') ? 'critical' : text.includes('significant') ? 'high' : text.includes('moderate') ? 'medium' : 'low',
  };
}

function parsePriceDetails(breakdown: any): {
  priceUsd: string;
  priceChange24h: number;
  volume24h: string;
  liquidity: string;
  marketCap: string;
} {
  const details = (breakdown?.details || []) as string[];
  const summary = (breakdown?.summary || '') as string;

  const priceMatch = details.find(d => d.startsWith('Price:'))?.match(/\$([\d.,]+)/);
  const volMatch = details.find(d => d.includes('Volume'))?.match(/\$([\d.,]+)/);
  const liqMatch = details.find(d => d.toLowerCase().includes('liquidity'))?.match(/\$([\d.,]+[KMB]?)/);
  const changeMatch = summary.match(/([-+]?[\d.]+)%/);

  return {
    priceUsd: priceMatch?.[1] || '0',
    priceChange24h: parseFloat(changeMatch?.[1] || '0'),
    volume24h: volMatch?.[1] || '0',
    liquidity: liqMatch?.[1] || '0',
    marketCap: '0',
  };
}

function parseWhaleDetails(breakdown: any): {
  recentBuys: number;
  recentSells: number;
  netFlow: string;
  largestTx: string;
} {
  const details = (breakdown?.details || []) as string[];

  const buyMatch = details.find(d => d.includes('buy'))?.match(/(\d+)/);
  const sellMatch = details.find(d => d.includes('sell'))?.match(/(\d+)/);
  const netFlowMatch = details.find(d => d.toLowerCase().includes('net flow'));
  const largestMatch = details.find(d => d.toLowerCase().includes('largest'));

  return {
    recentBuys: parseInt(buyMatch?.[1] || '0'),
    recentSells: parseInt(sellMatch?.[1] || '0'),
    netFlow: netFlowMatch?.split(':')[1]?.trim() || 'Unknown',
    largestTx: largestMatch?.split(':')[1]?.trim() || 'N/A',
  };
}

function parseSentimentDetails(breakdown: any): {
  score: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  reasoning: string;
} {
  const details = (breakdown?.details || []) as string[];
  const summary = (breakdown?.summary || '') as string;

  const scoreMatch = details.find(d => d.includes('score'))?.match(/([-\d]+)/);
  const signal: 'bullish' | 'bearish' | 'neutral' =
    summary.toLowerCase().includes('bullish') ? 'bullish' :
    summary.toLowerCase().includes('bearish') ? 'bearish' : 'neutral';

  return {
    score: parseInt(scoreMatch?.[1] || '50'),
    signal,
    reasoning: details[details.length - 1] || summary,
  };
}

function transformAnalysisResponse(raw: any): IntelligenceReport {
  const report = raw.report || raw;
  const payments = raw.payments?.breakdown || [];

  return {
    tokenAddress: report.tokenAddress,
    tokenSymbol: report.tokenSymbol || report.tokenName || 'UNKNOWN',
    riskScore: report.overallRiskScore ?? 50,
    opportunityScore: report.opportunityScore ?? 50,
    recommendation: report.recommendation || 'HOLD',
    keyFindings: report.keyFindings || [],
    security: parseSecurityDetails(report.breakdown?.security?.details || []),
    price: parsePriceDetails(report.breakdown?.price),
    whale: parseWhaleDetails(report.breakdown?.whaleActivity),
    sentiment: parseSentimentDetails(report.breakdown?.sentiment),
    payments: payments.map((p: any) => ({
      dataSource: p.service,
      amount: (parseFloat(p.amount) / 1e18).toFixed(6),
      txHash: p.txHash || '',
      queryType: p.service,
      timestamp: Date.now(),
    })),
    analyzedAt: report.generatedAt || new Date().toISOString(),
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

export async function analyzeToken(
  tokenAddress: string
): Promise<IntelligenceReport> {
  const res = await fetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokenAddress }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `Analysis failed (${res.status}): ${errorBody}`
    );
  }

  const raw = await res.json();
  if (!raw.success) {
    throw new Error(raw.error || 'Analysis failed');
  }

  return transformAnalysisResponse(raw);
}

export async function getPaymentHistory(): Promise<PaymentRecord[]> {
  const res = await fetch(`${API_URL}/api/payments`);

  if (!res.ok) {
    throw new Error(`Failed to fetch payment history (${res.status})`);
  }

  const data = await res.json();
  return data.payments || [];
}

export async function getAgentStats(): Promise<AgentStats> {
  const res = await fetch(`${API_URL}/api/stats`);

  if (!res.ok) {
    throw new Error(`Failed to fetch agent stats (${res.status})`);
  }

  const data = await res.json();
  return {
    totalSpent: data.stats?.totalSpent || '0',
    totalQueries: data.stats?.queryCount || 0,
    averageCostPerQuery: '0',
    queriesByCategory: {},
    dailySpending: [],
  };
}

export async function getAgentBalance(): Promise<AgentBalance> {
  const res = await fetch(`${API_URL}/api/stats`);

  if (!res.ok) {
    throw new Error(`Failed to fetch agent balance (${res.status})`);
  }

  const data = await res.json();
  return {
    bnb: data.balances?.bnb || '0',
    usdt: data.balances?.usdt || '0',
  };
}
