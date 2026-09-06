import React, { useMemo, useState } from 'react';
import {
  Activity, AtSign, BadgeCheck, Bot, Building2, CheckCircle2, CircleDot, Cloud,
  Database, ExternalLink, FileImage, FileSearch, Fingerprint, FlaskConical, Globe2,
  Layers3, Link2, LoaderCircle, Mail, Map, Network, Phone, Radar, RefreshCw,
  Search, Sheet, ShieldCheck, Smartphone, Sparkles, Users, XCircle
} from 'lucide-react';
import { createDemoResult, inferSearchType, type EvidenceItem, type SearchResult } from '../lib/intelligence';

type ToolMode = 'deep' | 'company' | 'chat' | 'crawl' | 'map' | 'extract' | 'bulk' | 'market' | 'meeting';
type SourceItem = { title?: string; name?: string; url?: string; content?: string; raw_content?: string };

type ToolDef = {
  key: ToolMode;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
};

const tools: ToolDef[] = [
  { key: 'deep', label: 'Deep Research', subtitle: 'Multi-source intelligence report', icon: Sparkles },
  { key: 'company', label: 'Company Research', subtitle: 'Organization diligence', icon: Building2 },
  { key: 'chat', label: 'AI Answer', subtitle: 'Grounded analyst answer', icon: Bot },
  { key: 'crawl', label: 'Crawl2RAG', subtitle: 'Website intelligence crawl', icon: Layers3 },
  { key: 'map', label: 'Site Map', subtitle: 'Discover website structure', icon: Map },
  { key: 'extract', label: 'Evidence Extract', subtitle: 'Extract public URL content', icon: FileSearch },
  { key: 'bulk', label: 'Bulk Lookup', subtitle: 'Batch public searches', icon: Sheet },
  { key: 'market', label: 'Market Research', subtitle: 'Public market brief', icon: Activity },
  { key: 'meeting', label: 'Meeting Prep', subtitle: 'Public-source briefing', icon: Users },
];

const categoryLabel: Record<EvidenceItem['category'], string> = {
  profile: 'Social / profile',
  web: 'Public web',
  domain: 'Domain / registry',
  exposure: 'Exposure signal',
  business: 'Business / directory',
};

const platformFromUrl = (url: string) => {
  const v = String(url || '').toLowerCase();
  if (v.includes('facebook.com')) return 'Facebook';
  if (v.includes('instagram.com')) return 'Instagram';
  if (v.includes('linkedin.com')) return 'LinkedIn';
  if (v.includes('twitter.com') || v.includes('x.com')) return 'X / Twitter';
  if (v.includes('reddit.com')) return 'Reddit';
  if (v.includes('youtube.com') || v.includes('youtu.be')) return 'YouTube';
  if (v.includes('github.com')) return 'GitHub';
  if (v.includes('indiamart')) return 'IndiaMART';
  if (v.includes('justdial')) return 'Justdial';
  if (v.includes('tofler') || v.includes('zauba') || v.includes('thecompanycheck') || v.includes('instafinancials')) return 'Business Registry';
  return 'Public Web';
};

const Metric = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#081422] p-4">
    <div className="flex items-start justify-between gap-3">
      <div><div className="text-[8px] uppercase tracking-[.18em] font-black text-slate-600">{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div></div>
      <div className="w-9 h-9 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center"><Icon className="w-4 h-4 text-cyan-300" /></div>
    </div>
  </div>
);

const EvidenceCard = ({ item }: { item: EvidenceItem }) => (
  <article className="rounded-2xl border border-slate-800 bg-[#050d18] p-4 hover:border-cyan-500/25 transition-colors">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2 items-center"><span className="text-[8px] font-black uppercase tracking-widest text-cyan-400">{item.source}</span><span className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[8px] text-slate-500">{categoryLabel[item.category]}</span></div>
        <div className="mt-2 text-sm font-black text-white break-words">{item.title}</div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{item.summary}</p>
      </div>
      <span className="shrink-0 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black text-emerald-300">{item.confidence}%</span>
    </div>
    <div className="mt-3 flex items-center justify-between gap-3 text-[9px] text-slate-600"><span>{item.matchBasis || 'Source-linked public evidence'}</span><a href={item.url} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1 font-black text-cyan-300">Open <ExternalLink className="w-3 h-3" /></a></div>
  </article>
);

