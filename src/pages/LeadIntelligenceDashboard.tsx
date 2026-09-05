import React, { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, BadgeCheck, BookOpenCheck, BriefcaseBusiness,
  Building2, ChevronRight, CircleDot, Clock3, Database, ExternalLink, Eye,
  FileSearch, FileText, Fingerprint, GitBranch, Globe2, History, LayoutDashboard,
  Link2, ListFilter, Mail, MapPin, Network, Radar, RefreshCw, Search, Settings,
  ShieldCheck, Smartphone, Sparkles, UserRound, UserRoundSearch, Users, X,
  AtSign, CheckCircle2, CircleHelp, LockKeyhole
} from 'lucide-react';
import { createDemoResult, inferSearchType, type EvidenceItem, type SearchResult, type SearchType } from '../lib/intelligence';

type View = 'profile' | 'presence' | 'identities' | 'evidence' | 'timeline' | 'graph';
type Icon = React.ComponentType<{ className?: string }>;

const nav: Array<[View, Icon, string]> = [
  ['profile', LayoutDashboard, 'Lead 360 Profile'],
  ['presence', Globe2, 'Public Presence'],
  ['identities', Fingerprint, 'Identity Signals'],
  ['evidence', FileSearch, 'Evidence'],
  ['timeline', History, 'Timeline'],
  ['graph', Network, 'Relationship Graph'],
];

const typeLabels: Array<[SearchType, string, Icon]> = [
  ['email', 'Email', Mail],
  ['mobile', 'Mobile', Smartphone],
  ['username', 'Username', AtSign],
  ['domain', 'Domain', Globe2],
];

const fmt = (value: string) => new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
}).format(new Date(value));

const relative = (value: string) => {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Checked today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
};

const Score = ({ value, label }: { value: number; label: string }) => (
  <div className="flex items-center gap-3">
    <div className="relative w-16 h-16 rounded-full p-[3px] bg-[conic-gradient(#22d3ee_var(--score),#172033_0)]" style={{ '--score': `${value}%` } as React.CSSProperties}>
      <div className="w-full h-full rounded-full bg-[#08111f] flex items-center justify-center text-sm font-black text-white">{value}</div>
    </div>
    <div>
      <div className="text-[9px] uppercase tracking-[0.18em] font-black text-slate-600">{label}</div>
      <div className="mt-1 text-sm font-black text-slate-200">{value >= 80 ? 'High' : value >= 60 ? 'Moderate' : 'Low'}</div>
    </div>
  </div>
);

const Stat = ({ icon: IconEl, label, value, text }: { icon: Icon; label: string; value: string; text: string }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#0a1220] p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[9px] uppercase tracking-[0.18em] font-black text-slate-600">{label}</div>
        <div className="mt-2 text-2xl font-black text-white">{value}</div>
      </div>
      <div className="w-10 h-10 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center"><IconEl className="w-4.5 h-4.5 text-cyan-300" /></div>
    </div>
    <div className="mt-3 text-[10px] leading-relaxed text-slate-600">{text}</div>
  </div>
);

const statusFor = (item: EvidenceItem) => item.confidence >= 85 ? 'Strong signal' : item.confidence >= 70 ? 'Possible match' : 'Review required';

