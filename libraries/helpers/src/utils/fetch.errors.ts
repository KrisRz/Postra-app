/**
 * A 402/406 response is handled globally (layout.context shows the trial /
 * payment dialog). customFetch rejects the original request with this marker
 * instead of returning a promise that never resolves, so a caller's
 * `finally`/`catch` can clear its loading state. It is a benign, already-handled
 * signal — GlobalErrorLogger swallows it rather than reporting a crash.
 */
export class FetchHandledError extends Error {
  readonly handled = true;
  constructor(public status: number) {
    super(`Request handled globally (status ${status})`);
    this.name = 'FetchHandledError';
  }
}

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
