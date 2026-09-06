import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, AtSign, Bell, BriefcaseBusiness, Building2, ChartNoAxesCombined,
  ChevronRight, CircleDot, Clock3, Code2, Database, ExternalLink, Eye, FileSearch, FileText,
  Fingerprint, Github, Globe2, History, LayoutDashboard, Link2, ListFilter, Mail, MapPin,
  Network, Radar, RefreshCw, Search, Settings, ShieldCheck, Smartphone, Sparkles, UserRound,
  Users, Watch, X
} from 'lucide-react';
import { inferSearchType, createDemoResult, type EvidenceItem, type SearchResult } from '../lib/intelligence';

type Icon = React.ComponentType<{ className?: string }>;
type Platform = { name: string; count: number; pct: number; color: string };

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const fmtDate = (value?: string) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

function useCountUp(value: number, duration = 650) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = shown;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return shown;
}

const AnimatedNumber = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const shown = useCountUp(value);
  return <>{shown}{suffix}</>;
};

const MiniSpark = ({ seed, tone = '#22d3ee' }: { seed: number; tone?: string }) => {
  const pts = useMemo(() => Array.from({ length: 10 }, (_, i) => {
    const v = 10 + ((seed * (i + 3) * 17 + i * 13) % 26);
    return `${i * 12},${42 - v}`;
  }).join(' '), [seed]);
  return <svg viewBox="0 0 108 45" className="w-20 h-9 opacity-90"><polyline points={pts} fill="none" stroke={tone} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><polyline points={`0,45 ${pts} 108,45`} fill={`${tone}12`} stroke="none" /></svg>;
};

