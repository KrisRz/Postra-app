import { useEffect, useState } from 'react';

/**
 * Mobilny breakpoint = poniżej `md` (768px), spójny z app-shellem
 * (sidebar znika na `md`, bottom-nav pojawia się na `md`).
 *
 * SSR-safe: zwraca `false` na serwerze i przy pierwszym renderze klienta
 * (zgodnym z SSR), a po zamontowaniu koryguje wg `matchMedia` — bez
 * hydration mismatch. Tylko do progresywnego włączania zachowań mobilnych;
 * widok desktopowy (>=768px) pozostaje nietknięty.
 */
export function useIsMobile(maxWidth = 767): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [maxWidth]);

  return isMobile;
}
