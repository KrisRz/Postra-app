'use client';

import { RouteError } from '@gitroom/frontend/components/layout/route-error';

// Route-level error boundary for the (app) segment. Without it, any render
// throw (e.g. an unguarded .map over an undefined value) bubbles to the root
// and white-screens the whole app with Next.js's generic "Application error".
export default function AppError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} segment="(app)" />;
}
