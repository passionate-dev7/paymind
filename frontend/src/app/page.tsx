'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import TokenSearch from '@/components/TokenSearch';
import RiskGauge from '@/components/RiskGauge';
import ReportCard from '@/components/ReportCard';
import PaymentFeed from '@/components/PaymentFeed';
import { analyzeToken } from '@/lib/api';
import type { IntelligenceReport } from '@/types';

const DEFAULT_TOKEN = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';

type PipelineStage = 'idle' | 'query' | 'payment' | 'datasource' | 'analysis' | 'done';

function formatUsd(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  if (num >= 1) return `$${num.toFixed(2)}`;
  return `$${num.toFixed(6)}`;
}

export default function Dashboard() {
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle');
  const autoRanRef = useRef(false);

  const handleSearch = useCallback(async (address: string) => {
    setIsLoading(true);
    setError(null);
    setReport(null);
    setPipelineStage('query');

    // Simulate pipeline progression
    const t1 = setTimeout(() => setPipelineStage('payment'), 1200);
    const t2 = setTimeout(() => setPipelineStage('datasource'), 2800);
    const t3 = setTimeout(() => setPipelineStage('analysis'), 4500);

    try {
      const result = await analyzeToken(address);
      setReport(result);
      setPipelineStage('done');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
      setPipelineStage('idle');
    } finally {
      setIsLoading(false);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    }
  }, []);

  // Auto-run analysis on first load
  useEffect(() => {
    if (!autoRanRef.current) {
      autoRanRef.current = true;
      handleSearch(DEFAULT_TOKEN);
    }
  }, [handleSearch]);

  const totalSpent = report?.payments
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)
    .toFixed(4);

  const recommendationClass = {
    BUY: 'badge-buy',
    HOLD: 'badge-hold',
    AVOID: 'badge-avoid',
  };

  const stages: { key: PipelineStage; label: string; sub: string }[] = [
    { key: 'query', label: 'Query', sub: 'Token lookup' },
    { key: 'payment', label: 'x402 Pay', sub: 'Micropayment' },
    { key: 'datasource', label: 'Data Sources', sub: 'Fetching intel' },
    { key: 'analysis', label: 'AI Analysis', sub: 'Generating report' },
  ];

  function stageStatus(stageKey: PipelineStage): 'idle' | 'active' | 'done' {
    const order: PipelineStage[] = ['query', 'payment', 'datasource', 'analysis', 'done'];
    const currentIdx = order.indexOf(pipelineStage);
    const stageIdx = order.indexOf(stageKey);
    if (pipelineStage === 'idle') return 'idle';
    if (stageIdx < currentIdx || pipelineStage === 'done') return 'done';
    if (stageIdx === currentIdx) return 'active';
    return 'idle';
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Token Intelligence
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: '#6b7a99' }}>
            Autonomous analysis with verifiable x402 data payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bnb-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L7.172 4.828l-1.414-1.414L12-2.828l6.242 6.242-1.414 1.414L12 0zm-7.172 12L0 16.828l4.828 4.828 1.414-1.414L1.414 16.828 4.828 12zM12 24l4.828-4.828 1.414 1.414L12 26.828l-6.242-6.242 1.414-1.414L12 24zm7.172-12L24 7.172l-4.828-4.828-1.414 1.414 4.828 4.828L19.172 12zM12 8l4 4-4 4-4-4 4-4z" />
            </svg>
            BNB Chain
          </span>
          <span className="x402-badge">x402 Protocol</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="card-glass p-4">
        <TokenSearch
          onSearch={handleSearch}
          isLoading={isLoading}
          defaultAddress={DEFAULT_TOKEN}
        />
      </div>

      {/* Pipeline visualization */}
      {(isLoading || report) && (
        <div className="flex flex-wrap items-center justify-center gap-2 py-2">
          {stages.map((stage, i) => {
            const status = stageStatus(stage.key);
            return (
              <div key={stage.key} className="flex items-center gap-2">
                <div
                  className={`pipeline-step ${status === 'active' ? 'active' : ''} ${status === 'done' ? 'done' : ''}`}
                >
                  {status === 'done' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00b894" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : status === 'active' ? (
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  ) : (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: '#2d3348' }}
                    />
                  )}
                  <div>
                    <p className="text-xs font-semibold" style={{ color: status === 'done' ? '#00b894' : status === 'active' ? '#a29bfe' : '#4a5568' }}>
                      {stage.label}
                    </p>
                    <p className="text-[0.6rem]" style={{ color: '#4a5568' }}>{stage.sub}</p>
                  </div>
                </div>
                {i < stages.length - 1 && <div className="pipeline-connector hidden sm:block" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Loading state */}
      {isLoading && !report && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="spinner" style={{ width: 40, height: 40 }} />
          <p className="text-sm font-medium" style={{ color: '#a29bfe' }}>
            Agent is acquiring intelligence...
          </p>
          <p className="text-xs" style={{ color: '#4a5568' }}>
            Paying data providers via x402 micropayments on BNB Chain
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="rounded-xl p-5 text-center"
          style={{
            background: 'rgba(255, 107, 107, 0.06)',
            border: '1px solid rgba(255, 107, 107, 0.2)',
          }}
        >
          <p className="text-sm font-semibold" style={{ color: '#ff6b6b' }}>Analysis Failed</p>
          <p className="mt-1 text-xs" style={{ color: '#ff6b6b99' }}>{error}</p>
        </div>
      )}

      {/* Results */}
      {report && (
        <div className="space-y-5 animate-fade-up">
          {/* Token header + scores row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Left: Token info */}
            <div className="card-elevated lg:col-span-5">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Token avatar */}
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                    style={{
                      background: 'linear-gradient(135deg, #6c5ce7, #0984e3)',
                    }}
                  >
                    {report.tokenSymbol.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">
                        {report.tokenSymbol}
                      </h2>
                      <span className={recommendationClass[report.recommendation]}>
                        {report.recommendation}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[0.7rem]" style={{ color: '#4a5568' }}>
                      {report.tokenAddress}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="section-label">Price</p>
                        <p className="mt-0.5 text-lg font-bold text-white">
                          {formatUsd(report.price.priceUsd)}
                        </p>
                      </div>
                      <div>
                        <p className="section-label">24h Change</p>
                        <p
                          className="mt-0.5 text-lg font-bold"
                          style={{
                            color: report.price.priceChange24h >= 0 ? '#00b894' : '#ff6b6b',
                          }}
                        >
                          {report.price.priceChange24h >= 0 ? '+' : ''}
                          {report.price.priceChange24h.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="section-label">Volume 24h</p>
                        <p className="mt-0.5 text-sm font-semibold text-white">
                          {formatUsd(report.price.volume24h)}
                        </p>
                      </div>
                      <div>
                        <p className="section-label">Liquidity</p>
                        <p className="mt-0.5 text-sm font-semibold text-white">
                          {formatUsd(report.price.liquidity)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Gauges */}
            <div className="card-glass flex items-center justify-around lg:col-span-4">
              <RiskGauge
                score={report.riskScore}
                label="Risk Score"
                invertColor={false}
              />
              <div className="h-16 w-px" style={{ background: 'var(--border-subtle)' }} />
              <RiskGauge
                score={report.opportunityScore}
                label="Opportunity"
                invertColor={true}
              />
            </div>

            {/* Sentiment quick card */}
            <div className="card-glass flex flex-col justify-between p-5 lg:col-span-3">
              <p className="section-label">Market Sentiment</p>
              <div className="my-2">
                <span
                  className="text-2xl font-bold"
                  style={{
                    color:
                      report.sentiment.signal === 'bullish'
                        ? '#00b894'
                        : report.sentiment.signal === 'bearish'
                        ? '#ff6b6b'
                        : '#fdcb6e',
                  }}
                >
                  {report.sentiment.signal.charAt(0).toUpperCase() +
                    report.sentiment.signal.slice(1)}
                </span>
                <span className="ml-2 text-sm font-semibold" style={{ color: '#6b7a99' }}>
                  {report.sentiment.score}/100
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#6b7a99' }}>
                {report.sentiment.reasoning}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00b894" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                  <span className="text-xs font-semibold" style={{ color: '#00b894' }}>
                    {report.whale.recentBuys} buys
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                  <span className="text-xs font-semibold" style={{ color: '#ff6b6b' }}>
                    {report.whale.recentSells} sells
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Findings */}
          {report.keyFindings.length > 0 && (
            <div className="card-glass p-5">
              <p className="section-label mb-3">AI Narrative</p>
              <div className="space-y-2">
                {report.keyFindings.map((finding, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: 'linear-gradient(135deg, #6c5ce7, #0984e3)' }}
                    />
                    <span className="text-sm leading-relaxed" style={{ color: '#b0b8cc' }}>
                      {finding}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data source cards - 2x2 grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ReportCard
              title="Security Audit"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              }
              data={{
                isHoneypot: report.security.isHoneypot,
                ownerCanMint: report.security.ownerCanMint,
                hasProxyContract: report.security.hasProxyContract,
                buyTax: report.security.buyTax + '%',
                sellTax: report.security.sellTax + '%',
                holderCount: report.security.holderCount,
                riskLevel: report.security.riskLevel,
              }}
              txHash={
                report.payments.find((p) =>
                  p.dataSource.toLowerCase().includes('security')
                )?.txHash
              }
              paidAmount={
                report.payments.find((p) =>
                  p.dataSource.toLowerCase().includes('security')
                )?.amount
              }
            />

            <ReportCard
              title="Price Intelligence"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00b894" strokeWidth="2" strokeLinecap="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              }
              data={{
                priceUsd: formatUsd(report.price.priceUsd),
                priceChange24h: `${report.price.priceChange24h >= 0 ? '+' : ''}${report.price.priceChange24h}%`,
                volume24h: formatUsd(report.price.volume24h),
                liquidity: formatUsd(report.price.liquidity),
                marketCap: formatUsd(report.price.marketCap),
              }}
              txHash={
                report.payments.find((p) =>
                  p.dataSource.toLowerCase().includes('price') ||
                  p.dataSource.toLowerCase().includes('dex')
                )?.txHash
              }
              paidAmount={
                report.payments.find((p) =>
                  p.dataSource.toLowerCase().includes('price') ||
                  p.dataSource.toLowerCase().includes('dex')
                )?.amount
              }
            />

            <ReportCard
              title="Whale Tracker"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0984e3" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              }
              data={{
                recentBuys: report.whale.recentBuys,
                recentSells: report.whale.recentSells,
                netFlow: report.whale.netFlow,
                largestTx: report.whale.largestTx,
              }}
              txHash={
                report.payments.find((p) =>
                  p.dataSource.toLowerCase().includes('whale')
                )?.txHash
              }
              paidAmount={
                report.payments.find((p) =>
                  p.dataSource.toLowerCase().includes('whale')
                )?.amount
              }
            />

            <ReportCard
              title="Sentiment Analysis"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              }
              data={{
                score: report.sentiment.score,
                signal: report.sentiment.signal,
                reasoning: report.sentiment.reasoning,
              }}
              txHash={
                report.payments.find((p) =>
                  p.dataSource.toLowerCase().includes('sentiment')
                )?.txHash
              }
              paidAmount={
                report.payments.find((p) =>
                  p.dataSource.toLowerCase().includes('sentiment')
                )?.amount
              }
            />
          </div>

          {/* Payment stream */}
          <PaymentFeed
            payments={report.payments}
            totalSpent={totalSpent}
          />

          {/* Footer info */}
          <div className="flex items-center justify-between py-2">
            <p className="text-[0.65rem]" style={{ color: '#3d4560' }}>
              Report generated {new Date(report.analyzedAt).toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <span className="x402-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {report.payments.length} x402 payments
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state for first-time visitors (won't show since auto-run) */}
      {!isLoading && !report && !error && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(108, 92, 231, 0.1)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: '#6b7a99' }}>
            Enter a BSC token address to start analysis
          </p>
        </div>
      )}
    </div>
  );
}
