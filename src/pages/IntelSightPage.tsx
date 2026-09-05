import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigation } from '../context/NavigationContext';
import { SEO } from '../components/common/SEO';
import {
  Search, Fingerprint, ShieldCheck, Network, Globe2, Mail, Smartphone, AtSign,
  Building2, Radar, FileSearch, GitBranch, Sparkles, ArrowRight, CheckCircle2,
  LockKeyhole, Activity, FileText, Users, BriefcaseBusiness, Scale, Landmark,
  Gauge, BrainCircuit, Shield, ScanLine, Link2, Code2, BookOpenCheck, Check,
  ChevronRight, Eye, Clock3, Server, AlertTriangle, Zap
} from 'lucide-react';

type SearchType = 'Email' | 'Mobile' | 'Username' | 'Domain';
type IconType = React.ComponentType<{ className?: string }>;

const features = [
  [Search, 'Universal Intelligence Search', 'Search public web signals using email, mobile number, username, domain or business identifiers from one console.'],
  [Fingerprint, 'Identity Intelligence', 'Correlate public profiles, usernames, domains and organizational references with confidence-based matching.'],
  [Network, 'Relationship Graph', 'Visualize how public identifiers connect across profiles, domains, companies and evidence sources.'],
  [FileSearch, 'Evidence-Linked Findings', 'Keep every finding traceable with source URLs, timestamps, discovery context and analyst notes.'],
  [ShieldCheck, 'Exposure Intelligence', 'Surface defensive cyber-exposure indicators from authorized providers without showing stolen secrets.'],
  [BrainCircuit, 'AI Investigation Summary', 'Turn collected evidence into a source-grounded summary with corroborated findings and review priorities.'],
  [FileText, 'Professional Reports', 'Generate branded investigation reports with findings, relationships, confidence notes and evidence references.'],
  [LockKeyhole, 'Team Controls & Audit Logs', 'Role-based access, investigation history and complete audit trails for professional teams.'],
] as const;

const workflow = [
  [Radar, '01', 'Search', 'Enter a permitted public identifier.'],
  [Globe2, '02', 'Discover', 'Check configured public and authorized sources.'],
  [GitBranch, '03', 'Correlate', 'Normalize and score matching signals.'],
  [Fingerprint, '04', 'Investigate', 'Review evidence, relationships and cases.'],
  [FileText, '05', 'Report', 'Create a structured intelligence report.'],
] as const;

const useCases = [
  [Scale, 'Legal & Investigation Teams', 'Organize lawful public-source research, evidence references and case notes.'],
  [Landmark, 'Financial Services & Risk', 'Support authorized due diligence, fraud-risk review and business verification.'],
  [Building2, 'Corporate Compliance', 'Review vendors, organizations and public-risk signals with an auditable workflow.'],
  [Shield, 'Cybersecurity Teams', 'Track public exposure indicators for authorized business identities and domains.'],
  [BriefcaseBusiness, 'Professional Analysts', 'Replace scattered tabs and spreadsheets with one structured workspace.'],
  [Users, 'Enterprise Investigation Units', 'Collaborate on cases with role controls, audit history and standardized reporting.'],
] as const;

const plans = [
  { name: 'Professional', price: '₹2,499', text: 'For independent analysts and professional investigators.', features: ['1 user', '300 searches / month', '20 active cases', '20 PDF reports / month', 'Confidence scoring', 'Relationship graph'] },
  { name: 'Business', price: '₹8,999', text: 'For compliance, legal, risk and investigation teams.', popular: true, features: ['Up to 5 users', '2,000 searches / month', 'Unlimited cases', '100 PDF reports / month', 'AI summaries', 'Bulk screening', '25 monitored subjects'] },
  { name: 'Enterprise', price: '₹24,999+', text: 'For institutions requiring higher limits, controls and integrations.', features: ['15+ users', '10,000+ searches / month', 'API & webhooks', 'White-label reports', 'SSO / advanced access', 'Priority onboarding'] },
];

