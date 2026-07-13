import { safeMediaUrl } from './safe.media.url';

describe('safeMediaUrl', () => {
  it('passes http(s), blob and relative URLs through unchanged', () => {
    expect(safeMediaUrl('https://cdn-dev.postra.pl/a.jpg')).toBe(
      'https://cdn-dev.postra.pl/a.jpg'
    );
    expect(safeMediaUrl('http://host/a.jpg')).toBe('http://host/a.jpg');
    expect(safeMediaUrl('blob:https://app.postra.pl/uuid')).toBe(
      'blob:https://app.postra.pl/uuid'
    );
    expect(safeMediaUrl('/uploads/a.jpg')).toBe('/uploads/a.jpg');
  });

  it('allows data: URLs only for image and video payloads', () => {
    expect(safeMediaUrl('data:image/png;base64,AAA')).toBe(
      'data:image/png;base64,AAA'
    );
    expect(safeMediaUrl('data:video/mp4;base64,AAA')).toBe(
      'data:video/mp4;base64,AAA'
    );
    expect(safeMediaUrl('data:text/html,<script>1</script>')).toBeUndefined();
  });

  it('rejects script-capable and malformed values', () => {
    expect(safeMediaUrl('javascript:alert(1)')).toBeUndefined();
    // eslint-disable-next-line no-script-url
    expect(safeMediaUrl('JavaScript:alert(1)')).toBeUndefined();
    expect(safeMediaUrl('vbscript:x')).toBeUndefined();
    expect(safeMediaUrl(null)).toBeUndefined();
    expect(safeMediaUrl(undefined)).toBeUndefined();
    expect(safeMediaUrl('')).toBeUndefined();
  });
});
