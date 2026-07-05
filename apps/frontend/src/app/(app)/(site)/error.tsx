'use client';

import { RouteError } from '@gitroom/frontend/components/layout/route-error';

// Boundary inside the (site) shell: a page crash keeps the menu/sidebar
// rendered (they live in (site)/layout.tsx, above this boundary) and only the
// page content is replaced, instead of the (app) boundary taking the shell too.
export default function SiteError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} segment="(site)" />;
}
