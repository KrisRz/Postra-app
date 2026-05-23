'use client';

import { useEffect } from 'react';

// Route-level error boundary for the (app) segment. Without it, any render
// throw (e.g. an unguarded .map over an undefined value) bubbles to the root
// and white-screens the whole app with Next.js's generic "Application error".
// This contains the failure to the page and offers a recovery action.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('App route error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center p-[24px]">
      <div className="max-w-[440px] w-full rounded-[16px] border border-white/10 bg-[rgba(15,23,42,0.72)] backdrop-blur-xl p-[28px] text-center flex flex-col gap-[14px]">
        <div className="text-[40px]">⚠️</div>
        <div className="text-white text-[18px] font-[600]">
          Coś poszło nie tak
        </div>
        <div className="text-white/60 text-[14px]">
          Wystąpił nieoczekiwany błąd na tym ekranie. Reszta aplikacji działa
          dalej — spróbuj ponownie.
        </div>
        <div className="flex gap-[10px] justify-center mt-[6px]">
          <button
            onClick={() => reset()}
            className="h-[40px] px-[18px] rounded-[8px] bg-[#38bdf8] text-[#0a0e1a] font-[600] text-[14px] cursor-pointer"
          >
            Spróbuj ponownie
          </button>
          <button
            onClick={() => window.location.reload()}
            className="h-[40px] px-[18px] rounded-[8px] bg-white/[0.06] border border-white/10 text-white text-[14px] cursor-pointer"
          >
            Odśwież stronę
          </button>
        </div>
      </div>
    </div>
  );
}
