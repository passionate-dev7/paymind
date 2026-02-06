'use client';

import { useState, useEffect, useMemo } from 'react';
import { getPaymentHistory } from '@/lib/api';
import type { PaymentRecord } from '@/types';

function formatAmount(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return '$0.00';
  if (num >= 1) return `$${num.toFixed(2)}`;
  return `$${num.toFixed(6)}`;
}

function getSourceStyle(source: string): { color: string; bg: string } {
  const s = source.toLowerCase();
  if (s.includes('security') || s.includes('honeypot'))
    return { color: '#ff6b6b', bg: 'rgba(255, 107, 107, 0.08)' };
  if (s.includes('price') || s.includes('dex'))
    return { color: '#00b894', bg: 'rgba(0, 184, 148, 0.08)' };
  if (s.includes('whale'))
    return { color: '#0984e3', bg: 'rgba(9, 132, 227, 0.08)' };
  if (s.includes('sentiment') || s.includes('social'))
    return { color: '#6c5ce7', bg: 'rgba(108, 92, 231, 0.08)' };
  return { color: '#8b95ad', bg: 'rgba(139, 149, 173, 0.08)' };
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState('all');

  useEffect(() => {
    async function fetchPayments() {
      try {
        const data = await getPaymentHistory();
        setPayments(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch payments'
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchPayments();
  }, []);

  const uniqueSources = useMemo(
    () => ['all', ...Array.from(new Set(payments.map((p) => p.dataSource)))],
    [payments]
  );

  const filteredPayments = useMemo(() => {
    if (filterSource === 'all') return payments;
    return payments.filter((p) => p.dataSource === filterSource);
  }, [payments, filterSource]);

  const stats = useMemo(() => {
    const total = filteredPayments.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0
    );
    return {
      totalSpent: total,
      totalQueries: filteredPayments.length,
      avgCost: filteredPayments.length > 0 ? total / filteredPayments.length : 0,
    };
  }, [filteredPayments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Transactions</h1>
          <p className="mt-0.5 text-sm" style={{ color: '#6b7a99' }}>
            x402 micropayment ledger
          </p>
        </div>
        <span className="x402-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          x402 Protocol
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="section-label">Total Spent</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatAmount(stats.totalSpent.toFixed(6))}
          </p>
          <p className="mt-0.5 text-[0.7rem]" style={{ color: '#4a5568' }}>USDT via x402</p>
        </div>
        <div className="stat-card">
          <p className="section-label">Transactions</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {stats.totalQueries.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[0.7rem]" style={{ color: '#4a5568' }}>data queries paid</p>
        </div>
        <div className="stat-card">
          <p className="section-label">Avg Cost / Query</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatAmount(stats.avgCost.toFixed(6))}
          </p>
          <p className="mt-0.5 text-[0.7rem]" style={{ color: '#4a5568' }}>per data source</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <p className="section-label">Filter</p>
        <div className="flex flex-wrap gap-1.5">
          {uniqueSources.map((src) => (
            <button
              key={src}
              onClick={() => setFilterSource(src)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: filterSource === src ? 'rgba(108, 92, 231, 0.15)' : 'transparent',
                color: filterSource === src ? '#a29bfe' : '#6b7a99',
                border: `1px solid ${filterSource === src ? 'rgba(108, 92, 231, 0.3)' : 'var(--border-subtle)'}`,
              }}
            >
              {src === 'all' ? 'All' : src}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl p-4 text-center text-sm"
          style={{
            background: 'rgba(255, 107, 107, 0.06)',
            border: '1px solid rgba(255, 107, 107, 0.2)',
            color: '#ff6b6b',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="spinner" />
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <div
          className="overflow-hidden rounded-xl"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          <div className="overflow-x-auto">
            <table className="table-pro w-full">
              <thead>
                <tr>
                  <th className="text-left">Timestamp</th>
                  <th className="text-left">Source</th>
                  <th className="text-left">Type</th>
                  <th className="text-right">Amount</th>
                  <th className="text-left">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center"
                      style={{ color: '#4a5568' }}
                    >
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment, idx) => {
                    const style = getSourceStyle(payment.dataSource);
                    return (
                      <tr key={`${payment.txHash}-${idx}`}>
                        <td className="whitespace-nowrap">
                          <span className="font-mono text-xs" style={{ color: '#8b95ad' }}>
                            {new Date(payment.timestamp * 1000).toLocaleDateString(
                              undefined,
                              { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                            )}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">
                          <span
                            className="rounded-md px-2 py-0.5 text-[0.7rem] font-semibold"
                            style={{ color: style.color, background: style.bg }}
                          >
                            {payment.dataSource}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="text-xs" style={{ color: '#6b7a99' }}>
                            {payment.queryType}
                          </span>
                        </td>
                        <td className="whitespace-nowrap text-right">
                          <span className="font-mono text-xs font-semibold" style={{ color: '#00b894' }}>
                            {formatAmount(payment.amount)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">
                          {payment.txHash ? (
                            <a
                              href={`https://bscscan.com/tx/${payment.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs transition-colors"
                              style={{ color: '#6c5ce7' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#a29bfe')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#6c5ce7')}
                            >
                              {payment.txHash.slice(0, 8)}...{payment.txHash.slice(-6)}
                            </a>
                          ) : (
                            <span className="text-xs" style={{ color: '#3d4560' }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
