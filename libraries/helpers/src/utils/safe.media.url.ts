const SAFE_PROTOCOLS = new Set(['https:', 'http:', 'blob:', 'data:']);

/**
 * Restrict a URL that will be rendered as an <img>/<video> src to schemes that
 * can only carry media: https/http/blob, plus data: limited to image/video
 * payloads. Anything else (javascript:, vbscript:, data:text/html, garbage)
 * returns undefined so the element renders without a source.
 */
export const safeMediaUrl = (url?: string | null): string | undefined => {
  if (!url) {
    return undefined;
  }
  try {
    // The base only matters for relative URLs (e.g. "/uploads/x.jpg"), which
    // resolve to http: and pass; it never rewrites the returned value.
    const parsed = new URL(url, 'http://relative.local');
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
      return undefined;
    }
    if (parsed.protocol === 'data:' && !/^data:(image|video)\//i.test(url)) {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
};
