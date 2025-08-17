'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, TrendingUp, TrendingDown, ListPlus, Tags, Banknote, Settings, Trash2, Trophy, BarChart3, Brain
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, Line, BarChart, Bar, Cell, ReferenceLine, CartesianGrid
} from 'recharts';

/* ——— Constantes UI ——— */
const ACCENT = '#ff008e';
const LINE   = '#7E6DFF';
const GREEN  = '#00F5A8';
const RED    = '#FF2F66';
const CURRENCIES = { EUR: '€', USD: '$' } as const;

/* ——— Types locaux ——— */
type Direction = 'LONG'|'SHORT';
type TradeRow = {
  id: string;
  date: string;
  symbol: string;
  direction: Direction;
  setup?: string;
  notes?: string;
  R?: number;        // si non fourni, on peut le calculer via entry/stop/exit
  entry?: number;
  stop?: number;
  exit?: number;
};
type EquityPoint = { date?: string; x: number; value: number };

/* ——— Bouton Connexion / Déconnexion ——— */
function AuthButton() {
  const router = useRouter();
  const [email, setEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return email ? (
    <div className="flex items-center gap-2">
      <span className="hidden sm:block text-white/70 text-xs">{email}</span>
      <button
        className="rounded-2xl bg-transparent text-white border border-white/30 hover:bg-white/10 px-3 h-9"
        onClick={async () => {
          await supabase.auth.signOut();
          router.replace('/auth');
        }}
      >
        Déconnexion
      </button>
    </div>
  ) : (
    <Link
      href="/auth"
      className="rounded-2xl bg-transparent text-white border border-white/30 hover:bg-white/10 px-3 h-9 inline-flex items-center"
    >
      Connexion
    </Link>
  );
}

/* ——— Utils ——— */
const uid  = () => Math.random().toString(36).slice(2, 10);
const r2   = (n: any) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const pad2 = (n: number) => String(n).padStart(2, '0');

function fmtNum(n: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}
function fmtMoneyRight(val: number, code: keyof typeof CURRENCIES) {
  const sym = CURRENCIES[code] || '';
  return `${fmtNum(val)} ${sym}`;
}

/* ——— Dates ——— */
function parseIsoMaybe(s: string) {
  const d1 = new Date(s);
  if (!isNaN(d1.getTime())) return d1;
  const d2 = new Date(`${s}T00:00:00`);
  if (!isNaN(d2.getTime())) return d2;
  return null;
}
function safeTime(s: string | null | undefined) {
  const d = s ? parseIsoMaybe(s) : null;
  return d ? d.getTime() : null;
}
function isoBetween(a: string, b: string, t: number) {
  const A = safeTime(a), B = safeTime(b);
  if (A == null || B == null || !isFinite(t)) return `${String(a)}~${String(b)}@${Math.max(0, Math.min(100, Math.round(Number(t) * 100)))}`;
  const ms = A + t * (B - A);
  return new Date(ms).toISOString().slice(0, 10);
}
function prevDate(isoDate: string) {
  const t = safeTime(isoDate);
  if (t == null) return isoDate;
  const d = new Date(t);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
function safeNumber(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/* ——— Calculs Equity ——— */
function buildEquityR(dates: string[], Rs: number[]): EquityPoint[] {
  let cum = 0;
  const arr = dates.map((date, i) => {
    cum += safeNumber(Rs[i]);
    return { date, x: i + 1, value: cum };
  });
  return arr.length ? [{ date: prevDate(dates[0]), x: 0, value: 0 }, ...arr] : [];
}
function densifyAtZero(points: EquityPoint[]): EquityPoint[] {
  if (!Array.isArray(points) || points.length <= 1) return Array.isArray(points) ? points.slice() : [];
  const out: EquityPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const av = safeNumber(a?.value), bv = safeNumber(b?.value);
    const ax = Number(a?.x),       bx = Number(b?.x);
    const mid = (t: number): EquityPoint => {
      const mx = ax + t * (bx - ax);
      const date = (a?.date && b?.date) ? isoBetween(a.date!, b.date!, t) : '';
      return { date, x: mx, value: 0 };
    };
    if (av === 0 && bv === 0) { out.push(mid(0.5)); out.push(b); continue; }
    if (av === 0 || bv === 0 || av * bv > 0) { out.push(b); }
    else { const t = (bv - av) === 0 ? 0.5 : -av / (bv - av); out.push(mid(t)); out.push(b); }
  }
  return out;
}
function computeR(trade: Partial<TradeRow>) {
  const { direction, entry, stop, exit } = trade || {};
  if (entry == null || stop == null || exit == null || !direction) return 0;
  const risk = direction === 'LONG' ? entry - stop : stop - entry;
  if (!exit || risk === 0) return 0;
  const move = direction === 'LONG' ? exit - entry : entry - exit;
  return move / risk;
}
function longestStreaks(Rs: number[]) {
  let win = 0, bestWin = 0, loss = 0, bestLoss = 0;
  for (const r of Rs) {
    if (r > 0) { win++; loss = 0; bestWin = Math.max(bestWin, win); }
    else { loss++; win = 0; bestLoss = Math.max(bestLoss, loss); }
  }
  return { bestWin, bestLoss };
}

/* ——— App ——— */
export default function TradePulseApp() {
  const router = useRouter();

  /* Auth guard — si pas connecté => /auth */
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) router.replace('/auth');
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session) router.replace('/auth');
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);
  if (!authChecked) return null; // évite le flash

  /* SETTINGS */
  const [settings, setSettings] = useState({
    startingEquity: 10000,
    defaultRiskPerTrade: 100,
    currencyCode: 'EUR' as keyof typeof CURRENCIES,
    showMonetary: false,
  });

  /* Données persistées (localStorage) */
  const [trades, setTrades] = useState<TradeRow[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('mindrisk_trades') || '[]'); }
    catch { return []; }
  });
  const [symbols, setSymbols] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('mindrisk_symbols') || '[]'); }
    catch { return []; }
  });
  const [setups, setSetups] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('mindrisk_setups') || '[]'); }
    catch { return []; }
  });

  /* Filtres/UI */
  const [filters, setFilters] = useState({ q: '', symbol: 'ALL', direction: 'ALL', setup: 'ALL' });
  const [range, setRange] = useState('ALL');
  const [openNewTrade, setOpenNewTrade] = useState(false);
  const [editing, setEditing] = useState<TradeRow | null>(null);
  const [openSymbolsManager, setOpenSymbolsManager] = useState(false);
  const [openSetupsManager, setOpenSetupsManager] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  /* Brouillons pour la modale Réglages */
  const [startEqDraft, setStartEqDraft] = useState('');
  const [riskDraft, setRiskDraft] = useState('');
  useEffect(() => {
    if (openSettings) {
      setStartEqDraft(settings.startingEquity ? String(settings.startingEquity) : '');
      setRiskDraft(settings.defaultRiskPerTrade ? String(settings.defaultRiskPerTrade) : '');
    }
  }, [openSettings, settings.startingEquity, settings.defaultRiskPerTrade]);

  /* Persistences */
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('mindrisk_trades', JSON.stringify(trades)); }, [trades]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('mindrisk_symbols', JSON.stringify(symbols)); }, [symbols]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('mindrisk_setups', JSON.stringify(setups)); }, [setups]);

  /* Filtres + calculs */
  const startRange = useMemo(() => getRangeStart(range), [range]);

  const filtered = useMemo(() => {
    return trades
      .filter(t => (filters.symbol === 'ALL' ? true : t.symbol === filters.symbol))
      .filter(t => (filters.direction === 'ALL' ? true : t.direction === filters.direction))
      .filter(t => (filters.setup === 'ALL' ? true : (t.setup || '') === filters.setup))
      .filter(t => {
        if (!filters.q) return true;
        const q = filters.q.toLowerCase();
        const blob = [t.symbol, t.direction, t.setup || '', t.notes || ''].join(' ').toLowerCase();
        return blob.includes(q);
      })
      .filter(t => (startRange ? t.date >= startRange : true))
      .sort((a,b)=> (a.date < b.date ? -1 : 1));
  }, [trades, filters, startRange]);

  const Rs = useMemo(
    () => filtered.map(t => (typeof t.R === 'number' ? t.R : computeR(t)) || 0),
    [filtered]
  );

  const equityR = useMemo(
    () => densifyAtZero(buildEquityR(filtered.map(t => t.date), Rs)),
    [filtered, Rs]
  );

  const segments = useMemo(() => {
    const pts = equityR; if (pts.length < 2) return [] as {sign: 1|-1; data: EquityPoint[]}[];
    const segs: {sign: 1|-1; data: EquityPoint[]}[] = [];
    let seg: EquityPoint[] = [pts[0]];
    let sign: 1 | -1 | 0 = (Math.sign(pts[0].value) as any) || 0;
    for (let i = 1; i < pts.length; i++) {
      const v = pts[i].value;
      const s: number = (Math.sign(v) as any) || 0; seg.push(pts[i]);
      if (v === 0 && i < pts.length - 1) { segs.push({ sign: sign >= 0 ? 1 : -1, data: seg }); seg = [pts[i]]; sign = 0; }
      else if (sign === 0 && s !== 0) { sign = s as any; }
      else if (s !== 0 && sign !== 0 && s !== sign) { segs.push({ sign: (sign >= 0 ? 1 : -1) as 1|-1, data: seg }); seg = [pts[i - 1], pts[i]]; sign = s as any; }
    }
    segs.push({ sign: (sign >= 0 ? 1 : -1) as 1|-1, data: seg });
    return segs;
  }, [equityR]);

  const yDomain = useMemo<[number, number]>(() => {
    if (equityR.length === 0) return [-1, 1];
    const vals = equityR.map(p => p.value);
    const min = Math.min(...vals), max = Math.max(...vals);
    const pad = Math.max(0.5, Math.max(1e-6, max - min) * 0.10);
    return [min - pad, max + pad];
  }, [equityR]);

  const average = (arr: number[]) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
  const wins = Rs.filter(r => r > 0).length;
  const winRate = Rs.length ? (wins / Rs.length) * 100 : 0;
  const avgR = average(Rs);
  const { bestWin, bestLoss } = useMemo(() => longestStreaks(Rs), [Rs]);

  const currencySymbol = CURRENCIES[settings.currencyCode];
  const fmtR = (val: number) => `${r2(val)}R`;
  const fmtMoney = (valR: number) => `${currencySymbol}${r2(valR * settings.defaultRiskPerTrade)}`;
  const valueFromR = (valR: number) => settings.showMonetary ? valR * settings.defaultRiskPerTrade : valR;
  const unitLabel = settings.showMonetary ? currencySymbol : 'R';

  const rowsWithRAsc  = useMemo(() => filtered.map((t, i) => ({ trade: t, R: Rs[i] })), [filtered, Rs]);
  const rowsWithRDesc = useMemo(() => [...rowsWithRAsc].reverse(), [rowsWithRAsc]);
  const [showAllRows, setShowAllRows] = useState(false);
  const showRows = useMemo(() => (showAllRows ? rowsWithRDesc : rowsWithRDesc.slice(0,3)), [rowsWithRDesc, showAllRows]);

  const totalR = equityR.length ? equityR[equityR.length - 1].value : 0;
  const profitMoney = totalR * settings.defaultRiskPerTrade;
  const totalCapitalMoney = settings.startingEquity + profitMoney;
  const profitPct = settings.startingEquity ? (profitMoney / settings.startingEquity) * 100 : 0;

  const titleValue = settings.showMonetary
    ? `${profitMoney >= 0 ? '+' : ''}${fmtMoneyRight(r2(profitMoney), settings.currencyCode)} (${profitPct >= 0 ? '+' : ''}${fmtNum(r2(profitPct))}%)`
    : `${totalR > 0 ? '+' : ''}${r2(totalR)}R`;

  const titleColor = totalR > 0 ? 'text-emerald-400' : totalR < 0 ? 'text-rose-400' : 'text-white';
  const subtitle = settings.showMonetary
    ? `Capital total : ${fmtMoneyRight(r2(totalCapitalMoney), settings.currencyCode)}`
    : 'Courbe d’équité — R cumulés';

  function upsertTrade(t: Partial<TradeRow> & { R: number }) {
    if (t.id) setTrades(cur => cur.map(x => x.id === t.id ? { ...(x as TradeRow), ...t } as TradeRow : x));
    else setTrades(cur => [...cur, { ...(t as any), id: uid() } as TradeRow]);
  }
  function removeTrade(id: string) { setTrades(cur => cur.filter(t => t.id !== id)); }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b10] via-[#141421] to-[#0b0b10] text-white p-6">
      <style>{`
        .tp-wordmark{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans";letter-spacing:-.015em;}
        .tp-logo:hover svg{filter:drop-shadow(0 0 10px rgba(255,0,142,.5));}
        .card-plain{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.15);}
        .grad-filters{background:radial-gradient(80% 120% at 0% 0%, rgba(100,140,255,.14) 0%, transparent 60%),radial-gradient(60% 100% at 100% 0%, rgba(180,120,255,.12) 0%, transparent 65%),rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.22);}
        .grad-kpi-rate{background:radial-gradient(120% 140% at 15% -10%, rgba(126,109,255,.28) 0%, transparent 60%),radial-gradient(120% 140% at 120% 0%, rgba(30,144,255,.22) 0%, transparent 65%),rgba(255,255,255,.05);border:1px solid rgba(126,109,255,.25);}
        .grad-kpi-avg{background:radial-gradient(120% 140% at 15% -10%, rgba(255,184,108,.30) 0%, transparent 60%),radial-gradient(120% 140% at 120% 0%, rgba(255,94,105,.18) 0%, transparent 65%),rgba(255,255,255,.05);border:1px solid rgba(255,184,108,.25);}
        .grad-kpi-best{background:radial-gradient(120% 140% at 20% -10%, rgba(0,245,168,.30) 0%, transparent 60%),radial-gradient(120% 140% at 120% 0%, rgba(126,109,255,.16) 0%, transparent 65%),rgba(255,255,255,.05);border:1px solid rgba(0,245,168,.28);}
        .grad-kpi-worst{background:radial-gradient(120% 140% at 15% -10%, rgba(255,47,102,.28) 0%, transparent 60%),radial-gradient(110% 140% at 120% 0%, rgba(255,125,150,.16) 0%, transparent 65%),rgba(255,255,255,.05);border:1px solid rgba(255,47,102,.28);}
        .grad-journal{background:radial-gradient(140% 140% at -10% 110%, rgba(126,109,255,.45) 0%, rgba(126,109,255,.18) 45%, transparent 65%),radial-gradient(120% 140% at 120% -10%, rgba(0,200,255,.35) 0%, rgba(0,200,255,.12) 55%, transparent 70%),radial-gradient(100% 100% at 50% 0%, rgba(255,0,142,.25) 0%, transparent 70%),rgba(255,255,255,.05);border:1px solid rgba(126,109,255,.35);box-shadow:0 12px 32px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.06);}
        .grad-mini{background:radial-gradient(130% 160% at 0% 0%, rgba(32,120,255,.20) 0%, transparent 60%),radial-gradient(110% 150% at 100% 15%, rgba(0,200,255,.14) 0%, transparent 65%),linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.10));border:1px solid rgba(180,200,255,.20);box-shadow: 0 8px 18px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.04);}
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 tp-logo">
            <Brain size={50} color={ACCENT} strokeWidth={2.25} />
            <div>
              <h1 className="tp-wordmark text-3xl md:text-4xl font-extrabold tracking-tight">TradePulse</h1>
              <p className="text-sm text-white/80">Journal de trading — prototype local</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <Dialog open={openNewTrade} onOpenChange={setOpenNewTrade}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl" style={{ backgroundColor: ACCENT }}>
                  <Plus className="h-4 w-4 mr-2" /> Nouveau trade
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl bg-gradient-to-b from-[#141421] to-[#0b0b10] text-white border border-white/20 rounded-3xl p-6">
                <DialogHeader className="pb-4 border-b border-white/10">
                  <DialogTitle className="text-white text-xl font-bold">
                    {editing ? 'Modifier le trade' : 'Ajouter un trade'}
                  </DialogTitle>
                </DialogHeader>
                <TradeForm
                  initial={ editing || { date: new Date().toISOString().slice(0, 10), direction: 'LONG' } }
                  symbols={symbols} setups={setups}
                  onCancel={() => { setEditing(null); setOpenNewTrade(false); }}
                  onSave={(t) => { upsertTrade(t); setEditing(null); setOpenNewTrade(false); }}
                />
              </DialogContent>
            </Dialog>
            <Button className="rounded-2xl bg-transparent text-white border border-white/30 hover:bg-white/10" onClick={() => setOpenSymbolsManager(true)}>
              <ListPlus className="h-4 w-4 mr-2" /> Gérer symboles
            </Button>
            <Button className="rounded-2xl bg-transparent text-white border border-white/30 hover:bg-white/10" onClick={() => setOpenSetupsManager(true)}>
              <Tags className="h-4 w-4 mr-2" /> Gérer setups
            </Button>

            {/* Connexion / Déconnexion */}
            <AuthButton />
          </div>
        </div>

        {/* Filtres */}
        <Card className="grad-filters rounded-2xl">
          <CardContent className="p-4">
            <div className="grid grid-cols-12 gap-x-6 gap-y-4 items-end">
              <div className="col-span-12 md:col-span-4">
                <Label className="block mb-2 text-white/70">Recherche</Label>
                <Input
                  placeholder="symbole, note, tag…"
                  value={filters.q}
                  onChange={(e) => setFilters(f => ({ ...f, q: e.target.value }))}
                  className="w-full bg-white/5 border-white/20 text-white placeholder:text-white/60"
                />
              </div>
              <div className="col-span-6 md:col-span-2">
                <Label className="block mb-2 text-white/70">Période</Label>
                <Select value={range} onValueChange={(v) => setRange(v)}>
                  <SelectTrigger className="w-full bg-white/5 border-white/20 text-white"><SelectValue placeholder="Tout" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tout l’historique</SelectItem>
                    <SelectItem value="YTD">Cette année</SelectItem>
                    <SelectItem value="SEM">Ce semestre</SelectItem>
                    <SelectItem value="QTD">Ce trimestre</SelectItem>
                    <SelectItem value="MTD">Ce mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-6 md:col-span-2">
                <Label className="block mb-2 text-white/70">Symbole</Label>
                <Select value={filters.symbol} onValueChange={(v) => setFilters(f => ({ ...f, symbol: v }))}>
                  <SelectTrigger className="w-full bg-white/5 border-white/20 text-white"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tous</SelectItem>
                    {symbols.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-6 md:col-span-2">
                <Label className="block mb-2 text-white/70">Direction</Label>
                <Select value={filters.direction} onValueChange={(v) => setFilters(f => ({ ...f, direction: v }))}>
                  <SelectTrigger className="w-full bg-white/5 border-white/20 text-white"><SelectValue placeholder="Toutes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toutes</SelectItem>
                    <SelectItem value="LONG">Long</SelectItem>
                    <SelectItem value="SHORT">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-6 md:col-span-2">
                <Label className="block mb-2 text-white/70">Setup</Label>
                <Select value={filters.setup} onValueChange={(v) => setFilters(f => ({ ...f, setup: v }))}>
                  <SelectTrigger className="w-full bg-white/5 border-white/20 text-white"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    {setups.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    <SelectItem value="ALL">Tous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Taux de gain" value={`${r2(winRate)}%`} icon={<Trophy />} variant="rate" />
          <StatCard title="Moyenne (R)" value={r2(avgR)} icon={<BarChart3 />} variant="avg" />
          <StatCard title="Meilleure série de gains" value={bestWin} icon={<TrendingUp />} variant="best" />
          <StatCard title="Pire série de pertes" value={bestLoss} icon={<TrendingDown />} variant="worst" />
        </div>

        {/* Courbe d’équité */}
        <Card className="card-plain rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className={`text-2xl font-extrabold ${titleColor}`}>{titleValue}</CardTitle>
              <div className="text-xs text-white/60">{subtitle}</div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={settings.currencyCode} onValueChange={(v: 'EUR'|'USD') => setSettings(s => ({ ...s, currencyCode: v }))}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white h-8 px-2"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="EUR">EUR (€)</SelectItem><SelectItem value="USD">USD ($)</SelectItem></SelectContent>
              </Select>
              <Button variant="ghost" className="rounded-xl text-white" onClick={() => setSettings(s => ({ ...s, showMonetary: !s.showMonetary }))} title={settings.showMonetary ? 'Afficher en R' : 'Afficher en €/$'}>
                <Banknote className={`h-5 w-5 ${settings.showMonetary ? '' : 'opacity-50'}`} />
              </Button>
              <Button variant="ghost" className="rounded-xl text-white" onClick={() => setOpenSettings(true)} title="Réglages">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-[26rem] md:h-[30rem]">
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

                <XAxis dataKey="x" type="number" domain={['dataMin','dataMax']} hide />
                <YAxis hide domain={yDomain} />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload || !payload.length) return null;
                    const p: any = payload[0]?.payload || {};
                    const v = typeof p.value === 'number' ? p.value : 0;
                    return (
                      <div className="rounded-md border border-white/20 bg-black/70 px-3 py-2 text-xs text-white">
                        <div className="font-semibold mb-1">{p.date ? `Trade du ${p.date}` : 'Point technique'}</div>
                        <div>{settings.showMonetary ? fmtMoney(v) : fmtR(v)}</div>
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
          </CardContent>
        </Card>

        {/* Mini-charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MiniBarCard title={`Profit par symbole (${unitLabel})`} data={aggregate(byKey('symbol', filtered, Rs, valueFromR)).slice(0,8)} unitLabel={unitLabel} />
          <MiniBarCard title={`Profit par setup (${unitLabel})`}  data={aggregate(byKey('setup',  filtered, Rs, valueFromR)).slice(0,8)} unitLabel={unitLabel} />
          <MiniBarCard title={`Profit par direction (${unitLabel})`} data={aggregate(byKey('direction',filtered, Rs, valueFromR))} unitLabel={unitLabel} />
        </div>

        {/* Journal */}
        <Card className="grad-journal rounded-2xl">
          <CardHeader><CardTitle className="text-white">Journal</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto px-4">
            <table className="w-full text-sm table-auto">
              <thead className="text-white/90">
                <tr className="border-b border-white/20">
                  <th className="text-left py-2 pr-3">Date</th>
                  <th className="text-left py-2 pr-3">Symbole</th>
                  <th className="text-left py-2 pr-3">Dir</th>
                  <th className="text-left py-2 pr-3">Setup</th>
                  <th className="text-left py-2 pr-3">{unitLabel}</th>
                  <th className="text-right py-2 pl-3 w-0"></th>
                </tr>
              </thead>
              <tbody>
                {showRows.map(({ trade: t, R }) => {
                  const out = settings.showMonetary ? `${currencySymbol}${r2(R * settings.defaultRiskPerTrade)}` : `${r2(R)}R`;
                  const pos = R > 0;
                  return (
                    <tr key={t.id} className="border-b border-white/10 hover:bg-white/10">
                      <td className="py-2 pr-3 whitespace-nowrap text-white/90">{t.date}</td>
                      <td className="py-2 pr-3 text-white/90">{t.symbol}</td>
                      <td className="py-2 pr-3 text-white/90">{t.direction}</td>
                      <td className="py-2 pr-3 text-white/90">{t.setup || '—'}</td>
                      <td className={`py-2 pr-3 font-semibold ${pos ? 'text-emerald-400' : R < 0 ? 'text-rose-400' : 'text-white'}`}>{out}</td>
                      <td className="py-2 pl-3">
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setEditing(t); setOpenNewTrade(true); }}>Éditer</Button>
                          <button
                            type="button"
                            aria-label="Supprimer"
                            onClick={() => removeTrade(t.id)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-xl border transition-colors focus:outline-none focus:ring-2"
                            style={{ borderColor: RED, color: RED, backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${RED}20`)}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rowsWithRAsc.length === 0 && (<tr><td colSpan={6} className="py-6 text-center text-white/60">Aucun élément pour l’instant.</td></tr>)}
              </tbody>
            </table>

            {rowsWithRAsc.length > 3 && (
              <div className="flex justify-center pt-3">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowAllRows(v => !v)}>
                  {showAllRows ? 'Afficher moins' : 'Afficher plus'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modales gestion & réglages */}
        <Dialog open={openSymbolsManager} onOpenChange={setOpenSymbolsManager}>
          <DialogContent className="max-w-md bg-gradient-to-b from-[#141421] to-[#0b0b10] text-white border border-white/20 rounded-3xl p-6">
            <div className="text-white text-lg font-bold mb-2">Gérer les symboles</div>
            <ListManager
              items={symbols}
              onAdd={(v) => setSymbols(arr => Array.from(new Set([...arr, v.toUpperCase()])))}
              onRemove={(v) => setSymbols(arr => arr.filter(x => x !== v))}
              placeholder="ex: XAUUSD, US100, EURUSD"
            />
          </DialogContent>
        </Dialog>

        <Dialog open={openSetupsManager} onOpenChange={setOpenSetupsManager}>
          <DialogContent className="max-w-md bg-gradient-to-b from-[#141421] to-[#0b0b10] text-white border border-white/20 rounded-3xl p-6">
            <div className="text-white text-lg font-bold mb-2">Gérer les setups</div>
            <ListManager
              items={setups}
              onAdd={(v) => setSetups(arr => Array.from(new Set([...arr, v])))}
              onRemove={(v) => setSetups(arr => arr.filter(x => x !== v))}
              placeholder="ex: Breakout, Pullback, Rejet"
            />
          </DialogContent>
        </Dialog>

        <Dialog open={openSettings} onOpenChange={setOpenSettings}>
          <DialogContent className="max-w-md bg-gradient-to-b from-[#141421] to-[#0b0b10] text-white border border-white/20 rounded-3xl p-6">
            <DialogHeader><DialogTitle className="text-white text-lg font-bold">Réglages</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/70 block">Capital de départ ({CURRENCIES[settings.currencyCode]})</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="ex: 10000"
                  value={startEqDraft}
                  onChange={(e) => setStartEqDraft(e.target.value)}
                  onBlur={(e) => setSettings(s => ({ ...s, startingEquity: Number(e.target.value || 0) }))}
                  className="bg-white/5 border-white/20 text-white select-text"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 block">Valeur d’un R ({CURRENCIES[settings.currencyCode]})</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="ex: 100"
                  value={riskDraft}
                  onChange={(e) => setRiskDraft(e.target.value)}
                  onBlur={(e) => setSettings(s => ({ ...s, defaultRiskPerTrade: Number(e.target.value || 0) }))}
                  className="bg-white/5 border-white/20 text-white select-text"
                />
              </div>
              <div className="text-xs text-white/60">Le graphique reste en R ; l’affichage peut basculer en montant via “Valeur d’un R”.</div>
            </div>
          </DialogContent>
        </Dialog>

        <footer className="text-xs text-white/70 pt-6">
          <p>⚠️ Prototype local. Calculs simplifiés.</p>
        </footer>
      </div>
    </div>
  );
}

