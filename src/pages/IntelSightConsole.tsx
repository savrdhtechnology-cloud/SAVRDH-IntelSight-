import React, { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, BarChart3, BookOpenCheck, BriefcaseBusiness,
  CheckCircle2, ChevronRight, CircleDot, Clock3, Database, Eye, FileSearch,
  FileText, Fingerprint, GitBranch, Globe2, History, LayoutDashboard, Link2,
  ListFilter, LockKeyhole, Network, Radar, Search, Settings, ShieldCheck,
  Sparkles, UserRoundSearch, Users, X
} from 'lucide-react';
import { createDemoResult, inferSearchType, type SearchResult, type SearchType } from '../lib/intelligence';
import { isSupabaseConfigured } from '../lib/supabase';

type View = 'overview' | 'search' | 'cases' | 'graph' | 'reports' | 'watchlists' | 'sources' | 'audit' | 'settings';
type Icon = React.ComponentType<{ className?: string }>;

const nav: Array<[View, Icon, string]> = [
  ['overview', LayoutDashboard, 'Overview'],
  ['search', UserRoundSearch, 'Intelligence Search'],
  ['cases', BriefcaseBusiness, 'Cases'],
  ['graph', Network, 'Relationship Graph'],
  ['reports', FileText, 'Reports'],
  ['watchlists', Radar, 'Watchlists'],
  ['sources', Database, 'Sources'],
  ['audit', History, 'Audit Log'],
  ['settings', Settings, 'Settings'],
];

const typeLabels: Array<[SearchType, string]> = [
  ['email', 'Email'], ['mobile', 'Mobile'], ['username', 'Username'], ['domain', 'Domain'], ['company', 'Company'],
];

const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric'
}).format(new Date(value));

const ScoreRing = ({ value, label }: { value: number; label: string }) => (
  <div className="flex items-center gap-4">
    <div className="relative w-16 h-16 rounded-full bg-[conic-gradient(#22d3ee_var(--score),#172033_0)] p-[3px]" style={{ '--score': `${value}%` } as React.CSSProperties}>
      <div className="w-full h-full rounded-full bg-[#07101f] flex items-center justify-center text-sm font-black text-white">{value}</div>
    </div>
    <div><div className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-500">{label}</div><div className="mt-1 text-sm font-bold text-slate-200">{value >= 80 ? 'High' : value >= 60 ? 'Moderate' : 'Low'}</div></div>
  </div>
);

const StatCard = ({ icon: IconEl, label, value, detail }: { icon: Icon; label: string; value: string; detail: string }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#0a1220] p-5">
    <div className="flex items-start justify-between gap-4">
      <div><div className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-500">{label}</div><div className="mt-3 text-3xl font-black text-white">{value}</div></div>
      <div className="w-11 h-11 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center"><IconEl className="w-5 h-5 text-cyan-300" /></div>
    </div>
    <div className="mt-4 text-xs text-slate-500">{detail}</div>
  </div>
);

const EmptyPanel = ({ icon: IconEl, title, text }: { icon: Icon; title: string; text: string }) => (
  <div className="rounded-3xl border border-slate-800 bg-[#09111e] min-h-[420px] flex items-center justify-center p-8 text-center">
    <div className="max-w-lg"><div className="mx-auto w-16 h-16 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center"><IconEl className="w-7 h-7 text-cyan-300" /></div><h2 className="mt-5 text-2xl font-black text-white">{title}</h2><p className="mt-3 text-sm leading-relaxed text-slate-500">{text}</p><div className="mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] font-black text-cyan-400"><Sparkles className="w-3.5 h-3.5" /> Phase 1 foundation ready</div></div>
  </div>
);

