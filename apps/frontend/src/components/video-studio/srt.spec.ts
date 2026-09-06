import { parseSrt, captionAt } from './srt';

// Whisper's own output is well-formed; these cover what a user does to it once
// the SRT lands in an editable textarea.
describe('parseSrt', () => {
  const WHISPER = [
    '1',
    '00:00:00,000 --> 00:00:02,500',
    'Welcome to the shop.',
    '',
    '2',
    '00:00:02,500 --> 00:00:05,000',
    'Open Monday to Saturday.',
  ].join('\n');

  it('parses blocks into timed segments', () => {
    expect(parseSrt(WHISPER)).toEqual([
      { start: 0, end: 2.5, text: 'Welcome to the shop.' },
      { start: 2.5, end: 5, text: 'Open Monday to Saturday.' },
    ]);
  });

  it('joins a multi-line cue into one caption', () => {
    const srt = '1\n00:00:01,000 --> 00:00:03,000\nfirst line\nsecond line';
    expect(parseSrt(srt)[0].text).toBe('first line second line');
  });

  it('accepts CRLF, a missing index line and extra blank lines', () => {
    const srt = '\r\n\r\n00:00:01,000 --> 00:00:02,000\r\nhello\r\n\r\n\r\n';
    expect(parseSrt(srt)).toEqual([{ start: 1, end: 2, text: 'hello' }]);
  });

  it('accepts a dot as the millisecond separator', () => {
    expect(parseSrt('1\n00:00:01.250 --> 00:00:02.000\nhi')[0].start).toBe(1.25);
  });

  it('pads short millisecond values rather than reading them as thousandths', () => {
    // ",5" is five hundred milliseconds, not five.
    expect(parseSrt('1\n00:00:00,5 --> 00:00:01,000\nhi')[0].start).toBe(0.5);
  });

  it('drops blocks with no text, no timing, or a non-positive duration', () => {
    const srt = [
      '1\n00:00:01,000 --> 00:00:02,000\nkept',
      '2\n00:00:03,000 --> 00:00:03,000\nzero length',
      '3\n00:00:05,000 --> 00:00:04,000\nbackwards',
      '4\n00:00:06,000 --> 00:00:07,000',
      'just a note with no timing',
    ].join('\n\n');
    expect(parseSrt(srt).map((s) => s.text)).toEqual(['kept']);
  });

  it('returns nothing for empty or junk input', () => {
    expect(parseSrt('')).toEqual([]);
    expect(parseSrt('not a subtitle file')).toEqual([]);
  });
});

describe('captionAt', () => {
  const segments = parseSrt(
    ['1', '00:00:01,000 --> 00:00:02,000', 'first', '', '2', '00:00:03,000 --> 00:00:04,000', 'second'].join('\n')
  );

  it('returns the caption covering the moment', () => {
    expect(captionAt(segments, 1.5)).toBe('first');
    expect(captionAt(segments, 3.999)).toBe('second');
  });

  it('is inclusive of the start and exclusive of the end, so cues never overlap', () => {
    expect(captionAt(segments, 1)).toBe('first');
    expect(captionAt(segments, 2)).toBeNull();
  });

  it('returns null in the gaps and outside the clip', () => {
    expect(captionAt(segments, 0.5)).toBeNull();
    expect(captionAt(segments, 2.5)).toBeNull();
    expect(captionAt(segments, 99)).toBeNull();
    expect(captionAt([], 1)).toBeNull();
  });
});
