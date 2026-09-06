import React from 'react';
import { LiveIntelDashboard } from './LiveIntelDashboard';
import { TavilyLab } from './TavilyLab';

export const UnifiedIntelHome: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#030811] text-slate-200">
      <div className="sticky top-0 z-[70] border-b border-slate-800 bg-[#030811]/95 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <div className="text-[9px] uppercase tracking-[.2em] font-black text-cyan-400">SAVRDH IntelSight™</div>
            <div className="text-sm font-black text-white">Unified Application Home</div>
          </div>
          <button onClick={() => document.getElementById('lead-360-home')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2.5 text-[10px] font-black text-cyan-300">Lead 360</button>
          <button onClick={() => document.getElementById('deep-scan-home')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-2.5 text-[10px] font-black text-violet-300">Deep Scan / Tavily Lab</button>
        </div>
      </div>

      <section id="lead-360-home" className="scroll-mt-20">
        <div className="border-b border-cyan-500/10 bg-cyan-500/[.025] px-4 sm:px-6 py-4">
          <div className="max-w-[1800px] mx-auto">
            <div className="text-[9px] uppercase tracking-[.2em] font-black text-cyan-400">Module 01</div>
            <h1 className="mt-1 text-xl sm:text-2xl font-black text-white">Lead 360 Intelligence</h1>
            <p className="mt-1 text-xs text-slate-500">Verified public search, evidence, public presence, identity signals, timeline and relationship intelligence.</p>
          </div>
        </div>
        <LiveIntelDashboard />
      </section>

      <section id="deep-scan-home" className="scroll-mt-20 border-t border-violet-500/15">
        <div className="bg-violet-500/[.025] px-4 sm:px-6 py-5">
          <div className="max-w-[1800px] mx-auto">
            <div className="text-[9px] uppercase tracking-[.2em] font-black text-violet-400">Module 02</div>
            <h2 className="mt-1 text-xl sm:text-2xl font-black text-white">Deep Scan & Tavily Intelligence Lab</h2>
            <p className="mt-1 text-xs text-slate-500">Deep Research, Company Research, AI Answer, Crawl2RAG, Site Map, Evidence Extract, Bulk Lookup, Market Research and Meeting Prep.</p>
          </div>
        </div>
        <TavilyLab />
      </section>
    </div>
  );
};