export const IntelSightConsole: React.FC = () => {
  const [view, setView] = useState<View>('overview');
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('email');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [running, setRunning] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const placeholder = useMemo(() => ({
    email: 'name@example.com',
    mobile: '+91 98765 43210',
    username: 'public_username',
    domain: 'example.com',
    company: 'SAVRDH Capital Private Limited',
  }[searchType]), [searchType]);

  const runSearch = async () => {
    const value = query.trim();
    if (!value) return;
    const inferred = inferSearchType(value);
    const effectiveType: SearchType = inferred === 'company' ? 'company' : searchType;
    if (effectiveType !== searchType) setSearchType(effectiveType);
    setRunning(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: value, type: effectiveType })
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.result) setResult(payload.result as SearchResult);
        else setResult(createDemoResult(value, effectiveType));
      } else {
        setResult(createDemoResult(value, effectiveType));
      }
    } catch {
      setResult(createDemoResult(value, effectiveType));
    } finally {
      setRunning(false);
      setView('search');
    }
  };

  const useDetectedType = () => query.trim() && setSearchType(inferSearchType(query));

  const content = () => {
    if (view === 'overview') return <Overview onSearch={() => setView('search')} />;
    if (view === 'search') return <SearchWorkspace result={result} query={query} setQuery={setQuery} searchType={searchType} setSearchType={setSearchType} runSearch={runSearch} running={running} placeholder={placeholder} useDetectedType={useDetectedType} />;
    if (view === 'cases') return <EmptyPanel icon={BriefcaseBusiness} title="Case Workspace" text="Create investigation cases, attach searches and evidence, add analyst notes, and preserve an auditable research trail. Database tables are included in the backend schema foundation." />;
    if (view === 'graph') return <EmptyPanel icon={Network} title="Relationship Graph" text="Graph view will visualize evidence-backed links among public identifiers, profiles, domains and organizations. Edges will carry source references and confidence instead of unverified identity claims." />;
    if (view === 'reports') return <EmptyPanel icon={FileText} title="Intelligence Reports" text="Generate branded SAVRDH IntelSight reports containing executive summary, findings, evidence references, confidence notes and analyst review status." />;
    if (view === 'watchlists') return <EmptyPanel icon={Radar} title="Authorized Watchlists" text="Watchlists are designed for permitted business subjects, owned domains and authorized monitoring. They will not be used for covert private-person tracking or private-location surveillance." />;
    if (view === 'sources') return <SourcesPanel />;
    if (view === 'audit') return <EmptyPanel icon={History} title="Audit Log" text="Every search, case update, report generation and administrative change will be recorded with user, timestamp and action metadata when Supabase authentication is enabled." />;
    return <EmptyPanel icon={Settings} title="Workspace Settings" text="Organization settings, role-based access, retention, source connectors, API limits and reporting preferences will be configured here." />;
  };

  return (
    <div className="min-h-screen bg-[#050a13] text-slate-200 flex">
      <aside className={`${mobileNav ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden'} lg:flex w-[272px] shrink-0 flex-col border-r border-slate-800 bg-[#07101c]`}>
        <div className="h-20 px-5 border-b border-slate-800 flex items-center justify-between gap-3">
          <button onClick={() => window.location.assign('/')} className="flex items-center gap-3 text-left cursor-pointer">
            <span className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center relative"><FileSearch className="w-6 h-6 text-cyan-300" /><Fingerprint className="absolute w-3 h-3 text-white" /></span>
            <span><span className="block text-sm font-black text-white">SAVRDH IntelSight™</span><span className="block text-[8px] uppercase tracking-[0.2em] text-cyan-400">Investigation Console</span></span>
          </button>
          <button onClick={() => setMobileNav(false)} className="lg:hidden text-slate-500"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-3 py-4 space-y-1 flex-1 overflow-y-auto">
          <div className="px-3 mb-3 text-[9px] uppercase tracking-[0.2em] font-black text-slate-600">Workspace</div>
          {nav.map(([key, IconEl, label]) => <button key={key} onClick={() => { setView(key); setMobileNav(false); }} className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${view === key ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300' : 'border border-transparent text-slate-500 hover:text-slate-200 hover:bg-slate-900'}`}><IconEl className="w-4 h-4" /><span>{label}</span>{view === key && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}</button>)}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between"><span className="text-[9px] uppercase tracking-[0.17em] font-black text-slate-600">Backend</span><span className={`text-[9px] font-black ${isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>{isSupabaseConfigured ? 'CONNECTED' : 'SETUP PENDING'}</span></div>
            <div className="mt-2 text-[10px] leading-relaxed text-slate-500">Supabase Auth + PostgreSQL foundation prepared. Environment keys are required for live persistence.</div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="h-20 sticky top-0 z-40 bg-[#050a13]/92 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><button onClick={() => setMobileNav(true)} className="lg:hidden w-10 h-10 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center"><ListFilter className="w-4 h-4" /></button><div><div className="text-[10px] uppercase tracking-[0.18em] font-black text-cyan-400">SAVRDH Technology</div><div className="text-sm sm:text-base font-black text-white">{nav.find(item => item[0] === view)?.[2]}</div></div></div>
          <div className="flex items-center gap-2"><span className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-[9px] font-black text-emerald-300"><CircleDot className="w-3 h-3" /> SAFE PUBLIC-DATA MODE</span><button onClick={() => window.location.assign('/')} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft className="w-3.5 h-3.5" /> Website</button></div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1500px] mx-auto">{content()}</div>
      </main>
    </div>
  );
};

const Overview = ({ onSearch }: { onSearch: () => void }) => (
  <div>
    <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
      <div><div className="text-[10px] uppercase tracking-[0.2em] font-black text-cyan-400">Operations Overview</div><h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-white">Intelligence workspace</h1><p className="mt-3 max-w-2xl text-sm text-slate-500 leading-relaxed">One console for permitted public-source search, evidence review, identity correlation, investigation cases and reports.</p></div>
      <button onClick={onSearch} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-black text-white"><Search className="w-4 h-4" /> New Intelligence Search</button>
    </div>

    <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard icon={Search} label="Searches this month" value="0" detail="Live usage starts after backend connection." />
      <StatCard icon={BriefcaseBusiness} label="Active cases" value="0" detail="Case management schema is prepared." />
      <StatCard icon={Database} label="Source connectors" value="2" detail="RDAP + GitHub public connector skeleton." />
      <StatCard icon={FileText} label="Reports generated" value="0" detail="PDF report module is scheduled for Phase 1." />
    </div>

    <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.35fr_.65fr] gap-5">
      <div className="rounded-3xl border border-slate-800 bg-[#09111e] p-6">
        <div className="flex items-center justify-between gap-4"><div><div className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-500">Investigation pipeline</div><h2 className="mt-2 text-xl font-black text-white">From identifier to evidence-backed report</h2></div><GitBranch className="w-6 h-6 text-cyan-300" /></div>
        <div className="mt-7 grid grid-cols-1 md:grid-cols-5 gap-3">{[[Search,'Search'],[Globe2,'Discover'],[Link2,'Correlate'],[BookOpenCheck,'Review'],[FileText,'Report']].map(([I,label], index) => { const IconEl = I as Icon; return <div key={label as string} className="relative rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><div className="text-[9px] font-black text-cyan-400">0{index+1}</div><IconEl className="mt-4 w-5 h-5 text-slate-300" /><div className="mt-3 text-xs font-black text-white">{label as string}</div></div>; })}</div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-[#09111e] p-6">
        <div className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-emerald-400" /><h2 className="text-sm font-black text-white">Built-in safety scope</h2></div>
        <div className="mt-5 space-y-3">{['Public or licensed sources only','No stolen passwords, OTPs or session tokens','No private chats or private-location tracking','Confidence-based matches require analyst review','Evidence URLs retained for traceability'].map(item => <div key={item} className="flex gap-2.5 text-xs text-slate-400"><CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />{item}</div>)}</div>
      </div>
    </div>
  </div>
);

type SearchWorkspaceProps = {
  result: SearchResult | null; query: string; setQuery: (v: string) => void; searchType: SearchType; setSearchType: (v: SearchType) => void; runSearch: () => void; running: boolean; placeholder: string; useDetectedType: () => void;
};

const SearchWorkspace = ({ result, query, setQuery, searchType, setSearchType, runSearch, running, placeholder, useDetectedType }: SearchWorkspaceProps) => (
  <div>
    <div><div className="text-[10px] uppercase tracking-[0.2em] font-black text-cyan-400">Universal Search</div><h1 className="mt-2 text-3xl font-black text-white">Public intelligence search</h1><p className="mt-2 text-sm text-slate-500">Search a permitted public identifier, domain or company and review evidence-linked signals. Results must be treated as investigative leads until verified.</p></div>

    <div className="mt-6 rounded-3xl border border-slate-800 bg-[#09111e] p-5 sm:p-6">
      <div className="flex flex-wrap gap-2">{typeLabels.map(([type,label]) => <button key={type} onClick={() => setSearchType(type)} className={`px-4 py-2.5 rounded-xl text-xs font-black border ${searchType === type ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 bg-slate-950 text-slate-500'}`}>{label}</button>)}</div>
      <div className="mt-4 flex flex-col sm:flex-row gap-3"><div className="flex-1 h-14 rounded-2xl border border-slate-700 bg-slate-950 flex items-center px-4 gap-3"><Search className="w-5 h-5 text-slate-600" /><input value={query} onChange={e => setQuery(e.target.value)} onBlur={useDetectedType} onKeyDown={e => e.key === 'Enter' && runSearch()} placeholder={placeholder} className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white font-mono" /></div><button onClick={runSearch} disabled={running || !query.trim()} className="h-14 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-40 text-sm font-black text-white inline-flex items-center justify-center gap-2">{running ? <Activity className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}{running ? 'Scanning public sources…' : 'Run Search'}</button></div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-600"><LockKeyhole className="w-3.5 h-3.5" /> Only use identifiers or organizations you are legally permitted to investigate. Private credentials and private communications are outside product scope.</div>
    </div>

    {!result ? <div className="mt-6 rounded-3xl border border-dashed border-slate-800 min-h-[360px] flex items-center justify-center text-center p-8"><div><div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><Eye className="w-7 h-7 text-cyan-300" /></div><h3 className="mt-5 text-lg font-black text-white">No search executed yet</h3><p className="mt-2 text-sm text-slate-600">Enter an email, mobile number, username, domain or company name to begin.</p></div></div> : <ResultView result={result} />}
  </div>
);

const ResultView = ({ result }: { result: SearchResult }) => (
  <div className="mt-6 space-y-5">
    <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.08] to-blue-500/[0.04] p-5 sm:p-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[9px] uppercase tracking-[0.16em] font-black text-cyan-300">{result.type}</span><span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[9px] uppercase tracking-[0.16em] font-black text-amber-300">{result.mode === 'demo' ? 'DEMO DATA' : 'LIVE DATA'}</span></div><div className="mt-3 text-xl sm:text-2xl font-black text-white break-all">{result.query}</div><div className="mt-2 text-sm font-bold text-slate-300">{result.possibleIdentity}</div><p className="mt-3 max-w-3xl text-xs sm:text-sm leading-relaxed text-slate-500">{result.summary}</p></div>
        <div className="flex flex-wrap gap-6"><ScoreRing value={result.visibilityScore} label="Visibility" /><ScoreRing value={result.confidence} label="Confidence" /></div>
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_.65fr] gap-5">
      <div className="rounded-3xl border border-slate-800 bg-[#09111e] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between"><div><div className="text-[9px] uppercase tracking-[0.17em] font-black text-slate-600">Evidence</div><div className="mt-1 text-sm font-black text-white">Source-linked findings</div></div><span className="text-xs font-black text-cyan-300">{result.sourceCount} sources</span></div>
        <div className="divide-y divide-slate-800">{result.evidence.map(item => <div key={item.id} className="p-5"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Globe2 className="w-4 h-4 text-cyan-400" /><span className="text-[10px] font-black text-cyan-300">{item.source}</span></div><div className="mt-2 text-sm font-black text-white">{item.title}</div><p className="mt-2 text-xs leading-relaxed text-slate-500">{item.summary}</p><div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-600"><span>{formatDate(item.observedAt)}</span><span>Confidence {item.confidence}%</span><span className="uppercase">{item.category}</span></div></div><a href={item.url} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-[10px] font-bold text-slate-400 hover:text-cyan-300"><Link2 className="w-3.5 h-3.5" /> Source</a></div></div>)}</div>
      </div>

      <div className="space-y-5">
        <div className="rounded-3xl border border-slate-800 bg-[#09111e] p-5"><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /><div className="text-xs font-black text-white">Exposure Intelligence</div></div><div className="mt-4 text-[10px] uppercase tracking-[0.16em] font-black text-amber-300">{result.exposure.status}</div><p className="mt-2 text-xs leading-relaxed text-slate-500">{result.exposure.summary}</p></div>
        <div className="rounded-3xl border border-slate-800 bg-[#09111e] p-5"><div className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-cyan-400" /><div className="text-xs font-black text-white">Signal Timeline</div></div><div className="mt-5 space-y-4">{result.timeline.map((item,index) => <div key={`${item.date}-${index}`} className="flex gap-3"><div className="pt-1"><div className="w-2 h-2 rounded-full bg-cyan-400" /></div><div><div className="text-[10px] font-black text-white">{item.label}</div><div className="mt-1 text-[9px] text-slate-600">{formatDate(item.date)}</div><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{item.detail}</p></div></div>)}</div></div>
      </div>
    </div>
  </div>
);

const SourcesPanel = () => (
  <div><div className="text-[10px] uppercase tracking-[0.2em] font-black text-cyan-400">Connector Registry</div><h1 className="mt-2 text-3xl font-black text-white">Public & authorized sources</h1><p className="mt-2 text-sm text-slate-500">Server-side connectors protect API keys and preserve source attribution.</p>
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[
      ['RDAP Domain Intelligence', Globe2, 'Public', 'Ready skeleton', 'Domain registration and registry metadata.'],
      ['GitHub Public Profiles', Users, 'Public', 'Ready skeleton', 'Public username profile and repository signals.'],
      ['Web Search Provider', Search, 'Licensed API', 'API key required', 'Indexed public web occurrences for permitted identifiers.'],
      ['Company Intelligence', BriefcaseBusiness, 'Public/Licensed web', 'Connected', 'Corporate references, public company pages, professional profiles and domain signals.'],
      ['Defensive Exposure Provider', ShieldCheck, 'Licensed API', 'API key required', 'Breach/exposure summary without stolen secrets.'],
      ['Supabase', Database, 'Internal', isSupabaseConfigured ? 'Configured' : 'Keys required', 'Authentication, cases, evidence, reports and audit logs.'],
      ['CRM Integration', BarChart3, 'Internal', 'Phase 2', 'Optional SAVRDH CRM lead/case handoff.'],
    ].map(([name,I,type,status,text]) => { const IconEl=I as Icon; return <div key={name as string} className="rounded-2xl border border-slate-800 bg-[#09111e] p-5"><div className="flex items-center justify-between"><div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><IconEl className="w-5 h-5 text-cyan-300" /></div><span className="text-[9px] uppercase tracking-[0.14em] font-black text-slate-600">{type as string}</span></div><div className="mt-4 text-sm font-black text-white">{name as string}</div><div className="mt-2 text-[10px] font-bold text-cyan-400">{status as string}</div><p className="mt-3 text-xs leading-relaxed text-slate-500">{text as string}</p></div>; })}</div>
  </div>
);
