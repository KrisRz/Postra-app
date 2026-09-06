import {
  Input,
  Output,
  Conversion,
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
} from 'mediabunny';
import { UnsupportedCodecError } from './compositor-pipeline';

/**
 * Postra Clip — the bridge between what the browser editor can open and what
 * the server will accept.
 *
 * The upload endpoint admits exactly one video container: `video/mp4`, checked
 * by magic bytes (`custom.upload.validation.ts`). The editor, meanwhile, loads
 * anything Mediabunny can parse — MOV, WebM, MKV. So every path that uploads a
 * clip the user never trimmed ("Add captions", "Use in post", "Save to
 * library") used to die as a bare "Upload failed." on precisely the footage a
 * phone produces. Remuxing on the way out fixes that: when the codecs already
 * fit MP4 it is a container rewrite with no re-encode, so it costs a copy of
 * the bytes and no quality.
 */

/** Reasons a track never made it into the output because we couldn't carry it. */
const LOST_VIDEO_REASONS: ReadonlySet<string> = new Set([
  'unknown_source_codec',
  'undecodable_source_codec',
  'no_encodable_target_codec',
]);

/**
 * True when the blob is already the container the server accepts.
 *
 * Deliberately strict: `video/quicktime` (an iPhone `.mov`) is rejected by the
 * upload validator even though the browser plays it happily.
 */
export function isMp4(source: Blob): boolean {
  return source.type === 'video/mp4';
}

/**
 * Guard a Mediabunny conversion against silently dropping the picture.
 *
 * A conversion whose video track is undecodable stays `isValid` as long as an
 * audio track survives, and `execute()` resolves cleanly — the user gets a
 * "clip" that is sound over a black screen, with no error anywhere. Call this
 * right after `Conversion.init()` (the discard list is populated before
 * execution) so we fail fast, with a codec name, instead of rendering for a
 * minute and uploading a broken file.
 */
export function assertVideoSurvives(conversion: Conversion): void {
  const lost = conversion.discardedTracks.find(
    (d) => d.track.isVideoTrack() && LOST_VIDEO_REASONS.has(d.reason)
  );
  if (lost) {
    throw new UnsupportedCodecError(
      lost.track.isVideoTrack() ? lost.track.codec : null
    );
  }
}

/**
 * Return a blob the upload endpoint will accept, remuxing into MP4 if needed.
 *
 * Note this does NOT require the video to be decodable: a container rewrite
 * copies encoded packets, so an HEVC clip Chrome cannot render still uploads
 * fine and can be attached to a post. Decoding only matters for editing, which
 * is where `assertVideoSurvives` and the compositor's `canDecode()` check live.
 */
export async function ensureMp4(
  source: Blob,
  onProgress?: (ratio: number) => void
): Promise<Blob> {
  if (isMp4(source)) return source;

  const input = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });
  const output = new Output({
    format: new Mp4OutputFormat(),
    target: new BufferTarget(),
  });
  const conversion = await Conversion.init({ input, output });

  // A container the MP4 box model can't hold at all (e.g. VP9 video with no
  // encodable target) has to surface as the codec error, not as a mute file.
  assertVideoSurvives(conversion);

  if (onProgress) conversion.onProgress = (p) => onProgress(p);
  await conversion.execute();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('remux produced an empty buffer');
  return new Blob([buffer], { type: 'video/mp4' });
}