const InlineGraph = ({ query, evidence }: { query: string; evidence: EvidenceItem[] }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    evidence.forEach((item) => {
      const key = item.source || platformFromUrl(item.url);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].map(([name, count]) => ({ name, count })).slice(0, 8);
  }, [evidence]);
  const nodes = groups.map((item, index, all) => ({ ...item, x: 50 + Math.cos((index / Math.max(1, all.length)) * Math.PI * 2) * 33, y: 50 + Math.sin((index / Math.max(1, all.length)) * Math.PI * 2) * 30 }));
  const linked = selected ? evidence.filter((item) => (item.source || platformFromUrl(item.url)) === selected) : [];
  return <div className="relative h-[340px] rounded-2xl border border-slate-800 bg-[#040b14] overflow-hidden">
    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#1e3a5f 1px,transparent 1px)', backgroundSize: '18px 18px' }} />
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
      {nodes.map((node, index) => <g key={`edge-${node.name}`}><line x1="50" y1="50" x2={node.x} y2={node.y} stroke="#22d3ee" opacity=".35" strokeDasharray="2 2" strokeWidth=".45"><animate attributeName="stroke-dashoffset" values="0;-8" dur={`${1.6 + index * .12}s`} repeatCount="indefinite" /></line><circle r=".8" fill="#67e8f9"><animateMotion dur={`${2 + index * .1}s`} repeatCount="indefinite" path={`M 50 50 L ${node.x} ${node.y}`} /></circle></g>)}
      {nodes.map((node, index) => <g key={node.name} onClick={() => setSelected(node.name)} style={{ cursor: 'pointer' }}><circle cx={node.x} cy={node.y} r="7.5" fill="#071827" stroke={selected === node.name ? '#67e8f9' : '#38bdf8'} strokeWidth="1"><animate attributeName="r" values="6.8;7.8;6.8" dur={`${1.8 + index * .15}s`} repeatCount="indefinite" /></circle><text x={node.x} y={node.y + 1} textAnchor="middle" fill="#fff" fontSize="3.2" fontWeight="800">{node.count}</text><text x={node.x} y={node.y + 10} textAnchor="middle" fill="#64748b" fontSize="2.7">{node.name.slice(0, 16)}</text></g>)}
      <g><circle cx="50" cy="50" r="11" fill="#073047" stroke="#22d3ee" strokeWidth="1.2"><animate attributeName="r" values="9.5;11.5;9.5" dur="2.2s" repeatCount="indefinite" /></circle><circle cx="50" cy="50" r="3.8" fill="#22d3ee"><animate attributeName="opacity" values=".45;1;.45" dur="1.4s" repeatCount="indefinite" /></circle><text x="50" y="65" textAnchor="middle" fill="#e2e8f0" fontSize="2.8">{query.slice(0, 28)}</text></g>
    </svg>
    {selected && <div className="absolute right-3 top-3 bottom-3 w-[46%] min-w-[260px] rounded-2xl border border-cyan-500/25 bg-[#06101b]/95 backdrop-blur-xl p-3 overflow-y-auto"><div className="text-[9px] uppercase tracking-widest text-cyan-400 font-black">{selected}</div><div className="mt-1 text-xs text-slate-500">{linked.length} linked public source{linked.length === 1 ? '' : 's'}</div><div className="mt-3 space-y-2">{linked.map((item) => <EvidenceCard key={item.id} item={item} />)}</div><button onClick={() => setSelected(null)} className="absolute top-2 right-2 text-slate-500 hover:text-white">×</button></div>}
  </div>;
};

