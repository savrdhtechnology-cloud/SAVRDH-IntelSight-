import React, { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Bell, BriefcaseBusiness, Building2, ChevronRight, CircleDot,
  Database, ExternalLink, Eye, FileSearch, Fingerprint, Globe2, History, LayoutDashboard,
  ListFilter, MapPin, Network, Radar, RefreshCw, Search, Settings, ShieldCheck,
  UserRound, Users, X
} from 'lucide-react';
import { createDemoResult, inferSearchType, type EvidenceItem, type SearchResult } from '../lib/intelligence';

type IconType = React.ComponentType<{ className?: string }>;
type Platform = { name: string; count: number; pct: number; color: string };

type NavItem = { label: string; href: string; icon: IconType; active?: boolean };

const clamp = (value: number) => Math.max(0, Math.min(100, value));

const sourceName = (item: EvidenceItem) => {
  const haystack = `${item.source} ${item.title} ${item.url}`.toLowerCase();
  if (haystack.includes('facebook')) return 'Facebook';
  if (haystack.includes('instagram')) return 'Instagram';
  if (haystack.includes('linkedin')) return 'LinkedIn';
  if (haystack.includes('twitter') || haystack.includes('x.com')) return 'X';
  if (haystack.includes('github')) return 'GitHub';
  if (haystack.includes('reddit')) return 'Reddit';
  if (haystack.includes('youtube')) return 'YouTube';
  if (item.category === 'business') return 'Business';
  if (item.category === 'domain') return 'Websites';
  return 'Web';
};

const derivePlatforms = (result: SearchResult): Platform[] => {
  const colors: Record<string, string> = {
    Web: '#22d3ee', Facebook: '#3b82f6', Instagram: '#ec4899', LinkedIn: '#0ea5e9',
    X: '#94a3b8', GitHub: '#8b5cf6', Reddit: '#f97316', YouTube: '#ef4444',
    Business: '#10b981', Websites: '#14b8a6'
  };
  const counts = new Map<string, number>();
  result.evidence.forEach((item) => {
    const name = sourceName(item);
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  const total = Math.max(1, result.evidence.length);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100), color: colors[name] || '#64748b' }))
    .sort((a, b) => b.count - a.count);
};

