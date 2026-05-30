'use client';

import { FC, useCallback, useRef, useState } from 'react';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { VideoLibraryPicker, LibraryMedia } from './video-library-picker';
import {
  fetchLibraryVideoAsFile,
  VideoTooLargeError,
} from './load-library-media';
import { composeVideo } from './compositor-pipeline';

/**
 * "Tekst na video" — burns a brand text band into a clip using the shared
 * compositor pipeline (decode → overlay → encode), now carrying the original
 * audio through. This is the thin UI; the heavy lifting lives in composeVideo().
 * Manual text from Brand Kit + photo→video reuse the same core.
 */
export const VideoCompositorPrototype: FC = () => {
  const t = useT();
  const toaster = useToaster();
  const mediaDirectory = useMediaDirectory();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('Twój tekst na wideo');
  const [busy, setBusy] = useState(false);
  const [frames, setFrames] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [hadAudio, setHadAudio] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [importing, setImporting] = useState(false);

  const compose = useCallback(async () => {
    if (!file || busy) return;
    setBusy(true);
    setFrames(0);
    setElapsedMs(0);
    setProgress(0);
    setResultUrl(null);
    const startedAt = performance.now();

    try {
      const result = await composeVideo({
        file,
        onProgress: (r) => setProgress(Math.round(r * 100)),
        drawOverlay: (ctx, { width: W, height: H }) => {
          const fontSize = Math.round(W * 0.05);
          // Translucent bottom band + brand-coloured centered text.
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fillRect(0, H - fontSize * 2.4, W, fontSize * 2.4);
          ctx.fillStyle = '#38bdf8';
          ctx.font = `bold ${fontSize}px Geist, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, W / 2, H - fontSize * 1.2);
        },
      });

      setResultUrl(URL.createObjectURL(result.blob));
      setFrames(result.frames);
      setHadAudio(result.hadAudio);
      setElapsedMs(Math.round(performance.now() - startedAt));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Postra:compositor] failed:', err);
      toaster.show(
        t('compositor_failed', 'Render klipu padł — sprawdź konsolę.'),
        'warning'
      );
    } finally {
      setBusy(false);
    }
  }, [file, busy, text, t, toaster]);

  const loadFromLibrary = useCallback(
    async (media: LibraryMedia) => {
      setImporting(true);
      try {
        const loaded = await fetchLibraryVideoAsFile(mediaDirectory.set(media.path));
        setFile(loaded);
        setResultUrl(null);
        setShowLibrary(false);
      } catch (e) {
        toaster.show(
          e instanceof VideoTooLargeError
            ? t(
                'video_library_too_big',
                'Ten klip jest za duży do edycji w przeglądarce (limit 200 MB). Użyj krótszego.'
              )
            : t('video_library_load_failed', 'Nie udało się wczytać wideo z biblioteki.'),
          'warning'
        );
      } finally {
        setImporting(false);
      }
    },
    [mediaDirectory, toaster, t]
  );

  return (
    <div className="flex flex-col gap-3 p-3 text-textColor">
      <div className="text-[11px] text-textColor/70 leading-snug">
        🧪 {t(
          'compositor_intro',
          'Prototyp: wgraj klip, wpisz tekst — wypalimy tekst w wideo własnym pipeline (Mediabunny + canvas). Dowód czy własny edytor da radę.'
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setFile(f);
            setResultUrl(null);
          }
          e.target.value = '';
        }}
      />
      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy || importing}
          className="flex-1 text-xs px-3 py-2 rounded bg-newColColor hover:bg-forth text-textColor transition-colors disabled:opacity-50"
        >
          📁 {t('compositor_pick', 'Z dysku')}
        </button>
        <button
          onClick={() => setShowLibrary(true)}
          disabled={busy || importing}
          className="flex-1 text-xs px-3 py-2 rounded bg-newColColor hover:bg-forth text-textColor transition-colors disabled:opacity-50"
        >
          🗂 {t('compositor_pick_library', 'Z biblioteki')}
        </button>
      </div>
      {file && (
        <div className="text-[10px] text-textColor/60 truncate">
          ✓ {file.name}
        </div>
      )}

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
        placeholder={t('compositor_text', 'Tekst na wideo')}
        className="text-xs px-2 py-2 rounded bg-newColColor border border-newBorder text-textColor placeholder-textColor/40 focus:outline-none focus:border-forth disabled:opacity-50"
      />

      <button
        onClick={compose}
        disabled={!file || busy}
        className="px-3 py-2 text-sm rounded bg-newAccent text-white hover:bg-forth disabled:opacity-50 transition-colors"
      >
        {busy
          ? `${t('compositor_running', 'Renderuję…')} ${progress}%`
          : t('compositor_run', '🎬 Wypal tekst w wideo')}
      </button>

      {resultUrl && (
        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-green-400">
            ✓ {frames} {t('compositor_frames', 'klatek')} · {elapsedMs} ms ·{' '}
            {hadAudio
              ? t('compositor_with_audio', 'z dźwiękiem')
              : t('compositor_no_audio', 'bez dźwięku')}
          </div>
          <video src={resultUrl} controls className="w-full rounded border border-newBorder" />
          <a
            href={resultUrl}
            download="postra-clip-test.mp4"
            className="text-[10px] text-newAccent underline self-start"
          >
            {t('compositor_download', 'Pobierz wynik')}
          </a>
        </div>
      )}

      {/* Anchored to VideoStudio's relative content area (this root is not
          positioned), so the picker fills the whole tab like the trim flow. */}
      {showLibrary && (
        <div className="absolute inset-0 z-[20]">
          <VideoLibraryPicker
            onPick={loadFromLibrary}
            onClose={() => setShowLibrary(false)}
            busy={importing}
          />
        </div>
      )}
    </div>
  );
};
