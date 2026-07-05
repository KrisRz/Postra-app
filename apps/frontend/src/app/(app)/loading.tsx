import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

// Segment loading fallback (there was none in the whole app/ tree). Next.js
// wraps the (app) page in a Suspense boundary with this, so a slow initial
// render shows a branded spinner instead of a blank screen.
export default function AppLoading() {
  return (
    <div className="min-h-[100vh] w-full flex items-center justify-center">
      <LoadingComponent />
    </div>
  );
}
