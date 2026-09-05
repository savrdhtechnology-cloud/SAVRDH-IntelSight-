import React, { useState } from 'react';
import { ArrowLeft, Fingerprint, KeyRound, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const { sendOtp, enableDemoMode } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setMessage('');
    const result = await sendOtp(email);
    if (result.error) {
      setStatus('error');
      setMessage(result.error);
    } else {
      setStatus('sent');
      setMessage('Check your email for the secure IntelSight sign-in link / OTP flow configured in Supabase Auth.');
    }
  };

  const demo = () => {
    enableDemoMode();
    window.location.assign('/app');
  };

  return (
    <div className="min-h-screen bg-[#050a13] text-slate-200 grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden lg:flex items-center justify-center overflow-hidden border-r border-slate-800 p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,.15),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(37,99,235,.14),transparent_35%)]" />
        <div className="absolute inset-0 opacity-25 bg-[linear-gradient(rgba(148,163,184,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300"><ShieldCheck className="w-3.5 h-3.5" /> Secure Investigation Workspace</div>
          <div className="mt-8 flex items-center gap-4"><div className="w-16 h-16 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 flex items-center justify-center"><Fingerprint className="w-8 h-8 text-cyan-300" /></div><div><div className="text-sm font-black text-cyan-300">SAVRDH TECHNOLOGY</div><div className="text-xs text-slate-500">Enterprise Intelligence Product</div></div></div>
          <h1 className="mt-8 text-5xl xl:text-6xl font-black tracking-[-0.04em] leading-[1] text-white">SAVRDH <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">IntelSight™</span></h1>
          <p className="mt-5 text-xl font-bold text-slate-300">OSINT • Digital Forensics • Identity Intelligence</p>
          <p className="mt-5 text-sm leading-relaxed text-slate-500">Authorized teams can search public signals, correlate evidence, organize cases and generate auditable intelligence reports from one controlled workspace.</p>
          <div className="mt-8 grid grid-cols-2 gap-3">{['Public & licensed sources','Evidence-linked findings','Confidence scoring','Role-based access'].map(item => <div key={item} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 flex items-center gap-2.5 text-xs text-slate-400"><ShieldCheck className="w-4 h-4 text-emerald-400" />{item}</div>)}</div>
        </div>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <button onClick={() => window.location.assign('/')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-white"><ArrowLeft className="w-4 h-4" /> Back to website</button>
          <div className="mt-8 lg:hidden flex items-center gap-3"><div className="w-12 h-12 rounded-xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center"><Fingerprint className="w-6 h-6 text-cyan-300" /></div><div><div className="font-black text-white">SAVRDH IntelSight™</div><div className="text-[9px] uppercase tracking-[0.16em] text-cyan-400">Investigation Console</div></div></div>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-[#09111e] p-6 sm:p-7 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center"><KeyRound className="w-5 h-5 text-cyan-300" /></div>
            <h2 className="mt-5 text-2xl font-black text-white">Sign in to IntelSight</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">Use your authorized work email. Production access will be controlled through Supabase Auth and organization roles.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block"><span className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-500">Work Email</span><div className="mt-2 h-13 rounded-xl border border-slate-700 bg-slate-950 flex items-center px-3 gap-2"><Mail className="w-4 h-4 text-slate-600" /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white" /></div></label>
              <button type="submit" disabled={status === 'sending' || !isSupabaseConfigured} className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-40 text-sm font-black text-white inline-flex items-center justify-center gap-2"><LockKeyhole className="w-4 h-4" />{status === 'sending' ? 'Sending secure sign-in…' : 'Send Email OTP / Link'}</button>
            </form>

            {status !== 'idle' && message && <div className={`mt-4 rounded-xl border p-3 text-xs leading-relaxed ${status === 'error' ? 'border-rose-500/20 bg-rose-500/10 text-rose-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}>{message}</div>}

            {!isSupabaseConfigured && <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-black text-amber-300"><Sparkles className="w-3.5 h-3.5" /> Development mode</div><p className="mt-2 text-xs leading-relaxed text-amber-100/60">Supabase keys are not connected yet. You can open the internal demo console while backend setup is pending.</p><button onClick={demo} className="mt-3 w-full h-11 rounded-xl border border-amber-400/20 bg-amber-400/10 text-xs font-black text-amber-200">Continue in Demo Mode</button></div>}
          </div>
        </div>
      </section>
    </div>
  );
};
