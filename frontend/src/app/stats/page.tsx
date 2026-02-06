'use client';

import { useState, useEffect } from 'react';
import { getAgentStats, getAgentBalance } from '@/lib/api';
import type { AgentStats, AgentBalance } from '@/types';

function formatUsd(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  if (num >= 0.01) return `$${num.toFixed(2)}`;
  return `$${num.toFixed(6)}`;
}

function BarChart({
  data,
}: {
  data: { date: string; amount: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-xs" style={{ color: '#4a5568' }}>
        No spending data yet
      </div>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.amount), 0.001);

  return (
    <div className="flex h-44 items-end gap-1 pt-4">
      {data.map((item) => {
        const heightPct = (item.amount / maxAmount) * 100;
        return (
          <div
            key={item.date}
            className="group relative flex flex-1 flex-col items-center"
          >
            {/* Tooltip */}
            <div
              className="pointer-events-none absolute -top-8 z-10 hidden rounded-md px-2 py-1 text-[0.65rem] shadow-lg group-hover:block"
              style={{ background: 'rgba(15, 18, 30, 0.95)', color: '#d1d8e8', border: '1px solid var(--border-subtle)' }}
            >
              {formatUsd(item.amount)}
            </div>
            {/* Bar */}
            <div
              className="w-full min-w-[4px] rounded-t transition-all duration-500"
              style={{
                height: `${Math.max(heightPct, 3)}%`,
                background: 'linear-gradient(180deg, #6c5ce7, #0984e3)',
                opacity: 0.8,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
            />
            {/* Label */}
            <span className="mt-1.5 text-[0.55rem]" style={{ color: '#3d4560' }}>
              {item.date.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CategoryBars({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-xs" style={{ color: '#4a5568' }}>
        No category data yet
      </div>
    );
  }

  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  const colors = ['#6c5ce7', '#0984e3', '#00b894', '#fdcb6e', '#e17055', '#a29bfe'];

  return (
    <div className="space-y-3">
      {entries.map(([category, count], i) => (
        <div key={category}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs" style={{ color: '#8b95ad' }}>{category}</span>
            <span className="font-mono text-[0.7rem] font-semibold" style={{ color: '#d1d8e8' }}>{count}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(100, 116, 160, 0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(count / maxVal) * 100}%`,
                background: colors[i % colors.length],
                opacity: 0.75,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [balance, setBalance] = useState<AgentBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, balanceData] = await Promise.all([
          getAgentStats(),
          getAgentBalance(),
        ]);
        setStats(statsData);
        setBalance(balanceData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch stats'
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
          <p className="mt-0.5 text-sm" style={{ color: '#6b7a99' }}>
            Agent performance and spending
          </p>
        </div>
        <div className="flex gap-2">
          <span className="bnb-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L7.172 4.828l-1.414-1.414L12-2.828l6.242 6.242-1.414 1.414L12 0zm-7.172 12L0 16.828l4.828 4.828 1.414-1.414L1.414 16.828 4.828 12zM12 24l4.828-4.828 1.414 1.414L12 26.828l-6.242-6.242 1.414-1.414L12 24zm7.172-12L24 7.172l-4.828-4.828-1.414 1.414 4.828 4.828L19.172 12zM12 8l4 4-4 4-4-4 4-4z" />
            </svg>
            BNB Chain
          </span>
        </div>
      </div>

      {/* Balance / Stats cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: 'rgba(243, 186, 47, 0.1)' }}
            >
              <span className="text-[0.65rem] font-bold" style={{ color: '#f3ba2f' }}>BNB</span>
            </div>
            <p className="section-label">BNB Balance</p>
          </div>
          <p className="mt-3 text-xl font-bold text-white">
            {parseFloat(balance?.bnb || '0').toFixed(4)}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: 'rgba(0, 184, 148, 0.1)' }}
            >
              <span className="text-[0.65rem] font-bold" style={{ color: '#00b894' }}>$</span>
            </div>
            <p className="section-label">USDT Balance</p>
          </div>
          <p className="mt-3 text-xl font-bold text-white">
            {formatUsd(balance?.usdt || '0')}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: 'rgba(108, 92, 231, 0.1)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
            <p className="section-label">Total Spent</p>
          </div>
          <p className="mt-3 text-xl font-bold text-white">
            {formatUsd(stats?.totalSpent || '0')}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: 'rgba(9, 132, 227, 0.1)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0984e3" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <p className="section-label">Total Queries</p>
          </div>
          <p className="mt-3 text-xl font-bold text-white">
            {(stats?.totalQueries || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card-glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Daily Spending</h3>
            <p className="section-label">USDT / Day</p>
          </div>
          <BarChart data={stats?.dailySpending || []} />
        </div>

        <div className="card-glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Queries by Source</h3>
            <p className="section-label">Distribution</p>
          </div>
          <CategoryBars data={stats?.queriesByCategory || {}} />
        </div>
      </div>

      {/* Summary row */}
      <div className="card-elevated">
        <div className="grid grid-cols-2 gap-px sm:grid-cols-4" style={{ background: 'var(--border-subtle)' }}>
          {[
            { value: stats?.totalQueries || 0, label: 'Total Queries', color: '#6c5ce7' },
            { value: Object.keys(stats?.queriesByCategory || {}).length, label: 'Data Sources', color: '#0984e3' },
            { value: stats?.dailySpending?.length || 0, label: 'Active Days', color: '#00b894' },
            { value: 'x402', label: 'Payment Protocol', color: '#a29bfe' },
          ].map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center py-5"
              style={{ background: 'var(--surface-1)' }}
            >
              <p className="text-xl font-bold" style={{ color: item.color }}>
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </p>
              <p className="mt-1 text-[0.65rem]" style={{ color: '#4a5568' }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
