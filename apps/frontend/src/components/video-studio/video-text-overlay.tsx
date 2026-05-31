'use client';

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/frontend/components/ui/button';
import { STUDIO_FONTS } from '../design-editor/fonts';
import { VideoLibraryPicker, LibraryMedia } from './video-library-picker';
import { fetchLibraryVideoAsFile, VideoTooLargeError } from './load-library-media';
import { composeVideo } from './compositor-pipeline';
import {
  TextPosition,
  fontFamilyForLabel,
  ensureFontLoaded,
  hexToRgba,
  drawBrandText,
} from './text-overlay';
import { useBrandKit } from './use-brand-kit';

interface VideoTextOverlayProps {
  /** Hand the rendered clip (already uploaded) back to the post. */
  onReady: (media: { id: string; path: string }) => void;
}

const POSITIONS: { key: TextPosition; label: string; icon: string }[] = [
  { key: 'top', label: 'Góra', icon: '⬆' },
  { key: 'middle', label: 'Środek', icon: '⏺' },
  { key: 'bottom', label: 'Dół', icon: '⬇' },
];

const SIZES: { key: string; label: string; scale: number }[] = [
  { key: 's', label: 'S', scale: 0.8 },
  { key: 'm', label: 'M', scale: 1 },
  { key: 'l', label: 'L', scale: 1.25 },
];

/**
 * "Tekst" — burn manual, on-brand text into a clip. Colour and font default to
 * the active org's Brand Kit (so an agency's client gets THEIR colours, never a
 * hardcoded Postra blue); the user can still override per clip. Decode → paint
 * the branded band → re-encode runs through the shared compositor pipeline,
 * with the original audio carried through untouched.
 */
