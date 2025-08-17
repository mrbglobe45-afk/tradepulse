'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';

type EquityPoint = { date?: string; x: number; value: number };
type Segment = { sign: 1 | -1; data: EquityPoint[] };
type MiniDatum = { name: string; value: number };

const LINE = '#7E6DFF';
const GREEN = '#00F5A8';
const RED   = '#FF2F66';

function r2(n: number) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** GRAND GRAPH d’équité (client-only) */
export default function ChartsIsland({
  equityR,
  segments,
  yDomain,
  showMonetary,
  riskPerTrade,
  currencySymbol,
}: {
  equityR: EquityPoint[];
  segments: Segment[];
  yDomain: [number, number];
  showMonetary: boolean;
  riskPerTrade: number;
  currencySymbol: string; // "€" ou "$"
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={equityR} margin={{ left: 12, right: 12 }}>
        <defs>
          <linearGradient id="eqPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={GREEN} stopOpacity={0.9} />
            <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="eqNeg" x1="0" y1="1" x2="0" y2="0">
            <stop offset="5%"  stopColor={RED} stopOpacity={0.9} />
            <stop offset="95%" stopColor={RED} stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} hide />
        <YAxis hide domain={yDomain} />
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload || !payload.length) return null;
            const p: any = payload[0]?.payload || {};
            const v = typeof p.value === 'number' ? p.value : 0;
            const out = showMonetary ? `${currencySymbol}${r2(v * riskPerTrade)}` : `${r2(v)}R`;
            return (
              <div className="rounded-md border border-white/20 bg-black/70 px-3 py-2 text-xs text-white">
                <div className="font-semibold mb-1">{p.date ? `Trade du ${p.date}` : 'Point technique'}</div>
                <div>{out}</div>
              </div>
            );
          }}
        />

        {segments.map((seg, i) => (
          <Area
            key={i}
            type="linear"
            data={seg.data}
            dataKey="value"
            stroke="none"
            fill={seg.sign >= 0 ? 'url(#eqPos)' : 'url(#eqNeg)'}
            isAnimationActive={false}
            connectNulls
          />
        ))}

        <Line
          type="linear"
          dataKey="value"
          stroke={LINE}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          strokeLinecap="round"
          strokeLinejoin="round"
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** MINI BAR CHART (profit par symbole/setup/direction) — client-only */
export function MiniBarIsland({
  data,
  unitLabel,
}: {
  data: MiniDatum[];
  unitLabel: string; // "R", "€", "$"
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="name"
          // cast pour ne pas se battre avec les types Recharts
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 } as any}
          tickLine={false}
          axisLine={false}
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          content={({ active, payload, label }: any) => {
            if (!active || !payload || !payload.length) return null;
            const v = Number(payload[0].value || 0);
            const s = unitLabel === 'R' ? `${r2(v)}R` : `${unitLabel}${r2(v)}`;
            return (
              <div className="rounded-md border border-white/20 bg-black/70 px-3 py-2 text-xs text-white">
                {label}: {s}
              </div>
            );
          }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value >= 0 ? GREEN : RED} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
