import React, { useMemo, useState } from 'react';
import {
  Activity, AtSign, Bot, Building2, CheckCircle2, ExternalLink, FileText,
  Globe2, Link2, LoaderCircle, Mail, Network, Phone, Radar, Search, ShieldCheck,
  Sparkles, UserRound, Users, X
} from 'lucide-react';

type ResearchSource = { title?: string; url?: string; content?: string };
type ResearchSection = { title: string; body: string };
type PlatformStat = { name: string; count: number };

const SOCIAL = new Set(['Facebook', 'Instagram', 'LinkedIn', 'X / Twitter', 'Reddit', 'YouTube', 'TikTok', 'Threads', 'Pinterest']);
const BUSINESS_HOSTS = ['instafinancials', 'zaubacorp', 'tofler', 'tradeindia', 'indiamart', 'justdial', 'sulekha', 'companycheck', 'cleartax', 'indiafilings'];

const platformFromUrl = (url: string) => {
  const value = url.toLowerCase();
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
  if (BUSINESS_HOSTS.some((host) => value.includes(host))) return 'Business / Registry';
  return 'Public Web';
};

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
    if (match) {
      flush();
      title = match[1];
    } else {
      body.push(line);
    }
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

const Metric = ({ label, value, icon: Icon }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }> }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#081422] p-4">
    <div className="flex items-start justify-between gap-3">
      <div><div className="text-[8px] uppercase tracking-[.18em] font-black text-slate-600">{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div></div>
      <div className="w-9 h-9 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center"><Icon className="w-4 h-4 text-cyan-300" /></div>
    </div>
  </div>
);