/* ——— Composants UI ——— */
function StatCard({
  title, value, icon, variant,
}: { title:string; value:any; icon:any; variant:'rate'|'avg'|'best'|'worst' }) {
  const cls =
    variant === 'rate'  ? 'grad-kpi-rate'  :
    variant === 'avg'   ? 'grad-kpi-avg'   :
    variant === 'best'  ? 'grad-kpi-best'  :
                          'grad-kpi-worst';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`${cls} rounded-2xl h-full`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm text-white/85">{title}</CardTitle>
          <div style={{ color: ACCENT }}>{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl md:text-4xl font-extrabold text-white">{value}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MiniBarCard({ title, data, unitLabel }:{
  title:string; data:{name:string; value:number}[]; unitLabel:string
}) {
  return (
    <Card className="grad-mini rounded-2xl">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-white/85">{title}</CardTitle></CardHeader>
      <CardContent className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis hide domain={data.length ? undefined : [-1, 1]} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload, label }: any) => {
                if (!active || !payload || !payload.length) return null;
                const v = Number(payload[0].value || 0);
                const s = unitLabel === 'R' ? `${r2(v)}R` : `${unitLabel}${r2(v)}`;
                return <div className="rounded-md border border-white/20 bg-black/70 px-3 py-2 text-xs text-white">{label}: {s}</div>;
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => (<Cell key={i} fill={d.value >= 0 ? GREEN : RED} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/* ——— Formulaire ——— */
function TradeForm({ initial, onSave, onCancel, symbols, setups }:{
  initial: Partial<TradeRow>;
  onSave: (t: Partial<TradeRow> & { R: number }) => void;
  onCancel: () => void;
  symbols: string[];
  setups: string[];
}) {
  const initialR = typeof initial?.R === 'number' ? initial.R : (computeR(initial || {}) || 0);
  const [form, setForm] = useState({
    id: initial?.id as string | undefined,
    date: (initial?.date as string) || new Date().toISOString().slice(0, 10),
    symbol: (initial?.symbol as string) || ((symbols[0] as string) || ''),
    direction: (initial?.direction as Direction) || 'LONG',
    setup: (initial?.setup as string) || ((setups[0] as string) || ''),
    RInput: String(initialR),
  });
  const parsedR = Number(form.RInput);
  const previewR = Number.isFinite(parsedR) ? parsedR : 0;

  return (
    <div className="space-y-5 text-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Date">
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-white/5 border-white/20 text-white" />
        </Field>
        <Field label="Direction">
          <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v as Direction })}>
            <SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="LONG">Long</SelectItem><SelectItem value="SHORT">Short</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Symbole">
          {symbols && symbols.length ? (
            <Select value={form.symbol} onValueChange={(v) => setForm({ ...form, symbol: v })}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{symbols.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
            </Select>
          ) : (
            <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} className="bg-white/5 border-white/20 text-white" />
          )}
        </Field>
        <Field label="Setup">
          {setups && setups.length ? (
            <Select value={form.setup} onValueChange={(v) => setForm({ ...form, setup: v })}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{setups.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
            </Select>
          ) : (
            <Input value={form.setup} onChange={(e) => setForm({ ...form, setup: e.target.value })} className="bg-white/5 border-white/20 text-white" />
          )}
        </Field>

        <Field label="Résultat (R)">
          <Input
            type="number"
            step={1}
            value={form.RInput}
            onChange={(e) => setForm({ ...form, RInput: e.target.value })}
            className="bg-white/5 border-white/20 text-white"
          />
        </Field>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-white/80">
          Aperçu : <span className={`font-semibold ${previewR > 0 ? 'text-emerald-400' : previewR < 0 ? 'text-rose-400' : 'text-white'}`}>{r2(previewR)}R</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCancel} className="rounded-xl bg-transparent text-white border border-white/30 hover:bg-white/10">Annuler</Button>
          <Button className="rounded-xl" style={{ backgroundColor: ACCENT }}
            onClick={() => {
              const n = Number(form.RInput);
              const cleanR = Number.isFinite(n) ? n : 0;
              onSave({ id: form.id, date: form.date, symbol: form.symbol, direction: form.direction, setup: form.setup, R: cleanR });
            }}
          >Enregistrer</Button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, children }:{label:string; children: React.ReactNode}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wider text-white/70">{label}</Label>
      {children}
    </div>
  );
}

