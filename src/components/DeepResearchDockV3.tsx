import React, { useMemo, useState } from 'react';
import {
  Activity, AtSign, Bot, Building2, CheckCircle2, Cloud, ExternalLink, FileImage,
  FileText, GitBranch, Globe2, Image as ImageIcon, Link2, LoaderCircle, Mail,
  Network, Phone, Radar, Search, ShieldCheck, Sparkles, Users, X
} from 'lucide-react';

type ResearchSource = {
  title?: string;
  url?: string;
  content?: string;
  source?: string;
  platform?: string;
  confidence?: number;
  origin?: string;
  category?: string;
  matchType?: string;
  candidateName?: string;
};

type ResearchSection = { title: string; body: string };
type PlatformStat = { name: string; count: number };
type EntityImage = { url?: string; description?: string; candidateName?: string; originQuery?: string };

type EntityExpansion = {
  candidateNames?: string[];
  evidence?: ResearchSource[];
  images?: EntityImage[];
  domains?: string[];
  counts?: Record<string, number>;
  notice?: string;
};

const SOCIAL = new Set(['Facebook', 'Instagram', 'LinkedIn', 'X / Twitter', 'Reddit', 'YouTube', 'TikTok', 'Threads', 'Pinterest']);
const DEV_CLOUD = new Set(['GitHub', 'GitHub Public Commits', 'Vercel Public Web', 'Supabase Public Web', 'npm', 'Stack Overflow', 'DEV Community']);
const BUSINESS_HOSTS = ['mca.gov.in', 'instafinancials', 'zaubacorp', 'tofler', 'thecompanycheck', 'tradeindia', 'indiamart', 'justdial', 'sulekha', 'indiafilings', 'cleartax', 'exportersindia'];

const platformFromUrl = (url: string) => {
  const value = String(url || '').toLowerCase();
  if (value.includes('facebook.com')) return 'Facebook';
  if (value.includes('instagram.com')) return 'Instagram';
  if (value.includes('linkedin.com')) return 'LinkedIn';
  if (value.includes('twitter.com') || value.includes('x.com')) return 'X / Twitter';
  if (value.includes('reddit.com')) return 'Reddit';
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'YouTube';
  if (value.includes('tiktok.com')) return 'TikTok';
  if (value.includes('threads.net')) return 'Threads';
  if (value.includes('pinterest.')) return 'Pinterest';
  if (value.includes('github.com')) return 'GitHub';
  if (value.includes('vercel.app') || value.includes('vercel.com')) return 'Vercel Public Web';
  if (value.includes('supabase.co') || value.includes('supabase.com')) return 'Supabase Public Web';
  if (value.includes('npmjs.com')) return 'npm';
  if (value.includes('stackoverflow.com') || value.includes('stackexchange.com')) return 'Stack Overflow';
  if (value.includes('dev.to')) return 'DEV Community';
  if (BUSINESS_HOSTS.some((host) => value.includes(host))) return 'Business / Registry';
  return 'Public Web';
};

const sourcePlatform = (source: ResearchSource) =>
  source.platform || (source.source && source.source !== 'Indexed Public Web' ? source.source : '') || platformFromUrl(String(source.url || ''));

const cleanMarkdown = (value: string) => value
  .replace(/\*\*/g, '')
  .replace(/\[\[(\d+)\]\]/g, '[$1]')
  .replace(/^[-*]\s+/gm, '• ')
  .replace(/\|[-:\s|]+\|/g, '')
  .trim();

