'use client';

import { useEffect, useRef } from 'react';
import type { PaymentRecord } from '@/types';

interface PaymentFeedProps {
  payments: PaymentRecord[];
  totalSpent?: string;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getSourceLabel(source: string): { label: string; color: string; bg: string } {
  const s = source.toLowerCase();
  if (s.includes('security') || s.includes('honeypot'))
    return { label: 'Security', color: '#ff6b6b', bg: 'rgba(255, 107, 107, 0.1)' };
  if (s.includes('price') || s.includes('dex'))
    return { label: 'Price', color: '#00b894', bg: 'rgba(0, 184, 148, 0.1)' };
  if (s.includes('whale'))
    return { label: 'Whale', color: '#0984e3', bg: 'rgba(9, 132, 227, 0.1)' };
  if (s.includes('sentiment') || s.includes('social'))
    return { label: 'Sentiment', color: '#6c5ce7', bg: 'rgba(108, 92, 231, 0.1)' };
  return { label: 'Query', color: '#8b95ad', bg: 'rgba(139, 149, 173, 0.1)' };
}

export default function PaymentFeed({
  payments,
  totalSpent,
}: PaymentFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [payments.length]);

  if (payments.length === 0) {
    return null;
  }

  const reversed = [...payments].reverse();

  return (
    <div className="card-glass p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ background: '#00b894' }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: '#00b894' }}
            />
          </div>
          <h3 className="text-sm font-semibold text-white">x402 Payment Stream</h3>
        </div>
        {totalSpent && (
          <span className="text-xs font-semibold" style={{ color: '#00b894' }}>
            {totalSpent} USDT total
          </span>
        )}
      </div>
      <div
        ref={scrollRef}
        className="max-h-64 space-y-1.5 overflow-y-auto pr-1"
      >
        {reversed.map((payment, idx) => {
          const source = getSourceLabel(payment.dataSource);
          return (
            <div
              key={`${payment.txHash}-${idx}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all"
              style={{
                background: idx === 0 ? 'rgba(0, 184, 148, 0.04)' : 'transparent',
                borderLeft: idx === 0 ? '2px solid rgba(0, 184, 148, 0.4)' : '2px solid transparent',
              }}
            >
              {/* Source badge */}
              <span
                className="shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-semibold"
                style={{ color: source.color, background: source.bg }}
              >
                {source.label}
              </span>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs" style={{ color: '#8b95ad' }}>
                  {payment.dataSource}
                </p>
              </div>

              {/* Amount */}
              <span className="shrink-0 font-mono text-xs font-semibold" style={{ color: '#00b894' }}>
                {payment.amount}
              </span>

              {/* Time */}
              <span className="shrink-0 font-mono text-[0.65rem]" style={{ color: '#4a5568' }}>
                {formatTime(payment.timestamp)}
              </span>

              {/* Tx link */}
              {payment.txHash && (
                <a
                  href={`https://bscscan.com/tx/${payment.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[0.65rem] transition-colors"
                  style={{
                    color: '#6c5ce7',
                    border: '1px solid rgba(108, 92, 231, 0.2)',
                  }}
                >
                  Tx
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
