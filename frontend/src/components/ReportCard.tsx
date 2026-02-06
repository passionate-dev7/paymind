'use client';

interface ReportCardProps {
  title: string;
  icon: React.ReactNode;
  data: Record<string, string | number | boolean>;
  txHash?: string;
  paidAmount?: string;
}

function formatValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(2);
  }
  return String(value);
}

function getValueColor(
  key: string,
  value: string | number | boolean
): string {
  const k = key.toLowerCase();
  if (typeof value === 'boolean') {
    if (k.includes('honeypot') || k.includes('mint') || k.includes('proxy')) {
      return value ? '#ff6b6b' : '#00b894';
    }
    return value ? '#00b894' : '#6b7a99';
  }
  if (k.includes('change') && typeof value === 'string') {
    return value.startsWith('-') ? '#ff6b6b' : '#00b894';
  }
  if (k.includes('risk')) {
    const v = String(value).toLowerCase();
    if (v === 'low') return '#00b894';
    if (v === 'medium' || v === 'moderate') return '#fdcb6e';
    return '#ff6b6b';
  }
  if (k.includes('signal')) {
    const v = String(value).toLowerCase();
    if (v === 'bullish') return '#00b894';
    if (v === 'bearish') return '#ff6b6b';
    return '#fdcb6e';
  }
  return '#d1d8e8';
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export default function ReportCard({
  title,
  icon,
  data,
  txHash,
  paidAmount,
}: ReportCardProps) {
  return (
    <div className="card-elevated animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
            style={{ background: 'rgba(108, 92, 231, 0.1)' }}
          >
            {icon}
          </div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        {paidAmount && (
          <span className="x402-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {paidAmount} USDT
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pb-4">
        <div className="space-y-1.5">
          {Object.entries(data).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ background: 'rgba(6, 8, 15, 0.4)' }}
            >
              <span className="text-xs" style={{ color: '#6b7a99' }}>
                {formatKey(key)}
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: getValueColor(key, value) }}
              >
                {formatValue(value)}
              </span>
            </div>
          ))}
        </div>

        {/* Tx link */}
        {txHash && (
          <div className="mt-3 flex items-center justify-end">
            <a
              href={`https://bscscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: '#6c5ce7' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#a29bfe')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6c5ce7')}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
              </svg>
              View on BSCScan
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