const SectionTitle = ({ eyebrow, title, text, center = false }: { eyebrow: string; title: string; text?: string; center?: boolean }) => (
  <div className={center ? 'max-w-3xl mx-auto text-center' : 'max-w-3xl'}>
    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-400">{eyebrow}</div>
    <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">{title}</h2>
    {text && <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-400">{text}</p>}
  </div>
);

export const IntelSightPage: React.FC = () => {
  const { navigate, setOpenDemoModal } = useNavigation();
  const [searchType, setSearchType] = useState<SearchType>('Email');
  const [query, setQuery] = useState('analyst@example.com');
  const [scanning, setScanning] = useState(false);
  const [showResults, setShowResults] = useState(true);

  const placeholder = useMemo(() => searchType === 'Email' ? 'analyst@example.com' : searchType === 'Mobile' ? '+91 98765 43210' : searchType === 'Username' ? 'public_username' : 'example.com', [searchType]);

  const chooseType = (type: SearchType) => {
    setSearchType(type);
    setQuery(type === 'Email' ? 'analyst@example.com' : type === 'Mobile' ? '+91 98765 43210' : type === 'Username' ? 'public_username' : 'example.com');
  };

  const runScan = () => {
    setScanning(true);
    setShowResults(false);
    window.setTimeout(() => { setScanning(false); setShowResults(true); }, 1100);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200 overflow-hidden">
      <SEO title="SAVRDH IntelSight™ | Public Intelligence & Digital Investigation Platform" description="SAVRDH IntelSight™ is a public intelligence and digital investigation platform for authorized OSINT research, identity intelligence, source correlation, evidence management and professional reporting." path="/" />

      <section className="relative min-h-[760px] flex items-center border-b border-slate-800/80">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_18%,rgba(6,182,212,0.15),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(37,99,235,0.16),transparent_36%)]" />
        <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        <motion.div className="absolute left-[7%] top-24 w-80 h-80 rounded-full border border-cyan-500/10" animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }} />
        <motion.div className="absolute right-[7%] bottom-20 w-[430px] h-[430px] rounded-full border border-blue-500/10" animate={{ rotate: -360 }} transition={{ duration: 34, repeat: Infinity, ease: 'linear' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 xl:gap-20 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[11px] font-black uppercase tracking-[0.18em]"><Fingerprint className="w-3.5 h-3.5" />OSINT • Digital Forensics • Identity Intelligence</div>
              <div className="mt-7 flex items-center gap-4"><div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-600/20 border border-cyan-400/30 flex items-center justify-center"><Search className="absolute w-11 h-11 text-cyan-300" strokeWidth={1.6} /><Fingerprint className="w-6 h-6 text-white" strokeWidth={1.4} /></div><div><div className="text-sm font-bold text-cyan-300">SAVRDH TECHNOLOGY</div><div className="text-xs text-slate-500">Enterprise Intelligence Product</div></div></div>
              <h1 className="mt-7 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-[-0.04em] text-white leading-[0.98]">SAVRDH <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400">IntelSight™</span></h1>
              <p className="mt-6 text-xl sm:text-2xl font-bold text-slate-200">Public Intelligence & Digital Investigation Platform</p>
              <p className="mt-5 max-w-2xl text-sm sm:text-base text-slate-400 leading-relaxed">Discover, correlate and organize publicly available digital intelligence in one professional workspace—built for authorized due diligence, compliance, cybersecurity and investigation teams.</p>
              <div className="mt-8 flex flex-wrap gap-3"><button onClick={() => setOpenDemoModal(true)} className="group px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white text-sm font-black flex items-center gap-2 cursor-pointer"><Sparkles className="w-4 h-4" />Book Product Demo<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></button><button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-sm font-bold cursor-pointer"><Gauge className="inline w-4 h-4 mr-2 text-cyan-400" />View Plans</button><button onClick={() => navigate('/contact')} className="px-6 py-3.5 rounded-xl border border-cyan-500/20 text-cyan-300 text-sm font-bold cursor-pointer">Contact Sales</button></div>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">{[[Globe2,'Public & authorized sources'],[BookOpenCheck,'Evidence-linked findings'],[ShieldCheck,'Enterprise audit controls']].map(([Icon,label]) => { const I = Icon as IconType; return <div key={label as string} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800"><I className="w-4 h-4 text-cyan-400" /><span className="text-[11px] font-semibold text-slate-300">{label as string}</span></div>; })}</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65 }} className="relative">
              <div className="absolute -inset-10 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-indigo-500/10 blur-3xl rounded-full" />
              <div className="relative rounded-[28px] border border-slate-700/80 bg-[#080d19]/95 shadow-2xl overflow-hidden">
                <div className="h-11 px-4 flex items-center justify-between bg-slate-950/80 border-b border-slate-800"><div className="flex gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" /><span className="w-2.5 h-2.5 rounded-full bg-amber-300/80" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" /></div><div className="text-[10px] font-mono text-slate-500">INTELSIGHT / INVESTIGATION CONSOLE</div><div className="text-[10px] text-emerald-400 font-bold">● LIVE</div></div>
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-[0.18em] font-black text-cyan-400">Public intelligence workspace</div><div className="text-lg font-black text-white mt-1">Identity Visibility Scan</div></div><div className="w-11 h-11 rounded-xl border border-cyan-500/25 bg-cyan-500/10 flex items-center justify-center"><ScanLine className="w-5 h-5 text-cyan-300" /></div></div>
                  <div className="mt-5 flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-slate-950 border border-slate-800">{(['Email','Mobile','Username','Domain'] as SearchType[]).map(type => <button key={type} onClick={() => chooseType(type)} className={`px-3 py-2 rounded-lg text-[10px] font-bold cursor-pointer ${searchType === type ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{type}</button>)}</div>
                  <div className="mt-3 flex gap-2"><div className="flex-1 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center px-3 gap-2">{searchType==='Email'?<Mail className="w-4 h-4 text-slate-500"/>:searchType==='Mobile'?<Smartphone className="w-4 h-4 text-slate-500"/>:searchType==='Username'?<AtSign className="w-4 h-4 text-slate-500"/>:<Globe2 className="w-4 h-4 text-slate-500"/>}<input value={query} onChange={e=>setQuery(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent outline-none text-xs text-slate-200 font-mono min-w-0" /></div><button onClick={runScan} className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white cursor-pointer">{scanning?<Activity className="w-5 h-5 animate-spin"/>:<Search className="w-5 h-5"/>}</button></div>
                  <div className="mt-3 text-[9px] text-slate-600 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3"/>Interactive demonstration uses synthetic data only.</div>
                  <div className="mt-5 relative h-72 rounded-2xl border border-slate-800 bg-[#050812] overflow-hidden"><div className="absolute inset-0 opacity-40 bg-[radial-gradient(#1e3a5f_1px,transparent_1px)] [background-size:18px_18px]"/><motion.div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" animate={{ top:['12%','88%','12%'] }} transition={{duration:4.2,repeat:Infinity}}/><svg className="absolute inset-0 w-full h-full opacity-70" viewBox="0 0 500 280"><line x1="250" y1="136" x2="92" y2="63" stroke="rgba(34,211,238,.48)"/><line x1="250" y1="136" x2="410" y2="66" stroke="rgba(59,130,246,.48)"/><line x1="250" y1="136" x2="104" y2="226" stroke="rgba(99,102,241,.48)"/><line x1="250" y1="136" x2="406" y2="222" stroke="rgba(16,185,129,.48)"/></svg><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-400/40 flex flex-col items-center justify-center"><Fingerprint className="w-7 h-7 text-cyan-300"/><span className="text-[8px] font-bold text-white mt-1">IDENTITY</span></div>{[[Globe2,'WEB','left-[11%] top-[15%]'],[Building2,'ORG','right-[10%] top-[16%]'],[AtSign,'USERNAME','left-[13%] bottom-[12%]'],[ShieldCheck,'EXPOSURE','right-[11%] bottom-[12%]']].map(([Icon,label,pos])=>{const I=Icon as IconType;return <motion.div key={label as string} className={`absolute ${pos as string} w-[74px] h-[58px] rounded-xl bg-slate-950/90 border border-slate-700 flex flex-col items-center justify-center`} animate={{y:[0,-4,0]}} transition={{duration:3,repeat:Infinity}}><I className="w-4 h-4 text-cyan-300"/><span className="mt-1 text-[8px] font-black text-slate-400">{label as string}</span></motion.div>})}<AnimatePresence>{scanning?<motion.div initial={{opacity:0}} animate={{opacity:1}} className="absolute inset-x-5 bottom-4 p-3 rounded-xl bg-cyan-950/75 border border-cyan-500/25"><div className="flex items-center gap-2 text-[10px] font-bold text-cyan-300"><Activity className="w-3.5 h-3.5 animate-spin"/>Scanning configured public intelligence sources…</div></motion.div>:showResults?<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="absolute inset-x-5 bottom-4 p-3 rounded-xl bg-emerald-950/55 border border-emerald-500/20"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-bold text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5"/>Public signals correlated</div><div className="text-[9px] text-slate-400">Confidence 86%</div></div></motion.div>:null}</AnimatePresence></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-800 bg-slate-950/40"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">{[['Search','Public identifiers'],['Discover','Open-source signals'],['Correlate','Evidence & relationships'],['Report','Structured intelligence']].map(([t,s])=><div key={t} className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><ChevronRight className="w-4 h-4 text-cyan-400"/></div><div><div className="text-xs font-black text-white">{t}</div><div className="text-[10px] text-slate-500">{s}</div></div></div>)}</div></section>

      <section className="py-24 sm:py-28"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><SectionTitle eyebrow="Platform capabilities" title="One investigation workspace. Multiple intelligence layers." text="Turn scattered public-source signals into organized, reviewable intelligence while keeping evidence traceable to its source."/><div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{features.map(([Icon,title,text],i)=>{const I=Icon as IconType;return <motion.div key={title} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*.04}} whileHover={{y:-5}} className="min-h-[220px] p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800"><div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center"><I className="w-5 h-5 text-cyan-400"/></div><h3 className="mt-5 text-base font-black text-white">{title}</h3><p className="mt-3 text-xs text-slate-400 leading-relaxed">{text}</p></motion.div>})}</div></div></section>

      <section className="py-24 border-y border-slate-800 bg-[#080d19]"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><SectionTitle eyebrow="Investigation workflow" title="Search → Discover → Correlate → Investigate → Report" text="A structured workflow keeps public-source research consistent, evidence-linked and easier for teams to review." center/><div className="mt-14 grid grid-cols-1 md:grid-cols-5 gap-4">{workflow.map(([Icon,step,title,text],i)=>{const I=Icon as IconType;return <motion.div key={step} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*.06}} className="p-5 rounded-2xl bg-slate-950/75 border border-slate-800 text-center"><div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center"><I className="w-6 h-6 text-cyan-300"/></div><div className="mt-4 text-[10px] font-black text-cyan-500">STEP {step}</div><h3 className="mt-2 text-base font-black text-white">{title}</h3><p className="mt-2 text-[11px] text-slate-500">{text}</p></motion.div>})}</div></div></section>

      <section className="py-24 border-b border-slate-800 bg-slate-950/35"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><SectionTitle eyebrow="Who it is for" title="Built for professional teams that need structured public intelligence." text="IntelSight is positioned as an investigation productivity and intelligence organization platform—not a private surveillance product." center/><div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{useCases.map(([Icon,title,text])=>{const I=Icon as IconType;return <div key={title} className="p-5 rounded-2xl bg-slate-900/75 border border-slate-800"><I className="w-5 h-5 text-cyan-400"/><h3 className="mt-4 text-base font-black text-white">{title}</h3><p className="mt-2 text-xs text-slate-400 leading-relaxed">{text}</p></div>})}</div></div></section>

      <section className="py-24"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="rounded-[32px] border border-cyan-500/20 bg-gradient-to-br from-cyan-950/35 via-[#090f1c] to-blue-950/25 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"><div><div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center"><ShieldCheck className="w-7 h-7 text-cyan-300"/></div><h2 className="mt-5 text-3xl sm:text-4xl font-black text-white">Public intelligence with professional controls.</h2><p className="mt-4 text-sm text-slate-400 leading-relaxed">The platform is intended for lawful public-source research and authorized investigations. Private messages, OTPs, passwords, session tokens and restricted account data are not part of the product experience.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[[Globe2,'Public / authorized sources'],[Eye,'Evidence transparency'],[LockKeyhole,'Role-based access'],[Activity,'Audit history']].map(([Icon,title])=>{const I=Icon as IconType;return <div key={title as string} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800"><I className="w-4 h-4 text-cyan-400"/><div className="mt-3 text-xs font-black text-white">{title as string}</div></div>})}</div></div></div></section>

      <section id="pricing" className="py-24 sm:py-28 border-y border-slate-800 bg-[#080d19]"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><SectionTitle eyebrow="Simple SaaS plans" title="Start with a demo. Upgrade when your team is ready." text="A controlled 7-day evaluation can be offered before paid activation." center/><div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-5">{plans.map((plan,i)=><motion.div key={plan.name} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*.06}} className={`relative p-6 rounded-3xl border flex flex-col ${plan.popular?'bg-gradient-to-b from-blue-950/70 to-slate-950 border-cyan-500/45 lg:-translate-y-3':'bg-slate-950/75 border-slate-800'}`}>{plan.popular&&<div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[9px] font-black">MOST POPULAR</div>}<div className="text-xs font-black text-cyan-400 uppercase">{plan.name}</div><div className="mt-4"><span className="text-4xl font-black text-white">{plan.price}</span><span className="text-[10px] text-slate-500"> /month + GST</span></div><p className="mt-3 text-xs text-slate-400">{plan.text}</p><div className="my-5 h-px bg-slate-800"/><div className="space-y-2.5 flex-1">{plan.features.map(f=><div key={f} className="flex gap-2 text-[11px] text-slate-300"><Check className="w-3.5 h-3.5 text-cyan-400 shrink-0"/>{f}</div>)}</div><button onClick={()=>plan.name==='Enterprise'?navigate('/contact'):setOpenDemoModal(true)} className={`mt-6 w-full py-3 rounded-xl text-xs font-black cursor-pointer ${plan.popular?'bg-gradient-to-r from-cyan-500 to-blue-600 text-white':'bg-slate-900 border border-slate-700 text-slate-200'}`}>{plan.name==='Enterprise'?'Contact Enterprise Sales':'Start with Product Demo'}</button></motion.div>)}</div><div className="mt-7 flex flex-wrap justify-center gap-6 text-[10px] text-slate-500"><span><Clock3 className="inline w-3.5 h-3.5 text-cyan-500 mr-1"/>7-day controlled evaluation</span><span><AlertTriangle className="inline w-3.5 h-3.5 text-amber-400 mr-1"/>Lawful-purpose terms</span><span><Server className="inline w-3.5 h-3.5 text-blue-400 mr-1"/>Enterprise limits on request</span></div></div></section>

      <section className="py-24 sm:py-28"><div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center"><motion.div initial={{opacity:0,scale:.97}} whileInView={{opacity:1,scale:1}} viewport={{once:true}} className="p-8 sm:p-12 rounded-[34px] bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800"><div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center"><Fingerprint className="w-8 h-8 text-cyan-300"/></div><div className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">A product of SAVRDH TECHNOLOGY</div><h2 className="mt-4 text-3xl sm:text-5xl font-black text-white">Turn public information into structured intelligence.</h2><p className="mt-4 max-w-2xl mx-auto text-sm text-slate-400">Explore the SAVRDH IntelSight™ product concept, discuss your organization’s use case and request early access.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button onClick={()=>setOpenDemoModal(true)} className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white text-sm font-black flex items-center gap-2 cursor-pointer"><Zap className="w-4 h-4"/>Request Demo</button><button onClick={()=>navigate('/contact')} className="px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-sm font-bold cursor-pointer">Talk to SAVRDH Technology</button></div></motion.div></div></section>
    </div>
  );
};