const PresenceCard = ({ item }: { item: EvidenceItem }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4 hover:border-cyan-500/25 transition-colors">
    <div className="flex items-start justify-between gap-3">
      <div className="w-10 h-10 rounded-xl border border-slate-800 bg-[#0b1422] flex items-center justify-center">
        {item.category === 'profile' ? <UserRound className="w-4 h-4 text-cyan-300" /> : item.category === 'domain' ? <Globe2 className="w-4 h-4 text-blue-300" /> : item.category === 'business' ? <Building2 className="w-4 h-4 text-indigo-300" /> : item.category === 'exposure' ? <ShieldCheck className="w-4 h-4 text-amber-300" /> : <Search className="w-4 h-4 text-slate-300" />}
      </div>
      <span className={`px-2 py-1 rounded-lg border text-[8px] uppercase tracking-[0.13em] font-black ${item.confidence >= 85 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>{statusFor(item)}</span>
    </div>
    <div className="mt-4 text-[10px] font-black text-cyan-300">{item.source}</div>
    <div className="mt-1.5 text-sm font-black text-white line-clamp-2">{item.title}</div>
    <p className="mt-2 text-[10px] leading-relaxed text-slate-500 line-clamp-3">{item.summary}</p>
    <div className="mt-4 flex items-center justify-between gap-3">
      <div className="text-[9px] text-slate-600"><Clock3 className="inline w-3 h-3 mr-1" />{relative(item.observedAt)}</div>
      <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-cyan-400 hover:text-cyan-300">Open source <ExternalLink className="w-3 h-3" /></a>
    </div>
  </div>
);

const IdentityChip = ({ icon: IconEl, label, value, state }: { icon: Icon; label: string; value: string; state: string }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#0a1220] p-4">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 shrink-0 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><IconEl className="w-4 h-4 text-cyan-300" /></div>
      <div className="min-w-0 flex-1"><div className="text-[8px] uppercase tracking-[0.16em] font-black text-slate-600">{label}</div><div className="mt-1 text-xs font-black text-white break-all">{value}</div><div className="mt-2 text-[9px] font-bold text-emerald-400">{state}</div></div>
    </div>
  </div>
);

export const LeadIntelligenceDashboard: React.FC = () => {
  const [view, setView] = useState<View>('profile');
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState('public.demo@example.com');
  const [searchType, setSearchType] = useState<SearchType>('email');
  const [result, setResult] = useState<SearchResult>(() => createDemoResult('public.demo@example.com', 'email'));
  const [running, setRunning] = useState(false);

  const strongest = useMemo(() => [...result.evidence].sort((a, b) => b.confidence - a.confidence)[0], [result]);
  const lastObserved = useMemo(() => [...result.evidence].sort((a, b) => +new Date(b.observedAt) - +new Date(a.observedAt))[0]?.observedAt, [result]);
  const profileCount = result.evidence.filter(i => i.category === 'profile').length;
  const domainCount = result.evidence.filter(i => i.category === 'domain').length;
  const businessCount = result.evidence.filter(i => i.category === 'business').length;

  const runSearch = async () => {
    const value = query.trim();
    if (!value) return;
    const detected = inferSearchType(value);
    setSearchType(detected);
    setRunning(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: value, type: detected }),
      });
      if (response.ok) {
        const payload = await response.json();
        setResult(payload?.result || createDemoResult(value, detected));
      } else {
        setResult(createDemoResult(value, detected));
      }
    } catch {
      setResult(createDemoResult(value, detected));
    } finally {
      setRunning(false);
      setView('profile');
    }
  };

  const renderView = () => {
    if (view === 'presence') return <PresenceView result={result} />;
    if (view === 'identities') return <IdentityView result={result} />;
    if (view === 'evidence') return <EvidenceView result={result} />;
    if (view === 'timeline') return <TimelineView result={result} />;
    if (view === 'graph') return <GraphView result={result} />;
    return <ProfileView result={result} strongest={strongest} lastObserved={lastObserved} profileCount={profileCount} domainCount={domainCount} businessCount={businessCount} onNavigate={setView} />;
  };

  return (
    <div className="min-h-screen bg-[#050a13] text-slate-200 flex">
      <aside className={`${mobileNav ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden'} lg:flex w-[278px] shrink-0 flex-col border-r border-slate-800 bg-[#07101c]`}>
        <div className="h-20 px-5 border-b border-slate-800 flex items-center justify-between gap-3">
          <button onClick={() => window.location.assign('/')} className="flex items-center gap-3 text-left">
            <span className="relative w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><FileSearch className="w-6 h-6 text-cyan-300" /><Fingerprint className="absolute w-3 h-3 text-white" /></span>
            <span><span className="block text-sm font-black text-white">SAVRDH IntelSight™</span><span className="block text-[8px] uppercase tracking-[0.2em] text-cyan-400">Lead Intelligence</span></span>
          </button>
          <button onClick={() => setMobileNav(false)} className="lg:hidden text-slate-500"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          <div className="px-3 py-3 text-[9px] uppercase tracking-[0.2em] font-black text-slate-600">Intelligence Workspace</div>
          <div className="space-y-1">{nav.map(([key, IconEl, label]) => <button key={key} onClick={() => { setView(key); setMobileNav(false); }} className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-xs font-bold transition-all ${view === key ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300' : 'border-transparent text-slate-500 hover:bg-slate-900 hover:text-slate-200'}`}><IconEl className="w-4 h-4" />{label}{view === key && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}</button>)}</div>

          <div className="mt-5 px-3 py-3 text-[9px] uppercase tracking-[0.2em] font-black text-slate-600">Operations</div>
          <div className="space-y-1">
            <button onClick={() => window.location.assign('/app/workspace')} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-900 hover:text-slate-200"><BriefcaseBusiness className="w-4 h-4" />Cases & Workspace</button>
            <button className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-900 hover:text-slate-200"><FileText className="w-4 h-4" />Generate Report</button>
            <button className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-900 hover:text-slate-200"><Settings className="w-4 h-4" />Settings</button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] p-4"><div className="flex items-center gap-2 text-[9px] font-black text-emerald-300"><ShieldCheck className="w-3.5 h-3.5" /> PUBLIC-DATA MODE</div><p className="mt-2 text-[9px] leading-relaxed text-slate-600">Presence means observed on public or authorized sources — not private online status or private location.</p></div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#050a13]/94 backdrop-blur-xl">
          <div className="h-20 px-4 sm:px-6 lg:px-8 flex items-center gap-3">
            <button onClick={() => setMobileNav(true)} className="lg:hidden w-10 h-10 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center"><ListFilter className="w-4 h-4" /></button>
            <div className="hidden xl:block min-w-[190px]"><div className="text-[9px] uppercase tracking-[0.18em] font-black text-cyan-400">Lead Intelligence</div><div className="mt-1 text-sm font-black text-white">360° Public Profile</div></div>
            <div className="flex-1 max-w-3xl mx-auto flex gap-2">
              <div className="flex-1 h-12 rounded-xl border border-slate-700 bg-slate-950 flex items-center gap-3 px-4"><Search className="w-4 h-4 text-slate-600" /><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} placeholder="Email, mobile, username or domain" className="min-w-0 flex-1 bg-transparent outline-none text-xs sm:text-sm text-white font-mono" /></div>
              <button onClick={runSearch} disabled={running || !query.trim()} className="h-12 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-40 text-xs font-black text-white inline-flex items-center gap-2">{running ? <Activity className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}<span className="hidden sm:inline">{running ? 'Scanning…' : 'Search'}</span></button>
            </div>
            <button onClick={() => window.location.assign('/')} className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-[10px] font-bold text-slate-500 hover:text-white"><ArrowLeft className="w-3.5 h-3.5" />Website</button>
          </div>
        </header>

        <div className="max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {typeLabels.map(([type, label, IconEl]) => <button key={type} onClick={() => setSearchType(type)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black ${searchType === type ? 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 bg-slate-950 text-slate-600'}`}><IconEl className="w-3 h-3" />{label}</button>)}
            <span className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[8px] uppercase tracking-[0.14em] font-black ${result.mode === 'live' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}><CircleDot className="w-3 h-3" />{result.mode === 'live' ? 'LIVE PUBLIC DATA' : 'DEMO DATA'}</span>
          </div>
          {renderView()}
        </div>
      </main>
    </div>
  );
};

const ProfileView = ({ result, strongest, lastObserved, profileCount, domainCount, businessCount, onNavigate }: { result: SearchResult; strongest?: EvidenceItem; lastObserved?: string; profileCount: number; domainCount: number; businessCount: number; onNavigate: (view: View) => void }) => (
  <div className="space-y-5">
    <section className="rounded-3xl border border-cyan-500/20 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.08),transparent_35%),#09111e] p-5 sm:p-6 lg:p-7">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-7">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 min-w-0">
          <div className="w-20 h-20 shrink-0 rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/15 to-blue-600/10 flex items-center justify-center relative"><UserRoundSearch className="w-9 h-9 text-cyan-300" /><span className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-[#09111e] flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></span></div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className="px-2.5 py-1 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-[8px] uppercase tracking-[0.15em] font-black text-cyan-300">Possible identity profile</span><span className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-950 text-[8px] uppercase tracking-[0.15em] font-black text-slate-500">Analyst verification required</span></div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-black text-white break-words">{result.possibleIdentity}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-slate-500"><span className="font-mono break-all">{result.query}</span><span className="uppercase">Type: {result.type}</span>{lastObserved && <span>Last checked: {fmt(lastObserved)}</span>}</div>
            <p className="mt-4 max-w-4xl text-xs sm:text-sm leading-relaxed text-slate-500">{result.summary}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-6"><Score value={result.visibilityScore} label="Public Visibility" /><Score value={result.confidence} label="Identity Confidence" /></div>
      </div>
    </section>

    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Stat icon={Globe2} label="Public sources" value={String(result.sourceCount)} text="Evidence-linked public or authorized source records." />
      <Stat icon={Users} label="Profiles found" value={String(profileCount)} text="Possible public profile surfaces requiring correlation review." />
      <Stat icon={Globe2} label="Domains" value={String(domainCount)} text="Domains or registry references connected to the search." />
      <Stat icon={Building2} label="Organizations" value={String(businessCount)} text="Public business or organization association signals." />
    </section>

    <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_.65fr] gap-5">
      <div className="rounded-3xl border border-slate-800 bg-[#09111e] overflow-hidden">
        <div className="px-5 sm:px-6 py-5 border-b border-slate-800 flex items-center justify-between gap-4"><div><div className="text-[9px] uppercase tracking-[0.18em] font-black text-slate-600">Public presence</div><h2 className="mt-1 text-lg font-black text-white">Where this identifier appears on the internet</h2></div><button onClick={() => onNavigate('presence')} className="inline-flex items-center gap-1.5 text-[10px] font-black text-cyan-400">View all <ChevronRight className="w-3.5 h-3.5" /></button></div>
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">{result.evidence.slice(0, 4).map(item => <PresenceCard key={item.id} item={item} />)}</div>
      </div>

      <div className="space-y-5">
        <div className="rounded-3xl border border-slate-800 bg-[#09111e] p-5">
          <div className="flex items-center justify-between"><div><div className="text-[9px] uppercase tracking-[0.18em] font-black text-slate-600">Strongest signal</div><div className="mt-1 text-sm font-black text-white">Best corroborated public lead</div></div><BadgeCheck className="w-5 h-5 text-emerald-400" /></div>
          {strongest ? <><div className="mt-5 text-xs font-black text-cyan-300">{strongest.source}</div><div className="mt-2 text-sm font-black text-white">{strongest.title}</div><p className="mt-2 text-xs leading-relaxed text-slate-500">{strongest.summary}</p><div className="mt-4 flex items-center justify-between"><span className="text-[10px] font-black text-emerald-400">Confidence {strongest.confidence}%</span><a href={strongest.url} target="_blank" rel="noreferrer" className="text-[10px] font-black text-cyan-400">Open evidence</a></div></> : <div className="mt-5 text-xs text-slate-600">No signal available.</div>}
        </div>

        <div className="rounded-3xl border border-amber-500/15 bg-amber-500/[0.04] p-5"><div className="flex items-center gap-2 text-xs font-black text-amber-300"><AlertTriangle className="w-4 h-4" />Interpretation notice</div><p className="mt-3 text-[10px] leading-relaxed text-slate-500">Public presence does not mean the person is currently online. IntelSight shows where a public identifier or corroborating signal was observed and when the source was last checked.</p></div>
      </div>
    </section>

    <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <IdentitySummary result={result} onNavigate={onNavigate} />
      <MiniGraph result={result} onNavigate={onNavigate} />
    </section>
  </div>
);

const PresenceView = ({ result }: { result: SearchResult }) => (
  <div>
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"><div><div className="text-[10px] uppercase tracking-[0.2em] font-black text-cyan-400">Internet Presence</div><h1 className="mt-2 text-3xl font-black text-white">Public presence surfaces</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">Each card represents a public or authorized source where a matching signal was observed. Status is confidence-based, not proof of current activity.</p></div><div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-[9px] font-black text-slate-500"><RefreshCw className="w-3.5 h-3.5" />Last scan: {fmt(result.evidence[0]?.observedAt || new Date().toISOString())}</div></div>
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{result.evidence.map(item => <PresenceCard key={item.id} item={item} />)}</div>
    <div className="mt-5 rounded-2xl border border-slate-800 bg-[#09111e] p-5 flex gap-3"><CircleHelp className="w-5 h-5 text-cyan-400 shrink-0" /><div><div className="text-xs font-black text-white">How to read this</div><p className="mt-2 text-[10px] leading-relaxed text-slate-500">“Strong signal” means the searched identifier or a closely matching public record was found with high confidence. “Possible match” means the connection needs analyst corroboration before it should be associated with the same person or organization.</p></div></div>
  </div>
);

const IdentitySummary = ({ result, onNavigate }: { result: SearchResult; onNavigate: (view: View) => void }) => (
  <div className="rounded-3xl border border-slate-800 bg-[#09111e] p-5 sm:p-6">
    <div className="flex items-center justify-between"><div><div className="text-[9px] uppercase tracking-[0.18em] font-black text-slate-600">Identity signals</div><div className="mt-1 text-lg font-black text-white">Correlated identifiers</div></div><button onClick={() => onNavigate('identities')} className="text-[10px] font-black text-cyan-400">View details</button></div>
    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <IdentityChip icon={result.type === 'email' ? Mail : result.type === 'mobile' ? Smartphone : result.type === 'domain' ? Globe2 : AtSign} label={`Primary ${result.type}`} value={result.query} state="Searched identifier" />
      <IdentityChip icon={UserRound} label="Possible identity" value={result.possibleIdentity} state={`Confidence ${result.confidence}%`} />
      <IdentityChip icon={Globe2} label="Public source coverage" value={`${result.sourceCount} evidence records`} state="Source-linked" />
      <IdentityChip icon={ShieldCheck} label="Exposure state" value={result.exposure.status} state="Defensive summary only" />
    </div>
  </div>
);

const IdentityView = ({ result }: { result: SearchResult }) => (
  <div>
    <div><div className="text-[10px] uppercase tracking-[0.2em] font-black text-cyan-400">Identity Resolution</div><h1 className="mt-2 text-3xl font-black text-white">Correlated identity signals</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Identifiers are grouped by source evidence and confidence. IntelSight does not assert two profiles belong to the same person without sufficient corroboration.</p></div>
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"><IdentityChip icon={result.type === 'email' ? Mail : result.type === 'mobile' ? Smartphone : result.type === 'domain' ? Globe2 : AtSign} label="Primary identifier" value={result.query} state="User supplied" /><IdentityChip icon={UserRound} label="Possible identity" value={result.possibleIdentity} state={`Confidence ${result.confidence}%`} /><IdentityChip icon={Database} label="Evidence records" value={String(result.sourceCount)} state="Traceable sources" /><IdentityChip icon={ShieldCheck} label="Exposure status" value={result.exposure.status} state="No secrets displayed" /></div>
    <div className="mt-5 rounded-3xl border border-slate-800 bg-[#09111e] p-5 sm:p-6"><div className="text-sm font-black text-white">Evidence supporting identity correlation</div><div className="mt-5 space-y-3">{result.evidence.map(item => <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><div className="text-[10px] font-black text-cyan-300">{item.source}</div><div className="mt-1 text-xs font-black text-white">{item.title}</div><div className="mt-2 text-[10px] text-slate-600">Observed {fmt(item.observedAt)} • {item.category}</div></div><div className="flex items-center gap-3"><span className="text-xs font-black text-emerald-400">{item.confidence}%</span><a href={item.url} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-500 hover:text-cyan-300"><ExternalLink className="w-4 h-4" /></a></div></div>)}</div></div>
  </div>
);

const EvidenceView = ({ result }: { result: SearchResult }) => (
  <div><div><div className="text-[10px] uppercase tracking-[0.2em] font-black text-cyan-400">Evidence Locker</div><h1 className="mt-2 text-3xl font-black text-white">Source-linked evidence</h1><p className="mt-2 text-sm text-slate-500">Every finding stays tied to its source URL, discovery date, category and confidence.</p></div><div className="mt-6 rounded-3xl border border-slate-800 bg-[#09111e] overflow-hidden"><div className="hidden md:grid grid-cols-[1.2fr_.8fr_.5fr_.5fr_48px] gap-4 px-5 py-3 border-b border-slate-800 text-[8px] uppercase tracking-[0.16em] font-black text-slate-600"><span>Finding</span><span>Source</span><span>Observed</span><span>Confidence</span><span /></div><div className="divide-y divide-slate-800">{result.evidence.map(item => <div key={item.id} className="grid md:grid-cols-[1.2fr_.8fr_.5fr_.5fr_48px] gap-3 md:gap-4 px-5 py-4 items-center"><div><div className="text-xs font-black text-white">{item.title}</div><div className="mt-1 text-[9px] text-slate-600 uppercase">{item.category}</div></div><div className="text-[10px] font-bold text-cyan-300">{item.source}</div><div className="text-[10px] text-slate-500">{fmt(item.observedAt)}</div><div className="text-xs font-black text-emerald-400">{item.confidence}%</div><a href={item.url} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-500 hover:text-cyan-300"><ExternalLink className="w-4 h-4" /></a></div>)}</div></div></div>
);

const TimelineView = ({ result }: { result: SearchResult }) => (
  <div><div><div className="text-[10px] uppercase tracking-[0.2em] font-black text-cyan-400">Digital Timeline</div><h1 className="mt-2 text-3xl font-black text-white">Observed public signals over time</h1><p className="mt-2 text-sm text-slate-500">Chronology shows when public signals were reported or checked, not a person’s private movement or real-time activity.</p></div><div className="mt-7 max-w-4xl rounded-3xl border border-slate-800 bg-[#09111e] p-6"><div className="space-y-1">{result.timeline.map((item, index) => <div key={`${item.date}-${index}`} className="grid grid-cols-[20px_1fr] gap-4"><div className="flex flex-col items-center"><span className="mt-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-cyan-500/10" />{index < result.timeline.length - 1 && <span className="w-px flex-1 bg-slate-800 min-h-20" />}</div><div className="pb-8"><div className="text-[9px] font-black text-cyan-400">{fmt(item.date)}</div><div className="mt-1 text-sm font-black text-white">{item.label}</div><p className="mt-2 text-xs leading-relaxed text-slate-500">{item.detail}</p></div></div>)}</div></div></div>
);

const MiniGraph = ({ result, onNavigate }: { result: SearchResult; onNavigate: (view: View) => void }) => (
  <div className="rounded-3xl border border-slate-800 bg-[#09111e] p-5 sm:p-6 overflow-hidden">
    <div className="flex items-center justify-between"><div><div className="text-[9px] uppercase tracking-[0.18em] font-black text-slate-600">Relationship graph</div><div className="mt-1 text-lg font-black text-white">Evidence-backed connections</div></div><button onClick={() => onNavigate('graph')} className="text-[10px] font-black text-cyan-400">Expand graph</button></div>
    <div className="mt-5 relative h-64 rounded-2xl border border-slate-800 bg-[#050a13] overflow-hidden"><div className="absolute inset-0 opacity-30 bg-[radial-gradient(#1e3a5f_1px,transparent_1px)] [background-size:18px_18px]" /><svg viewBox="0 0 600 260" className="absolute inset-0 w-full h-full"><line x1="300" y1="130" x2="100" y2="65" stroke="rgba(34,211,238,.4)"/><line x1="300" y1="130" x2="500" y2="65" stroke="rgba(59,130,246,.4)"/><line x1="300" y1="130" x2="120" y2="215" stroke="rgba(99,102,241,.35)"/><line x1="300" y1="130" x2="485" y2="215" stroke="rgba(16,185,129,.35)"/></svg><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-cyan-500/35 bg-cyan-500/10 flex flex-col items-center justify-center"><Fingerprint className="w-7 h-7 text-cyan-300" /><span className="mt-1 text-[8px] font-black text-white">SUBJECT</span></div>{[[Globe2,'WEB','left-[10%] top-[13%]'],[UserRound,'PROFILE','right-[10%] top-[13%]'],[Building2,'ORG','left-[12%] bottom-[12%]'],[ShieldCheck,'RISK','right-[12%] bottom-[12%]']].map(([I,label,pos]) => { const IconEl=I as Icon; return <div key={label as string} className={`absolute ${pos as string} w-20 h-16 rounded-2xl border border-slate-700 bg-[#09111e] flex flex-col items-center justify-center`}><IconEl className="w-4 h-4 text-cyan-300" /><span className="mt-1 text-[7px] font-black text-slate-400">{label as string}</span></div>; })}</div>
    <div className="mt-3 text-[9px] text-slate-600">Current graph preview uses {result.sourceCount} source-linked signals. Graph edges should only be promoted after evidence review.</div>
  </div>
);

const GraphView = ({ result }: { result: SearchResult }) => (
  <div><div><div className="text-[10px] uppercase tracking-[0.2em] font-black text-cyan-400">Relationship Intelligence</div><h1 className="mt-2 text-3xl font-black text-white">Public relationship graph</h1><p className="mt-2 text-sm text-slate-500">Visualize how the searched identifier connects to public profiles, domains, organizations and evidence records.</p></div><div className="mt-6 rounded-3xl border border-slate-800 bg-[#09111e] p-5"><div className="relative h-[560px] rounded-2xl border border-slate-800 bg-[#050a13] overflow-hidden"><div className="absolute inset-0 opacity-35 bg-[radial-gradient(#1e3a5f_1px,transparent_1px)] [background-size:22px_22px]"/><svg viewBox="0 0 1000 560" className="absolute inset-0 w-full h-full">{result.evidence.slice(0,6).map((_,i) => { const points=[[160,100],[840,105],[150,440],[850,435],[300,500],[700,500]]; const [x,y]=points[i]||[500,100]; return <line key={i} x1="500" y1="280" x2={x} y2={y} stroke="rgba(34,211,238,.35)" />; })}</svg><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-cyan-500/40 bg-cyan-500/10 flex flex-col items-center justify-center text-center p-3"><Fingerprint className="w-8 h-8 text-cyan-300"/><span className="mt-2 text-[8px] font-black text-white break-all line-clamp-2">{result.query}</span></div>{result.evidence.slice(0,6).map((item,i) => { const pos=['left-[8%] top-[10%]','right-[8%] top-[10%]','left-[7%] bottom-[12%]','right-[7%] bottom-[12%]','left-[25%] bottom-[5%]','right-[25%] bottom-[5%]'][i]; return <div key={item.id} className={`absolute ${pos} w-28 sm:w-36 rounded-xl border border-slate-700 bg-[#0a1220] p-3`}><div className="text-[8px] font-black text-cyan-300 truncate">{item.source}</div><div className="mt-1 text-[8px] text-slate-500 line-clamp-2">{item.title}</div><div className="mt-2 text-[8px] font-black text-emerald-400">{item.confidence}%</div></div>})}</div><div className="mt-4 flex items-center gap-2 text-[10px] text-slate-600"><LockKeyhole className="w-3.5 h-3.5" />Graph represents evidence relationships, not certainty of personal identity.</div></div></div>
);
