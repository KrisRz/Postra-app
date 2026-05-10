'use client';

import { FC, FormEvent, useState } from 'react';

const WAITLIST_URL = 'https://3wdzoqu6qe.execute-api.eu-west-2.amazonaws.com/';

export const ComingSoon: FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>(
    'idle'
  );
  const [errorMsg, setErrorMsg] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(WAITLIST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 200) {
        setStatus('success');
        setEmail('');
      } else if (res.status === 400) {
        const data = await res.json().catch(() => ({}));
        if (
          (data?.error || '').toLowerCase().includes('exists') ||
          (data?.error || '').toLowerCase().includes('conditional')
        ) {
          setStatus('duplicate');
        } else {
          setStatus('error');
          setErrorMsg(data?.error || 'Nieprawidłowy adres email');
        }
      } else {
        setStatus('error');
        setErrorMsg('Coś poszło nie tak. Spróbuj ponownie.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Brak połączenia. Spróbuj ponownie.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.14),transparent_32%),linear-gradient(180deg,#0a0e1a,#0f172a_42%,#111827)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(56,189,248,0.06),transparent_20%),radial-gradient(circle_at_80%_80%,rgba(167,139,250,0.08),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.75)_0.6px,transparent_0.6px)] [background-size:18px_18px]" />
      <div className="relative min-h-full flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="max-w-[600px] w-full flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-[56px] sm:text-[72px] font-[800] tracking-[-0.04em] text-white leading-none">
            P<span className="text-[#38bdf8]">o</span>str
            <span className="text-[#a78bfa]">a</span>
          </h1>
          <p className="text-[18px] sm:text-[20px] text-textColor/80 font-[500]">
            Wszystkie social media w jednym miejscu
          </p>
        </div>

        <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.2em] text-textColor/50">
          <div className="h-px w-12 bg-textColor/20" />
          Już wkrótce
          <div className="h-px w-12 bg-textColor/20" />
        </div>

        <p className="text-[15px] text-textColor/65 leading-relaxed max-w-[480px]">
          Aplikacja w fazie końcowych testów. Jedno narzędzie do
          planowania postów, generowania treści z AI i analityki —
          Facebook, Instagram, LinkedIn, TikTok, YouTube, X.
        </p>

        <form
          onSubmit={submit}
          className="w-full max-w-[440px] flex flex-col gap-3"
        >
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="twoj@email.pl"
              required
              disabled={status === 'loading' || status === 'success'}
              className="flex-1 px-4 py-3 rounded-lg bg-newColColor border border-newBorder text-textColor placeholder-textColor/40 focus:outline-none focus:border-[#38bdf8] disabled:opacity-50 text-[14px]"
            />
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="px-5 py-3 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#0a0e1a] font-[600] text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {status === 'loading' ? 'Zapisywanie…' : 'Powiadom mnie'}
            </button>
          </div>
          {status === 'success' && (
            <p className="text-[13px] text-[#34d399]">
              ✓ Dziękujemy! Damy znać gdy ruszamy.
            </p>
          )}
          {status === 'duplicate' && (
            <p className="text-[13px] text-textColor/60">
              Ten email już jest na liście. Damy znać gdy ruszamy.
            </p>
          )}
          {status === 'error' && (
            <p className="text-[13px] text-[#f87171]">{errorMsg}</p>
          )}
        </form>

        <a
          href="mailto:kontakt@postra.pl"
          className="text-[13px] text-white/50 hover:text-white/80 transition-colors"
        >
          Kontakt: kontakt@postra.pl
        </a>
        </div>
      </div>
    </div>
  );
};
