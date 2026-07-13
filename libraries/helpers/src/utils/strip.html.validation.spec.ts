import { stripHtmlValidation } from './strip.html.validation';

describe('stripHtmlValidation entity unescaping', () => {
  it('decodes single-escaped entities', () => {
    expect(stripHtmlValidation('none', '&gt;')).toBe('>');
    expect(stripHtmlValidation('none', '&lt;b&gt;')).toBe('<b>');
    expect(stripHtmlValidation('none', 'a &amp; b')).toBe('a & b');
  });

  it('decodes double-escaped entities exactly once (no double unescaping)', () => {
    // "&amp;gt;" is the escaped form of the literal text "&gt;" — after one
    // decode it must stay "&gt;", not collapse to ">".
    expect(stripHtmlValidation('none', '&amp;gt;')).toBe('&gt;');
    expect(stripHtmlValidation('none', '&amp;lt;script&amp;gt;')).toBe(
      '&lt;script&gt;'
    );
    expect(stripHtmlValidation('none', '&amp;quot;')).toBe('&quot;');
  });

  it('keeps the same guarantee for the html branch', () => {
    expect(stripHtmlValidation('html', '&amp;gt;')).toBe('&gt;');
    expect(stripHtmlValidation('html', '&gt;')).toBe('>');
  });
});
