'use client';

import { useEffect, useState } from 'react';

interface RiskGaugeProps {
  score: number;
  label: string;
  invertColor?: boolean;
}

function getColor(score: number, invert: boolean): string {
  const s = invert ? 100 - score : score;
  if (s <= 30) return '#00b894';
  if (s <= 60) return '#fdcb6e';
  if (s <= 80) return '#e17055';
  return '#ff6b6b';
}

function getLabel(score: number, invert: boolean): string {
  const s = invert ? 100 - score : score;
  if (s <= 30) return 'Low';
  if (s <= 60) return 'Moderate';
  if (s <= 80) return 'High';
  return 'Critical';
}

export default function RiskGauge({
  score,
  label,
  invertColor = false,
}: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 150);
    return () => clearTimeout(timer);
  }, [score]);

  const color = getColor(score, invertColor);
  const levelText = getLabel(score, invertColor);

  // SVG arc
  const cx = 80;
  const cy = 80;
  const radius = 62;
  const strokeWidth = 8;
  const startAngle = 135;
  const endAngle = 405;
  const range = endAngle - startAngle;
  const circumference = (range / 360) * 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  function polarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  function describeArc(startA: number, endA: number) {
    const start = polarToCartesian(endA);
    const end = polarToCartesian(startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  const arcPath = describeArc(startAngle, endAngle);

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="130" viewBox="0 0 160 160">
        {/* Track */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(100, 116, 160, 0.1)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference - progress}
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease',
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
        {/* Score text */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fill={color}
          fontSize="32"
          fontWeight="700"
          fontFamily="var(--font-sans, system-ui)"
          style={{ transition: 'fill 0.5s ease' }}
        >
          {animatedScore}
        </text>
        {/* Level text */}
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          fill="#6b7a99"
          fontSize="11"
          fontWeight="500"
          fontFamily="var(--font-sans, system-ui)"
        >
          {levelText}
        </text>
      </svg>
      <p className="-mt-3 text-xs font-medium" style={{ color: '#8b95ad' }}>
        {label}
      </p>
    </div>
  );
}
