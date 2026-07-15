import sharp from 'sharp';
import { fetch } from 'undici';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { parseDataUrl } from '@gitroom/nestjs-libraries/upload/data.url';

// Instagram rejects feed images whose aspect ratio falls outside 4:5 (0.8) ..
// 1.91:1 with "Aspect ratio not supported" (Meta error 2207009 / 36003). It is
// the single biggest source of failed IG publishes: tall/banner crops and wide
// OG images clear every other network but bounce off Meta's strict band.
//
// We center-crop the smallest amount needed to land inside the band. The crop is
// also acceptable to FB/X/LinkedIn, so callers can normalize once and reuse the
// result across a multi-channel post. On any failure (unreachable URL, non-image,
// decode error) we return the input untouched — aspect normalization must never
// block a post.
//
// Returns a `data:image/jpeg;base64,...` URL when a crop was applied, or the
// original `urlOrData` unchanged when the image is already in-band or could not
// be processed. Callers that need a hosted URL should re-upload only when the
// return value differs from the input (i.e. starts with `data:`).
export async function toInstagramSafeAspect(urlOrData: string): Promise<string> {
  const MIN = 0.8; // 4:5 portrait bound
  const MAX = 1.91; // 1.91:1 landscape bound
  // Crop targets sit just inside the bounds so rounding never pushes us back
  // over Meta's strict limit.
  const MIN_TARGET = 0.81;
  const MAX_TARGET = 1.9;

  try {
    let buf: Buffer;
    if (urlOrData.startsWith('data:')) {
      const parsed = parseDataUrl(urlOrData);
      if (!parsed) return urlOrData;
      buf = parsed.buffer;
    } else {
      if (!(await isSafePublicHttpsUrl(urlOrData))) return urlOrData;
      const res = await fetch(urlOrData, {
        dispatcher: ssrfSafeDispatcher,
        headers: { 'User-Agent': 'PostraBot/1.0' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return urlOrData;
      buf = Buffer.from(await res.arrayBuffer());
    }

    const img = sharp(buf, {
      failOn: 'none',
      // Remote/untrusted images — same decompression-bomb cap as every other
      // sharp call site (Faza A).
      limitInputPixels: 100_000_000,
    });
    const meta = await img.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (!w || !h) return urlOrData;

    const ratio = w / h;
    if (ratio >= MIN && ratio <= MAX) return urlOrData;

    let targetW = w;
    let targetH = h;
    if (ratio > MAX) {
      targetW = Math.round(h * MAX_TARGET); // too wide -> trim sides
    } else {
      targetH = Math.round(w / MIN_TARGET); // too tall -> trim top/bottom
    }

    const left = Math.max(0, Math.round((w - targetW) / 2));
    const top = Math.max(0, Math.round((h - targetH) / 2));
    const out = await img
      .extract({
        left,
        top,
        width: Math.min(targetW, w - left),
        height: Math.min(targetH, h - top),
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    return `data:image/jpeg;base64,${out.toString('base64')}`;
  } catch {
    return urlOrData;
  }
}
