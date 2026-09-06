import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AtSign,
  BadgeCheck,
  Building2,
  CalendarClock,
  Camera,
  Code2,
  ExternalLink,
  FileSearch,
  FileText,
  Fingerprint,
  Globe2,
  Link2,
  Loader2,
  MessageCircle,
  MessageSquare,
  Music2,
  Network,
  PlayCircle,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { inferSearchType, type EvidenceItem, type SearchResult } from '../lib/intelligence';

type Selection =
  | { kind: 'subject'; result: SearchResult }
  | { kind: 'evidence'; result: SearchResult; item: EvidenceItem };

type PlatformGroup = {
  name: string;
  count: number;
  items: EvidenceItem[];
};

const SOCIAL_PLATFORMS = new Set([
  'Facebook', 'Instagram', 'LinkedIn', 'X / Twitter', 'GitHub', 'Reddit',
  'TikTok', 'YouTube', 'Threads', 'Pinterest', 'Medium', 'DEV Community',
]);

const confidenceLabel = (value: number) => {
  if (value >= 85) return 'Strong signal';
  if (value >= 70) return 'Possible match';
  return 'Review required';
};

const sourceHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Public source';
  }
};

const platformFor = (item: EvidenceItem) => {
  const hay = `${item.source} ${item.url}`.toLowerCase();
  if (hay.includes('facebook.com') || hay.includes('facebook')) return 'Facebook';
  if (hay.includes('instagram.com') || hay.includes('instagram')) return 'Instagram';
  if (hay.includes('linkedin.com') || hay.includes('linkedin')) return 'LinkedIn';
  if (hay.includes('twitter.com') || hay.includes('x.com') || item.source.toLowerCase() === 'x') return 'X / Twitter';
  if (hay.includes('github.com') || hay.includes('github')) return 'GitHub';
  if (hay.includes('reddit.com') || hay.includes('reddit')) return 'Reddit';
  if (hay.includes('tiktok.com') || hay.includes('tiktok')) return 'TikTok';
  if (hay.includes('youtube.com') || hay.includes('youtu.be') || hay.includes('youtube')) return 'YouTube';
  if (hay.includes('threads.net') || hay.includes('threads')) return 'Threads';
  if (hay.includes('pinterest.com') || hay.includes('pinterest')) return 'Pinterest';
  if (hay.includes('medium.com') || hay.includes('medium')) return 'Medium';
  if (hay.includes('dev.to') || hay.includes('dev community')) return 'DEV Community';
  if (item.category === 'business') return 'Business / Organization';
  if (item.category === 'domain') return 'Domains / Websites';
  if (item.category === 'exposure') return 'Exposure Intelligence';
  if (/\.pdf(?:$|\?)/i.test(item.url) || /document|pdf|report|notice|registry/i.test(`${item.source} ${item.title}`)) return 'Public Documents';
  return 'Indexed Web';
};

const relationLabel = (item: EvidenceItem) => {
  const platform = platformFor(item);
  if (SOCIAL_PLATFORMS.has(platform)) return `Public ${platform} footprint connected to the searched identifier`;
  if (item.category === 'domain') return 'Public domain or website signal connected to the searched identifier';
  if (item.category === 'business') return 'Public organization or business association signal';
  if (item.category === 'exposure') return 'Defensive public exposure indicator';
  return 'Indexed public-web occurrence connected to the searched identifier';
};

const platformIcon = (platform: string) => {
  if (platform === 'Instagram') return Camera;
  if (platform === 'GitHub' || platform === 'DEV Community') return Code2;
  if (platform === 'Reddit') return MessageSquare;
  if (platform === 'TikTok') return Music2;
  if (platform === 'YouTube') return PlayCircle;
  if (platform === 'X / Twitter' || platform === 'Threads') return MessageCircle;
  if (platform === 'Business / Organization') return Building2;
  if (platform === 'Public Documents') return FileText;
  if (platform === 'Domains / Websites') return Globe2;
  if (platform === 'Exposure Intelligence') return ShieldCheck;
  if (platform === 'Facebook' || platform === 'LinkedIn' || platform === 'Pinterest' || platform === 'Medium') return Users;
  return Globe2;
};