const Panel = ({ title, subtitle, icon: Icon, children, action }: { title: string; subtitle?: string; icon: IconType; children: React.ReactNode; action?: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-800 bg-[#091321] overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,.12)]">
    <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl border border-cyan-400/20 bg-cyan-400/10 flex items-center justify-center"><Icon className="w-4 h-4 text-cyan-300" /></div>
      <div className="min-w-0 flex-1"><div className="text-sm font-black text-white">{title}</div>{subtitle && <div className="mt-0.5 text-[9px] text-slate-600 truncate">{subtitle}</div>}</div>
      {action}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const Metric = ({ label, value, icon: Icon, score, tone = '#22d3ee' }: { label: string; value: number; icon: IconType; score?: boolean; tone?: string }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#091321] p-4 hover:border-cyan-500/30 hover:-translate-y-0.5 transition-all duration-300">
    <div className="flex items-start justify-between gap-3">
      <div><div className="text-[8px] uppercase tracking-[.17em] font-black text-slate-600">{label}</div><div className="mt-1 text-2xl font-black text-white">{value}{score ? ' / 100' : ''}</div></div>
      <div className="w-10 h-10 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center"><Icon className="w-4 h-4 text-cyan-300" /></div>
    </div>
    <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${score ? clamp(value) : Math.min(100, 26 + value * 4)}%`, background: `linear-gradient(90deg,${tone},#2563eb)` }} /></div>
  </div>
);

const TrendChart = ({ result }: { result: SearchResult }) => {
  const values = useMemo(() => {
    const base = Math.max(25, result.visibilityScore);
    return Array.from({ length: 16 }, (_, i) => clamp(Math.round(base * 0.35 + i * 3.4 + ((i * 13 + result.sourceCount * 5) % 15))));
  }, [result]);
  const identity = values.map((value, i) => clamp(Math.round(value * 0.62 + ((i * 7) % 12))));
  const points = (arr: number[]) => arr.map((value, i) => `${(i / (arr.length - 1)) * 100},${100 - value}`).join(' ');
  return (
    <div className="relative h-56 rounded-xl border border-slate-800 bg-[#06101d] overflow-hidden">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(#1e293b 1px,transparent 1px),linear-gradient(90deg,#1e293b 1px,transparent 1px)', backgroundSize: '20% 25%' }} />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full p-3">
        <defs><linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0ea5e9" stopOpacity=".28"/><stop offset="1" stopColor="#0ea5e9" stopOpacity="0"/></linearGradient></defs>
        <polygon points={`0,100 ${points(values)} 100,100`} fill="url(#trendArea)" />
        <polyline points={points(values)} fill="none" stroke="#38bdf8" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
        <polyline points={points(identity)} fill="none" stroke="#c084fc" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute left-4 bottom-3 flex items-center gap-4 text-[8px] text-slate-500"><span><i className="inline-block w-2 h-2 rounded-full bg-sky-400 mr-1"/>Public mentions</span><span><i className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-1"/>Identity signals</span></div>
    </div>
  );
};

const Donut = ({ platforms, total }: { platforms: Platform[]; total: number }) => {
  const segments = platforms.length ? platforms : [{ name: 'No signals', count: 1, pct: 100, color: '#334155' }];
  let cursor = 0;
  const gradient = segments.map((item) => {
    const start = cursor;
    cursor += item.pct;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(', ');
  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative w-40 h-40 rounded-full shrink-0" style={{ background: `conic-gradient(${gradient})` }}><div className="absolute inset-[26px] rounded-full bg-[#091321] flex flex-col items-center justify-center"><b className="text-3xl text-white">{total}</b><span className="text-[8px] uppercase tracking-widest text-slate-600">Sources</span></div></div>
      <div className="w-full flex-1 space-y-2">{segments.slice(0, 7).map((item) => <div key={item.name} className="flex items-center gap-2 text-[9px]"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} /><span className="flex-1 text-slate-500">{item.name}</span><b className="text-slate-300">{item.pct}%</b><span className="text-slate-700">({item.count})</span></div>)}</div>
    </div>
  );
};

const GaugeCard = ({ value, label, tone }: { value: number; label: string; tone: string }) => (
  <div className="flex flex-col items-center">
    <div className="relative w-28 h-28 rounded-full" style={{ background: `conic-gradient(${tone} ${clamp(value)}%,#172033 0)` }}><div className="absolute inset-[9px] rounded-full bg-[#091321] flex flex-col items-center justify-center"><b className="text-2xl text-white">{value}</b><span className="text-[8px] text-slate-600">/100</span></div></div>
    <div className="mt-2 text-xs font-black text-slate-200">{label}</div><div className={`mt-1 text-[8px] font-bold ${value >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>{value >= 75 ? 'High' : 'Moderate'}</div>
  </div>
);

const Heatmap = ({ count }: { count: number }) => {
  const dots = [[17,38],[23,34],[32,45],[48,30],[51,50],[62,37],[70,28],[74,43],[79,56],[84,33],[87,63],[59,68],[37,68]];
  return (
    <div className="relative h-60 rounded-xl border border-slate-800 bg-[#06101d] overflow-hidden">
      <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full opacity-70"><path d="M5 23l8-9 14 2 5 8-4 8-8-2-5 5-8-4zm29-6 8-6 10 3 6 8-4 8-6 3-5 11-6-5 2-10zm28-5 12-5 13 7 9 2-2 8-9 2-3 8-8-2-5 6-7-4 4-8-6-6zm11 31 11 1 8 7-4 5-12-1-7-6z" fill="#17314b" stroke="#28506f" strokeWidth=".5" />{dots.map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="2.7" fill="#0ea5e9" opacity=".15"><animate attributeName="r" values="2;4;2" dur={`${2 + i * .12}s`} repeatCount="indefinite" /></circle><circle cx={x} cy={y} r=".8" fill="#38bdf8" /></g>)}</svg>
      <div className="absolute left-4 bottom-4 flex gap-5"><div><b className="text-xl text-white">{Math.min(28, Math.max(1, Math.ceil(count / 2)))}</b><div className="text-[8px] uppercase tracking-widest text-slate-600">Countries detected</div></div><div><b className="text-xl text-cyan-300">{count}</b><div className="text-[8px] uppercase tracking-widest text-slate-600">Global signals</div></div></div>
    </div>
  );
};

const Relationship = ({ result, platforms }: { result: SearchResult; platforms: Platform[] }) => {
  const nodes = (platforms.length ? platforms : [{ name: 'Web', count: 1, pct: 100, color: '#22d3ee' }]).slice(0, 6).map((item, index, all) => ({ ...item, x: 50 + Math.cos((index / all.length) * Math.PI * 2) * 34, y: 50 + Math.sin((index / all.length) * Math.PI * 2) * 31 }));
  return (
    <div className="relative h-60 rounded-xl border border-slate-800 bg-[#06101d] overflow-hidden">
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">{nodes.map((node, index) => <line key={`line-${index}`} x1="50" y1="50" x2={node.x} y2={node.y} stroke={node.color} strokeWidth=".45" opacity=".65" strokeDasharray="2 2" />)}{nodes.map((node) => <g key={node.name}><circle cx={node.x} cy={node.y} r="7" fill="#0b1726" stroke={node.color} strokeWidth="1" /><circle cx={node.x} cy={node.y} r="2.7" fill={node.color} /><text x={node.x} y={node.y + 11} textAnchor="middle" fill="#94a3b8" fontSize="3.2">{node.name}</text></g>)}<circle cx="50" cy="50" r="10" fill="#061b2a" stroke="#22d3ee" strokeWidth="1.3" /><circle cx="50" cy="50" r="3.5" fill="#22d3ee" /><text x="50" y="65" textAnchor="middle" fill="#e2e8f0" fontSize="3.1">{result.query.slice(0, 20)}</text></svg>
    </div>
  );
};

const Bars = ({ platforms }: { platforms: Platform[] }) => {
  const items = platforms.slice(0, 8);
  const max = Math.max(1, ...items.map((item) => item.count));
  return <div className="h-48 flex items-end gap-2 px-2">{items.length ? items.map((item) => <div key={item.name} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full"><span className="text-[8px] font-black text-slate-400 mb-1">{item.count}</span><div className="w-full max-w-12 rounded-t-md transition-all duration-700" style={{ height: `${Math.max(14, (item.count / max) * 120)}px`, background: `linear-gradient(180deg,${item.color},${item.color}66)` }} /><span className="mt-2 w-full truncate text-center text-[8px] text-slate-600">{item.name}</span></div>) : <div className="m-auto text-xs text-slate-600">No platform signals yet.</div>}</div>;
};

const Strongest = ({ item }: { item?: EvidenceItem }) => (
  <div>{item ? <><div className="flex items-start gap-3"><div className="w-12 h-12 rounded-xl border border-blue-500/20 bg-blue-500/10 flex items-center justify-center"><Globe2 className="w-5 h-5 text-blue-300" /></div><div className="min-w-0 flex-1"><div className="flex gap-2 items-start justify-between"><div><div className="text-[9px] font-black text-cyan-300">{item.source}</div><div className="mt-1 text-sm font-black text-white line-clamp-2">{item.title}</div></div><span className="shrink-0 px-2 py-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-[8px] font-black text-emerald-300">{item.confidence >= 85 ? 'STRONG MATCH' : 'REVIEW'}</span></div><p className="mt-2 text-[9px] leading-relaxed text-slate-500 line-clamp-3">{item.summary}</p></div></div><div className="mt-4 flex items-center gap-4"><div className="flex-1"><div className="flex justify-between text-[8px]"><span className="text-slate-600">Relevance</span><b className="text-emerald-400">{item.confidence}%</b></div><div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${item.confidence}%` }} /></div></div><a href={item.url} target="_blank" rel="noreferrer" className="text-[9px] font-black text-cyan-400 inline-flex items-center gap-1">Open Evidence <ExternalLink className="w-3 h-3" /></a></div></> : <div className="text-xs text-slate-600">No evidence collected.</div>}</div>
);

export const AnalyticsDashboard: React.FC = () => {
  const [query, setQuery] = useState('public.demo@example.com');
  const [result, setResult] = useState<SearchResult>(() => createDemoResult('public.demo@example.com', 'email'));
  const [running, setRunning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const platforms = useMemo(() => derivePlatforms(result), [result]);
  const strongest = useMemo(() => [...result.evidence].sort((a, b) => b.confidence - a.confidence)[0], [result]);
  const profiles = result.evidence.filter((item) => item.category === 'profile').length;
  const domains = result.evidence.filter((item) => item.category === 'domain').length;
  const organizations = result.evidence.filter((item) => item.category === 'business').length;
  const risk = clamp(Math.round((100 - result.confidence) * .55 + (result.exposure.status === 'observed' ? 38 : result.exposure.status === 'possible' ? 18 : 4)));
  const credibility = clamp(Math.round((result.confidence + Math.min(100, result.sourceCount * 4)) / 2));

  const runSearch = async () => {
    const value = query.trim();
    if (!value) return;
    const type = inferSearchType(value);
    setRunning(true);
    try {
      const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: value, type }) });
      if (response.ok) {
        const payload = await response.json();
        setResult(payload?.result || createDemoResult(value, type));
      } else {
        setResult(createDemoResult(value, type));
      }
    } catch {
      setResult(createDemoResult(value, type));
    } finally {
      setRunning(false);
    }
  };

  const nav: NavItem[] = [
    { label: 'Lead 360 Analytics', href: '/app', icon: LayoutDashboard, active: true },
    { label: 'Lead 360 Profile', href: '/app/profile', icon: UserRound },
    { label: 'Public Presence', href: '/app/profile', icon: Globe2 },
    { label: 'Identity Signals', href: '/app/profile', icon: Fingerprint },
    { label: 'Evidence', href: '/app/profile', icon: FileSearch },
    { label: 'Timeline', href: '/app/profile', icon: History },
    { label: 'Relationship Graph', href: '/app/profile', icon: Network },
    { label: 'Geo Intelligence', href: '/app/profile', icon: MapPin }
  ];
  const operations: NavItem[] = [
    { label: 'Cases & Workspace', href: '/app/workspace', icon: BriefcaseBusiness },
    { label: 'Watchlist', href: '#', icon: Eye },
    { label: 'Bulk Lookup', href: '#', icon: Users },
    { label: 'Settings', href: '#', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#040a12] text-slate-200 flex">
      <aside className={`${menuOpen ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden'} lg:flex w-[252px] shrink-0 flex-col border-r border-slate-800 bg-[#06101b]`}>
        <div className="h-[74px] px-4 border-b border-slate-800 flex items-center justify-between"><button onClick={() => window.location.assign('/')} className="flex items-center gap-3"><span className="relative w-10 h-10 rounded-xl border border-cyan-500/25 bg-cyan-500/10 flex items-center justify-center"><Fingerprint className="w-5 h-5 text-cyan-300" /><Radar className="absolute w-3 h-3 text-white" /></span><span className="text-left"><b className="block text-sm text-white">SAVRDH IntelSight™</b><span className="block text-[8px] tracking-[.2em] uppercase text-cyan-400">Lead Intelligence</span></span></button><button className="lg:hidden" onClick={() => setMenuOpen(false)}><X className="w-5 h-5" /></button></div>
        <div className="p-3 flex-1 overflow-y-auto"><div className="px-3 py-3 text-[8px] uppercase tracking-[.24em] font-black text-slate-600">Intelligence Workspace</div><div className="space-y-1">{nav.map(({ label, href, icon: Icon, active }) => <button key={label} onClick={() => window.location.assign(href)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-[10px] font-bold ${active ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-300' : 'border-transparent text-slate-500 hover:text-white hover:bg-slate-900'}`}><Icon className="w-4 h-4" />{label}{active && <ChevronRight className="w-3 h-3 ml-auto" />}</button>)}</div><div className="mt-5 px-3 py-3 text-[8px] uppercase tracking-[.24em] font-black text-slate-600">Operations</div><div className="space-y-1">{operations.map(({ label, href, icon: Icon }) => <button key={label} onClick={() => href !== '#' && window.location.assign(href)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-bold text-slate-500 hover:text-white hover:bg-slate-900"><Icon className="w-4 h-4" />{label}</button>)}</div></div>
        <div className="p-4 border-t border-slate-800"><div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[.04] p-4"><div className="text-[9px] font-black text-white">SAVRDH IntelSight™</div><div className="mt-1 text-[8px] uppercase tracking-[.16em] text-cyan-400">Turn open data into intelligence</div><div className="mt-4 flex items-center gap-2 text-[8px] text-emerald-400"><CircleDot className="w-3 h-3 animate-pulse" />Public-data system online</div></div></div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 h-[74px] border-b border-slate-800 bg-[#040a12]/95 backdrop-blur-xl px-4 lg:px-6 flex items-center gap-3"><button onClick={() => setMenuOpen(true)} className="lg:hidden w-10 h-10 rounded-xl border border-slate-800 flex items-center justify-center"><ListFilter className="w-4 h-4" /></button><div className="flex-1 max-w-4xl h-11 rounded-xl border border-slate-700 bg-[#07101c] flex items-center gap-3 px-4 focus-within:border-cyan-500/45"><Search className="w-4 h-4 text-slate-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="Enter email, phone number, domain or username…" className="flex-1 min-w-0 bg-transparent outline-none text-xs text-white" /></div><button onClick={runSearch} disabled={running || !query.trim()} className="h-11 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-[10px] font-black text-white inline-flex items-center gap-2 disabled:opacity-50">{running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}<span className="hidden sm:inline">{running ? 'Scanning' : 'Search'}</span></button><Bell className="hidden xl:block w-4 h-4 text-slate-500" /></header>

        <div className="p-4 lg:p-6 max-w-[1800px] mx-auto">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4"><div><div className="text-[8px] uppercase tracking-[.24em] font-black text-cyan-400">Lead Intelligence</div><h1 className="mt-1 text-2xl lg:text-3xl font-black text-white">Lead 360 Analytics Dashboard</h1><p className="mt-1 text-[10px] text-slate-500">Animated intelligence analytics and discovery insights from public or authorized sources.</p></div><div className="rounded-2xl border border-slate-800 bg-[#091321] px-4 py-3 flex items-center gap-4 xl:min-w-[430px]"><div className="w-11 h-11 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center"><UserRound className="w-5 h-5 text-cyan-300" /></div><div className="min-w-0 flex-1"><div className="text-[8px] uppercase tracking-widest text-slate-600">Target identifier</div><div className="mt-1 text-xs font-black text-white truncate">{result.query}</div><div className="mt-1 text-[8px] text-slate-600">Type: {result.type} • {result.mode === 'live' ? 'Live source scan' : 'Demo dataset'}</div></div><span className={`px-2 py-1 rounded-full border text-[8px] font-black ${result.mode === 'live' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>{result.mode === 'live' ? 'PROFILE ANALYZED' : 'DEMO'}</span></div></div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3"><Metric label="Public Sources" value={result.sourceCount} icon={Database} /><Metric label="Profiles Found" value={profiles} icon={Users} /><Metric label="Domains" value={domains} icon={Globe2} /><Metric label="Organizations" value={organizations} icon={Building2} /><Metric label="Visibility Score" value={result.visibilityScore} icon={Eye} score /><Metric label="Confidence Score" value={result.confidence} icon={ShieldCheck} score /><Metric label="Risk Score" value={risk} icon={AlertTriangle} score tone="#fb923c" /></div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4"><div className="xl:col-span-6"><Panel title="Visibility Trend" subtitle="Public mentions and identity signals over time" icon={Activity} action={<span className="px-2 py-1 rounded-md border border-blue-500/50 bg-blue-500/10 text-[8px] text-blue-300">30D</span>}><TrendChart result={result} /></Panel></div><div className="xl:col-span-3"><Panel title="Source Distribution" subtitle="Identified signals by platform" icon={Network}><Donut platforms={platforms} total={result.sourceCount} /></Panel></div><div className="xl:col-span-3"><Panel title="Confidence & Credibility" subtitle="Cross-source reliability" icon={ShieldCheck}><div className="grid grid-cols-2 gap-3"><GaugeCard value={result.confidence} label="Confidence" tone="#22d3ee" /><GaugeCard value={credibility} label="Credibility" tone="#34d399" /></div></Panel></div></div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4"><div className="xl:col-span-4"><Panel title="Global Presence Heatmap" subtitle="Approximate geography of public source signals" icon={Globe2}><Heatmap count={result.sourceCount} /></Panel></div><div className="xl:col-span-5"><Panel title="Relationship Graph" subtitle="Evidence-linked people, profiles, domains and organizations" icon={Network}><Relationship result={result} platforms={platforms} /></Panel></div><div className="xl:col-span-3"><Panel title="Recent Activity" subtitle="Discovery and correlation events" icon={Activity} action={<span className="px-2 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[8px] font-black text-emerald-300">LIVE</span>}><div>{result.evidence.slice(0, 6).map((item, index) => <div key={item.id} className="relative pl-6 py-2.5 border-l border-cyan-500/25 last:border-transparent"><span className="absolute -left-[5px] top-4 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-cyan-500/10" /><div className="text-[9px] font-black text-slate-300 truncate">{index === 0 ? 'New signal discovered' : index === 1 ? 'Cross-platform match' : 'Evidence collected'}</div><div className="mt-0.5 text-[8px] text-slate-600 truncate">{item.source} • {item.title}</div></div>)}</div></Panel></div></div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4"><div className="xl:col-span-5"><Panel title="Platform Signal Comparison" subtitle="Signal volume across detected platforms" icon={Activity}><Bars platforms={platforms} /></Panel></div><div className="xl:col-span-4"><Panel title="Strongest Evidence" subtitle="Top corroborating public-source signal" icon={ShieldCheck}><Strongest item={strongest} /></Panel></div><div className="xl:col-span-3"><Panel title="Live Scan Activity" subtitle={running ? 'Scanning public sources now' : 'Latest scan status'} icon={Radar} action={<span className={`px-2 py-1 rounded-full border text-[8px] font-black ${running ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-500'}`}>{running ? 'SCANNING…' : result.mode.toUpperCase()}</span>}><div className="space-y-2">{['Scanning public web index…','Checking public social surfaces…','Analyzing public documents…','Discovering related profiles…','Cross-referencing evidence…'].map((step, index) => <div key={step} className="flex items-center gap-2 text-[9px]"><span className={`w-2 h-2 rounded-full ${running && index < 3 ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-500/70'}`} /><span className="flex-1 text-slate-500">{step}</span><span className="text-slate-700">{running ? `${index * 3 + 1}s` : 'done'}</span></div>)}</div></Panel></div></div>

          <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/[.035] p-4 flex gap-3"><AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /><div className="text-[9px] leading-relaxed text-slate-500"><b className="text-amber-300">Interpretation notice:</b> Public presence does not mean a person is currently online. IntelSight displays public or authorized-source observations, evidence links and confidence. It does not access private chats, hidden accounts, private location or secret credentials.</div></div>
        </div>
      </main>
    </div>
  );
};
