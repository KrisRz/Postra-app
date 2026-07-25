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
