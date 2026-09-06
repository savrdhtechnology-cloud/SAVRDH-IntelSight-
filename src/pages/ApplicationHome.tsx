import React from 'react';
import {
  ArrowRight, BadgeCheck, Building2, FileSearch, Fingerprint, FlaskConical,
  Globe2, Layers3, Network, Radar, Search, ShieldCheck, Sparkles, UserRound
} from 'lucide-react';

const ModuleCard = ({
  icon: Icon,
  eyebrow,
  title,
  description,
  features,
  action,
  href,
  accent = 'cyan',
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  features: string[];
  action: string;
  href: string;
  accent?: 'cyan' | 'violet';
}) => {
  const accentStyles = accent === 'violet'
    ? 'border-violet-500/20 bg-violet-500/[.05] text-violet-300'
    : 'border-cyan-500/20 bg-cyan-500/[.05] text-cyan-300';

  return (
    <button
      onClick={() => window.location.assign(href)}
      className="group w-full text-left rounded-3xl border border-slate-800 bg-[#07101c] p-5 sm:p-6 hover:border-cyan-500/30 hover:-translate-y-0.5 transition-all duration-300 shadow-[0_18px_60px_rgba(0,0,0,.18)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${accentStyles}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] text-slate-500 group-hover:text-white transition-colors">Open module</span>
      </div>

      <div className="mt-5 text-[9px] uppercase tracking-[.2em] font-black text-cyan-400">{eyebrow}</div>
      <h2 className="mt-2 text-xl sm:text-2xl font-black text-white">{title}</h2>
      <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-500">{description}</p>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {features.map((feature) => (
          <div key={feature} className="rounded-xl border border-slate-800 bg-[#040a12] px-3 py-2.5 flex items-center gap-2 text-[10px] text-slate-400">
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {feature}
          </div>
        ))}
      </div>

      <div className="mt-6 inline-flex items-center gap-2 text-xs font-black text-cyan-300">
        {action} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
};

export const ApplicationHome: React.FC = () => (
  <div className="min-h-screen bg-[#040a12] text-slate-200">
    <header className="border-b border-slate-800 bg-[#040a12]/95 backdrop-blur-xl">
      <div className="max-w-[1500px] mx-auto h-20 px-4 sm:px-6 flex items-center justify-between gap-4">
        <button onClick={() => window.location.assign('/app')} className="flex items-center gap-3 text-left">
          <span className="relative w-11 h-11 rounded-xl border border-cyan-500/25 bg-cyan-500/10 flex items-center justify-center">
            <FileSearch className="w-5 h-5 text-cyan-300" />
            <Fingerprint className="absolute w-3 h-3 text-white" />
          </span>
          <span>
            <b className="block text-sm text-white">SAVRDH IntelSight™</b>
            <span className="block text-[8px] uppercase tracking-[.2em] text-cyan-400">Application Home</span>
          </span>
        </button>

        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[.04] px-3 py-2 text-[9px] text-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5" /> PUBLIC / AUTHORIZED DATA MODE
        </div>
      </div>
    </header>

    <main className="max-w-[1500px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <section className="rounded-[28px] border border-slate-800 bg-gradient-to-br from-[#07111e] to-[#050b13] p-6 sm:p-8 overflow-hidden relative">
        <div className="absolute -right-28 -top-28 w-80 h-80 rounded-full bg-cyan-500/[.06] blur-3xl" />
        <div className="relative max-w-4xl">
          <div className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[.2em] font-black text-cyan-400"><Sparkles className="w-3.5 h-3.5" /> Intelligence Workspace</div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black text-white">Choose your IntelSight module</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">Lead investigation and Tavily-powered research are now available directly from the application home screen. Open the workspace you need and continue the investigation from there.</p>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[9px] uppercase tracking-[.2em] font-black text-slate-600">Primary modules</div>
            <h2 className="mt-1 text-lg font-black text-white">Investigation & Research</h2>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[9px] text-slate-600"><Layers3 className="w-3.5 h-3.5" /> 2 primary workspaces</div>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ModuleCard
            icon={UserRound}
            eyebrow="Lead Intelligence"
            title="Lead 360"
            description="Open the full 360° public profile workspace for identifier research, public presence, identity signals, evidence, timeline, relationship graph and deep-research workflows."
            features={[
              '360° Public Profile',
              'Public Presence & Social Signals',
              'Evidence, Timeline & Graph',
              'Deep Research / Entity Intelligence',
            ]}
            action="Open Lead 360"
            href="/app/profile"
          />

          <ModuleCard
            icon={FlaskConical}
            eyebrow="Research Tools"
            title="Tavily Lab"
            description="Use the Tavily-powered research toolkit for company intelligence, deep research, Crawl2RAG, website mapping, page extraction, market research and bulk public-data lookup."
            features={[
              'Company Researcher',
              'Deep Research & AI Answer',
              'Crawl / Map / Extract',
              'Bulk Lookup & Research Tools',
            ]}
            action="Open Tavily Lab"
            href="/app/lab"
            accent="violet"
          />
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-800 bg-[#07101c] p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center shrink-0"><Radar className="w-5 h-5 text-cyan-300" /></div>
            <div>
              <div className="text-[9px] uppercase tracking-[.18em] font-black text-cyan-400">Quick access</div>
              <h3 className="mt-1 text-base font-black text-white">Verified Public Intelligence Search</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Run exact email, mobile, username, domain or company searches using the current production search engine. Deep Research remains available inside this console.</p>
            </div>
          </div>
          <button onClick={() => window.location.assign('/app/search')} className="shrink-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-xs font-black text-white inline-flex items-center justify-center gap-2 hover:brightness-110">
            <Search className="w-4 h-4" /> Open Search Console
          </button>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-[#07101c] p-4 flex items-center gap-3"><Network className="w-4 h-4 text-cyan-300" /><div><div className="text-[10px] font-black text-white">Relationship Intelligence</div><div className="mt-1 text-[9px] text-slate-600">Evidence-backed graph connections</div></div></div>
        <div className="rounded-2xl border border-slate-800 bg-[#07101c] p-4 flex items-center gap-3"><Building2 className="w-4 h-4 text-cyan-300" /><div><div className="text-[10px] font-black text-white">Company Intelligence</div><div className="mt-1 text-[9px] text-slate-600">Organizations, domains & registry signals</div></div></div>
        <div className="rounded-2xl border border-slate-800 bg-[#07101c] p-4 flex items-center gap-3"><Globe2 className="w-4 h-4 text-cyan-300" /><div><div className="text-[10px] font-black text-white">Public Web Research</div><div className="mt-1 text-[9px] text-slate-600">Public/indexed sources only</div></div></div>
      </section>
    </main>
  </div>
);