export const VideoTextOverlay: FC<VideoTextOverlayProps> = ({ onReady }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const mediaDirectory = useMediaDirectory();
  const { kit, loading: kitLoading } = useBrandKit();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('Nowość w sklepie');
  const [position, setPosition] = useState<TextPosition>('bottom');
  const [color, setColor] = useState<string | null>(null);
  const [fontLabel, setFontLabel] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [hadAudio, setHadAudio] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [importing, setImporting] = useState(false);

  // Seed colour/font from the Brand Kit once it loads; user edits win after.
  const seeded = useRef(false);
  useEffect(() => {
    if (kitLoading || seeded.current) return;
    seeded.current = true;
    setColor((c) => c ?? kit.primaryColor);
    setFontLabel((f) => f ?? kit.font);
  }, [kitLoading, kit]);

  const effectiveColor = color ?? kit.primaryColor;
  const effectiveFontLabel = fontLabel ?? kit.font;

  const resetResult = useCallback(() => {
    setResultBlob(null);
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const compose = useCallback(async () => {
    if (!file || busy) return;
    setBusy(true);
    setProgress(0);
    resetResult();

    const fontFamily = fontFamilyForLabel(effectiveFontLabel);
    const bandColor = hexToRgba(kit.secondaryColor, 0.55);
    try {
      // Load the chosen webfont before painting, or the canvas falls back to a
      // default face. Probe size is indicative; the loop sizes per frame width.
      await ensureFontLoaded(fontFamily, 64);
      const result = await composeVideo({
        file,
        onProgress: (r) => setProgress(Math.round(r * 100)),
        drawOverlay: (ctx, { width, height }) =>
          drawBrandText(ctx, width, height, {
            text,
            position,
            color: effectiveColor,
            bandColor,
            fontFamily,
            scale,
          }),
      });
      setResultBlob(result.blob);
      setResultUrl(URL.createObjectURL(result.blob));
      setHadAudio(result.hadAudio);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Postra:text-overlay] failed:', err);
      toaster.show(
        t('clip_text_failed', 'Nie udało się wypalić tekstu w wideo — sprawdź konsolę.'),
        'warning'
      );
    } finally {
      setBusy(false);
    }
  }, [
    file,
    busy,
    resetResult,
    effectiveFontLabel,
    effectiveColor,
    kit.secondaryColor,
    text,
    position,
    scale,
    toaster,
    t,
  ]);

  const useInPost = useCallback(async () => {
    if (!resultBlob || uploading) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', resultBlob, `postra-clip-${Date.now()}.mp4`);
      const res = await fetch('/media/upload-simple', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data?.id && data?.path) {
        onReady({ id: data.id, path: data.path });
      } else {
        throw new Error('upload returned no media');
      }
    } catch {
      toaster.show(t('clip_text_upload_failed', 'Upload klipu nie powiódł się.'), 'warning');
    } finally {
      setUploading(false);
    }
  }, [resultBlob, uploading, fetch, onReady, toaster, t]);

  const loadFromLibrary = useCallback(
    async (media: LibraryMedia) => {
      setImporting(true);
      try {
        const loaded = await fetchLibraryVideoAsFile(mediaDirectory.set(media.path));
        setFile(loaded);
        resetResult();
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
    [mediaDirectory, toaster, t, resetResult]
  );

  return (
    <div className="flex flex-col gap-3 p-3 text-textColor">
      <div className="text-[11px] text-textColor/70 leading-snug">
        ✍️{' '}
        {t(
          'clip_text_intro',
          'Wgraj klip (albo weź B-roll z biblioteki), wpisz tekst — wypalimy go w wideo w kolorze i foncie Twojego Brand Kitu. Dźwięk zostaje.'
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
            resetResult();
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
          📁 {t('video_source_disk', 'Z dysku')}
        </button>
        <button
          onClick={() => setShowLibrary(true)}
          disabled={busy || importing}
          className="flex-1 text-xs px-3 py-2 rounded bg-newColColor hover:bg-forth text-textColor transition-colors disabled:opacity-50"
        >
          🗂 {t('video_source_library', 'Z biblioteki')}
        </button>
      </div>
      {file && (
        <div className="text-[10px] text-textColor/60 truncate">✓ {file.name}</div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
        rows={2}
        placeholder={t('clip_text_placeholder', 'Tekst na wideo')}
        className="text-xs px-2 py-2 rounded bg-newColColor border border-newBorder text-textColor placeholder-textColor/40 focus:outline-none focus:border-forth disabled:opacity-50 resize-none"
      />

      {/* Position */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-textColor/60">{t('clip_text_position', 'Pozycja')}</label>
        <div className="flex gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPosition(p.key)}
              disabled={busy}
              className={`flex-1 text-xs px-2 py-1.5 rounded transition-colors disabled:opacity-50 ${
                position === p.key
                  ? 'bg-newAccent text-white'
                  : 'bg-newColColor text-textColor hover:bg-forth'
              }`}
            >
              {p.icon} {t(`clip_text_pos_${p.key}`, p.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Colour + size, defaulting to the Brand Kit */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-textColor/60">{t('clip_text_color', 'Kolor')}</label>
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 shrink-0">
              <div
                className="absolute inset-0 rounded-md border border-newBorder shadow-inner pointer-events-none"
                style={{ backgroundColor: effectiveColor }}
              />
              <input
                type="color"
                value={effectiveColor}
                onChange={(e) => setColor(e.target.value)}
                disabled={busy}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                aria-label={t('clip_text_color', 'Kolor')}
              />
            </div>
            {color && color.toLowerCase() !== kit.primaryColor.toLowerCase() && (
              <button
                onClick={() => setColor(kit.primaryColor)}
                disabled={busy}
                className="text-[10px] text-newAccent underline disabled:opacity-50"
              >
                {t('clip_text_brand_color', 'Brand')}
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] text-textColor/60">{t('clip_text_size', 'Rozmiar')}</label>
          <div className="flex gap-2">
            {SIZES.map((s) => (
              <button
                key={s.key}
                onClick={() => setScale(s.scale)}
                disabled={busy}
                className={`flex-1 text-xs px-2 py-1.5 rounded transition-colors disabled:opacity-50 ${
                  scale === s.scale
                    ? 'bg-newAccent text-white'
                    : 'bg-newColColor text-textColor hover:bg-forth'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Font */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-textColor/60">{t('font', 'Font')}</label>
        <select
          value={effectiveFontLabel}
          onChange={(e) => setFontLabel(e.target.value)}
          disabled={busy}
          className="text-xs px-2 py-1.5 rounded bg-newColColor border border-newBorder text-textColor focus:outline-none focus:border-forth disabled:opacity-50"
        >
          {STUDIO_FONTS.map((font) => (
            <option key={font.key} value={font.label} style={{ fontFamily: font.family }}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={compose}
        disabled={!file || busy}
        className="px-3 py-2 text-sm rounded bg-newAccent text-white hover:bg-forth disabled:opacity-50 transition-colors"
      >
        {busy
          ? `${t('clip_text_running', 'Renderuję…')} ${progress}%`
          : t('clip_text_run', '🎬 Wypal tekst w wideo')}
      </button>

      {resultUrl && (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] text-green-400">
            ✓{' '}
            {hadAudio
              ? t('compositor_with_audio', 'z dźwiękiem')
              : t('compositor_no_audio', 'bez dźwięku')}
          </div>
          <video
            src={resultUrl}
            controls
            className="w-full rounded border border-newBorder"
          />
          <div className="flex items-center gap-2">
            <Button loading={uploading} onClick={useInPost} className="!h-[30px] !text-xs">
              {t('clip_text_use_in_post', 'Użyj w poście')}
            </Button>
            <a
              href={resultUrl}
              download="postra-clip.mp4"
              className="text-[10px] text-newAccent underline"
            >
              {t('clip_text_download', 'Pobierz')}
            </a>
          </div>
        </div>
      )}

      {/* Fills VideoStudio's relative content area, like the trim/library flow. */}
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