/* ——— Gestion listes ——— */
function ListManager({ items, onAdd, onRemove, placeholder }:{
  items:string[]; onAdd:(v:string)=>void; onRemove:(v:string)=>void; placeholder:string;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="bg-white/5 border-white/20 text-white placeholder:text-white/60" />
        <Button onClick={() => { const v = value.trim(); if (v) { onAdd(v); setValue(''); } }} className="rounded-xl" style={{ backgroundColor: ACCENT }}>Ajouter</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Badge key={it} className="bg-white/10 border border-white/20 text-white px-3 py-1">
            {it}
            <Button size="sm" variant="ghost" className="ml-2 h-5 px-2 text-white/70 hover:text-white" onClick={() => onRemove(it)}>×</Button>
          </Badge>
        ))}
        {items.length === 0 && <p className="text-white/60 text-sm">Aucun élément pour l'instant.</p>}
      </div>
    </div>
  );
}

/* ——— Agrégations mini-charts ——— */
const byKey = (
  key: 'symbol'|'setup'|'direction',
  filtered: TradeRow[],
  Rs: number[],
  conv: (x:number)=>number
) =>
  filtered.map((t, i) => ({
    k: key==='direction'?t.direction : key==='setup'?(t.setup||'—'):t.symbol,
    v: conv(Rs[i] || 0),
  }));
