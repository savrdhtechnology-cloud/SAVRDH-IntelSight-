import React, { useState } from 'react';
import {
  ArrowLeft, Bot, Building2, CheckCircle2, ChevronRight, Database, ExternalLink,
  FileSearch, Globe2, Layers3, LoaderCircle, Map, MessageSquareText, Radar,
  Search, Sheet, Sparkles, Users, XCircle
} from 'lucide-react';

type Mode = 'deep' | 'company' | 'chat' | 'crawl' | 'map' | 'extract' | 'bulk' | 'market' | 'meeting';
type ApiPayload = Record<string, unknown>;

type ToolDef = {
  key: Mode;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
};

const tools: ToolDef[] = [
  { key: 'deep', label: 'Deep Research', subtitle: 'Multi-source research report', icon: Sparkles },
  { key: 'company', label: 'Company Researcher', subtitle: 'Organization intelligence brief', icon: Building2 },
  { key: 'chat', label: 'AI Answer', subtitle: 'Search-grounded analyst answer', icon: MessageSquareText },
  { key: 'crawl', label: 'Crawl2RAG', subtitle: 'Crawl and extract website intelligence', icon: Layers3 },
  { key: 'map', label: 'Site Map', subtitle: 'Discover website structure', icon: Map },
  { key: 'extract', label: 'Evidence Extract', subtitle: 'Extract content from public URLs', icon: FileSearch },
  { key: 'bulk', label: 'Bulk Lookup', subtitle: 'Sheet-style batch searches', icon: Sheet },
  { key: 'market', label: 'Market Researcher', subtitle: 'Public market intelligence brief', icon: Radar },
  { key: 'meeting', label: 'Meeting Prep', subtitle: 'Public-source company briefing', icon: Users },
];

