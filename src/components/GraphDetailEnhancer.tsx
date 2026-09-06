import React, { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  ExternalLink,
  FileSearch,
  Fingerprint,
  Globe2,
  Link2,
  Loader2,
  Network,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { inferSearchType, type EvidenceItem, type SearchResult } from '../lib/intelligence';

type Selection =
  | { kind: 'subject'; result: SearchResult }
  | { kind: 'evidence'; result: SearchResult; item: EvidenceItem };

const confidenceLabel = (value: number) => {
  if (value >= 85) return 'Strong signal';
  if (value >= 70) return 'Possible match';
  return 'Review required';
};

const relationLabel = (item: EvidenceItem) => {
  if (item.category === 'profile') return 'Possible public profile connected to the searched identifier';
  if (item.category === 'domain') return 'Public domain or registry signal connected to the searched identifier';
  if (item.category === 'business') return 'Public organization/business association signal';
  if (item.category === 'exposure') return 'Defensive public exposure indicator';
  return 'Indexed public-web occurrence connected to the searched identifier';
};

const sourceHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Public source';
  }
};

const GraphDetailEnhancer: React.FC = () => {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<string, SearchResult>());
  const selectedNode = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const graphCanvas = () => Array.from(document.querySelectorAll<HTMLElement>('div')).find((el) => {
      const cls = typeof el.className === 'string' ? el.className : '';
      return cls.includes('h-[560px]') && cls.includes('bg-[#050a13]') && !!el.querySelector('svg');
    });

    const enhance = () => {
      const canvas = graphCanvas();
      if (!canvas) return;

      Array.from(canvas.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        const cls = child.className || '';

        if (cls.includes('w-28') && cls.includes('p-3') && cls.includes('absolute')) {
          child.dataset.intelsightGraphEvidence = '1';
          child.setAttribute('role', 'button');
          child.setAttribute('tabindex', '0');
          child.setAttribute('aria-label', `Open details for ${child.textContent || 'graph evidence'}`);
          child.style.cursor = 'pointer';
          child.style.transition = 'border-color .2s ease, box-shadow .2s ease, transform .2s ease';
        }

        if (cls.includes('w-32') && cls.includes('h-32') && cls.includes('rounded-full')) {
          child.dataset.intelsightGraphSubject = '1';
          child.setAttribute('role', 'button');
          child.setAttribute('tabindex', '0');
          child.setAttribute('aria-label', 'Open searched identifier details');
          child.style.cursor = 'pointer';
          child.style.transition = 'box-shadow .2s ease, transform .2s ease';
        }
      });
    };

    const getQuery = (node: HTMLElement) => {
      const canvas = node.closest<HTMLElement>('div[class*="h-[560px]"]') || graphCanvas();
      const subject = canvas?.querySelector<HTMLElement>('[data-intelsight-graph-subject="1"] span');
      return subject?.textContent?.trim() || '';
    };

    const loadResult = async (query: string) => {
      if (!query) throw new Error('No graph subject found');
      const existing = cache.current.get(query);
      if (existing) return existing;

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type: inferSearchType(query) }),
      });
      if (!response.ok) throw new Error('Could not load source details');
      const payload = await response.json();
      if (!payload?.result) throw new Error('No source details returned');
      cache.current.set(query, payload.result as SearchResult);
      return payload.result as SearchResult;
    };

    const markSelected = (node: HTMLElement) => {
      if (selectedNode.current && selectedNode.current !== node) {
        selectedNode.current.style.boxShadow = '';
        selectedNode.current.style.borderColor = '';
        selectedNode.current.style.transform = '';
      }
      selectedNode.current = node;
      node.style.boxShadow = '0 0 0 1px rgba(34,211,238,.55), 0 0 28px rgba(34,211,238,.16)';
      node.style.borderColor = 'rgba(34,211,238,.65)';
      node.style.transform = 'translateY(-2px)';
    };

    const openNode = async (node: HTMLElement, kind: 'subject' | 'evidence') => {
      markSelected(node);
      const query = getQuery(node);
      setLoading(true);
      try {
        const result = await loadResult(query);
        if (kind === 'subject') {
          setSelection({ kind: 'subject', result });
          return;
        }

        const source = node.children.item(0)?.textContent?.trim() || '';
        const title = node.children.item(1)?.textContent?.trim() || '';
        const item = result.evidence.find((candidate) =>
          candidate.source.trim() === source && candidate.title.trim() === title,
        ) || result.evidence.find((candidate) => candidate.source.trim() === source);

        if (item) setSelection({ kind: 'evidence', result, item });
      } finally {
        setLoading(false);
      }
    };

    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const evidence = target?.closest<HTMLElement>('[data-intelsight-graph-evidence="1"]');
      if (evidence) {
        event.preventDefault();
        void openNode(evidence, 'evidence');
        return;
      }
      const subject = target?.closest<HTMLElement>('[data-intelsight-graph-subject="1"]');
      if (subject) {
        event.preventDefault();
        void openNode(subject, 'subject');
      }
    };

    const keyHandler = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target as HTMLElement | null;
      const evidence = target?.closest<HTMLElement>('[data-intelsight-graph-evidence="1"]');
      const subject = target?.closest<HTMLElement>('[data-intelsight-graph-subject="1"]');
      if (evidence) {
        event.preventDefault();
        void openNode(evidence, 'evidence');
      } else if (subject) {
        event.preventDefault();
        void openNode(subject, 'subject');
      }
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', clickHandler, true);
    document.addEventListener('keydown', keyHandler, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', clickHandler, true);
      document.removeEventListener('keydown', keyHandler, true);
    };
  }, []);

  const close = () => {
    if (selectedNode.current) {
      selectedNode.current.style.boxShadow = '';
      selectedNode.current.style.borderColor = '';
      selectedNode.current.style.transform = '';
      selectedNode.current = null;
    }
    setSelection(null);
  };

  if (!selection && !loading) return null;

  const result = selection?.result;
  const selectedItem = selection?.kind === 'evidence' ? selection.item : undefined;
  const related = selectedItem && result
    ? result.evidence.filter((item) => item.id !== selectedItem.id && (item.category === selectedItem.category || item.source === selectedItem.source)).slice(0, 4)
    : result?.evidence.slice(0, 5) || [];

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[1px]" onClick={close} />
      <aside className="fixed right-0 top-0 bottom-0 z-[80] w-full sm:w-[440px] border-l border-cyan-500/20 bg-[#07101c]/98 shadow-[-24px_0_70px_rgba(0,0,0,.45)] backdrop-blur-xl overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-[#07101c]/95 backdrop-blur-xl px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] font-black text-cyan-400">Graph Intelligence Detail</div>
            <div className="mt-1 text-lg font-black text-white">{selection?.kind === 'subject' ? 'Target identifier' : 'Connected public evidence'}</div>
          </div>
          <button onClick={close} className="w-9 h-9 shrink-0 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-500 hover:text-white hover:border-cyan-500/30" aria-label="Close graph detail">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading && !selection ? (
          <div className="min-h-[420px] flex flex-col items-center justify-center text-center px-8">
            <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
            <div className="mt-4 text-sm font-black text-white">Extracting source-linked details…</div>
            <div className="mt-2 text-[10px] leading-relaxed text-slate-500">Loading the same public evidence set used to build this relationship graph.</div>
          </div>
        ) : selection?.kind === 'subject' ? (
          <div className="p-5 space-y-4">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-5">
              <div className="w-12 h-12 rounded-xl border border-cyan-500/25 bg-cyan-500/10 flex items-center justify-center"><Fingerprint className="w-6 h-6 text-cyan-300" /></div>
              <div className="mt-4 text-[9px] uppercase tracking-[0.16em] font-black text-slate-600">Searched identifier</div>
              <div className="mt-1 text-sm font-black text-white break-all">{selection.result.query}</div>
              <div className="mt-2 text-[10px] uppercase text-cyan-400">Type: {selection.result.type}</div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Metric label="Sources" value={String(selection.result.sourceCount)} />
              <Metric label="Visibility" value={`${selection.result.visibilityScore}%`} />
              <Metric label="Confidence" value={`${selection.result.confidence}%`} />
            </div>

            <DetailBlock icon={UserRound} label="Possible identity" value={selection.result.possibleIdentity} />
            <DetailBlock icon={ShieldCheck} label="Exposure summary" value={`${selection.result.exposure.status.toUpperCase()} — ${selection.result.exposure.summary}`} />
            <DetailBlock icon={Network} label="Relationship interpretation" value="These graph edges represent public evidence relationships. They are investigative signals, not proof that every node belongs to the same person or organization." />
            <DetailBlock icon={FileSearch} label="Analysis summary" value={selection.result.summary} />

            <RelatedEvidence items={related} onSelect={(item) => setSelection({ kind: 'evidence', result: selection.result, item })} />
          </div>
        ) : selectedItem && result ? (
          <div className="p-5 space-y-4">
            <div className="rounded-2xl border border-cyan-500/20 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,.09),transparent_45%),#091421] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="w-11 h-11 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center">
                  {selectedItem.category === 'profile' ? <UserRound className="w-5 h-5 text-cyan-300" /> : selectedItem.category === 'business' ? <Building2 className="w-5 h-5 text-cyan-300" /> : <Globe2 className="w-5 h-5 text-cyan-300" />}
                </div>
                <span className={`px-2.5 py-1.5 rounded-lg border text-[8px] uppercase tracking-[0.13em] font-black ${selectedItem.confidence >= 85 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : selectedItem.confidence >= 70 ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
                  {confidenceLabel(selectedItem.confidence)}
                </span>
              </div>
              <div className="mt-4 text-[10px] font-black text-cyan-300">{selectedItem.source}</div>
              <div className="mt-2 text-base font-black text-white leading-snug">{selectedItem.title}</div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{selectedItem.summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Metric label="Confidence" value={`${selectedItem.confidence}%`} />
              <Metric label="Category" value={selectedItem.category} />
            </div>

            <DetailBlock icon={Link2} label="Relationship to target" value={relationLabel(selectedItem)} />
            <DetailBlock icon={Globe2} label="Source host" value={sourceHost(selectedItem.url)} />
            <DetailBlock icon={CalendarClock} label="Observed / checked" value={new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(selectedItem.observedAt))} />
            <DetailBlock icon={BadgeCheck} label="Why this node is shown" value={selectedItem.confidence >= 85 ? 'High-confidence public signal. The evidence contains a strong identifier or contextual match and should still be verified against the original source.' : selectedItem.confidence >= 70 ? 'Moderate-confidence correlation. Review the original source and corroborate with another independent signal before treating it as the same identity.' : 'Weak or contextual signal. Keep this as a research lead only until stronger corroboration is available.'} />

            <a href={selectedItem.url} target="_blank" rel="noreferrer" className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black inline-flex items-center justify-center gap-2 hover:brightness-110">
              Open public source <ExternalLink className="w-4 h-4" />
            </a>

            <RelatedEvidence items={related} onSelect={(item) => setSelection({ kind: 'evidence', result, item })} />

            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4 text-[9px] leading-relaxed text-slate-500">
              IntelSight displays public or authorized source evidence only. A graph connection is an investigative lead and does not establish private account ownership, private activity or private location.
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-slate-800 bg-[#091421] p-3">
    <div className="text-[8px] uppercase tracking-[0.14em] font-black text-slate-600">{label}</div>
    <div className="mt-1 text-sm font-black text-white break-words">{value}</div>
  </div>
);

const DetailBlock = ({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#091421] p-4 flex gap-3">
    <div className="w-9 h-9 shrink-0 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center"><Icon className="w-4 h-4 text-cyan-300" /></div>
    <div className="min-w-0"><div className="text-[8px] uppercase tracking-[0.14em] font-black text-slate-600">{label}</div><div className="mt-1.5 text-[10px] leading-relaxed text-slate-300 break-words">{value}</div></div>
  </div>
);

const RelatedEvidence = ({ items, onSelect }: { items: EvidenceItem[]; onSelect: (item: EvidenceItem) => void }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#091421] overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-800"><div className="text-[8px] uppercase tracking-[0.16em] font-black text-slate-600">Related supporting evidence</div></div>
    {items.length ? <div className="divide-y divide-slate-800">{items.map((item) => (
      <button key={item.id} onClick={() => onSelect(item)} className="w-full px-4 py-3 text-left hover:bg-cyan-500/[0.04] transition-colors">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[9px] font-black text-cyan-300 truncate">{item.source}</div><div className="mt-1 text-[10px] font-bold text-slate-300 line-clamp-2">{item.title}</div></div><span className="shrink-0 text-[9px] font-black text-emerald-400">{item.confidence}%</span></div>
      </button>
    ))}</div> : <div className="p-4 text-[10px] text-slate-600">No additional related evidence in the current scan.</div>}
  </div>
);

export default GraphDetailEnhancer;
