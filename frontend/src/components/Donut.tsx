import React from 'react';

type Slice = { label: string; value: number; color?: string };

export default function Donut({ data, total, onSliceClick }: { data: Slice[]; total?: number; onSliceClick?: (label: string) => void }) {
  const size = 200; const radius = 80; const stroke = 20; const c = 2 * Math.PI * radius;
  const computed = data.reduce((a, b) => a + b.value, 0);
  const sum = (total ?? computed) || 1;
  let offset = 0;
  const palette = [
    'url(#grad-accent)', '#38bdf8', '#e879f9', '#22c55e', '#f43f5e', '#f59e0b', '#94a3b8'
  ];
  return (
    <div className="flex items-start gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="grad-accent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <g transform={`translate(${size/2},${size/2})`}>
          <circle r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
          {data.map((s, i) => {
            const frac = Math.max(0, s.value / sum);
            const len = frac * c;
            const dash = `${len} ${c - len}`;
            const el = (
              <circle key={s.label}
                r={radius} fill="none" stroke={s.color || palette[i % palette.length]}
                strokeWidth={stroke} strokeDasharray={dash} strokeDashoffset={-offset}
                style={{ cursor: onSliceClick ? 'pointer' as const : 'default' }}
                onClick={() => onSliceClick && onSliceClick(s.label)}
              />
            );
            offset += len;
            return el;
          })}
        </g>
      </svg>
      <ul className="text-sm space-y-2">
        {data.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: s.color || palette[i % palette.length] }} />
            <span className="text-[color:var(--text)]">{s.label}</span>
            <span className="ml-auto text-[color:var(--text-dim)] tnum">{((s.value / sum) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