const NetworkGraph = ({ subject, platforms }: { subject: string; platforms: PlatformStat[] }) => {
  const nodes = platforms.slice(0, 8).map((item, index, all) => ({
    ...item,
    x: 50 + Math.cos((index / Math.max(1, all.length)) * Math.PI * 2) * 35,
    y: 50 + Math.sin((index / Math.max(1, all.length)) * Math.PI * 2) * 32,
  }));
  return (
    <div className="relative h-72 rounded-2xl border border-slate-800 bg-[#050d18] overflow-hidden">
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(#1e3a5f 1px,transparent 1px)', backgroundSize: '18px 18px' }} />
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        {nodes.map((node) => <line key={`l-${node.name}`} x1="50" y1="50" x2={node.x} y2={node.y} stroke="#22d3ee" opacity=".3" strokeWidth=".55" />)}
        {nodes.map((node) => <g key={node.name}>
          <circle cx={node.x} cy={node.y} r="8" fill="#091827" stroke="#38bdf8" strokeWidth=".8" />
          <text x={node.x} y={node.y - 1} textAnchor="middle" fill="#e2e8f0" fontSize="3.2" fontWeight="700">{node.count}</text>
          <text x={node.x} y={node.y + 12} textAnchor="middle" fill="#64748b" fontSize="3">{node.name.slice(0, 16)}</text>
        </g>)}
        <circle cx="50" cy="50" r="11" fill="#062536" stroke="#22d3ee" strokeWidth="1.2" />
        <circle cx="50" cy="50" r="4" fill="#22d3ee" opacity=".85" />
        <text x="50" y="66" textAnchor="middle" fill="#e2e8f0" fontSize="3.1">{subject.slice(0, 28)}</text>
      </svg>
    </div>
  );
};

export default function DeepResearchDock() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'sources'>('overview');

  const openDock = () => {
    const dashboardInput = document.querySelector('header input') as HTMLInputElement | null;
    if (dashboardInput?.value?.trim()) setSubject(dashboardInput.value.trim());
    setOpen(true);
  };

  const callApi = async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/tavily-suite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || 'Deep Research request failed');
    return data;
  };

  const runResearch = async () => {
    const value = subject.trim();
    if (!value || running) return;
    setRunning(true); setError(''); setResult(null); setStatus('Starting research…'); setActiveTab('overview');
    try {
      const input = `Build a structured public intelligence profile for "${value}" using public sources only. Cover: Identity & Ownership; Online Presence; Social-media & Professional Networks; Corporate & Registrations; Public Mentions & Media; Security & Reputation only when directly supported by public sources; Additional Contact Information; Synthesis; and Sources. Preserve source links. Distinguish confirmed evidence from possible matches. Do not infer private data or private account contents.`;
      const started = await callApi({ action: 'research', input, model: 'mini' });
      const requestId = started?.data?.request_id;
      if (!requestId) throw new Error('Research service did not return a request ID.');
      setResult(started);

      for (let attempt = 0; attempt < 48; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        setStatus(`Researching public sources… ${Math.min(99, 8 + attempt * 2)}%`);
        const next = await callApi({ action: 'research_status', requestId: String(requestId) });
        setResult(next);
        const researchStatus = String(next?.data?.status || '').toLowerCase();
        if (researchStatus === 'completed') { setStatus('Research completed'); break; }
        if (researchStatus === 'failed') throw new Error('Deep Research failed upstream.');
      }
    } catch (err) {
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
  const sources = useMemo(() => {
    const byUrl = new Map<string, ResearchSource>();
    sourceObjects.forEach((source) => { if (source?.url) byUrl.set(String(source.url), source); });
    textUrls.forEach((url) => { if (!byUrl.has(url)) byUrl.set(url, { url, title: url }); });
    return [...byUrl.values()];
  }, [sourceObjects, textUrls]);
  const platforms = useMemo<PlatformStat[]>(() => {
    const counts = new Map<string, number>();
    sources.forEach((source) => {
      const name = platformFromUrl(String(source.url || ''));
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [sources]);
  const contacts = useMemo(() => contactsFromText(content), [content]);
  const socialCount = platforms.filter((item) => SOCIAL.has(item.name)).reduce((sum, item) => sum + item.count, 0);
  const businessCount = platforms.find((item) => item.name === 'Business / Registry')?.count || 0;
  const coverage = Math.min(100, sources.length * 7 + platforms.length * 6 + Math.min(20, sections.length * 2));
  const completed = String(data?.status || '').toLowerCase() === 'completed';
  const maxPlatform = Math.max(1, ...platforms.map((item) => item.count));

  return <>
    <button onClick={openDock} className="fixed right-5 bottom-5 z-[60] rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3.5 shadow-[0_16px_50px_rgba(14,165,233,.25)] text-white inline-flex items-center gap-2 text-xs font-black hover:brightness-110">
      <Sparkles className="w-4 h-4" /> Deep Research
    </button>

    {open && <div className="fixed inset-0 z-[80] bg-[#02060d]/95 backdrop-blur-xl overflow-y-auto">
      <div className="min-h-screen max-w-[1700px] mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 flex items-center justify-center"><Bot className="w-5 h-5 text-cyan-300" /></div>
            <div><div className="text-[9px] uppercase tracking-[.2em] font-black text-cyan-400">SAVRDH IntelSight™</div><h2 className="text-xl sm:text-2xl font-black text-white">Deep Research Intelligence Dashboard</h2></div>
          </div>
          <button onClick={() => setOpen(false)} className="w-11 h-11 rounded-xl border border-slate-800 bg-[#07101c] flex items-center justify-center text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <section className="mt-5 rounded-3xl border border-slate-800 bg-[#07101c] p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 h-12 rounded-xl border border-slate-700 bg-[#040a12] flex items-center gap-3 px-4 focus-within:border-cyan-500/50"><Search className="w-4 h-4 text-slate-600" /><input value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runResearch()} placeholder="Email, mobile, company, domain or public identifier" className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white font-mono" /></div>
            <button onClick={runResearch} disabled={running || !subject.trim()} className="h-12 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-black text-white inline-flex items-center justify-center gap-2 disabled:opacity-40">{running ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}{running ? 'Researching…' : 'Run Deep Research'}</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] text-slate-600"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />Public/authorized sources only <span>•</span><span>Research Mini</span>{status && <><span>•</span><span className="text-cyan-400">{status}</span></>}</div>
          {error && <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</div>}
        </section>

        {!content && <section className="mt-5 min-h-[440px] rounded-3xl border border-slate-800 bg-[#07101c] flex items-center justify-center text-center p-8"><div><Sparkles className={`w-12 h-12 mx-auto ${running ? 'text-cyan-300 animate-pulse' : 'text-slate-700'}`} /><h3 className="mt-4 text-lg font-black text-white">{running ? 'Building intelligence profile…' : 'Deep Research ready'}</h3><p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-600">The research agent will collect public-source evidence, organize the report, and convert it into graphical intelligence automatically.</p></div></section>}

        {content && <>
          <section className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Metric label="Sources" value={sources.length} icon={Globe2} />
            <Metric label="Social footprints" value={socialCount} icon={Users} />
            <Metric label="Business / registry" value={businessCount} icon={Building2} />
            <Metric label="Emails found" value={contacts.emails.length} icon={Mail} />
            <Metric label="Phones found" value={contacts.phones.length} icon={Phone} />
            <Metric label="Coverage score" value={`${coverage}%`} icon={Activity} />
          </section>

          <div className="mt-5 flex flex-wrap gap-2">
            {(['overview', 'report', 'sources'] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-[.12em] ${activeTab === tab ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 bg-[#07101c] text-slate-600'}`}>{tab}</button>)}
            {completed && <span className="ml-auto px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-[9px] font-black text-emerald-300 inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />RESEARCH COMPLETE</span>}
          </div>

          {activeTab === 'overview' && <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4">
            <section className="xl:col-span-7 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="flex items-center gap-2"><Network className="w-4 h-4 text-cyan-300" /><div><div className="text-sm font-black text-white">Public Footprint Relationship Graph</div><div className="text-[9px] text-slate-600">Source-platform relationships discovered by Deep Research</div></div></div><div className="mt-4"><NetworkGraph subject={subject} platforms={platforms} /></div></section>
            <section className="xl:col-span-5 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="text-sm font-black text-white">Source Distribution</div><div className="mt-1 text-[9px] text-slate-600">Actual research sources grouped by platform</div><div className="mt-5 space-y-4">{platforms.map((item) => <div key={item.name}><div className="flex justify-between text-[10px]"><span className="text-slate-400">{item.name}</span><b className="text-white">{item.count}</b></div><div className="mt-1.5 h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-700" style={{ width: `${Math.max(7, (item.count / maxPlatform) * 100)}%` }} /></div></div>)}</div></section>

            <section className="xl:col-span-12 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="flex items-center gap-2"><AtSign className="w-4 h-4 text-cyan-300" /><div className="text-sm font-black text-white">Public Contact Signals</div></div><div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3"><div className="rounded-2xl border border-slate-800 bg-[#050d18] p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">Emails observed in research</div><div className="mt-3 flex flex-wrap gap-2">{contacts.emails.length ? contacts.emails.map((email) => <span key={email} className="px-2.5 py-1.5 rounded-lg border border-cyan-500/15 bg-cyan-500/[.06] text-[10px] text-cyan-300">{email}</span>) : <span className="text-[10px] text-slate-700">None surfaced.</span>}</div></div><div className="rounded-2xl border border-slate-800 bg-[#050d18] p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">Phone numbers observed in research</div><div className="mt-3 flex flex-wrap gap-2">{contacts.phones.length ? contacts.phones.map((phone) => <span key={phone} className="px-2.5 py-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/[.06] text-[10px] text-emerald-300">{phone}</span>) : <span className="text-[10px] text-slate-700">None surfaced.</span>}</div></div></div></section>
          </div>}

          {activeTab === 'report' && <section className="mt-4 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-300" /><div><div className="text-sm font-black text-white">Structured Intelligence Report</div><div className="text-[9px] text-slate-600">Raw research converted into readable investigation sections</div></div></div><div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">{sections.map((section, index) => <article key={`${section.title}-${index}`} className="rounded-2xl border border-slate-800 bg-[#050d18] p-5"><div className="flex items-start gap-3"><div className="w-8 h-8 rounded-lg border border-cyan-500/15 bg-cyan-500/[.06] flex items-center justify-center text-[10px] font-black text-cyan-300">{index + 1}</div><div className="min-w-0 flex-1"><h3 className="text-sm font-black text-white">{section.title}</h3><div className="mt-3 whitespace-pre-wrap text-[11px] leading-6 text-slate-400">{section.body}</div></div></div></article>)}</div></section>}

          {activeTab === 'sources' && <section className="mt-4 rounded-3xl border border-slate-800 bg-[#07101c] p-5"><div className="flex items-center gap-2"><Link2 className="w-4 h-4 text-cyan-300" /><div><div className="text-sm font-black text-white">Evidence Sources</div><div className="text-[9px] text-slate-600">Clickable public sources retained from Tavily Deep Research</div></div></div><div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-3">{sources.map((source, index) => <a key={`${source.url}-${index}`} href={String(source.url || '#')} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-800 bg-[#050d18] p-4 hover:border-cyan-500/25 transition-colors"><div className="flex items-start justify-between gap-3"><div><div className="text-[8px] uppercase tracking-widest text-cyan-400">{platformFromUrl(String(source.url || ''))}</div><div className="mt-1 text-xs font-black text-white">{source.title || `Source ${index + 1}`}</div>{source.content && <p className="mt-2 text-[10px] leading-relaxed text-slate-600 line-clamp-3">{source.content}</p>}<div className="mt-2 text-[9px] text-slate-700 break-all">{source.url}</div></div><ExternalLink className="w-4 h-4 text-cyan-400 shrink-0" /></div></a>)}</div></section>}

          <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/[.035] p-4 text-[9px] leading-relaxed text-slate-600"><b className="text-amber-300">Analyst notice:</b> Deep Research is an AI-generated synthesis of public-source material. Graphical counts describe source coverage, not proof of identity ownership. Material claims should be verified against the linked original sources.</div>
        </>}
      </div>
    </div>}
  </>;
}