const SourceList = ({ sources }: { sources: SourceItem[] }) => <div className="grid gap-2">{sources.map((source, index) => {
  const url = String(source?.url || '');
  return <article key={`${url}-${index}`} className="rounded-xl border border-slate-800 bg-[#050d18] p-3"><div className="text-[10px] font-black text-white">{source.title || source.name || url || `Source ${index + 1}`}</div>{source.content && <p className="mt-2 text-[9px] leading-relaxed text-slate-500 line-clamp-4">{String(source.content)}</p>}{source.raw_content && <p className="mt-2 text-[9px] leading-relaxed text-slate-500 line-clamp-4">{String(source.raw_content).slice(0, 900)}</p>}{url && <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[9px] font-black text-cyan-300">Open source <ExternalLink className="w-3 h-3" /></a>}</article>;
})}</div>;

export const UnifiedIntelHome: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult>(() => createDemoResult('', 'email'));
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [toolMode, setToolMode] = useState<ToolMode>('deep');
  const [toolRunning, setToolRunning] = useState(false);
  const [toolResult, setToolResult] = useState<any>(null);
  const [toolError, setToolError] = useState('');
  const [context, setContext] = useState('');
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState('');
  const [bulk, setBulk] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [companyHq, setCompanyHq] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');

  const runSearch = async () => {
    const value = query.trim();
    if (!value || searching) return;
    setSearching(true); setSearchError('');
    try {
      const type = inferSearchType(value);
      const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: value, type }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Search failed');
      if (!payload?.result) throw new Error('No live search payload returned');
      setSearchResult(payload.result as SearchResult);
    } catch (err) {
      setSearchResult(createDemoResult(value, inferSearchType(value)));
      setSearchError(err instanceof Error ? err.message : 'Search unavailable');
    } finally { setSearching(false); }
  };

  const postApi = async (endpoint: string, payload: Record<string, unknown>) => {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || 'Request failed');
    return data;
  };

  const pollResearch = async (requestId: string, company = false) => {
    for (let attempt = 0; attempt < 48; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const next = company ? await postApi('/api/company-report', { action: 'status', requestId }) : await postApi('/api/tavily-suite', { action: 'research_status', requestId });
      setToolResult(next);
      const status = String(next?.data?.status || '').toLowerCase();
      if (status === 'completed' || status === 'failed' || status === 'limited') return;
    }
  };

  const runTool = async () => {
    if (toolRunning) return;
    const subject = query.trim();
    if (!subject && !['crawl', 'map', 'extract', 'bulk'].includes(toolMode)) { setToolError('Enter a search subject above first.'); return; }
    setToolRunning(true); setToolError(''); setToolResult(null);
    try {
      if (toolMode === 'company') {
        const started = await postApi('/api/company-report', { action: 'start', companyName: subject, companyUrl, companyHq, companyIndustry, context, model: 'mini' });
        setToolResult(started);
        if (started?.data?.request_id) await pollResearch(String(started.data.request_id), true);
        return;
      }
      let payload: Record<string, unknown>;
      if (toolMode === 'deep') payload = { action: 'research', input: subject, model: 'mini' };
      else if (toolMode === 'chat') payload = { action: 'chat', query: subject, maxResults: 10 };
      else if (toolMode === 'crawl') payload = { action: 'crawl', url, instructions: context, maxDepth: 1, maxBreadth: 12, limit: 20 };
      else if (toolMode === 'map') payload = { action: 'map', url, instructions: context, maxDepth: 1, maxBreadth: 18, limit: 35 };
      else if (toolMode === 'extract') payload = { action: 'extract', urls: urls.split(/\n+/).map((v) => v.trim()).filter(Boolean), query: context };
      else if (toolMode === 'bulk') payload = { action: 'bulk', items: bulk };
      else if (toolMode === 'market') payload = { action: 'market_research', subject, context, model: 'mini' };
      else payload = { action: 'meeting_prep', subject, context, model: 'mini' };
      const started = await postApi('/api/tavily-suite', payload);
      setToolResult(started);
      if (started?.data?.request_id && ['deep', 'market', 'meeting'].includes(toolMode)) await pollResearch(String(started.data.request_id));
    } catch (err) {
      setToolError(err instanceof Error ? err.message : 'Tool request failed');
    } finally { setToolRunning(false); }
  };

  const evidence = searchResult.evidence || [];
  const social = evidence.filter((item) => item.category === 'profile').length;
  const business = evidence.filter((item) => item.category === 'business').length;
  const domains = evidence.filter((item) => item.category === 'domain').length;
  const hasResult = searchResult.mode === 'live';
  const selectedTool = tools.find((tool) => tool.key === toolMode)!;
  const toolData = toolResult?.data || toolResult;
  const toolSources: SourceItem[] = Array.isArray(toolData?.sources) ? toolData.sources : Array.isArray(toolData?.results) && !toolData.results?.[0]?.query ? toolData.results : [];

  return <div className="min-h-screen bg-[#030811] text-slate-200">
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#030811]/95 backdrop-blur-xl">
      <div className="max-w-[1780px] mx-auto px-4 sm:px-6 h-20 flex items-center gap-4">
        <button onClick={() => window.location.assign('/')} className="flex items-center gap-3 shrink-0"><span className="relative w-11 h-11 rounded-xl border border-cyan-500/25 bg-cyan-500/10 flex items-center justify-center"><Fingerprint className="w-5 h-5 text-cyan-300" /><FileSearch className="absolute w-3 h-3 text-white" /></span><span className="hidden md:block"><b className="block text-sm text-white">SAVRDH IntelSight™</b><span className="block text-[8px] uppercase tracking-[.2em] text-cyan-400">Unified Intelligence</span></span></button>
        <div className="flex-1 max-w-5xl mx-auto flex gap-2"><div className="flex-1 h-12 rounded-xl border border-slate-700 bg-[#07101c] flex items-center gap-3 px-4 focus-within:border-cyan-500/50"><Search className="w-4 h-4 text-slate-600" /><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runSearch()} placeholder="Email, +91 mobile, username, domain, person or company…" className="min-w-0 flex-1 bg-transparent outline-none text-sm text-white font-mono" /></div><button onClick={runSearch} disabled={!query.trim() || searching} className="h-12 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-black text-white disabled:opacity-40 inline-flex items-center gap-2">{searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}Search</button></div>
        <nav className="hidden xl:flex gap-2"><button onClick={() => document.getElementById('lead360')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-[10px] font-black text-cyan-300">Lead 360</button><button onClick={() => document.getElementById('deep-scan')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-[10px] font-black text-slate-400">Deep Scan</button></nav>
      </div>
    </header>

    <main className="max-w-[1780px] mx-auto p-4 sm:p-6 lg:p-8">
      <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-4"><div><div className="text-[9px] uppercase tracking-[.22em] font-black text-cyan-400">Unified Intelligence Workspace</div><h1 className="mt-2 text-2xl sm:text-3xl font-black text-white">Lead 360 + Deep Scan on one home screen</h1><p className="mt-2 max-w-3xl text-xs sm:text-sm text-slate-500">One search subject powers verified public intelligence, source evidence, relationship analysis, Tavily research, company diligence, crawl, map, extract and batch workflows.</p></div><div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[.04] px-4 py-3 flex items-center gap-3"><CircleDot className="w-4 h-4 text-emerald-400 animate-pulse" /><div><div className="text-[9px] font-black text-emerald-300">PUBLIC-DATA MODE</div><div className="text-[9px] text-slate-600">Public/authorized evidence only</div></div></div></section>

      {searchError && <div className="mt-5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">{searchError}</div>}

      <section id="lead360" className="mt-6 scroll-mt-28 rounded-3xl border border-cyan-500/15 bg-[#06101b] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4"><div><div className="text-[9px] uppercase tracking-[.2em] font-black text-cyan-400">Module 01</div><h2 className="mt-1 text-xl font-black text-white">Lead 360 Intelligence</h2></div><span className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[9px] font-black text-cyan-300">INLINE • LIVE</span></div>

        {!hasResult ? <div className="mt-5 rounded-2xl border border-slate-800 bg-[#081422] p-10 text-center"><Fingerprint className="w-10 h-10 mx-auto text-slate-700" /><div className="mt-4 text-base font-black text-white">Run a search from the top bar</div><p className="mt-2 text-xs text-slate-600">Lead 360 profile, evidence, timeline and relationship graph will populate here.</p></div> : <>
          <div className="mt-5 rounded-2xl border border-slate-800 bg-[#081422] p-5"><div className="flex flex-col lg:flex-row gap-5 lg:items-start justify-between"><div className="flex gap-4 min-w-0"><div className="w-12 h-12 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center shrink-0"><BadgeCheck className="w-5 h-5 text-cyan-300" /></div><div className="min-w-0"><div className="text-[8px] uppercase tracking-widest text-slate-600">Searched identifier</div><div className="mt-1 text-lg font-black text-white break-all">{searchResult.query}</div><div className="mt-2 text-xs text-slate-500">{searchResult.possibleIdentity}</div><p className="mt-3 max-w-4xl text-[11px] leading-relaxed text-slate-500">{searchResult.summary}</p></div></div><div className="flex gap-3"><div className="text-center"><div className="w-16 h-16 rounded-full border-4 border-cyan-500/70 flex items-center justify-center text-lg font-black text-white">{searchResult.visibilityScore}</div><div className="mt-1 text-[8px] uppercase tracking-widest text-slate-600">Visibility</div></div><div className="text-center"><div className="w-16 h-16 rounded-full border-4 border-blue-500/70 flex items-center justify-center text-lg font-black text-white">{searchResult.confidence}</div><div className="mt-1 text-[8px] uppercase tracking-widest text-slate-600">Confidence</div></div></div></div></div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3"><Metric label="Public Sources" value={searchResult.sourceCount} icon={Database} /><Metric label="Social / Profiles" value={social} icon={Users} /><Metric label="Domains" value={domains} icon={Globe2} /><Metric label="Business / Registry" value={business} icon={Building2} /><Metric label="Platforms" value={searchResult.platformCount ?? searchResult.platformsFound?.length ?? 0} icon={Cloud} /><Metric label="Exact Matches" value={searchResult.exactMatchCount ?? evidence.length} icon={BadgeCheck} /></div>
          <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4"><section className="xl:col-span-7 rounded-2xl border border-slate-800 bg-[#081422] p-4"><div className="flex items-center gap-2"><Globe2 className="w-4 h-4 text-cyan-300" /><h3 className="text-sm font-black text-white">Public Presence & Evidence</h3></div><div className="mt-4 grid gap-3">{evidence.length ? evidence.slice(0, 10).map((item) => <EvidenceCard key={item.id} item={item} />) : <div className="text-xs text-slate-600">No verified public evidence found.</div>}</div></section><section className="xl:col-span-5 rounded-2xl border border-slate-800 bg-[#081422] p-4"><div className="flex items-center gap-2"><Network className="w-4 h-4 text-cyan-300" /><h3 className="text-sm font-black text-white">Relationship Graph</h3></div><div className="mt-4"><InlineGraph query={searchResult.query} evidence={evidence} /></div></section></div>
          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4"><section className="rounded-2xl border border-slate-800 bg-[#081422] p-4"><div className="flex items-center gap-2"><AtSign className="w-4 h-4 text-cyan-300" /><h3 className="text-sm font-black text-white">Identity Signals</h3></div><div className="mt-4 grid gap-2"><div className="rounded-xl border border-slate-800 bg-[#050d18] p-3"><div className="text-[8px] uppercase tracking-widest text-slate-600">Primary identifier</div><div className="mt-1 text-xs font-black text-white break-all">{searchResult.query}</div></div><div className="rounded-xl border border-slate-800 bg-[#050d18] p-3"><div className="text-[8px] uppercase tracking-widest text-slate-600">Possible public identity</div><div className="mt-1 text-xs font-black text-white">{searchResult.possibleIdentity}</div></div><div className="rounded-xl border border-slate-800 bg-[#050d18] p-3"><div className="text-[8px] uppercase tracking-widest text-slate-600">Exposure</div><div className="mt-1 text-xs text-slate-400">{searchResult.exposure?.summary}</div></div></div></section><section className="rounded-2xl border border-slate-800 bg-[#081422] p-4"><div className="flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-300" /><h3 className="text-sm font-black text-white">Timeline</h3></div><div className="mt-4 space-y-3">{searchResult.timeline?.length ? searchResult.timeline.slice(0, 8).map((item, index) => <div key={`${item.date}-${index}`} className="flex gap-3"><div className="mt-1 w-2 h-2 rounded-full bg-cyan-400" /><div><div className="text-[9px] text-cyan-300">{item.date}</div><div className="text-[10px] font-black text-white">{item.label}</div><div className="text-[9px] text-slate-600">{item.detail}</div></div></div>) : <div className="text-xs text-slate-600">No timeline events surfaced.</div>}</div></section></div>
        </>}
      </section>

      <section id="deep-scan" className="mt-6 scroll-mt-28 rounded-3xl border border-violet-500/15 bg-[#06101b] p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><div className="text-[9px] uppercase tracking-[.2em] font-black text-violet-400">Module 02</div><h2 className="mt-1 text-xl font-black text-white">Deep Scan & Tavily Intelligence Modules</h2><p className="mt-2 text-xs text-slate-600">Uses the same home-screen search subject. Select any intelligence workflow below.</p></div><div className="rounded-xl border border-slate-800 bg-[#050d18] px-3 py-2 text-[10px] text-slate-500">Current subject: <b className="text-white">{query || 'Not set'}</b></div></div>

        <div className="mt-5 grid grid-cols-1 xl:grid-cols-[290px_minmax(0,1fr)] gap-4">
          <aside className="rounded-2xl border border-slate-800 bg-[#081422] p-3 h-fit"><div className="px-2 pb-3 text-[8px] uppercase tracking-[.18em] font-black text-slate-600">Deep Scan tools</div><div className="space-y-1">{tools.map((tool) => { const Icon = tool.icon; return <button key={tool.key} onClick={() => { setToolMode(tool.key); setToolResult(null); setToolError(''); }} className={`w-full rounded-xl border p-3 text-left flex items-center gap-3 transition-colors ${toolMode === tool.key ? 'border-violet-500/30 bg-violet-500/10' : 'border-transparent hover:bg-slate-900'}`}><div className="w-9 h-9 rounded-xl border border-slate-800 bg-[#050d18] flex items-center justify-center"><Icon className={`w-4 h-4 ${toolMode === tool.key ? 'text-violet-300' : 'text-slate-600'}`} /></div><div><div className={`text-[10px] font-black ${toolMode === tool.key ? 'text-white' : 'text-slate-400'}`}>{tool.label}</div><div className="text-[8px] text-slate-700">{tool.subtitle}</div></div></button>; })}</div></aside>
          <div className="space-y-4"><section className="rounded-2xl border border-slate-800 bg-[#081422] p-4"><div className="flex items-center justify-between gap-3"><div><div className="text-[8px] uppercase tracking-widest font-black text-violet-400">{selectedTool.label}</div><div className="mt-1 text-xs text-slate-500">{selectedTool.subtitle}</div></div><FlaskConical className="w-5 h-5 text-violet-300" /></div>
            {['company'].includes(toolMode) && <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3"><input value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} placeholder="Company URL (optional)" className="h-11 rounded-xl border border-slate-800 bg-[#050d18] px-3 text-xs text-white outline-none" /><input value={companyHq} onChange={(e) => setCompanyHq(e.target.value)} placeholder="HQ (optional)" className="h-11 rounded-xl border border-slate-800 bg-[#050d18] px-3 text-xs text-white outline-none" /><input value={companyIndustry} onChange={(e) => setCompanyIndustry(e.target.value)} placeholder="Industry (optional)" className="h-11 rounded-xl border border-slate-800 bg-[#050d18] px-3 text-xs text-white outline-none" /></div>}
            {['crawl','map'].includes(toolMode) && <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="mt-4 w-full h-11 rounded-xl border border-slate-800 bg-[#050d18] px-3 text-xs text-white outline-none" />}
            {toolMode === 'extract' && <textarea value={urls} onChange={(e) => setUrls(e.target.value)} placeholder="One public URL per line" rows={4} className="mt-4 w-full rounded-xl border border-slate-800 bg-[#050d18] p-3 text-xs text-white outline-none resize-none" />}
            {toolMode === 'bulk' && <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder="One identifier/company/domain per line" rows={5} className="mt-4 w-full rounded-xl border border-slate-800 bg-[#050d18] p-3 text-xs text-white outline-none resize-none" />}
            {toolMode !== 'bulk' && <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Optional research focus / instructions" rows={3} className="mt-4 w-full rounded-xl border border-slate-800 bg-[#050d18] p-3 text-xs text-white outline-none resize-none" />}
            {toolError && <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[10px] text-amber-300">{toolError}</div>}
            <button onClick={runTool} disabled={toolRunning} className="mt-4 h-11 px-5 rounded-xl bg-gradient-to-r from-violet-500 to-blue-600 text-xs font-black text-white inline-flex items-center gap-2 disabled:opacity-40">{toolRunning ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{toolRunning ? 'Running…' : `Run ${selectedTool.label}`}</button>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#081422] p-4 min-h-[300px]"><div className="flex items-center gap-2"><Database className="w-4 h-4 text-violet-300" /><h3 className="text-sm font-black text-white">Deep Scan Output</h3></div>{!toolResult ? <div className="min-h-[240px] flex items-center justify-center text-center"><div><Radar className="w-10 h-10 mx-auto text-slate-700" /><div className="mt-3 text-xs font-black text-slate-500">No deep-scan output yet</div><p className="mt-1 text-[10px] text-slate-700">Select a tool and run it from this home screen.</p></div></div> : <div className="mt-4 space-y-3">{toolData?.status && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[10px] text-emerald-300">Status: {String(toolData.status)}</div>}{toolData?.answer && <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[.05] p-4"><div className="text-[8px] uppercase tracking-widest text-cyan-400 font-black">Grounded Answer</div><div className="mt-2 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">{String(toolData.answer)}</div></div>}{toolData?.content && <div className="rounded-xl border border-slate-800 bg-[#050d18] p-4"><div className="text-[8px] uppercase tracking-widest text-violet-400 font-black">Research Report</div><div className="mt-3 max-h-[560px] overflow-y-auto text-[11px] leading-6 text-slate-400 whitespace-pre-wrap">{typeof toolData.content === 'string' ? toolData.content : JSON.stringify(toolData.content, null, 2)}</div></div>}{toolSources.length > 0 && <div><div className="mb-2 text-[8px] uppercase tracking-widest text-slate-600 font-black">Sources</div><SourceList sources={toolSources} /></div>}{!toolData?.answer && !toolData?.content && !toolSources.length && <pre className="max-h-[520px] overflow-auto rounded-xl border border-slate-800 bg-[#050d18] p-3 text-[9px] text-slate-500">{JSON.stringify(toolData, null, 2)}</pre>}</div>}</section></div>
        </div>
      </section>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-[#050d18] p-4 flex flex-wrap items-center gap-3 text-[9px] text-slate-600"><ShieldCheck className="w-4 h-4 text-emerald-400" />Public/authorized sources only <span>•</span> No private chats, passwords, OTPs, locked-account content or private real-time location.</div>
    </main>
  </div>;
};