const MetricCard = ({ icon: IconEl, label, value, delta, note, score, tone = '#22d3ee' }: { icon: Icon; label: string; value: number; delta?: string; note?: string; score?: boolean; tone?: string }) => (
  <div className="group rounded-2xl border border-slate-800/90 bg-[#091321] p-4 min-h-[112px] hover:border-cyan-500/30 hover:-translate-y-0.5 transition-all duration-300 shadow-[0_12px_35px_rgba(0,0,0,.14)]">
    <div className="flex items-start justify-between gap-3">
      <div className="flex gap-3 min-w-0">
        <div className="w-10 h-10 shrink-0 rounded-xl border border-cyan-400/20 bg-cyan-400/10 flex items-center justify-center"><IconEl className="w-4.5 h-4.5 text-cyan-300" /></div>
        <div className="min-w-0"><div className="text-[9px] uppercase tracking-[0.16em] font-black text-slate-500">{label}</div><div className="mt-1 text-2xl font-black text-white"><AnimatedNumber value={value} suffix={score ? ' / 100' : ''} /></div></div>
      </div>
      {delta && <span className="text-[9px] font-black text-emerald-400">{delta}</span>}
    </div>
    <div className="mt-2 flex items-end justify-between gap-3">{score ? <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${clamp(value)}%`, background: `linear-gradient(90deg,${tone},#2563eb)` }} /></div> : <div className="text-[9px] text-slate-600 leading-relaxed">{note}</div>}<MiniSpark seed={value} tone={tone} /></div>
  </div>
);

function platformName(item: EvidenceItem) {
  const hay = `${item.source} ${item.title} ${item.url}`.toLowerCase();
  if (hay.includes('facebook')) return 'Facebook';
  if (hay.includes('instagram')) return 'Instagram';
  if (hay.includes('linkedin')) return 'LinkedIn';
  if (hay.includes('twitter') || hay.includes('x.com')) return 'X (Twitter)';
  if (hay.includes('github')) return 'GitHub';
  if (hay.includes('reddit')) return 'Reddit';
  if (hay.includes('youtube')) return 'YouTube';
  if (item.category === 'business') return 'Business';
  if (item.category === 'domain') return 'Websites';
  return 'Web';
}

function derivePlatforms(result: SearchResult): Platform[] {
  const order = ['Web', 'Facebook', 'Instagram', 'LinkedIn', 'X (Twitter)', 'GitHub', 'Reddit', 'YouTube', 'Websites', 'Business'];
  const colors: Record<string, string> = { Web: '#22d3ee', Facebook: '#3b82f6', Instagram: '#ec4899', LinkedIn: '#0ea5e9', 'X (Twitter)': '#94a3b8', GitHub: '#8b5cf6', Reddit: '#f97316', YouTube: '#ef4444', Websites: '#14b8a6', Business: '#10b981' };
  const counts = new Map<string, number>();
  result.evidence.forEach((e) => counts.set(platformName(e), (counts.get(platformName(e)) || 0) + 1));
  const total = Math.max(1, result.evidence.length);
  return order.filter(n => counts.has(n)).map(name => ({ name, count: counts.get(name) || 0, pct: Math.round(((counts.get(name) || 0) / total) * 100), color: colors[name] })).sort((a, b) => b.count - a.count);
}

const VisibilityChart = ({ result }: { result: SearchResult }) => {
  const values = useMemo(() => {
    const base = clamp(result.visibilityScore, 20, 95);
    return Array.from({ length: 16 }, (_, i) => clamp(Math.round(base * .38 + i * (base * .038) + ((i * 17 + result.sourceCount * 3) % 15) - 6, 8, 98));
  }, [result]);
  const identity = values.map((v, i) => clamp(Math.round(v * .66 + ((i * 7) % 13) - 4)));
  const toPoints = (arr: number[]) => arr.map((v, i) => `${(i / (arr.length - 1)) * 100},${100 - v}`).join(' ');
  return (
    <Panel title="Visibility Trend" subtitle="Public mentions and identity signals over the current analysis window" icon={ChartNoAxesCombined} action={<div className="flex gap-1"><span className="px-2 py-1 rounded-md border border-slate-700 text-[8px] text-slate-500">7D</span><span className="px-2 py-1 rounded-md border border-blue-500/60 bg-blue-500/10 text-[8px] text-blue-300">30D</span><span className="px-2 py-1 rounded-md border border-slate-700 text-[8px] text-slate-500">90D</span></div>}>
      <div className="h-56 relative overflow-hidden rounded-xl border border-slate-800 bg-[#07111e]">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(#1e293b 1px,transparent 1px),linear-gradient(90deg,#1e293b 1px,transparent 1px)', backgroundSize: '20% 25%' }} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full p-3">
          <defs><linearGradient id="areaA" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#0ea5e9" stopOpacity=".28"/><stop offset="1" stopColor="#0ea5e9" stopOpacity="0"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="1.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <polygon points={`0,100 ${toPoints(values)} 100,100`} fill="url(#areaA)" />
          <polyline points={toPoints(values)} fill="none" stroke="#38bdf8" strokeWidth="1.7" vectorEffect="non-scaling-stroke" filter="url(#glow)" className="[stroke-dasharray:400] [stroke-dashoffset:400] animate-[dash_1.2s_ease-out_forwards]" />
          <polyline points={toPoints(identity)} fill="none" stroke="#c084fc" strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity=".9" />
        </svg>
        <div className="absolute left-4 bottom-3 flex items-center gap-4 text-[9px] text-slate-500"><span><i className="inline-block w-2 h-2 rounded-full bg-sky-400 mr-1"/>Public mentions</span><span><i className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-1"/>Identity signals</span></div>
      </div>
    </Panel>
  );
};

const Donut = ({ platforms, total }: { platforms: Platform[]; total: number }) => {
  let offset = 0;
  return <div className="flex flex-col sm:flex-row items-center gap-5"><div className="relative w-44 h-44 shrink-0"><svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">{platforms.map(p => { const dash = `${p.pct} ${100-p.pct}`; const node = <circle key={p.name} cx="21" cy="21" r="15.9155" fill="transparent" stroke={p.color} strokeWidth="7" strokeDasharray={dash} strokeDashoffset={-offset} className="transition-all duration-700"/>; offset += p.pct; return node; })}</svg><div className="absolute inset-0 flex flex-col items-center justify-center"><div className="text-3xl font-black text-white"><AnimatedNumber value={total}/></div><div className="text-[9px] uppercase tracking-widest text-slate-500">Sources</div></div></div><div className="flex-1 w-full space-y-2">{platforms.slice(0,7).map(p => <div key={p.name} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-full" style={{ background:p.color }}/><span className="text-slate-400 flex-1">{p.name}</span><span className="font-black text-slate-300">{p.pct}%</span><span className="text-slate-600">({p.count})</span></div>)}</div></div>;
};

const Gauge = ({ value, label, tone = '#22d3ee' }: { value: number; label: string; tone?: string }) => (
  <div className="flex flex-col items-center"><div className="relative w-32 h-32"><svg viewBox="0 0 120 120" className="w-full h-full -rotate-90"><circle cx="60" cy="60" r="47" fill="none" stroke="#172033" strokeWidth="10"/><circle cx="60" cy="60" r="47" fill="none" stroke={tone} strokeWidth="10" strokeLinecap="round" pathLength="100" strokeDasharray={`${clamp(value)} 100`} className="transition-all duration-1000" style={{ filter:`drop-shadow(0 0 6px ${tone}88)` }}/></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><div className="text-2xl font-black text-white"><AnimatedNumber value={value}/></div><div className="text-[8px] text-slate-600">/100</div></div></div><div className="mt-1 text-xs font-black text-slate-200">{label}</div><div className={`mt-1 text-[9px] font-bold ${value >= 75 ? 'text-emerald-400' : value >= 50 ? 'text-amber-400' : 'text-slate-500'}`}>{value >= 75 ? 'High' : value >= 50 ? 'Moderate' : 'Review'}</div></div>
);

const WorldMap = ({ count }: { count: number }) => {
  const dots = [[17,38],[23,34],[32,45],[48,30],[51,50],[62,37],[70,28],[74,43],[79,56],[84,33],[87,63],[59,68],[37,68]];
  return <div className="relative h-60 rounded-xl border border-slate-800 bg-[#06101d] overflow-hidden"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,.08),transparent_55%)]"/><svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full opacity-55"><path d="M5 23l8-9 14 2 5 8-4 8-8-2-5 5-8-4zm29-6 8-6 10 3 6 8-4 8-6 3-5 11-6-5 2-10zm28-5 12-5 13 7 9 2-2 8-9 2-3 8-8-2-5 6-7-4 4-8-6-6zm11 31 11 1 8 7-4 5-12-1-7-6z" fill="#16304a" stroke="#28506f" strokeWidth=".5"/>{dots.map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="2.5" fill="#0ea5e9" opacity=".15"><animate attributeName="r" values="2;4;2" dur={`${2+i*.13}s`} repeatCount="indefinite"/></circle><circle cx={x} cy={y} r=".8" fill="#38bdf8" style={{filter:'drop-shadow(0 0 2px #38bdf8)'}}/></g>)}</svg><div className="absolute left-4 bottom-4 flex gap-4"><div><div className="text-xl font-black text-white">{Math.min(28, Math.max(1, Math.ceil(count/2)))}</div><div className="text-[8px] uppercase tracking-widest text-slate-600">Countries detected</div></div><div><div className="text-xl font-black text-cyan-300">{count}</div><div className="text-[8px] uppercase tracking-widest text-slate-600">Global signals</div></div></div></div>;
};

