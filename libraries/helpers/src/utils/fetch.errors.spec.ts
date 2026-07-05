import { FetchHandledError, FetchTimeoutError } from './fetch.errors';

describe('FetchHandledError', () => {
  it('is an Error that carries the status and a handled marker', () => {
    const e = new FetchHandledError(406);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('FetchHandledError');
    expect(e.status).toBe(406);
    // GlobalErrorLogger / SwrProvider swallow it by checking this name/flag.
    expect(e.handled).toBe(true);
    expect(e.message).toContain('406');
  });
});

describe('FetchTimeoutError', () => {
  it('is an Error that names itself and keeps the url', () => {
    const e = new FetchTimeoutError('/posts');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('FetchTimeoutError');
    expect(e.url).toBe('/posts');
    expect(e.message).toContain('/posts');
  });
});
