/**
 * A 402/406/429/5xx response is handled globally (layout.context shows the
 * trial / payment dialog or a toast). customFetch rejects the original request
 * with this marker instead of returning a promise that never resolves, so a
 * caller's `finally`/`catch` can clear its loading state. It is a benign,
 * already-handled signal — GlobalErrorLogger swallows it rather than reporting
 * a crash.
 */
export class FetchHandledError extends Error {
  readonly handled = true;
  constructor(public status: number) {
    super(`Request handled globally (status ${status})`);
    this.name = 'FetchHandledError';
  }
}

/**
 * True when a rejection is the already-surfaced marker above. A `catch` that
 * renders its own message must check this first: the global handler has
 * already told the user what happened, and the caller's fallback text would
 * blame the wrong thing ("check your internet" for a server outage, "try a
 * different prompt" for a 502).
 *
 * Checks the name rather than `instanceof` so it still holds across the
 * separately-bundled client chunks.
 */
export const isFetchHandledError = (e: unknown): e is FetchHandledError =>
  (e as FetchHandledError | undefined)?.name === 'FetchHandledError';

/**
 * customFetch aborts a request that exceeds its timeout and rejects with this,
 * so a dead connection surfaces as an error instead of an infinite spinner.
 */
export class FetchTimeoutError extends Error {
  constructor(public url: string) {
    super(`Request timed out: ${url}`);
    this.name = 'FetchTimeoutError';
  }
}

/**
 * How each engine words "the request never reached the server" — dropped wifi,
 * airplane mode, DNS failure, a laptop lid closing mid-request. `fetch` rejects
 * with a bare TypeError carrying no code, so the message is the only portable
 * signal there is.
 *
 * Shared with Sentry's beforeSend, which drops these events: someone walking
 * into a lift is not a crash, and one commute would otherwise fill the quota.
 */
export const NETWORK_FAILURE_PATTERNS: readonly RegExp[] = [
  /^Failed to fetch/i, // Chrome, Edge
  /^Load failed/i, // Safari
  /^NetworkError when attempting to fetch resource\./i, // Firefox
  /^The Internet connection appears to be offline/i, // WebKit / iOS
  /^The network connection was lost/i, // WebKit / iOS
];

/**
 * True when a rejection means "we could not reach the server", as opposed to
 * "the server answered something we did not like". Callers use it to blame the
 * connection instead of the app — telling a user with no signal to "refresh the
 * page" is the one instruction guaranteed not to work.
 *
 * A timed-out request counts: customFetch only aborts after 120s, which no live
 * request reaches, so in practice it is a connection that died mid-flight.
 */
export const isNetworkError = (e: unknown): boolean => {
  if (!e) {
    return false;
  }
  // Name rather than instanceof — the marker classes cross separately-bundled
  // client chunks, same as isFetchHandledError above.
  if ((e as Error).name === 'FetchTimeoutError') {
    return true;
  }
  const message = (e as Error).message;
  return (
    typeof message === 'string' &&
    NETWORK_FAILURE_PATTERNS.some((pattern) => pattern.test(message))
  );
};
