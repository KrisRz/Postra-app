'use client';

import { RouteError } from '@gitroom/frontend/components/layout/route-error';

// The (extension) root had no boundary — a crash fell through to Next.js's
// bare error screen inside the browser-extension popup.
export default function ExtensionError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} segment="(extension)" />;
}
