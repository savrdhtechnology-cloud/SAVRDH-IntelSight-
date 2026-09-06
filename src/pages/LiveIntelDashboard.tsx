import React, { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, BadgeCheck, Building2, Database, ExternalLink,
  FileSearch, Fingerprint, Globe2, Mail, Network, Radar, Search, ShieldCheck,
  Smartphone, UserRound, Users, AtSign, BriefcaseBusiness, FlaskConical, RefreshCw,
  CircleDot, CheckCircle2, XCircle, Layers3
} from 'lucide-react';
import { createDemoResult, inferSearchType, type EvidenceItem, type SearchResult } from '../lib/intelligence';

type Icon = React.ComponentType<{ className?: string }>;

type PlatformRow = {
  name: string;
  count: number;
  percent: number;
};

const typeIcon: Record<string, Icon> = {
  email: Mail,
  mobile: Smartphone,
  username: AtSign,
  domain: Globe2,
  company: Building2,
};

const categoryLabel: Record<EvidenceItem['category'], string> = {
  profile: 'Public profile / social',
  web: 'Public web',
  domain: 'Domain / registry',
  exposure: 'Exposure signal',
  business: 'Business directory',
};

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
};

const Metric = ({ icon: IconEl, label, value, helper }: { icon: Icon; label: string; value: string | number; helper: string }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#091321] p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[9px] uppercase tracking-[.18em] font-black text-slate-600">{label}</div>
        <div className="mt-2 text-2xl font-black text-white">{value}</div>
      </div>
      <div className="w-10 h-10 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center">
        <IconEl className="w-4 h-4 text-cyan-300" />
      </div>
    </div>
    <div className="mt-3 text-[10px] leading-relaxed text-slate-600">{helper}</div>
  </div>
);

