/**
 * Shared bridge for Postra Clip: turn a media-library video (a URL) into a File
 * the browser editor can consume (Mediabunny BlobSource, WaveSurfer, etc.).
 * Used by both the main VideoStudio source toggle and the compositor tab so the
 * size guard and fetch handling live in one place.
 */

// Browser-side editing loads the whole clip into RAM, so cap what we accept —
// a 200 MB ceiling keeps mobile devices from OOM-ing on a huge file.
export const MAX_LIBRARY_VIDEO_BYTES = 200 * 1024 * 1024;

/** Thrown when the library clip is over MAX_LIBRARY_VIDEO_BYTES. */
export class VideoTooLargeError extends Error {}

export async function fetchLibraryVideoAsFile(
  url: string,
  name?: string
): Promise<File> {
  // Probe size first so we don't pull a huge file into memory.
  try {
    const head = await window.fetch(url, { method: 'HEAD' });
    const len = Number(head.headers.get('content-length') || 0);
    if (len && len > MAX_LIBRARY_VIDEO_BYTES) throw new VideoTooLargeError();
  } catch (e) {
    if (e instanceof VideoTooLargeError) throw e;
    // HEAD unsupported / blocked — fall through to GET.
  }

  const res = await window.fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const blob = await res.blob();
  const fileName =
    name || url.split('/').pop()?.split('?')[0] || `library-${Date.now()}.mp4`;
  return new File([blob], fileName, { type: blob.type || 'video/mp4' });
}
