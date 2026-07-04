'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

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
    // Log the failure in a structured, greppable shape so we can diagnose
    // it from a user's console screenshot even before source maps load.
    // The error boundary only receives the post-throw Error, so we dump
    // every field React gives us (message/name/stack/digest) plus context.
    /* eslint-disable no-console */
    console.error('[Postra:error-boundary] render crash:', {
      name: error?.name,
      message: error?.message,
      digest: error?.digest,
      url: typeof window !== 'undefined' ? window.location.href : '(ssr)',
      time: new Date().toISOString(),
    });
    // Separate log so the browser prints the clickable, source-mapped stack.
    console.error('[Postra:error-boundary] stack:', error?.stack || error);
    /* eslint-enable no-console */
    // No-op when Sentry isn't initialized (no DSN), so safe to call always.
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center p-[24px]">
      <div className="max-w-[440px] w-full rounded-[16px] border border-white/10 bg-[rgba(15,23,42,0.72)] backdrop-blur-xl p-[28px] text-center flex flex-col gap-[14px]">
        <div className="text-[40px]">⚠️</div>
        <div className="text-white text-[18px] font-[600]">
          Something went wrong
        </div>
        <div className="text-white/60 text-[14px]">
          An unexpected error occurred on this screen. The rest of the app keeps
          working — please try again.
        </div>
        <div className="flex gap-[10px] justify-center mt-[6px]">
          <button
            onClick={() => reset()}
            className="h-[40px] px-[18px] rounded-[8px] bg-[#38bdf8] text-[#0a0e1a] font-[600] text-[14px] cursor-pointer"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="h-[40px] px-[18px] rounded-[8px] bg-white/[0.06] border border-white/10 text-white text-[14px] cursor-pointer"
          >
            Refresh the page
          </button>
        </div>
      </div>
    </div>
  );
}
