import {
  FetchHandledError,
  FetchTimeoutError,
  isFetchHandledError,
} from './fetch.errors';

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

describe('isFetchHandledError', () => {
  it('recognises the marker so a catch can skip its own message', () => {
    expect(isFetchHandledError(new FetchHandledError(502))).toBe(true);
  });

  // The name check (not instanceof) is what makes this hold across separately
  // bundled client chunks — a structurally identical object must pass too.
  it('recognises a structurally identical error from another bundle', () => {
    expect(isFetchHandledError({ name: 'FetchHandledError', status: 502 })).toBe(
      true
    );
  });

  it('rejects unrelated failures, so real crashes still surface', () => {
    expect(isFetchHandledError(new FetchTimeoutError('/posts'))).toBe(false);
    expect(isFetchHandledError(new TypeError('Load failed'))).toBe(false);
    // the Safari DOMException this whole change exists to stop reporting
    expect(
      isFetchHandledError(
        Object.assign(
          new Error('The string did not match the expected pattern.'),
          { name: 'SyntaxError' }
        )
      )
    ).toBe(false);
    expect(isFetchHandledError(undefined)).toBe(false);
    expect(isFetchHandledError(null)).toBe(false);
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
