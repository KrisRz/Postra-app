import { readResponseError } from './response.error';

/**
 * Minimal Response-like stub. `clone()` returns itself and json/text re-read
 * from the same source, which is all readResponseError needs.
 */
const makeResponse = (opts: {
  json?: unknown;
  jsonThrows?: boolean;
  text?: string;
  textThrows?: boolean;
}): Response => {
  const res: any = {
    clone() {
      return res;
    },
    async json() {
      if (opts.jsonThrows) throw new SyntaxError('Unexpected end of JSON input');
      return opts.json;
    },
    async text() {
      if (opts.textThrows) throw new Error('stream already read');
      return opts.text ?? '';
    },
  };
  return res as Response;
};

describe('readResponseError', () => {
  it('returns a NestJS-style string message', async () => {
    const r = makeResponse({ json: { message: 'Channel disconnected' } });
    expect(await readResponseError(r)).toBe('Channel disconnected');
  });

  it('joins a NestJS-style string[] message', async () => {
    const r = makeResponse({ json: { message: ['Name is required', 'Too long'] } });
    expect(await readResponseError(r)).toBe('Name is required, Too long');
  });

  it('falls back to raw text when the body has no `message` field', async () => {
    const r = makeResponse({ json: { error: 'Bad Request' }, text: 'Bad Request' });
    expect(await readResponseError(r)).toBe('Bad Request');
  });

  it('falls back to text when the body is not JSON', async () => {
    const r = makeResponse({ jsonThrows: true, text: '<html>500</html>' });
    expect(await readResponseError(r)).toBe('<html>500</html>');
  });

  it('returns an empty string for an empty body', async () => {
    const r = makeResponse({ jsonThrows: true, text: '' });
    expect(await readResponseError(r)).toBe('');
  });

  it('never throws, even if reading the text also fails', async () => {
    const r = makeResponse({ jsonThrows: true, textThrows: true });
    await expect(readResponseError(r)).resolves.toBe('');
  });
});
