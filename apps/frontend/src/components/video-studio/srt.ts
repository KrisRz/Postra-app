/** Minimal SRT parsing for client-side caption rendering. */

export interface CaptionSegment {
  start: number; // seconds
  end: number; // seconds
  text: string;
}

/** "00:00:02,500" → 2.5 (also tolerates a "." as the millisecond separator). */
function timeToSeconds(stamp: string): number {
  const m = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/.exec(stamp.trim());
  if (!m) return 0;
  const [, h, min, s, ms] = m;
  return (
    Number(h) * 3600 +
    Number(min) * 60 +
    Number(s) +
    Number(ms.padEnd(3, '0')) / 1000
  );
}

/**
 * Parse an SRT string into timed segments. Whisper output is well-formed, but we
 * stay lenient: blank-line-separated blocks, an optional index line, a
 * "start --> end" line, then one or more text lines (joined with a space).
 */
export function parseSrt(srt: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  const blocks = srt.replace(/\r/g, '').split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim().length > 0);
    if (!lines.length) continue;
    const timeIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeIdx === -1) continue;
    const [from, to] = lines[timeIdx].split('-->');
    const text = lines.slice(timeIdx + 1).join(' ').trim();
    if (!text) continue;
    const start = timeToSeconds(from);
    const end = timeToSeconds(to);
    if (end <= start) continue;
    segments.push({ start, end, text });
  }
  return segments;
}

/** The caption visible at `timeSec`, or null between segments. */
export function captionAt(segments: CaptionSegment[], timeSec: number): string | null {
  for (const seg of segments) {
    if (timeSec >= seg.start && timeSec < seg.end) return seg.text;
  }
  return null;
}