const parseSections = (content: string): ResearchSection[] => {
  if (!content.trim()) return [];
  const lines = content.split(/\r?\n/);
  const sections: ResearchSection[] = [];
  let title = 'Executive Summary';
  let body: string[] = [];
  const flush = () => {
    const text = cleanMarkdown(body.join('\n'));
    if (text) sections.push({ title: cleanMarkdown(title).replace(/^#+\s*/, ''), body: text });
    body = [];
  };
  lines.forEach((line) => {
    const match = line.match(/^#{1,3}\s+(.+)/);
    if (match) { flush(); title = match[1]; } else body.push(line);
  });
  flush();
  return sections.filter((section) => !/^sources?$/i.test(section.title));
};

const urlsFromText = (content: string) => {
  const matches = content.match(/https?:\/\/[^\s)\]}>,]+/g) || [];
  return [...new Set(matches.map((url) => url.replace(/[.,;]+$/, '')))];
};

const contactsFromText = (content: string) => {
  const emails = [...new Set((content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((v) => v.toLowerCase()))];
  const phones = [...new Set((content.match(/(?:\+?91[\s-]?)?[6-9]\d{9}/g) || []).map((v) => v.replace(/\s|-/g, '')))];
  return { emails, phones };
};

const inferVerifiedType = (value: string) => {
  const v = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'email';
  if (/^\+?[\d\s().-]{7,20}$/.test(v)) return 'mobile';
  if (/^(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(v)) return 'domain';
  if (/^[a-z0-9_-]{2,60}$/i.test(v.replace(/^@/, ''))) return 'username';
  return null;
};

const Metric = ({ label, value, icon: Icon }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }> }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#081422] p-4">
    <div className="flex items-start justify-between gap-3">
      <div><div className="text-[8px] uppercase tracking-[.18em] font-black text-slate-600">{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div></div>
      <div className="w-9 h-9 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center"><Icon className="w-4 h-4 text-cyan-300" /></div>
    </div>
  </div>
);

function AnimatedGraph({ subject, platforms, sources }: { subject: string; platforms: PlatformStat[]; sources: ResearchSource[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const nodes = platforms.slice(0, 10).map((item, index, all) => ({
    ...item,
    x: 50 + Math.cos((index / Math.max(1, all.length)) * Math.PI * 2) * 34,
    y: 50 + Math.sin((index / Math.max(1, all.length)) * Math.PI * 2) * 31,
  }));
  const selectedSources = selected === '__all__' ? sources : selected ? sources.filter((source) => sourcePlatform(source) === selected) : [];
  const label = selected === '__all__' ? subject : selected;

  return (
    <div className="relative h-[410px] rounded-2xl border border-slate-800 bg-[#050d18] overflow-hidden">
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(#1e3a5f 1px,transparent 1px)', backgroundSize: '18px 18px' }} />
      <div className="absolute left-3 top-3 z-10 rounded-lg border border-cyan-500/20 bg-[#07101c]/90 px-2.5 py-1.5 text-[8px] font-black text-cyan-300">Click any node to inspect evidence</div>
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        {nodes.map((node, index) => <g key={`edge-${node.name}`}>
          <line x1="50" y1="50" x2={node.x} y2={node.y} stroke="#22d3ee" opacity=".35" strokeWidth=".55" strokeDasharray="2.4 2.4">
            <animate attributeName="stroke-dashoffset" values="0;-10" dur={`${1.4 + index * .12}s`} repeatCount="indefinite" />
          </line>
          <circle r="0.85" fill="#67e8f9" opacity=".9"><animateMotion dur={`${1.9 + index * .13}s`} repeatCount="indefinite" path={`M 50 50 L ${node.x} ${node.y}`} /></circle>
        </g>)}
        {nodes.map((node, index) => {
          const active = selected === node.name;
          return <g key={node.name} onClick={() => setSelected(node.name)} style={{ cursor: 'pointer' }}>
            <circle cx={node.x} cy={node.y} r="10" fill="#0a1c2a" stroke={active ? '#67e8f9' : '#38bdf8'} strokeWidth={active ? 1.7 : 1} opacity=".35"><animate attributeName="r" values="8.4;10;8.4" dur={`${1.9 + index * .16}s`} repeatCount="indefinite" /></circle>
            <circle cx={node.x} cy={node.y} r="7.6" fill="#091827" stroke={active ? '#67e8f9' : '#38bdf8'} strokeWidth={active ? 1.4 : .8} />
            <circle cx={node.x} cy={node.y} r="2.1" fill="#22d3ee" opacity=".45"><animate attributeName="opacity" values=".25;1;.25" dur="1.6s" repeatCount="indefinite" /></circle>
            <text x={node.x} y={node.y - .4} textAnchor="middle" fill="#e2e8f0" fontSize="3.1" fontWeight="800">{node.count}</text>
            <text x={node.x} y={node.y + 11.5} textAnchor="middle" fill={active ? '#67e8f9' : '#64748b'} fontSize="2.75">{node.name.slice(0, 19)}</text>
          </g>;
        })}
        <g onClick={() => setSelected('__all__')} style={{ cursor: 'pointer' }}>
          <circle cx="50" cy="50" r="14" fill="#0a3141" stroke="#22d3ee" strokeWidth="1" opacity=".28"><animate attributeName="r" values="11;14;11" dur="2.3s" repeatCount="indefinite" /></circle>
          <circle cx="50" cy="50" r="10.5" fill="#062536" stroke="#22d3ee" strokeWidth="1.3" />
          <circle cx="50" cy="50" r="4" fill="#22d3ee"><animate attributeName="r" values="3.3;4.8;3.3" dur="1.8s" repeatCount="indefinite" /></circle>
          <text x="50" y="65" textAnchor="middle" fill="#e2e8f0" fontSize="3" fontWeight="700">{subject.slice(0, 28)}</text>
        </g>
      </svg>

      {selected && <div className="absolute inset-y-3 right-3 z-20 w-[49%] min-w-[300px] rounded-2xl border border-cyan-500/25 bg-[#06101b]/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center"><Network className="w-4 h-4 text-cyan-300" /></div>
          <div className="min-w-0 flex-1"><div className="text-[8px] uppercase tracking-widest text-cyan-400">Graph intelligence detail</div><div className="mt-1 text-sm font-black text-white truncate">{label}</div><div className="mt-1 text-[9px] text-slate-600">{selectedSources.length} public source{selectedSources.length === 1 ? '' : 's'} linked</div></div>
          <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="p-3 space-y-2 overflow-y-auto">
          {selectedSources.length ? selectedSources.map((source, index) => <article key={`${source.url}-${index}`} className="rounded-xl border border-slate-800 bg-[#040a12] p-3">
            <div className="flex gap-2 items-start justify-between"><div className="min-w-0"><div className="text-[8px] font-black text-cyan-400">{sourcePlatform(source)}{source.origin ? ` • ${source.origin}` : ''}</div><div className="mt-1 text-[10px] font-black text-white line-clamp-2">{source.title || `Public source ${index + 1}`}</div></div>{typeof source.confidence === 'number' && <span className="shrink-0 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[8px] font-black text-emerald-300">{source.confidence}%</span>}</div>
            {source.candidateName && <div className="mt-2 text-[8px] text-violet-300">Name signal: {source.candidateName}</div>}
            {source.content && <p className="mt-2 text-[9px] leading-relaxed text-slate-600 line-clamp-4">{source.content}</p>}
            {source.matchType === 'name_only' && <div className="mt-2 text-[8px] text-amber-300">Name-only correlation — ownership not confirmed.</div>}
            {source.url && <button onClick={() => window.open(source.url, '_blank', 'noopener,noreferrer')} className="mt-2 inline-flex items-center gap-1 text-[9px] font-black text-cyan-300">Open public source <ExternalLink className="w-3 h-3" /></button>}
          </article>) : <div className="p-6 text-center text-[10px] text-slate-600">No source records attached to this node.</div>}
        </div>
      </div>}
    </div>
  );
}

const SourceCard = ({ source }: { source: ResearchSource }) => (
  <article className="rounded-2xl border border-slate-800 bg-[#050d18] p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><div className="text-[8px] uppercase tracking-widest font-black text-cyan-400">{sourcePlatform(source)}{source.origin ? ` • ${source.origin}` : ''}</div><div className="mt-1 text-xs font-black text-white line-clamp-2">{source.title || 'Public source'}</div></div>
      {typeof source.confidence === 'number' && <span className={`shrink-0 rounded-lg border px-2 py-1 text-[8px] font-black ${source.matchType === 'name_only' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}>{source.confidence}%</span>}
    </div>
    {source.candidateName && <div className="mt-2 text-[9px] text-violet-300">Entity: {source.candidateName}</div>}
    {source.content && <p className="mt-2 text-[10px] leading-relaxed text-slate-600 line-clamp-4">{source.content}</p>}
    {source.matchType === 'name_only' && <div className="mt-2 text-[8px] text-amber-300">Possible entity match — original identifier not observed on this source.</div>}
    {source.url && <button onClick={() => window.open(source.url, '_blank', 'noopener,noreferrer')} className="mt-3 inline-flex items-center gap-1 text-[9px] font-black text-cyan-300">Open public source <ExternalLink className="w-3 h-3" /></button>}
  </article>
);

export default function DeepResearchDockV3() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [fusionEvidence, setFusionEvidence] = useState<ResearchSource[]>([]);
  const [entityData, setEntityData] = useState<EntityExpansion>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'sources' | 'images'>('overview');

  const openDock = () => {
    const dashboardInput = document.querySelector('header input') as HTMLInputElement | null;
    if (dashboardInput?.value?.trim()) setSubject(dashboardInput.value.trim());
    setOpen(true);
  };

  const callJson = async (path: string, payload: Record<string, unknown>) => {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Request failed: ${path}`);
    return data;
  };

  const runFusion = async (value: string) => {
    const collected: ResearchSource[] = [];
    const verifiedType = inferVerifiedType(value);
    const tasks: Promise<any>[] = [];
    if (verifiedType) tasks.push(callJson('/api/search', { query: value, type: verifiedType }).catch(() => null));
    if (verifiedType === 'email') tasks.push(callJson('/api/dev-footprint', { query: value }).catch(() => null));
    const payloads = await Promise.all(tasks);
    payloads.forEach((payload) => {
      const searchEvidence = Array.isArray(payload?.result?.evidence) ? payload.result.evidence : [];
      const devEvidence = Array.isArray(payload?.evidence) ? payload.evidence : [];
      searchEvidence.forEach((item: any) => collected.push({
        source: item.source, platform: item.source, title: item.title, url: item.url,
        content: item.summary, confidence: item.confidence, origin: 'Verified exact connector', matchType: 'corroborated',
      }));
      devEvidence.forEach((item: any) => collected.push({
        source: item.source, platform: item.platform || item.source, title: item.title, url: item.url,
        content: item.content, confidence: item.confidence, origin: 'Developer/cloud connector', matchType: 'corroborated',
      }));
    });
    const seen = new Set<string>();
    setFusionEvidence(collected.filter((item) => {
      const key = String(item.url || '').toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    }));
  };

  const runResearch = async () => {
    const value = subject.trim();
    if (!value || running) return;
    setRunning(true); setError(''); setResult(null); setFusionEvidence([]); setEntityData({}); setStatus('Starting research + entity expansion…'); setActiveTab('overview');

    const fusionPromise = runFusion(value).catch(() => undefined);
    const entityPromise = callJson('/api/entity-expansion', { subject: value })
      .then((payload) => setEntityData(payload || {}))
      .catch(() => setEntityData({}));

    try {
      const input = `Build a structured public intelligence profile for "${value}" using public sources only. Cover: Identity & Ownership; Online Presence; Social-media & Professional Networks; Developer & Cloud Footprints when publicly observable; Websites & Domains; Corporate & Registration Signals; Public Mentions, Posts & Media; public image/poster references when supported by indexed sources; Additional Contact Information; Synthesis; and Sources. Preserve source links. Distinguish exact identifier evidence, name-only correlations, and possible matches. Do not infer private data, private account contents, private login associations, or private location.`;
      const started = await callJson('/api/tavily-suite', { action: 'research', input, model: 'mini' });
      const requestId = started?.data?.request_id;
      if (!requestId) throw new Error('Research service did not return a request ID.');
      setResult(started);
      for (let attempt = 0; attempt < 48; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        setStatus(`Researching web, social, domains, registry & images… ${Math.min(99, 8 + attempt * 2)}%`);
        const next = await callJson('/api/tavily-suite', { action: 'research_status', requestId: String(requestId) });
        setResult(next);
        const researchStatus = String(next?.data?.status || '').toLowerCase();
        if (researchStatus === 'completed') { setStatus('Research + entity expansion completed'); break; }
        if (researchStatus === 'failed') throw new Error('Deep Research failed upstream.');
      }
      await Promise.all([fusionPromise, entityPromise]);
    } catch (err) {
      await Promise.all([fusionPromise, entityPromise]);
      setError(err instanceof Error ? err.message : 'Deep Research failed');
    } finally {
      setRunning(false);
    }
  };

  const data = result?.data || {};
  const content = typeof data?.content === 'string' ? data.content : '';
  const sections = useMemo(() => parseSections(content), [content]);
  const sourceObjects: ResearchSource[] = Array.isArray(data?.sources) ? data.sources : [];
  const textUrls = useMemo(() => urlsFromText(content), [content]);
  const entityEvidence = Array.isArray(entityData?.evidence) ? entityData.evidence : [];
  const images = Array.isArray(entityData?.images) ? entityData.images : [];
  const candidateNames = Array.isArray(entityData?.candidateNames) ? entityData.candidateNames : [];
  const domains = Array.isArray(entityData?.domains) ? entityData.domains : [];

  const sources = useMemo(() => {
    const byUrl = new Map<string, ResearchSource>();
    sourceObjects.forEach((source) => { if (source?.url) byUrl.set(String(source.url), { ...source, origin: 'Tavily Research' }); });
    textUrls.forEach((url) => { if (!byUrl.has(url)) byUrl.set(url, { url, title: url, origin: 'Research report link' }); });
    fusionEvidence.forEach((item) => { if (item.url) byUrl.set(String(item.url), item); });
    entityEvidence.forEach((item) => {
      if (!item.url) return;
      byUrl.set(String(item.url), { ...item, origin: item.matchType === 'corroborated' ? 'Entity corroboration' : 'Name/entity expansion' });
    });
    return [...byUrl.values()];
  }, [sourceObjects, textUrls, fusionEvidence, entityEvidence]);

  const platforms = useMemo<PlatformStat[]>(() => {
    const counts = new Map<string, number>();
    sources.forEach((source) => {
      const name = sourcePlatform(source);
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [sources]);

  const contacts = useMemo(() => contactsFromText(`${content}\n${sources.map((s) => s.content || '').join('\n')}`), [content, sources]);
  const socialSources = sources.filter((source) => SOCIAL.has(sourcePlatform(source)));
  const registrySources = sources.filter((source) => sourcePlatform(source) === 'Business / Registry');
  const webDomainSources = sources.filter((source) => ['Public Web', 'Vercel Public Web', 'Supabase Public Web'].includes(sourcePlatform(source)));
  const devCloudCount = platforms.filter((item) => DEV_CLOUD.has(item.name)).reduce((sum, item) => sum + item.count, 0);
  const corroboratedCount = sources.filter((source) => source.matchType === 'corroborated' || (source.confidence || 0) >= 95).length;
  const coverage = Math.min(100, sources.length * 5 + platforms.length * 5 + candidateNames.length * 7 + domains.length * 5 + Math.min(images.length * 2, 12) + Math.min(sections.length * 2, 18));
  const completed = String(data?.status || '').toLowerCase() === 'completed';
  const maxPlatform = Math.max(1, ...platforms.map((item) => item.count));

  return <>
    <button onClick={openDock} className="fixed right-5 bottom-5 z-[60] rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3.5 shadow-[0_16px_50px_rgba(14,165,233,.25)] text-white inline-flex items-center gap-2 text-xs font-black hover:brightness-110"><Sparkles className="w-4 h-4" /> Deep Research</button>

    {open && <div className="fixed inset-0 z-[80] bg-[#02060d]/95 backdrop-blur-xl overflow-y-auto">
      <div className="min-h-screen max-w-[1780px] mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 flex items-center justify-center"><Bot className="w-5 h-5 text-cyan-300" /></div><div><div className="text-[9px] uppercase tracking-[.2em] font-black text-cyan-400">SAVRDH IntelSight™</div><h2 className="text-xl sm:text-2xl font-black text-white">Deep Research + Entity Intelligence</h2></div></div>
          <button onClick={() => setOpen(false)} className="w-11 h-11 rounded-xl border border-slate-800 bg-[#07101c] flex items-center justify-center text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <section className="mt-5 rounded-3xl border border-slate-800 bg-[#07101c] p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row gap-3"><div className="flex-1 h-12 rounded-xl border border-slate-700 bg-[#040a12] flex items-center gap-3 px-4 focus-within:border-cyan-500/50"><Search className="w-4 h-4 text-slate-600" /><input value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runResearch()} placeholder="Email, mobile, person/company name, domain or public identifier" className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white font-mono" /></div><button onClick={runResearch} disabled={running || !subject.trim()} className="h-12 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-black text-white inline-flex items-center justify-center gap-2 disabled:opacity-40">{running ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}{running ? 'Researching…' : 'Run Deep Research'}</button></div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] text-slate-600"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />Public/authorized sources only <span>•</span><span>Tavily Research</span><span>•</span><span className="text-cyan-400">Exact connector fusion + name/entity expansion + public image signals</span>{status && <><span>•</span><span className="text-cyan-400">{status}</span></>}</div>
          {error && <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</div>}
        </section>

        {!content && !fusionEvidence.length && !entityEvidence.length && <section className="mt-5 min-h-[440px] rounded-3xl border border-slate-800 bg-[#07101c] flex items-center justify-center text-center p-8"><div><Sparkles className={`w-12 h-12 mx-auto ${running ? 'text-cyan-300 animate-pulse' : 'text-slate-700'}`} /><h3 className="mt-4 text-lg font-black text-white">{running ? 'Expanding public intelligence…' : 'Deep Research ready'}</h3><p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-600">The engine will search exact identifier evidence, public names/entities, websites/domains, social posts/pages, business/registry references and public image signals.</p></div></section>}

        {(content || fusionEvidence.length > 0 || entityEvidence.length > 0) && <>
          <section className="mt-5 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <Metric label="All sources" value={sources.length} icon={Globe2} />
            <Metric label="Corroborated" value={corroboratedCount} icon={GitBranch} />
            <Metric label="Names / entities" value={candidateNames.length} icon={AtSign} />
            <Metric label="Domains" value={domains.length} icon={Cloud} />
            <Metric label="Social" value={socialSources.length} icon={Users} />
            <Metric label="Business / registry" value={registrySources.length} icon={Building2} />
            <Metric label="Images" value={images.length} icon={ImageIcon} />
            <Metric label="Coverage" value={`${coverage}%`} icon={Activity} />
          </section>

          <div className="mt-5 flex flex-wrap gap-2">
            {(['overview', 'report', 'sources', 'images'] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-[.12em] ${activeTab === tab ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 bg-[#07101c] text-slate-600'}`}>{tab}</button>)}
            {completed && <span className="ml-auto px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-[9px] font-black text-emerald-300 inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />RESEARCH COMPLETE</span>}
          </div>

          {activeTab === 'overview' && <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4">
            <section className="xl:col-span-7 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="flex items-center gap-2"><Network className="w-4 h-4 text-cyan-300" /><div><div className="text-sm font-black text-white">Public Footprint Relationship Graph</div><div className="text-[9px] text-slate-600">Exact + entity-expanded public source relationships</div></div></div><div className="mt-4"><AnimatedGraph subject={subject} platforms={platforms} sources={sources} /></div></section>
            <section className="xl:col-span-5 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="text-sm font-black text-white">Source Distribution</div><div className="mt-1 text-[9px] text-slate-600">Research + connector + entity expansion sources</div><div className="mt-5 space-y-4">{platforms.map((item) => <div key={item.name}><div className="flex justify-between text-[10px]"><span className="text-slate-400">{item.name}</span><b className="text-white">{item.count}</b></div><div className="mt-1.5 h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-700" style={{ width: `${Math.max(7, (item.count / maxPlatform) * 100)}%` }} /></div></div>)}</div></section>

            <section className="xl:col-span-12 rounded-3xl border border-slate-800 bg-[#07101c] p-5">
              <div className="flex items-center gap-2"><AtSign className="w-4 h-4 text-violet-300" /><div><div className="text-sm font-black text-white">Discovered Public Names & Entities</div><div className="text-[9px] text-slate-600">Used for second-stage domain/social/registry expansion</div></div></div>
              <div className="mt-4 flex flex-wrap gap-2">{candidateNames.length ? candidateNames.map((name) => <span key={name} className="rounded-xl border border-violet-500/20 bg-violet-500/[.07] px-3 py-2 text-[10px] font-black text-violet-300">{name}</span>) : <span className="text-[10px] text-slate-700">No reliable public name/entity candidate surfaced.</span>}</div>
              <div className="mt-3 text-[8px] text-amber-300">Name-only matches are correlation leads, not proof that the searched identifier owns that account/company/domain.</div>
            </section>

            <section className="xl:col-span-6 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="flex items-center gap-2"><Globe2 className="w-4 h-4 text-cyan-300" /><div><div className="text-sm font-black text-white">Websites & Domains</div><div className="text-[9px] text-slate-600">Public web/domain signals associated with discovered entities</div></div></div><div className="mt-4 flex flex-wrap gap-2">{domains.length ? domains.map((domain) => <span key={domain} className="rounded-xl border border-cyan-500/20 bg-cyan-500/[.06] px-3 py-2 text-[10px] text-cyan-300">{domain}</span>) : <span className="text-[10px] text-slate-700">No expanded domain surfaced.</span>}</div><div className="mt-4 grid grid-cols-1 gap-2">{webDomainSources.slice(0, 4).map((source) => <SourceCard key={source.url} source={source} />)}</div></section>

            <section className="xl:col-span-6 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-cyan-300" /><div><div className="text-sm font-black text-white">Social & Public Post Signals</div><div className="text-[9px] text-slate-600">Facebook, Instagram, LinkedIn, X, YouTube, Reddit and other indexed public surfaces</div></div></div><div className="mt-4 grid grid-cols-1 gap-2">{socialSources.length ? socialSources.slice(0, 5).map((source) => <SourceCard key={source.url} source={source} />) : <span className="text-[10px] text-slate-700">No public social/post signal surfaced in indexed sources.</span>}</div></section>

            <section className="xl:col-span-6 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-cyan-300" /><div><div className="text-sm font-black text-white">Company / Firm / Registry Signals</div><div className="text-[9px] text-slate-600">Public registry and business-directory references; source verification required</div></div></div><div className="mt-4 grid grid-cols-1 gap-2">{registrySources.length ? registrySources.slice(0, 5).map((source) => <SourceCard key={source.url} source={source} />) : <span className="text-[10px] text-slate-700">No public business/registry source surfaced.</span>}</div></section>

            <section className="xl:col-span-6 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="flex items-center gap-2"><FileImage className="w-4 h-4 text-cyan-300" /><div><div className="text-sm font-black text-white">Public Images / Posters</div><div className="text-[9px] text-slate-600">Indexed visual results and image descriptions returned by public search</div></div></div><div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">{images.length ? images.slice(0, 8).map((image, index) => <button key={`${image.url}-${index}`} onClick={() => image.url && window.open(image.url, '_blank', 'noopener,noreferrer')} className="group text-left rounded-xl border border-slate-800 bg-[#050d18] overflow-hidden hover:border-cyan-500/30"><div className="aspect-video bg-slate-900 overflow-hidden">{image.url && <img src={image.url} alt={image.description || `Public image ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />}</div><div className="p-2"><div className="text-[8px] font-black text-violet-300 truncate">{image.candidateName || 'Visual signal'}</div><div className="mt-1 text-[8px] leading-relaxed text-slate-600 line-clamp-2">{image.description || 'Public indexed image result; open source to inspect.'}</div></div></button>) : <div className="col-span-full text-[10px] text-slate-700">No public indexed image signal surfaced.</div>}</div><div className="mt-3 text-[8px] text-amber-300">Images are search leads, not identity proof. Text visible only inside non-indexed image pixels may require a separate OCR-capable public-source workflow.</div></section>

            <section className="xl:col-span-12 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="flex items-center gap-2"><Mail className="w-4 h-4 text-cyan-300" /><div className="text-sm font-black text-white">Public Contact Signals</div></div><div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3"><div className="rounded-2xl border border-slate-800 bg-[#050d18] p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">Emails observed</div><div className="mt-3 flex flex-wrap gap-2">{contacts.emails.length ? contacts.emails.map((email) => <span key={email} className="px-2.5 py-1.5 rounded-lg border border-cyan-500/15 bg-cyan-500/[.06] text-[10px] text-cyan-300">{email}</span>) : <span className="text-[10px] text-slate-700">None surfaced.</span>}</div></div><div className="rounded-2xl border border-slate-800 bg-[#050d18] p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">Phone numbers observed</div><div className="mt-3 flex flex-wrap gap-2">{contacts.phones.length ? contacts.phones.map((phone) => <span key={phone} className="px-2.5 py-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/[.06] text-[10px] text-emerald-300">{phone}</span>) : <span className="text-[10px] text-slate-700">None surfaced.</span>}</div></div><div className="rounded-2xl border border-slate-800 bg-[#050d18] p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">Developer / cloud</div><div className="mt-3 text-2xl font-black text-white">{devCloudCount}</div><div className="mt-1 text-[9px] text-slate-600">Only public/indexed developer/cloud evidence.</div></div></div></section>
          </div>}

          {activeTab === 'report' && <section className="mt-4 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-300" /><div><div className="text-sm font-black text-white">Structured Intelligence Report</div><div className="text-[9px] text-slate-600">Tavily synthesis separated into readable investigation sections</div></div></div><div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">{sections.map((section, index) => <article key={`${section.title}-${index}`} className="rounded-2xl border border-slate-800 bg-[#050d18] p-5"><div className="flex items-start gap-3"><div className="w-8 h-8 rounded-lg border border-cyan-500/15 bg-cyan-500/[.06] flex items-center justify-center text-[10px] font-black text-cyan-300">{index + 1}</div><div className="min-w-0 flex-1"><h3 className="text-sm font-black text-white">{section.title}</h3><div className="mt-3 whitespace-pre-wrap text-[11px] leading-6 text-slate-400">{section.body}</div></div></div></article>)}</div></section>}

          {activeTab === 'sources' && <section className="mt-4 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="flex items-center gap-2"><Link2 className="w-4 h-4 text-cyan-300" /><div><div className="text-sm font-black text-white">All Evidence Sources</div><div className="text-[9px] text-slate-600">Tavily Research + exact connectors + name/entity expansion</div></div></div><div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-3">{sources.map((source, index) => <SourceCard key={`${source.url}-${index}`} source={source} />)}</div></section>}

          {activeTab === 'images' && <section className="mt-4 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-cyan-300" /><div><div className="text-sm font-black text-white">Public Image Intelligence</div><div className="text-[9px] text-slate-600">Indexed images and descriptions connected to discovered public names/entities</div></div></div><div className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">{images.map((image, index) => <button key={`${image.url}-${index}`} onClick={() => image.url && window.open(image.url, '_blank', 'noopener,noreferrer')} className="group text-left rounded-2xl border border-slate-800 bg-[#050d18] overflow-hidden hover:border-cyan-500/30"><div className="aspect-[4/3] bg-slate-900 overflow-hidden">{image.url && <img src={image.url} alt={image.description || `Public image ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />}</div><div className="p-3"><div className="text-[9px] font-black text-violet-300">{image.candidateName || 'Visual signal'}</div><div className="mt-1 text-[9px] leading-relaxed text-slate-600 line-clamp-3">{image.description || 'Public indexed image result.'}</div><div className="mt-2 text-[8px] font-black text-cyan-300 inline-flex items-center gap-1">Open image/source <ExternalLink className="w-3 h-3" /></div></div></button>)}</div>{!images.length && <div className="py-12 text-center text-xs text-slate-700">No public indexed images surfaced for this research.</div>}<div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/[.035] p-3 text-[9px] text-slate-600"><b className="text-amber-300">Visual evidence notice:</b> search-index images/descriptions are discovery leads. They do not prove identity ownership, and non-indexed text embedded only inside image pixels may not be retrievable without a separate OCR-capable source connector.</div></section>}

          <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/[.035] p-4 text-[9px] leading-relaxed text-slate-600"><b className="text-amber-300">Analyst notice:</b> Exact identifier evidence, name/entity expansion and AI research are kept distinct. Same-name social accounts, websites or company records are not treated as verified ownership unless the original identifier or another strong public signal corroborates them.</div>
        </>}
      </div>
    </div>}
  </>;
}
