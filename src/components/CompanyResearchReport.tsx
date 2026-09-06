import React, { useMemo } from 'react';
import { Building2, ExternalLink, FileText, Globe2, ShieldCheck } from 'lucide-react';

type Source = { title?: string; name?: string; url?: string; content?: string };
type Block = { type: 'paragraph' | 'bullet'; text: string };
type Subsection = { title: string; blocks: Block[] };
type Section = { title: string; blocks: Block[]; subsections: Subsection[] };

const stripMd = (value: string) => value
  .replace(/^\s*#{1,6}\s+/, '')
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/__(.*?)__/g, '$1')
  .trim();

function parseReport(content: string): { title: string; intro: Block[]; sections: Section[] } {
  const lines = String(content || '').split(/\r?\n/);
  let title = 'Company Research Report';
  const intro: Block[] = [];
  const sections: Section[] = [];
  let section: Section | null = null;
  let subsection: Subsection | null = null;

  const pushBlock = (block: Block) => {
    if (subsection) subsection.blocks.push(block);
    else if (section) section.blocks.push(block);
    else intro.push(block);
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#\s+/.test(line)) { title = stripMd(line); continue; }
    if (/^##\s+/.test(line)) {
      section = { title: stripMd(line), blocks: [], subsections: [] };
      sections.push(section);
      subsection = null;
      continue;
    }
    if (/^###\s+/.test(line)) {
      if (!section) {
        section = { title: 'Company Overview', blocks: [], subsections: [] };
        sections.push(section);
      }
      subsection = { title: stripMd(line), blocks: [] };
      section.subsections.push(subsection);
      continue;
    }
    if (/^[-*•]\s+/.test(line)) pushBlock({ type: 'bullet', text: stripMd(line.replace(/^[-*•]\s+/, '')) });
    else pushBlock({ type: 'paragraph', text: stripMd(line) });
  }

  return { title, intro, sections };
}

const AutoLinkedText = ({ text }: { text: string }) => {
  const parts = text.split(/(https?:\/\/[^\s)\]]+)/g);
  return <>{parts.map((part, index) => /^https?:\/\//.test(part)
    ? <a key={index} href={part} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline break-all">{part}</a>
    : <React.Fragment key={index}>{part}</React.Fragment>)}</>;
};

const Blocks = ({ blocks }: { blocks: Block[] }) => {
  const bullets = blocks.filter((block) => block.type === 'bullet');
  const paragraphs = blocks.filter((block) => block.type === 'paragraph');
  return <div className="space-y-3">
    {paragraphs.map((block, index) => <p key={`p-${index}`} className="text-[12px] sm:text-[13px] leading-6 text-slate-300"><AutoLinkedText text={block.text} /></p>)}
    {bullets.length > 0 && <ul className="space-y-2.5">{bullets.map((block, index) => <li key={`b-${index}`} className="flex gap-2.5 text-[12px] sm:text-[13px] leading-6 text-slate-300"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" /><span><AutoLinkedText text={block.text} /></span></li>)}</ul>}
  </div>;
};

export const CompanyResearchReport = ({ content, companyName, sources = [] }: { content: string; companyName?: string; sources?: Source[] }) => {
  const parsed = useMemo(() => parseReport(content), [content]);
  const referenceSection = parsed.sections.find((section) => /reference|source/i.test(section.title));
  const bodySections = parsed.sections.filter((section) => section !== referenceSection);

  return <div className="space-y-5">
    <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[.08] to-blue-500/[.03] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-14 h-14 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 flex items-center justify-center"><Building2 className="w-6 h-6 text-cyan-300" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] uppercase tracking-[.2em] font-black text-cyan-400">SAVRDH IntelSight™ Company Intelligence</div>
          <h2 className="mt-1 text-xl sm:text-2xl font-black text-white">{companyName || parsed.title}</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-[9px]"><span className="px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 font-black inline-flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> PUBLIC-SOURCE RESEARCH</span><span className="px-2.5 py-1 rounded-full border border-slate-700 bg-slate-950/60 text-slate-400 inline-flex items-center gap-1.5"><FileText className="w-3 h-3" /> {bodySections.length} REPORT SECTIONS</span><span className="px-2.5 py-1 rounded-full border border-slate-700 bg-slate-950/60 text-slate-400 inline-flex items-center gap-1.5"><Globe2 className="w-3 h-3" /> {sources.length} SOURCES</span></div>
        </div>
      </div>
      {parsed.intro.length > 0 && <div className="mt-5 pt-5 border-t border-slate-800"><Blocks blocks={parsed.intro} /></div>}
    </div>

    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
      {bodySections.map((section, index) => <section key={`${section.title}-${index}`} className="rounded-2xl border border-slate-800 bg-[#07101c] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/25"><div className="text-[9px] uppercase tracking-[.17em] text-cyan-400 font-black">SECTION {String(index + 1).padStart(2, '0')}</div><h3 className="mt-1 text-base font-black text-white">{section.title}</h3></div>
        <div className="p-5 space-y-5">
          {section.blocks.length > 0 && <Blocks blocks={section.blocks} />}
          {section.subsections.map((subsection, subIndex) => <div key={`${subsection.title}-${subIndex}`} className="rounded-xl border border-slate-800/80 bg-[#050b14] p-4"><h4 className="text-xs font-black text-cyan-200">{subsection.title}</h4><div className="mt-3"><Blocks blocks={subsection.blocks} /></div></div>)}
        </div>
      </section>)}
    </div>

    {(referenceSection || sources.length > 0) && <section className="rounded-2xl border border-slate-800 bg-[#07101c] p-5">
      <div className="flex items-center gap-2"><ExternalLink className="w-4 h-4 text-cyan-300" /><h3 className="text-sm font-black text-white">References & Evidence Sources</h3></div>
      {referenceSection && <div className="mt-4"><Blocks blocks={[...referenceSection.blocks, ...referenceSection.subsections.flatMap((item) => item.blocks)]} /></div>}
      {sources.length > 0 && <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">{sources.slice(0, 30).map((source, index) => {
        const url = String(source?.url || '');
        return <a key={`${url}-${index}`} href={url || undefined} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-800 bg-[#050b14] p-3 hover:border-cyan-500/30 transition-colors"><div className="text-[11px] font-bold text-slate-200 line-clamp-2">{source?.title || source?.name || `Source ${index + 1}`}</div>{url && <div className="mt-1.5 text-[9px] text-cyan-500 break-all line-clamp-1">{url}</div>}</a>;
      })}</div>}
    </section>}
  </div>;
};