const EmptyState = ({ error }: { error: string | null }) => (
  <div className={`rounded-3xl border p-8 sm:p-12 text-center ${error ? 'border-rose-500/20 bg-rose-500/[.04]' : 'border-slate-800 bg-[#091321]'}`}>
    <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center border ${error ? 'border-rose-500/20 bg-rose-500/10' : 'border-cyan-500/20 bg-cyan-500/10'}`}>
      {error ? <XCircle className="w-6 h-6 text-rose-300" /> : <Radar className="w-6 h-6 text-cyan-300" />}
    </div>
    <h2 className="mt-5 text-xl font-black text-white">{error ? 'Search could not be completed' : 'Run a verified intelligence search'}</h2>
    <p className="mt-3 max-w-2xl mx-auto text-sm leading-relaxed text-slate-500">
      {error || 'Enter an email address, Indian mobile number, username, domain, or company name. IntelSight will only display source-linked public results returned by live connectors.'}
    </p>
    {!error && <div className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-emerald-400"><ShieldCheck className="w-4 h-4" />No synthetic fallback records</div>}
  </div>
);

const EvidenceCard = ({ item }: { item: EvidenceItem }) => (
  <article className="rounded-2xl border border-slate-800 bg-[#091321] p-4 hover:border-cyan-500/25 transition-colors">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black text-emerald-300">
            <BadgeCheck className="w-3 h-3" />VERIFIED IDENTIFIER
          </span>
          <span className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[9px] font-bold text-slate-500">{categoryLabel[item.category]}</span>
        </div>
        <div className="mt-3 text-[10px] font-black text-cyan-300">{item.source}</div>
        <h3 className="mt-1 text-sm sm:text-base font-black text-white break-words">{item.title}</h3>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{item.summary}</p>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-xl font-black text-white">{item.confidence}%</div>
        <div className="text-[8px] uppercase tracking-widest text-slate-600">confidence</div>
      </div>
    </div>
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[9px]">
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><span className="block text-slate-700">Match basis</span><b className="mt-1 block text-slate-300">{item.matchBasis || 'Source-linked identifier match'}</b></div>
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><span className="block text-slate-700">Scan group</span><b className="mt-1 block text-slate-300">{item.scanGroup || 'Public source'}</b></div>
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><span className="block text-slate-700">Observed</span><b className="mt-1 block text-slate-300">{formatDate(item.observedAt)}</b></div>
    </div>
    <div className="mt-4 flex items-center justify-end">
      <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[10px] font-black text-cyan-300 hover:bg-cyan-500/15">
        Open source <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  </article>
);

export const LiveIntelDashboard: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult>(() => createDemoResult('', 'email'));
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const platforms = useMemo<PlatformRow[]>(() => {
    const counts = new Map<string, number>();
    result.evidence.forEach((item) => counts.set(item.source, (counts.get(item.source) || 0) + 1));
    const total = Math.max(1, result.evidence.length);
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [result]);

  const social = result.evidence.filter((item) => item.category === 'profile').length;
  const business = result.evidence.filter((item) => item.category === 'business').length;
  const exact = result.exactMatchCount ?? result.evidence.length;
  const TypeIcon = typeIcon[result.type] || Fingerprint;
  const hasLiveResult = result.mode === 'live';

  const runSearch = async () => {
    const value = query.trim();
    if (!value || running) return;
    const type = inferSearchType(value);
    setRunning(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: value, type }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Live search service returned an error.');
      if (!payload?.result) throw new Error('Live search completed without a result payload.');
      setResult(payload.result as SearchResult);
    } catch (err) {
      setResult(createDemoResult(value, type));
      setError(err instanceof Error ? err.message : 'Live search is temporarily unavailable.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040a12] text-slate-200">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#040a12]/95 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto h-20 px-4 sm:px-6 flex items-center gap-4">
          <button onClick={() => window.location.assign('/')} className="flex items-center gap-3 shrink-0">
            <span className="relative w-11 h-11 rounded-xl border border-cyan-500/25 bg-cyan-500/10 flex items-center justify-center"><FileSearch className="w-5 h-5 text-cyan-300" /><Fingerprint className="absolute w-3 h-3 text-white" /></span>
            <span className="hidden sm:block text-left"><b className="block text-sm text-white">SAVRDH IntelSight™</b><span className="block text-[8px] uppercase tracking-[.2em] text-cyan-400">Verified Intelligence</span></span>
          </button>

          <div className="flex-1 max-w-4xl mx-auto flex gap-2">
            <div className="flex-1 h-12 rounded-xl border border-slate-700 bg-[#07101c] flex items-center gap-3 px-4 focus-within:border-cyan-500/50">
              <Search className="w-4 h-4 text-slate-600" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="Email, +91 mobile, username, domain, or company…" className="min-w-0 flex-1 bg-transparent outline-none text-xs sm:text-sm text-white font-mono" />
            </div>
            <button onClick={runSearch} disabled={running || !query.trim()} className="h-12 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-40 text-xs font-black text-white inline-flex items-center gap-2">
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}<span className="hidden sm:inline">{running ? 'Scanning…' : 'Search'}</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <button onClick={() => window.location.assign('/app/profile')} className="px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-[10px] font-bold text-slate-400 hover:text-white inline-flex items-center gap-2"><UserRound className="w-3.5 h-3.5" />Lead 360</button>
            <button onClick={() => window.location.assign('/app/lab')} className="px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-[10px] font-bold text-slate-400 hover:text-white inline-flex items-center gap-2"><FlaskConical className="w-3.5 h-3.5" />Tavily Lab</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="text-[9px] uppercase tracking-[.22em] font-black text-cyan-400">Production Search Model v1.0</div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-white">Verified Public Intelligence Dashboard</h1>
            <p className="mt-2 max-w-3xl text-xs sm:text-sm leading-relaxed text-slate-500">Live results only. Exact identifiers are verified against returned or extracted public content before a record is shown. Similar-name or inferred matches are excluded from verified evidence.</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[.04] px-4 py-3 flex items-center gap-3">
            <CircleDot className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div><div className="text-[9px] font-black text-emerald-300">PUBLIC-DATA MODE</div><div className="mt-0.5 text-[9px] text-slate-600">No private chats, credentials, locked accounts, or private location</div></div>
          </div>
        </div>

        {hasLiveResult && (
          <>
            <section className="mt-6 rounded-3xl border border-slate-800 bg-[#07101c] p-5 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div className="min-w-0 flex gap-4">
                  <div className="w-12 h-12 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center shrink-0"><TypeIcon className="w-5 h-5 text-cyan-300" /></div>
                  <div className="min-w-0">
                    <div className="text-[9px] uppercase tracking-[.18em] font-black text-slate-600">Searched identifier</div>
                    <div className="mt-1 text-base sm:text-lg font-black text-white break-all">{result.query || query}</div>
                    <div className="mt-2 text-[10px] text-slate-500">Type: <b className="text-slate-300">{result.type}</b> • Policy: <b className="text-slate-300">{result.matchPolicy || 'source-linked verification'}</b></div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-300 inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />LIVE VERIFIED</span>
                  <span className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[10px] font-black text-cyan-300">Grade {result.verificationGrade || (result.sourceCount ? 'B' : 'NONE')}</span>
                </div>
              </div>
              <p className="mt-5 text-xs sm:text-sm leading-relaxed text-slate-400">{result.summary}</p>
            </section>

            <section className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <Metric icon={Database} label="Verified sources" value={result.sourceCount} helper="Source-linked records accepted after verification." />
              <Metric icon={BadgeCheck} label="Exact matches" value={exact} helper="Identifier-level matches accepted by the engine." />
              <Metric icon={Users} label="Social / profiles" value={social} helper="Public social or professional profile signals." />
              <Metric icon={BriefcaseBusiness} label="Business refs" value={business} helper="Public business-directory or marketplace records." />
              <Metric icon={Layers3} label="Platforms" value={result.platformCount ?? platforms.length} helper="Distinct public sources represented in evidence." />
              <Metric icon={ShieldCheck} label="Confidence" value={`${result.confidence}%`} helper="Average evidence confidence, not identity ownership proof." />
            </section>

            <section className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-8 rounded-2xl border border-slate-800 bg-[#07101c] overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
                  <div><div className="text-sm font-black text-white">Verified Evidence</div><div className="mt-1 text-[9px] text-slate-600">Only records accepted by the live verification policy</div></div>
                  <FileSearch className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="p-4 space-y-3">
                  {result.evidence.length ? result.evidence.map((item) => <EvidenceCard key={item.id} item={item} />) : (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center"><AlertTriangle className="w-5 h-5 text-amber-400 mx-auto" /><div className="mt-3 text-sm font-black text-white">No exact public footprint verified</div><p className="mt-2 text-[10px] leading-relaxed text-slate-600">IntelSight did not find a returned public source that satisfied exact verification. It intentionally did not fill the dashboard with inferred or similar-name matches.</p></div>
                  )}
                </div>
              </div>

              <div className="xl:col-span-4 space-y-4">
                <section className="rounded-2xl border border-slate-800 bg-[#07101c] overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-800"><div className="text-sm font-black text-white">Actual Source Distribution</div><div className="mt-1 text-[9px] text-slate-600">Calculated only from returned evidence</div></div>
                  <div className="p-4 space-y-3">
                    {platforms.length ? platforms.map((platform) => (
                      <div key={platform.name}>
                        <div className="flex items-center justify-between gap-3 text-[10px]"><span className="truncate text-slate-400">{platform.name}</span><b className="text-white">{platform.count}</b></div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${platform.percent}%` }} /></div>
                      </div>
                    )) : <div className="text-[10px] text-slate-600">No verified platform signals.</div>}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-800 bg-[#07101c] overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-300" /><div className="text-sm font-black text-white">Scan Coverage</div></div>
                  <div className="p-4 space-y-2 text-[10px]">
                    <div className="flex justify-between gap-3"><span className="text-slate-600">Search queries issued</span><b className="text-slate-300">{result.searchMeta?.queriesIssued ?? '—'}</b></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-600">Candidate URLs reviewed</span><b className="text-slate-300">{result.searchMeta?.candidateUrlsReviewed ?? '—'}</b></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-600">Extraction checks</span><b className="text-slate-300">{result.searchMeta?.extractionsAttempted ?? '—'}</b></div>
                    <div className="pt-2 border-t border-slate-800"><div className="text-[8px] uppercase tracking-widest text-slate-700">Groups attempted</div><div className="mt-2 flex flex-wrap gap-1.5">{result.searchMeta?.groupsAttempted?.length ? result.searchMeta.groupsAttempted.map((group) => <span key={group} className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[8px] text-slate-500">{group}</span>) : <span className="text-slate-700">Connector-specific scan</span>}</div></div>
                  </div>
                </section>

                <section className="rounded-2xl border border-amber-500/15 bg-amber-500/[.035] p-4">
                  <div className="flex gap-3"><ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" /><div><div className="text-[10px] font-black text-amber-300">Accuracy policy</div><p className="mt-1 text-[9px] leading-relaxed text-slate-600">A missing result is preferable to a false identity match. Public search engines cannot guarantee complete internet coverage, so “no verified result” is not the same as “no account exists.”</p></div></div>
                </section>
              </div>
            </section>
          </>
        )}

        {!hasLiveResult && <div className="mt-6"><EmptyState error={error} /></div>}

        <div className="mt-6 flex flex-wrap items-center gap-2 text-[9px] text-slate-700">
          <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Public/authorized sources only</span><span>•</span><span>No private real-time presence</span><span>•</span><span>No secret credentials</span><span>•</span><button onClick={() => window.location.assign('/app/profile')} className="text-cyan-500 hover:text-cyan-300 inline-flex items-center gap-1">Open Lead 360 <ArrowUpRight className="w-3 h-3" /></button>
        </div>
      </main>
    </div>
  );
};
