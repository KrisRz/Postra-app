'use client';

import { RouteError } from '@gitroom/frontend/components/layout/route-error';

// The (provider) root had no boundary — a crash fell through to Next.js's
// bare error screen during the public channel-connect flow.
export default function ProviderError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} segment="(provider)" />;
}