const RelationshipGraph = ({ result }: { result: SearchResult }) => {
  const platforms = derivePlatforms(result).slice(0,6);
  const nodes = platforms.map((p,i)=>({ ...p, x: 50 + Math.cos((i/platforms.length)*Math.PI*2)*34, y: 50 + Math.sin((i/platforms.length)*Math.PI*2)*32 }));
  return <div className="relative h-60 rounded-xl border border-slate-800 bg-[#06101d] overflow-hidden"><svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">{nodes.map((n,i)=><line key={`l${i}`} x1="50" y1="50" x2={n.x} y2={n.y} stroke={n.color} strokeWidth=".45" opacity=".6" strokeDasharray="2 2"/>)}{nodes.map((n,i)=><g key={n.name}><circle cx={n.x} cy={n.y} r="7" fill="#0b1726" stroke={n.color} strokeWidth="1"/><circle cx={n.x} cy={n.y} r="3" fill={n.color} opacity=".85"/><text x={n.x} y={n.y+12} textAnchor="middle" fill="#94a3b8" fontSize="3.3">{n.name}</text></g>)}<circle cx="50" cy="50" r="10" fill="#061b2a" stroke="#22d3ee" strokeWidth="1.3"/><circle cx="50" cy="50" r="4" fill="#22d3ee" opacity=".85"/><text x="50" y="65" textAnchor="middle" fill="#e2e8f0" fontSize="3.3">{result.query.slice(0,22)}</text></svg><div className="absolute top-3 left-3 text-[8px] uppercase tracking-widest text-cyan-400 font-black">Evidence-linked network</div></div>;
};

