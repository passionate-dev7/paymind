export interface IntelligenceReport {
  tokenAddress: string;
  tokenSymbol: string;
  riskScore: number;
  opportunityScore: number;
  recommendation: 'BUY' | 'HOLD' | 'AVOID';
  keyFindings: string[];
  security: SecurityAnalysis;
  price: PriceData;
  whale: WhaleActivity;
  sentiment: SentimentData;
  payments: PaymentRecord[];
  analyzedAt: string;
}

export interface PaymentRecord {
  dataSource: string;
  amount: string;
  txHash: string;
  queryType: string;
  timestamp: number;
}

export interface SecurityAnalysis {
  isHoneypot: boolean;
  ownerCanMint: boolean;
  hasProxyContract: boolean;
  buyTax: string;
  sellTax: string;
  holderCount: number;
  riskLevel: string;
}

export interface PriceData {
  priceUsd: string;
  priceChange24h: number;
  volume24h: string;
  liquidity: string;
  marketCap: string;
}

export interface WhaleActivity {
  recentBuys: number;
  recentSells: number;
  netFlow: string;
  largestTx: string;
}

export interface SentimentData {
  score: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  reasoning: string;
}

export interface AgentStats {
  totalSpent: string;
  totalQueries: number;
  averageCostPerQuery: string;
  queriesByCategory: Record<string, number>;
  dailySpending: { date: string; amount: number }[];
}

export interface AgentBalance {
  bnb: string;
  usdt: string;
}