const aggregate = (rows: {k:string;v:number}[]) =>
  Array.from(
    rows.reduce((m, {k, v}) => m.set(k, (m.get(k) || 0) + v), new Map<string,number>()),
    ([name, value]) => ({ name, value })
  ).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

/* ——— Périodes ——— */
function getRangeStart(range: string) {
  if (range === 'ALL') return null;
  const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
  if (range === 'YTD') return `${y}-01-01`;
  if (range === 'SEM') return `${y}-${m >= 6 ? '07' : '01'}-01`;
  if (range === 'QTD') { const qStartMonth = Math.floor(m / 3) * 3; return `${y}-${pad2(qStartMonth + 1)}-01`; }
  if (range === 'MTD') return `${y}-${pad2(m + 1)}-01`;
  return null;
}

/* ——— Tests courts ——— */
function runTests(){
  function A(a:any,e:any,m:string){const ok=(Number.isNaN(a)&&Number.isNaN(e))||a===e;if(!ok)throw new Error(`${m}: got ${a}, expected ${e}`);}
  try{
    const s1=buildEquityR(['2025-01-10'],[2]);console.assert(s1.length===2&&s1[0].value===0&&s1[1].value===2&&s1[0].x===0&&s1[1].x===1,'equity start +');
    const s2=buildEquityR(['2025-01-10'],[-1.5]);console.assert(s2.length===2&&s2[1].value===-1.5,'equity start -');
    const d=densifyAtZero([{date:'A',x:0,value:-1},{date:'B',x:1,value:1}]);console.assert(d.length===3&&d[1].value===0&&d[1].x>0&&d[1].x<1,'cross 0');
    console.assert(Math.abs(computeR({direction:'LONG',entry:100,stop:90,exit:110})-1)<1e-9,'LONG 1R');
    console.assert(Math.abs(computeR({direction:'SHORT',entry:100,stop:110,exit:95})-0.5)<1e-9,'SHORT 0.5R');
    const st=longestStreaks([1,0.3,-0.2,-1,0.1,0.2,0.3,-0.1]);A(st.bestWin,3,'streak win');A(st.bestLoss,2,'streak loss');
    const dd=buildEquityR(['2025-01-01','2025-01-01','2025-01-02','2025-01-10'],[1,-0.5,2,-1]);for(let i=2;i<dd.length;i++){console.assert(Math.abs((dd[i].x-dd[i-1].x)-1)<1e-9,'x spacing 1')}
    console.log('TradePulse tests passed ✅');
  }catch(e){console.error('TradePulse tests failed ❌',e);}
}
