'use client';

import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Line,
  BarChart, Bar, Cell, ReferenceLine, CartesianGrid
} from 'recharts';

const GREEN = '#00F5A8';
const RED   = '#FF2F66';
const LINE  = '#7E6DFF';

type EquityPoint = { date?: string; x: number; value: number };

export default function ChartsIsland(props: {
  equityR: EquityPoint[];
  segments: { sign: 1 | -1; data: EquityPoint[] }[];
  yDomain: [number, number];
  showMonetary: boolean;
  currencySymbol: string;
  riskPerTrade: number;
  bySymbol: { name: string; value: number }[];
  bySetup:  { name: string; value: number }[];
  byDir:    { name: string; value: number }[];
}) {
  const fmtMoney = (v: number) => `${props.currencySymbol}${Math.round(v * props.riskPerTrade * 100) / 100}`;
  const fmtR = (v: number) => `${Math.round(v * 100) / 100}R`;
  const unitLabel = props.showMonetary ? props.currencySymbol : 'R';

  return (
    <>
      {/* COURBE D’ÉQUITÉ */}
      <div className="h-[26rem] md:h-[30rem]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={props.equityR} margin={{ left: 12, right: 12 }}>
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

            <XAxis dataKey="x" type="number" domain={['dataMin','dataMax']} hide />
            <YAxis hide domain={props.yDomain} />
            <Tooltip
              content={({ active, payload }: any) => {
                if (!active || !payload || !payload.length) return null;
                const p: any = payload[0]?.payload || {};
                const v = typeof p.value === 'number' ? p.value : 0;
                return (
                  <div className="rounded-md border border-white/20 bg-black/70 px-3 py-2 text-xs text-white">
                    <div className="font-semibold mb-1">{p.date ? `Trade du ${p.date}` : 'Point technique'}</div>
                    <div>{props.showMonetary ? fmtMoney(v) : fmtR(v)}</div>
                  </div>
                );
              }}
            />

            {props.segments.map((seg, i) => (
              <Area
                key={i}
                type="linear"
                data={seg.data}
                dataKey="value"
                stroke="none"
                fill={seg.sign >= 0 ? 'url(#eqPos)' : 'url(#eqNeg)'}
                isAnimationActive={false}
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
      </div>

      {/* MINI BAR CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {[['Profit par symbole', props.bySymbol],
          ['Profit par setup', props.bySetup],
          ['Profit par direction', props.byDir]].map(([title, data], idx) => (
          <div key={idx} className="rounded-2xl p-4 border border-white/20 bg-white/5 h-60">
            <div className="text-sm text-white/85 mb-2">{String(title)} ({unitLabel})</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data as any} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis hide domain={(data as any[]).length ? undefined : [-1, 1]} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload || !payload.length) return null;
                    const v = Number(payload[0].value || 0);
                    const s = unitLabel === 'R'
                      ? `${Math.round(v*100)/100}R`
                      : `${unitLabel}${Math.round(v*100)/100}`;
                    return <div className="rounded-md border border-white/20 bg-black/70 px-3 py-2 text-xs text-white">{label}: {s}</div>;
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {(data as any[]).map((d, i) => (<Cell key={i} fill={d.value >= 0 ? GREEN : RED} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </>
  );
}
