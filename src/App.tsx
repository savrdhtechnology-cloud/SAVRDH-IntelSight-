import React, { useState } from 'react';
import { Fingerprint, Sparkles, X } from 'lucide-react';
import { IntelSightPage } from './pages/IntelSightPage';
import { NavigationProvider, useNavigation } from './context/NavigationContext';

const Header = () => {
  const { setOpenDemoModal } = useNavigation();
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 text-left cursor-pointer">
          <span className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-cyan-300" />
          </span>
          <span>
            <span className="block text-sm font-black text-white tracking-tight">SAVRDH IntelSight™</span>
            <span className="block text-[9px] uppercase tracking-[0.18em] text-cyan-400">SAVRDH TECHNOLOGY</span>
          </span>
        </button>
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-400">
          <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-cyan-300 transition-colors cursor-pointer">Plans</button>
          <button onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-cyan-300 transition-colors cursor-pointer">Contact</button>
          <button onClick={() => setOpenDemoModal(true)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:brightness-110 transition-all cursor-pointer">Book Demo</button>
        </nav>
      </div>
    </header>
  );
};

const DemoModal = () => {
  const { openDemoModal, setOpenDemoModal } = useNavigation();
  const [submitted, setSubmitted] = useState(false);
  if (!openDemoModal) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={() => setOpenDemoModal(false)}>
      <div className="w-full max-w-lg rounded-3xl border border-cyan-500/25 bg-[#0a1020] shadow-2xl p-6 sm:p-7" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400"><Sparkles className="w-3.5 h-3.5" /> Early Access</div>
            <h2 className="mt-2 text-2xl font-black text-white">Request IntelSight Demo</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">Demo form is UI-ready. Connect this form to your CRM/API when the application backend is enabled.</p>
          </div>
          <button onClick={() => setOpenDemoModal(false)} className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {submitted ? (
          <div className="mt-6 p-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-sm text-emerald-300">Demo request captured in the interface. Backend/CRM submission can be connected next.</div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
            <input required placeholder="Full name" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50" />
            <input required type="email" placeholder="Work email" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50" />
            <input placeholder="Company / organization" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50" />
            <textarea placeholder="Use case" rows={3} className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50" />
            <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-sm font-black text-white hover:brightness-110 cursor-pointer">Submit Demo Request</button>
          </form>
        )}
      </div>
    </div>
  );
};

const Footer = () => (
  <footer id="contact" className="border-t border-slate-800 bg-[#050812]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
      <div>
        <div className="text-sm font-black text-white">SAVRDH IntelSight™</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-cyan-400">Public Intelligence & Digital Investigation Platform</div>
      </div>
      <div className="text-xs text-slate-500">A product of SAVRDH Technology • OSINT • Digital Forensics • Identity Intelligence</div>
    </div>
  </footer>
);

const Shell = () => (
  <div className="min-h-screen bg-[#070b14] text-slate-100">
    <Header />
    <IntelSightPage />
    <Footer />
    <DemoModal />
  </div>
);

export default function App() {
  return (
    <NavigationProvider>
      <Shell />
    </NavigationProvider>
  );
}