const dedupeEvidence = (items: EvidenceItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = (item.url || `${item.source}-${item.title}`).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const groupEvidence = (items: EvidenceItem[]): PlatformGroup[] => {
  const groups = new Map<string, EvidenceItem[]>();
  dedupeEvidence(items).forEach((item) => {
    const platform = platformFor(item);
    const current = groups.get(platform) || [];
    current.push(item);
    groups.set(platform, current);
  });
  return Array.from(groups.entries())
    .map(([name, entries]) => ({ name, count: entries.length, items: entries }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

const GraphDetailEnhancer: React.FC = () => {
  const [graphTarget, setGraphTarget] = useState<HTMLElement | null>(null);
  const [graphResult, setGraphResult] = useState<SearchResult | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selection, setSelection] = useState<Selection | null>(null);
  const cache = useRef(new Map<string, SearchResult>());
  const lastQuery = useRef('');

  useEffect(() => {
    let currentTarget: HTMLElement | null = null;

    const findGraphCanvas = () => Array.from(document.querySelectorAll<HTMLElement>('div')).find((el) => {
      const cls = typeof el.className === 'string' ? el.className : '';
      return cls.includes('h-[560px]') && cls.includes('bg-[#050a13]') && !!el.querySelector('svg');
    }) || null;

    const readQuery = (canvas: HTMLElement) => {
      const center = Array.from(canvas.children).find((child) => {
        if (!(child instanceof HTMLElement)) return false;
        const cls = child.className || '';
        return cls.includes('w-32') && cls.includes('h-32') && cls.includes('rounded-full');
      }) as HTMLElement | undefined;
      return center?.querySelector('span')?.textContent?.trim() || '';
    };

    const load = async (query: string) => {
      if (!query) return;
      const cached = cache.current.get(query);
      if (cached) {
        setGraphResult(cached);
        return;
      }
      setGraphLoading(true);
      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, type: inferSearchType(query) }),
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (payload?.result) {
          const result = payload.result as SearchResult;
          cache.current.set(query, result);
          setGraphResult(result);
        }
      } finally {
        setGraphLoading(false);
      }
    };

    const sync = () => {
      const canvas = findGraphCanvas();
      if (canvas !== currentTarget) {
        currentTarget = canvas;
        setGraphTarget(canvas);
      }
      if (!canvas) return;
      const query = readQuery(canvas);
      if (query && query !== lastQuery.current) {
        lastQuery.current = query;
        setSelectedPlatform('All');
        setSelection(null);
        setGraphResult(null);
        void load(query);
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const groups = useMemo(() => groupEvidence(graphResult?.evidence || []), [graphResult]);
  const uniqueEvidence = useMemo(() => dedupeEvidence(graphResult?.evidence || []), [graphResult]);
  const socialCount = useMemo(() => uniqueEvidence.filter((item) => SOCIAL_PLATFORMS.has(platformFor(item))).length, [uniqueEvidence]);
  const visibleItems = useMemo(() => selectedPlatform === 'All'
    ? uniqueEvidence
    : uniqueEvidence.filter((item) => platformFor(item) === selectedPlatform), [selectedPlatform, uniqueEvidence]);

  const close = () => setSelection(null);

  const graphPortal = graphTarget ? createPortal(
    <div className="absolute inset-0 z-20 bg-[#050a13] overflow-hidden rounded-2xl">
      <div className="h-full flex flex-col">
        <div className="px-4 sm:px-5 py-3 border-b border-slate-800 bg-[#07111d] flex flex-wrap items-center gap-3">
          <div>
            <div className="text-[8px] uppercase tracking-[0.18em] font-black text-cyan-400">Public Footprint Graph</div>
            <div className="mt-0.5 text-xs font-black text-white">All discovered public footprints, grouped by platform</div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[8px] font-black">
            <span className="px-2.5 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">{uniqueEvidence.length} TOTAL</span>
            <span className="px-2.5 py-1.5 rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-300">{socialCount} SOCIAL</span>
            <span className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-400">{groups.length} PLATFORMS</span>
          </div>
        </div>

        {graphLoading && !graphResult ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
            <div className="mt-4 text-sm font-black text-white">Mapping public footprints…</div>
            <div className="mt-2 max-w-md text-[10px] leading-relaxed text-slate-500">Checking the source-linked result set and grouping social, web, business, domain and document footprints.</div>
          </div>
        ) : graphResult ? (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[.9fr_1.1fr]">
            <div className="relative min-h-[250px] border-b lg:border-b-0 lg:border-r border-slate-800 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(6,182,212,.08),transparent_58%)]">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#1e3a5f_1px,transparent_1px)] [background-size:20px_20px]" />
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                {groups.map((group, index) => {
                  const angle = ((index / Math.max(groups.length, 1)) * Math.PI * 2) - Math.PI / 2;
                  const x = 50 + Math.cos(angle) * 38;
                  const y = 50 + Math.sin(angle) * 36;
                  return <line key={group.name} x1="50" y1="50" x2={x} y2={y} stroke="rgba(34,211,238,.34)" strokeWidth=".42" strokeDasharray="1.4 1.2" />;
                })}
              </svg>

              <button onClick={() => setSelection({ kind: 'subject', result: graphResult })} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-cyan-500/45 bg-cyan-500/10 shadow-[0_0_35px_rgba(34,211,238,.12)] flex flex-col items-center justify-center text-center p-2 hover:border-cyan-300 transition-all">
                <Fingerprint className="w-7 h-7 text-cyan-300" />
                <span className="mt-1 text-[7px] leading-tight font-black text-white break-all line-clamp-2">{graphResult.query}</span>
              </button>

              {groups.map((group, index) => {
                const angle = ((index / Math.max(groups.length, 1)) * Math.PI * 2) - Math.PI / 2;
                const x = 50 + Math.cos(angle) * 38;
                const y = 50 + Math.sin(angle) * 36;
                const Icon = platformIcon(group.name);
                const active = selectedPlatform === group.name;
                return (
                  <button
                    key={group.name}
                    onClick={() => setSelectedPlatform(group.name)}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-[88px] sm:w-[102px] rounded-xl border p-2 text-left shadow-lg transition-all ${active ? 'border-cyan-400 bg-cyan-500/15 shadow-cyan-950/50' : 'border-slate-700 bg-[#0a1422] hover:border-cyan-500/40'}`}
                  >
                    <div className="flex items-center gap-1.5"><Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-300' : 'text-slate-400'}`} /><span className="text-[7px] font-black text-white truncate">{group.name}</span></div>
                    <div className="mt-1 text-[8px] font-black text-emerald-400">{group.count} footprint{group.count === 1 ? '' : 's'}</div>
                  </button>
                );
              })}

              {!groups.some((group) => SOCIAL_PLATFORMS.has(group.name)) && (
                <div className="absolute left-3 bottom-3 right-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2 text-[8px] leading-relaxed text-slate-500">No public social-platform footprint was returned in the current indexed result set. This is not proof that no public social profile exists.</div>
              )}
            </div>

            <div className="min-h-0 flex flex-col bg-[#07101c]">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
                <button onClick={() => setSelectedPlatform('All')} className={`shrink-0 px-2.5 py-1.5 rounded-lg border text-[8px] font-black ${selectedPlatform === 'All' ? 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 bg-slate-950 text-slate-500'}`}>ALL {uniqueEvidence.length}</button>
                {groups.map((group) => <button key={group.name} onClick={() => setSelectedPlatform(group.name)} className={`shrink-0 px-2.5 py-1.5 rounded-lg border text-[8px] font-black ${selectedPlatform === group.name ? 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 bg-slate-950 text-slate-500'}`}>{group.name.toUpperCase()} {group.count}</button>)}
              </div>

              <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-3">
                <div><div className="text-[8px] uppercase tracking-[0.16em] font-black text-slate-600">All Public Footprints</div><div className="mt-0.5 text-[10px] font-black text-white">{selectedPlatform === 'All' ? 'Every unique source-linked occurrence' : selectedPlatform}</div></div>
                <div className="text-[9px] font-black text-cyan-300">{visibleItems.length} found</div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                {visibleItems.map((item) => {
                  const platform = platformFor(item);
                  const Icon = platformIcon(platform);
                  return (
                    <button key={item.id} onClick={() => setSelection({ kind: 'evidence', result: graphResult, item })} className="w-full text-left rounded-xl border border-slate-800 bg-slate-950/55 hover:border-cyan-500/30 hover:bg-cyan-500/[0.03] p-3 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 shrink-0 rounded-lg border border-cyan-500/15 bg-cyan-500/[0.07] flex items-center justify-center"><Icon className="w-4 h-4 text-cyan-300" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><span className="text-[8px] font-black text-cyan-300">{platform}</span><span className={`px-1.5 py-0.5 rounded border text-[7px] font-black ${item.confidence >= 85 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : item.confidence >= 70 ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-slate-700 text-slate-500'}`}>{confidenceLabel(item.confidence)}</span></div>
                          <div className="mt-1 text-[10px] font-black text-white line-clamp-1">{item.title}</div>
                          <div className="mt-1 text-[8px] text-slate-600 truncate">{sourceHost(item.url)} • {item.source}</div>
                        </div>
                        <div className="text-[9px] font-black text-emerald-400">{item.confidence}%</div>
                      </div>
                    </button>
                  );
                })}
                {visibleItems.length === 0 && <div className="py-10 text-center text-[10px] text-slate-600">No public footprint in this category was returned by the current scan.</div>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[10px] text-slate-600">No source-linked footprint data available.</div>
        )}
      </div>
    </div>,
    graphTarget,
  ) : null;

  const result = selection?.result;
  const selectedItem = selection?.kind === 'evidence' ? selection.item : undefined;
  const related = selectedItem && result
    ? dedupeEvidence(result.evidence).filter((item) => item.id !== selectedItem.id && (platformFor(item) === platformFor(selectedItem) || item.category === selectedItem.category)).slice(0, 5)
    : result ? dedupeEvidence(result.evidence).slice(0, 6) : [];

  return (
    <>
      {graphPortal}
      {selection && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[1px]" onClick={close} />
          <aside className="fixed right-0 top-0 bottom-0 z-[80] w-full sm:w-[460px] border-l border-cyan-500/20 bg-[#07101c]/98 shadow-[-24px_0_70px_rgba(0,0,0,.45)] backdrop-blur-xl overflow-y-auto">
            <div className="sticky top-0 z-10 border-b border-slate-800 bg-[#07101c]/95 backdrop-blur-xl px-5 py-4 flex items-start justify-between gap-4">
              <div><div className="text-[9px] uppercase tracking-[0.2em] font-black text-cyan-400">Graph Intelligence Detail</div><div className="mt-1 text-lg font-black text-white">{selection.kind === 'subject' ? 'Target identifier' : `${platformFor(selection.item)} footprint`}</div></div>
              <button onClick={close} className="w-9 h-9 shrink-0 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-500 hover:text-white hover:border-cyan-500/30" aria-label="Close graph detail"><X className="w-4 h-4" /></button>
            </div>

            {selection.kind === 'subject' ? (
              <div className="p-5 space-y-4">
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-5">
                  <div className="w-12 h-12 rounded-xl border border-cyan-500/25 bg-cyan-500/10 flex items-center justify-center"><Fingerprint className="w-6 h-6 text-cyan-300" /></div>
                  <div className="mt-4 text-[9px] uppercase tracking-[0.16em] font-black text-slate-600">Searched identifier</div>
                  <div className="mt-1 text-sm font-black text-white break-all">{selection.result.query}</div>
                  <div className="mt-2 text-[10px] uppercase text-cyan-400">Type: {selection.result.type}</div>
                </div>
                <div className="grid grid-cols-3 gap-2"><Metric label="Footprints" value={String(dedupeEvidence(selection.result.evidence).length)} /><Metric label="Visibility" value={`${selection.result.visibilityScore}%`} /><Metric label="Confidence" value={`${selection.result.confidence}%`} /></div>
                <DetailBlock icon={UserRound} label="Possible identity" value={selection.result.possibleIdentity} />
                <DetailBlock icon={Network} label="Graph interpretation" value="Platform nodes summarize public source footprints. Individual records remain confidence-scored leads and require analyst verification before identity attribution." />
                <DetailBlock icon={ShieldCheck} label="Exposure summary" value={selection.result.exposure.summary} />
                <RelatedEvidence items={related} onSelect={(item) => setSelection({ kind: 'evidence', result: selection.result, item })} />
              </div>
            ) : selectedItem && result ? (
              <div className="p-5 space-y-4">
                <div className="rounded-2xl border border-cyan-500/20 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,.09),transparent_45%),#091421] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="w-11 h-11 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center">{React.createElement(platformIcon(platformFor(selectedItem)), { className: 'w-5 h-5 text-cyan-300' })}</div>
                    <span className={`px-2.5 py-1.5 rounded-lg border text-[8px] uppercase tracking-[0.13em] font-black ${selectedItem.confidence >= 85 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : selectedItem.confidence >= 70 ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>{confidenceLabel(selectedItem.confidence)}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2"><span className="text-[10px] font-black text-cyan-300">{platformFor(selectedItem)}</span><span className="text-[8px] text-slate-600">• {selectedItem.source}</span></div>
                  <div className="mt-2 text-base font-black text-white leading-snug">{selectedItem.title}</div>
                  <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{selectedItem.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-2"><Metric label="Confidence" value={`${selectedItem.confidence}%`} /><Metric label="Category" value={selectedItem.category} /></div>
                <DetailBlock icon={Link2} label="Relationship to target" value={relationLabel(selectedItem)} />
                <DetailBlock icon={Globe2} label="Source host" value={sourceHost(selectedItem.url)} />
                <DetailBlock icon={CalendarClock} label="Observed / checked" value={new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(selectedItem.observedAt))} />
                <DetailBlock icon={BadgeCheck} label="Match interpretation" value={selectedItem.confidence >= 85 ? 'High-confidence public signal. Review the original public source before treating it as verified identity evidence.' : selectedItem.confidence >= 70 ? 'Moderate-confidence public correlation. Corroborate with another independent source before attribution.' : 'Weak or contextual public signal. Treat as a research lead only.'} />
                <a href={selectedItem.url} target="_blank" rel="noreferrer" className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black inline-flex items-center justify-center gap-2 hover:brightness-110">Open public source <ExternalLink className="w-4 h-4" /></a>
                <RelatedEvidence items={related} onSelect={(item) => setSelection({ kind: 'evidence', result, item })} />
                <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4 text-[9px] leading-relaxed text-slate-500">IntelSight displays public or authorized source evidence only. A social-platform footprint does not establish ownership of a private account, current online status or private location.</div>
              </div>
            ) : null}
          </aside>
        </>
      )}
    </>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-slate-800 bg-[#091421] p-3"><div className="text-[8px] uppercase tracking-[0.14em] font-black text-slate-600">{label}</div><div className="mt-1 text-sm font-black text-white break-words">{value}</div></div>
);

const DetailBlock = ({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#091421] p-4 flex gap-3"><div className="w-9 h-9 shrink-0 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center"><Icon className="w-4 h-4 text-cyan-300" /></div><div className="min-w-0"><div className="text-[8px] uppercase tracking-[0.14em] font-black text-slate-600">{label}</div><div className="mt-1.5 text-[10px] leading-relaxed text-slate-300 break-words">{value}</div></div></div>
);

const RelatedEvidence = ({ items, onSelect }: { items: EvidenceItem[]; onSelect: (item: EvidenceItem) => void }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#091421] overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-800"><div className="text-[8px] uppercase tracking-[0.14em] font-black text-slate-600">Related public footprints</div></div>
    <div className="divide-y divide-slate-800">{items.length ? items.map((item) => <button key={item.id} onClick={() => onSelect(item)} className="w-full text-left px-4 py-3 hover:bg-cyan-500/[0.04] transition-colors"><div className="flex items-center gap-2"><AtSign className="w-3 h-3 text-cyan-400" /><span className="text-[9px] font-black text-cyan-300">{platformFor(item)}</span><span className="ml-auto text-[9px] font-black text-emerald-400">{item.confidence}%</span></div><div className="mt-1 text-[10px] font-bold text-white line-clamp-1">{item.title}</div></button>) : <div className="px-4 py-5 text-[9px] text-slate-600">No additional related public footprint in this result set.</div>}</div>
  </div>
);

export default GraphDetailEnhancer;
