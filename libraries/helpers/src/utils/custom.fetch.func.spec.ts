import { customFetch } from './custom.fetch.func';
import { FetchHandledError, FetchTimeoutError } from './fetch.errors';

const baseUrl = 'https://api.test';
const response = (status: number) => ({ status, ok: status < 400 }) as Response;

describe('customFetch', () => {
  afterEach(() => {
    jest.useRealTimers();
    delete (global as any).fetch;
  });

  it('resolves with the response when there is no afterRequest hook', async () => {
    const res = response(200);
    global.fetch = jest.fn().mockResolvedValue(res);
    const fn = customFetch({ baseUrl });
    await expect(fn('/user/self')).resolves.toBe(res);
    expect(global.fetch).toHaveBeenCalledWith(
      baseUrl + '/user/self',
      expect.any(Object)
    );
  });

  it('resolves with the response when afterRequest approves it', async () => {
    const res = response(200);
    global.fetch = jest.fn().mockResolvedValue(res);
    const afterRequest = jest.fn().mockResolvedValue(true);
    const fn = customFetch({ baseUrl, afterRequest });
    await expect(fn('/posts')).resolves.toBe(res);
    expect(afterRequest).toHaveBeenCalledTimes(1);
  });

  // The A4 change: a 402/406 handled globally by the trial/payment dialog must
  // REJECT with a marker (not hang on a never-resolving promise) so the caller's
  // finally/catch can clear its spinner.
  it('rejects a globally-handled 406 with FetchHandledError instead of hanging', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(406));
    const afterRequest = jest.fn().mockResolvedValue(false);
    const fn = customFetch({ baseUrl, afterRequest });
    await expect(fn('/integrations')).rejects.toMatchObject({
      name: 'FetchHandledError',
      status: 406,
      handled: true,
    });
  });

  // The 502 case: while the backend restarts, the proxy answers with an HTML
  // error page. `fetch` RESOLVES — it is not a network failure — so without
  // this the response reaches callers that `.json()` it and blow up parsing
  // HTML (in Safari: an opaque DOMException reported to Sentry as a crash).
  it('rejects a 502 with FetchHandledError rather than handing back an HTML body', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(502));
    const fn = customFetch({ baseUrl, afterRequest: async () => false });
    await expect(fn('/integrations')).rejects.toMatchObject({
      name: 'FetchHandledError',
      status: 502,
      handled: true,
    });
  });

  it('propagates the 402 status on the FetchHandledError', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(402));
    const fn = customFetch({ baseUrl, afterRequest: async () => false });
    await expect(fn('/billing')).rejects.toBeInstanceOf(FetchHandledError);
    await expect(fn('/billing')).rejects.toHaveProperty('status', 402);
  });

  // The timeout must not fight a caller that manages its own cancellation
  // (e.g. the design refine panel) — we skip our controller when a signal exists.
  it('does not impose its own timeout when the caller passes a signal', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(200));
    const controller = new AbortController();
    const fn = customFetch({ baseUrl });
    await fn('/x', { signal: controller.signal });
    const passedOptions = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(passedOptions.signal).toBe(controller.signal);
  });

  it('aborts and rejects with FetchTimeoutError after the timeout (no caller signal)', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(
      (_url: string, opts: any) =>
        new Promise((_resolve, reject) => {
          opts.signal?.addEventListener('abort', () =>
            reject(new Error('The operation was aborted'))
          );
        })
    );
    const fn = customFetch({ baseUrl });
    const pending = fn('/slow');
    // avoid an unhandled-rejection warning in the microtask gap
    pending.catch(() => {});
    // async variant flushes the promise microtasks so the abort → reject →
    // FetchTimeoutError chain settles before we assert.
    await jest.advanceTimersByTimeAsync(120_000);
    await expect(pending).rejects.toBeInstanceOf(FetchTimeoutError);
  });
});