const Field = ({ value, onChange, placeholder, multiline = false }: { value: string; onChange: (v: string) => void; placeholder: string; multiline?: boolean }) => multiline ? (
  <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={5} className="w-full rounded-2xl border border-slate-800 bg-[#050b14] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 resize-none" />
) : (
  <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full h-12 rounded-2xl border border-slate-800 bg-[#050b14] px-4 text-sm text-white outline-none focus:border-cyan-500/50" />
);

const StatusBadge = ({ ok, text }: { ok: boolean; text: string }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black ${ok ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>
    {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}{text}
  </span>
);

const SourceList = ({ sources }: { sources: any[] }) => (
  <div className="grid gap-3">{sources.map((source, index) => {
    const url = String(source?.url || '');
    return <div key={`${url}-${index}`} className="rounded-2xl border border-slate-800 bg-[#07101c] p-4">
      <div className="text-xs font-black text-white">{source?.title || source?.name || url || `Source ${index + 1}`}</div>
      {source?.content && <p className="mt-2 text-[11px] leading-relaxed text-slate-500 line-clamp-4">{String(source.content)}</p>}
      {source?.raw_content && <p className="mt-2 text-[11px] leading-relaxed text-slate-500 line-clamp-5 whitespace-pre-wrap">{String(source.raw_content).slice(0, 1600)}</p>}
      {url && <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black text-cyan-400">Open source <ExternalLink className="w-3 h-3" /></a>}
    </div>;
  })}</div>
);

const ResultRenderer = ({ result }: { result: any }) => {
  if (!result) return <div className="h-full min-h-[420px] flex items-center justify-center text-center"><div><Database className="w-10 h-10 mx-auto text-slate-700" /><div className="mt-4 text-sm font-black text-slate-400">No result yet</div><p className="mt-2 text-xs text-slate-600">Run a Tavily-powered intelligence tool to inspect its live response.</p></div></div>;
  const data = result?.data || result;
  const sources = Array.isArray(data?.sources) ? data.sources : Array.isArray(data?.results) ? data.results : [];

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><StatusBadge ok={result?.ok !== false} text={result?.action ? String(result.action).replaceAll('_', ' ').toUpperCase() : 'LIVE RESPONSE'} />{data?.usage?.credits !== undefined && <span className="text-[9px] text-slate-600">Credits: {String(data.usage.credits)}</span>}</div>
    {data?.status && <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-400">Research status: <b className="text-cyan-300">{String(data.status)}</b></div>}
    {data?.answer && <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[.05] p-4"><div className="text-[9px] uppercase tracking-[.18em] font-black text-cyan-400">Grounded answer</div><p className="mt-2 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">{String(data.answer)}</p></div>}
    {data?.content && <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[.04] p-5"><div className="text-[9px] uppercase tracking-[.18em] font-black text-cyan-400">Research report</div><div className="mt-3 text-sm leading-7 text-slate-300 whitespace-pre-wrap">{typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2)}</div></div>}
    {data?.base_url && <div className="text-xs text-slate-500">Mapped: <span className="text-white font-bold">{String(data.base_url)}</span></div>}
    {sources.length > 0 && (typeof sources[0] === 'string' ? <div className="grid gap-2">{sources.map((url: string, index: number) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-800 bg-[#07101c] p-3 text-[11px] text-cyan-400 hover:border-cyan-500/30 break-all">{url}</a>)}</div> : <SourceList sources={sources} />)}
    {data?.results && Array.isArray(data.results) && data.results[0]?.query && <div className="space-y-4">{data.results.map((entry: any, index: number) => <div key={`${entry.query}-${index}`} className="rounded-2xl border border-slate-800 p-4"><div className="flex items-center justify-between"><b className="text-sm text-white">{entry.query}</b><StatusBadge ok={entry.ok !== false} text={entry.ok !== false ? 'FOUND' : 'ERROR'} /></div>{Array.isArray(entry.results) && <div className="mt-3"><SourceList sources={entry.results} /></div>}{entry.error && <div className="mt-2 text-xs text-rose-300">{entry.error}</div>}</div>)}</div>}
    {!data?.answer && !data?.content && !sources.length && <pre className="rounded-2xl border border-slate-800 bg-[#050b14] p-4 overflow-auto text-[10px] leading-relaxed text-slate-400">{JSON.stringify(data, null, 2)}</pre>}
  </div>;
};

export const TavilyLab: React.FC = () => {
  const [mode, setMode] = useState<Mode>('deep');
  const [subject, setSubject] = useState('');
  const [context, setContext] = useState('');
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState('');
  const [bulk, setBulk] = useState('');
  const [model, setModel] = useState<'mini' | 'pro' | 'auto'>('mini');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const callApi = async (payload: ApiPayload) => {
    const response = await fetch('/api/tavily-suite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Tavily request failed');
    return data;
  };

  const pollResearch = async (requestId: string, initial: any) => {
    setResult(initial);
    for (let attempt = 0; attempt < 36; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const next = await callApi({ action: 'research_status', requestId });
      setResult(next);
      const status = String(next?.data?.status || '').toLowerCase();
      if (status === 'completed' || status === 'failed') return;
    }
  };

  const run = async () => {
    setRunning(true); setError(''); setResult(null);
    try {
      let payload: ApiPayload;
      if (mode === 'deep') payload = { action: 'research', input: subject, model };
      else if (mode === 'company') payload = { action: 'company_research', subject, context, model };
      else if (mode === 'market') payload = { action: 'market_research', subject, context, model };
      else if (mode === 'meeting') payload = { action: 'meeting_prep', subject, context, model };
      else if (mode === 'chat') payload = { action: 'chat', query: subject, maxResults: 10 };
      else if (mode === 'crawl') payload = { action: 'crawl', url, instructions: context, maxDepth: 1, maxBreadth: 15, limit: 25 };
      else if (mode === 'map') payload = { action: 'map', url, instructions: context, maxDepth: 1, maxBreadth: 20, limit: 40 };
      else if (mode === 'extract') payload = { action: 'extract', urls: urls.split(/\n+/).map((item) => item.trim()).filter(Boolean), query: context };
      else payload = { action: 'bulk', items: bulk };

      const response = await callApi(payload);
      const requestId = response?.data?.request_id;
      if (requestId && ['deep', 'company', 'market', 'meeting'].includes(mode)) await pollResearch(String(requestId), response);
      else setResult(response);
    } catch (err: any) {
      setError(err?.message || 'Request failed');
    } finally { setRunning(false); }
  };

  const selected = tools.find((tool) => tool.key === mode)!;
  const needsUrl = mode === 'crawl' || mode === 'map';
  const needsUrls = mode === 'extract';
  const needsBulk = mode === 'bulk';
  const researchMode = ['deep', 'company', 'market', 'meeting'].includes(mode);

  return <div className="min-h-screen bg-[#040a12] text-slate-200">
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#040a12]/95 backdrop-blur-xl"><div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><button onClick={() => window.location.assign('/app')} className="w-10 h-10 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></button><div><div className="text-[9px] uppercase tracking-[.2em] font-black text-cyan-400">SAVRDH IntelSight™</div><div className="text-sm font-black text-white">Tavily Intelligence Lab</div></div></div><StatusBadge ok text="TAVILY CONNECTED" /></div></header>

    <main className="max-w-[1700px] mx-auto p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 xl:grid-cols-[290px_minmax(0,1fr)] gap-5">
        <aside className="rounded-3xl border border-slate-800 bg-[#07101c] p-3 h-fit xl:sticky xl:top-20"><div className="px-3 py-3"><div className="text-[9px] uppercase tracking-[.2em] font-black text-slate-600">Tavily capabilities</div><p className="mt-2 text-[10px] leading-relaxed text-slate-500">Test the same server-side Tavily key across research, search, crawl, map, extract and bulk intelligence workflows.</p></div><div className="space-y-1">{tools.map((tool) => { const Icon = tool.icon; return <button key={tool.key} onClick={() => { setMode(tool.key); setResult(null); setError(''); }} className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left ${mode === tool.key ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-transparent hover:bg-slate-900/70'}`}><div className="w-9 h-9 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center"><Icon className={`w-4 h-4 ${mode === tool.key ? 'text-cyan-300' : 'text-slate-500'}`} /></div><div className="min-w-0 flex-1"><div className={`text-[11px] font-black ${mode === tool.key ? 'text-white' : 'text-slate-400'}`}>{tool.label}</div><div className="mt-0.5 text-[8px] text-slate-600 truncate">{tool.subtitle}</div></div>{mode === tool.key && <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />}</button>; })}</div></aside>

        <section className="min-w-0">
          <div className="rounded-3xl border border-slate-800 bg-[#07101c] p-5 sm:p-6"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div><div className="text-[9px] uppercase tracking-[.2em] font-black text-cyan-400">Live API workspace</div><h1 className="mt-2 text-2xl sm:text-3xl font-black text-white">{selected.label}</h1><p className="mt-2 text-xs text-slate-500">{selected.subtitle}. Public/authorized sources only.</p></div>{researchMode && <select value={model} onChange={(e) => setModel(e.target.value as any)} className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs text-slate-300 outline-none"><option value="mini">Research Mini</option><option value="auto">Research Auto</option><option value="pro">Research Pro</option></select>}</div>

            <div className="mt-6 space-y-3">
              {!needsUrl && !needsUrls && !needsBulk && <Field value={subject} onChange={setSubject} placeholder={mode === 'company' ? 'Company / organization name' : mode === 'market' ? 'Company, sector or market' : mode === 'meeting' ? 'Company / meeting subject' : mode === 'chat' ? 'Ask a public-web intelligence question' : 'Research topic or question'} multiline={mode === 'deep' || mode === 'chat'} />}
              {needsUrl && <Field value={url} onChange={setUrl} placeholder="https://example.com" />}
              {needsUrls && <Field value={urls} onChange={setUrls} placeholder={'One public URL per line\nhttps://example.com/about\nhttps://example.com/contact'} multiline />}
              {needsBulk && <Field value={bulk} onChange={setBulk} placeholder={'One identifier/company/domain per line (max 10)\nexample.com\nCompany Name'} multiline />}
              {(mode === 'company' || mode === 'market' || mode === 'meeting' || mode === 'crawl' || mode === 'map' || mode === 'extract') && <Field value={context} onChange={setContext} placeholder={mode === 'extract' ? 'Optional: what information should be extracted?' : mode === 'crawl' || mode === 'map' ? 'Optional crawl/map instructions' : 'Optional research context / focus areas'} multiline />}
              <button onClick={run} disabled={running} className="h-12 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-black text-white inline-flex items-center gap-2 disabled:opacity-50">{running ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}{running ? (researchMode ? 'Researching…' : 'Running…') : `Run ${selected.label}`}</button>
              {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</div>}
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-800 bg-[#07101c] p-5 sm:p-6 min-h-[500px]"><div className="flex items-center gap-2 mb-5"><Bot className="w-4 h-4 text-cyan-300" /><div className="text-xs font-black text-white">Live intelligence output</div></div><ResultRenderer result={result} /></div>

          <div className="mt-5 rounded-2xl border border-amber-500/15 bg-amber-500/[.04] p-4 text-[10px] leading-relaxed text-slate-500"><b className="text-amber-300">Scope:</b> IntelSight uses public or authorized web data. These tools do not access private social accounts, passwords, OTPs, private chats, hidden location data or restricted account contents. Research output should retain source links and analyst verification for material claims.</div>
        </section>
      </div>
    </main>
  </div>;
};