const BarChart = ({ platforms }: { platforms: Platform[] }) => {
  const items = platforms.slice(0,8);
  const max = Math.max(1, ...items.map(i=>i.count));
  return <div className="h-52 flex items-end gap-2 sm:gap-3 px-2 pt-4 border-t border-slate-800/70">{items.map((p,i)=><div key={p.name} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full"><div className="text-[9px] font-black text-slate-400 mb-1">{p.count}</div><div className="w-full max-w-12 rounded-t-md transition-all duration-700 origin-bottom animate-[growbar_.8s_ease-out]" style={{height:`${Math.max(16,(p.count/max)*130)}px`,background:`linear-gradient(180deg,${p.color},${p.color}66)`,boxShadow:`0 0 14px ${p.color}22`}}/><div className="mt-2 text-[8px] text-slate-600 truncate w-full text-center">{p.name}</div></div>)}</div>;
};

const Panel = ({ title, subtitle, icon: IconEl, action, children, className='' }: { title:string; subtitle?:string; icon:Icon; action?:React.ReactNode; children:React.ReactNode; className?:string }) => <section className={`rounded-2xl border border-slate-800/90 bg-[#091321] overflow-hidden ${className}`}><div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center gap-3"><div className="w-9 h-9 rounded-xl border border-cyan-400/20 bg-cyan-400/10 flex items-center justify-center"><IconEl className="w-4 h-4 text-cyan-300"/></div><div className="min-w-0 flex-1"><div className="text-sm font-black text-white">{title}</div>{subtitle&&<div className="mt-0.5 text-[9px] text-slate-600 truncate">{subtitle}</div>}</div>{action}</div><div className="p-4">{children}</div></section>;

const StrongestEvidence = ({ item }: { item?: EvidenceItem }) => <Panel title="Strongest Evidence" subtitle="Top corroborating signal from public sources" icon={ShieldCheck}>{item ? <div><div className="flex items-start gap-3"><div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center"><Globe2 className="w-5 h-5 text-blue-300"/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><div className="text-[9px] font-black text-cyan-300">{item.source}</div><div className="mt-1 text-sm font-black text-white line-clamp-2">{item.title}</div></div><span className="shrink-0 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-300">{item.confidence >= 85 ? 'STRONG MATCH' : 'REVIEW'}</span></div><p className="mt-2 text-[9px] leading-relaxed text-slate-500 line-clamp-2">{item.summary}</p></div></div><div className="mt-4 flex items-center gap-4"><div className="flex-1"><div className="flex justify-between text-[8px] text-slate-600"><span>Relevance</span><b className="text-emerald-400">{item.confidence}%</b></div><div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{width:`${item.confidence}%`}}/></div></div><a href={item.url} target="_blank" rel="noreferrer" className="text-[9px] font-black text-cyan-400 inline-flex items-center gap-1">Open Evidence <ExternalLink className="w-3 h-3"/></a></div></div> : <div className="text-xs text-slate-600">No evidence collected yet.</div>}</Panel>;

const RecentActivity = ({ result }: { result: SearchResult }) => <Panel title="Recent Activity" subtitle="Discovery and correlation events" icon={Activity} action={<span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-300 inline-flex items-center gap-1"><CircleDot className="w-3 h-3 animate-pulse"/>Live</span>}><div className="space-y-0">{result.evidence.slice(0,6).map((e,i)=><div key={e.id} className="relative pl-7 py-2.5 border-l border-cyan-500/25 last:border-transparent"><span className="absolute -left-[5px] top-4 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-cyan-500/10"/><div className="flex gap-2"><div className="flex-1 min-w-0"><div className="text-[10px] font-black text-slate-200 truncate">{i===0?'New signal discovered':i===1?'Cross-platform match':i===2?'Organization signal':'Evidence collected'}</div><div className="mt-0.5 text-[9px] text-slate-600 truncate">{e.source} • {e.title}</div></div><div className="text-[8px] text-slate-600 shrink-0">{i*7+2}m ago</div></div></div>)}</div></Panel>;

const LiveScan = ({ running, result }: { running:boolean; result:SearchResult }) => {
  const steps=['Scanning public web index…','Checking social platform surfaces…','Analyzing public documents…','Discovering related profiles…','Cross-referencing evidence…'];
  return <Panel title="Live Scan Activity" subtitle={running?'Scanning public sources in real-time':'Latest scan completed'} icon={Radar} action={<span className={`px-2 py-1 rounded-full border text-[8px] font-black ${running?'border-emerald-500/20 bg-emerald-500/10 text-emerald-300':'border-slate-700 text-slate-500'}`}>{running?'Scanning…':result.mode==='live'?'Live data':'Demo data'}</span>}><div className="space-y-2">{steps.map((s,i)=><div key={s} className="flex items-center gap-2 text-[9px]"><span className={`w-2 h-2 rounded-full ${running && i<3 ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-500/70'}`}/><span className="text-slate-500 flex-1">{s}</span><span className="text-slate-700">{running?`${i*3+1}s`:'done'}</span></div>)}</div></Panel>;
};

export const AnalyticsDashboard: React.FC = () => {
  const [query,setQuery]=useState('public.demo@example.com');
  const [result,setResult]=useState<SearchResult>(()=>createDemoResult('public.demo@example.com','email'));
  const [running,setRunning]=useState(false);
  const [menu,setMenu]=useState(false);

  const platforms=useMemo(()=>derivePlatforms(result),[result]);
  const strongest=useMemo(()=>[...result.evidence].sort((a,b)=>b.confidence-a.confidence)[0],[result]);
  const profileCount=result.evidence.filter(e=>e.category==='profile').length;
  const domainCount=result.evidence.filter(e=>e.category==='domain').length;
  const orgCount=result.evidence.filter(e=>e.category==='business').length;
  const risk=clamp(Math.round((100-result.confidence)*.55 + (result.exposure.status==='observed'?38:result.exposure.status==='possible'?18:4)));
  const credibility=clamp(Math.round((result.confidence+Math.min(100,result.sourceCount*4))/2));

  const runSearch=async()=>{
    const value=query.trim(); if(!value)return;
    setRunning(true);
    const type=inferSearchType(value);
    try{const r=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:value,type})}); if(r.ok){const p=await r.json(); setResult(p?.result||createDemoResult(value,type));}else setResult(createDemoResult(value,type));}catch{setResult(createDemoResult(value,type));}finally{setRunning(false);}
  };

  const nav:Array<[string,Icon,string]>=[['/app',LayoutDashboard,'Lead 360 Analytics'],['/app/profile',UserRound,'Lead 360 Profile'],['/app/profile#presence',Globe2,'Public Presence'],['/app/profile#identities',Fingerprint,'Identity Signals'],['/app/profile#evidence',FileSearch,'Evidence'],['/app/profile#timeline',History,'Timeline'],['/app/profile#graph',Network,'Relationship Graph'],['/app/profile#geo',MapPin,'Geo Intelligence'],['/app/workspace',BriefcaseBusiness,'Cases & Workspace']];

  return <div className="min-h-screen bg-[#040a12] text-slate-200 flex font-sans">
    <style>{`@keyframes dash{to{stroke-dashoffset:0}}@keyframes growbar{from{transform:scaleY(0)}to{transform:scaleY(1)}}`}</style>
    <aside className={`${menu?'fixed inset-y-0 left-0 z-50 flex':'hidden'} lg:flex w-[252px] shrink-0 flex-col border-r border-slate-800 bg-[#06101b]`}>
      <div className="h-[74px] px-4 border-b border-slate-800 flex items-center justify-between"><button onClick={()=>window.location.assign('/')} className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl border border-cyan-500/25 bg-cyan-500/10 flex items-center justify-center relative"><Fingerprint className="w-5 h-5 text-cyan-300"/><Radar className="absolute w-3 h-3 text-white"/></span><span className="text-left"><b className="block text-sm text-white">SAVRDH IntelSight™</b><span className="block text-[8px] tracking-[.2em] uppercase text-cyan-400">Lead Intelligence</span></span></button><button className="lg:hidden" onClick={()=>setMenu(false)}><X className="w-5 h-5"/></button></div>
      <div className="p-3 flex-1 overflow-y-auto"><div className="px-3 py-3 text-[8px] uppercase tracking-[.24em] font-black text-slate-600">Intelligence Workspace</div><div className="space-y-1">{nav.slice(0,8).map(([href,IconEl,label],i)=><button key={label} onClick={()=>window.location.assign(href)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-[10px] font-bold ${i===0?'border-cyan-400/50 bg-cyan-500/10 text-cyan-300 shadow-[0_0_24px_rgba(6,182,212,.08)]':'border-transparent text-slate-500 hover:text-white hover:bg-slate-900'}`}><IconEl className="w-4 h-4"/>{label}{i===0&&<ChevronRight className="w-3 h-3 ml-auto"/>}</button>)}</div><div className="mt-5 px-3 py-3 text-[8px] uppercase tracking-[.24em] font-black text-slate-600">Operations</div><div className="space-y-1">{[['/app/workspace',BriefcaseBusiness,'Cases & Workspace'],['#',Watch,'Watchlist'],['#',Users,'Bulk Lookup'],['#',Code2,'API Access'],['#',Settings,'Settings']].map(([href,IconEl,label])=><button key={String(label)} onClick={()=>href!=='#'&&window.location.assign(String(href))} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-bold text-slate-500 hover:text-white hover:bg-slate-900"><IconEl className="w-4 h-4"/>{String(label)}</button>)}</div></div>
      <div className="p-4 border-t border-slate-800"><div className="rounded-2xl border border-cyan-500/15 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,.13),transparent_60%)] p-4"><div className="text-[9px] font-black text-white">SAVRDH IntelSight™</div><div className="mt-1 text-[8px] tracking-[.18em] uppercase text-cyan-400">Turn open data into intelligence</div><div className="mt-4 flex items-center gap-2 text-[8px] text-emerald-400"><CircleDot className="w-3 h-3 animate-pulse"/>Public-data system online</div></div></div>
    </aside>

    <main className="min-w-0 flex-1">
      <header className="sticky top-0 z-40 h-[74px] border-b border-slate-800 bg-[#040a12]/95 backdrop-blur-xl px-4 lg:px-6 flex items-center gap-3"><button onClick={()=>setMenu(true)} className="lg:hidden w-10 h-10 rounded-xl border border-slate-800 flex items-center justify-center"><ListFilter className="w-4 h-4"/></button><div className="flex-1 max-w-4xl h-11 rounded-xl border border-slate-700 bg-[#07101c] flex items-center gap-3 px-4 focus-within:border-cyan-500/45 transition-colors"><Search className="w-4 h-4 text-slate-600"/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runSearch()} placeholder="Enter a name, email, phone number, domain or username…" className="flex-1 min-w-0 bg-transparent outline-none text-xs text-white"/></div><button onClick={runSearch} disabled={running||!query.trim()} className="h-11 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-[10px] font-black text-white inline-flex items-center gap-2 disabled:opacity-50">{running?<RefreshCw className="w-4 h-4 animate-spin"/>:<Radar className="w-4 h-4"/>}<span className="hidden sm:inline">{running?'Scanning':'Search'}</span></button><div className="hidden xl:flex items-center gap-4 pl-3 border-l border-slate-800"><Bell className="w-4 h-4 text-slate-500"/><span className="w-8 h-8 rounded-full border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center text-[10px] font-black">S</span></div></header>

      <div className="p-4 lg:p-6 max-w-[1800px] mx-auto">
        <div className="flex flex-col xl:flex-row xl:items-center gap-4 justify-between"><div><div className="text-[8px] uppercase tracking-[.24em] font-black text-cyan-400">Lead Intelligence</div><h1 className="mt-1 text-2xl lg:text-3xl font-black text-white">Lead 360 Analytics Dashboard</h1><p className="mt-1 text-[10px] text-slate-500">Graphical intelligence analytics and discovery insights from public or authorized sources.</p></div><div className="rounded-2xl border border-slate-800 bg-[#091321] px-4 py-3 flex items-center gap-4 min-w-0 xl:min-w-[440px]"><div className="w-11 h-11 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center"><UserRound className="w-5 h-5 text-cyan-300"/></div><div className="min-w-0 flex-1"><div className="text-[8px] uppercase tracking-widest text-slate-600">Target identifier</div><div className="mt-1 text-xs font-black text-white truncate">{result.query}</div><div className="mt-1 text-[8px] text-slate-600">Type: {result.type} • Last scan: {fmtDate(result.evidence[0]?.observedAt)}</div></div><span className={`px-2 py-1 rounded-full border text-[8px] font-black ${result.mode==='live'?'border-emerald-500/20 bg-emerald-500/10 text-emerald-300':'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>{result.mode==='live'?'LIVE ANALYZED':'DEMO ANALYZED'}</span></div></div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3"><MetricCard icon={Database} label="Public Sources" value={result.sourceCount} delta="LIVE" note="Evidence-linked sources"/><MetricCard icon={Users} label="Profiles Found" value={profileCount} delta={profileCount?'+ SIGNALS':''} note="Public profile surfaces"/><MetricCard icon={Globe2} label="Domains" value={domainCount} note="Domain associations"/><MetricCard icon={Building2} label="Organizations" value={orgCount} note="Business associations"/><MetricCard icon={Eye} label="Visibility Score" value={result.visibilityScore} score/><MetricCard icon={ShieldCheck} label="Confidence Score" value={result.confidence} score tone="#22d3ee"/><MetricCard icon={AlertTriangle} label="Risk Score" value={risk} score tone="#fb923c"/></div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4"><div className="xl:col-span-6"><VisibilityChart result={result}/></div><div className="xl:col-span-3"><Panel title="Source Distribution" subtitle="Identified signals by platform" icon={Network}><Donut platforms={platforms.length?platforms:[{name:'No signals',count:1,pct:100,color:'#334155'}]} total={result.sourceCount}/></Panel></div><div className="xl:col-span-3"><Panel title="Confidence & Credibility" subtitle="Cross-source reliability assessment" icon={BadgeIcon}><div className="grid grid-cols-2 gap-2"><Gauge value={result.confidence} label="Confidence"/><Gauge value={credibility} label="Credibility" tone="#34d399"/></div></Panel></div></div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4"><div className="xl:col-span-4"><Panel title="Global Presence Heatmap" subtitle="Geographic distribution of discovered signals" icon={Globe2}><WorldMap count={result.sourceCount}/></Panel></div><div className="xl:col-span-5"><Panel title="Relationship Graph" subtitle="People, profiles, organizations and domains" icon={Network}><RelationshipGraph result={result}/></Panel></div><div className="xl:col-span-3"><RecentActivity result={result}/></div></div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4"><div className="xl:col-span-5"><Panel title="Platform Signal Comparison" subtitle="Signal strength across detected platforms" icon={ChartNoAxesCombined}><BarChart platforms={platforms}/></Panel></div><div className="xl:col-span-4"><StrongestEvidence item={strongest}/></div><div className="xl:col-span-3"><LiveScan running={running} result={result}/></div></div>

        <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/[.035] p-4 flex items-start gap-3"><AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"/><div className="text-[9px] leading-relaxed text-slate-500"><b className="text-amber-300">Interpretation notice:</b> Public presence does not mean a person is currently online. IntelSight shows where a public identifier or corroborating signal was observed, its source, and confidence. Private accounts, chats, hidden location and secret credentials are not accessed.</div></div>
      </div>
    </main>
  </div>;
};

const BadgeIcon: Icon = ({ className }) => <ShieldCheck className={className}/>;
