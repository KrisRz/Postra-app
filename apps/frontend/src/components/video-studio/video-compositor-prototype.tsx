'use client';

import { FC, useCallback, useRef, useState } from 'react';
import {
  Input,
  Output,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  ALL_FORMATS,
  CanvasSink,
  CanvasSource,
  QUALITY_MEDIUM,
} from 'mediabunny';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';

/**
 * FEASIBILITY PROTOTYPE — proves the "Postra Clip" approach:
 * decode each frame (Mediabunny CanvasSink) → composite a text/brand overlay
 * onto our own canvas → re-encode (Mediabunny CanvasSource) → playable MP4.
 *
 * If this runs smoothly, every other feature (AI captions, logo, multi-format)
 * is the SAME loop with more layers. Audio is dropped here (video-only proof);
 * the full build muxes the original audio track back in.
 */
export const VideoCompositorPrototype: FC = () => {
  const t = useT();
  const toaster = useToaster();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('Twój tekst na wideo');
  const [busy, setBusy] = useState(false);
  const [frames, setFrames] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const compose = useCallback(async () => {
    if (!file || busy) return;
    setBusy(true);
    setFrames(0);
    setElapsedMs(0);
    setResultUrl(null);
    const startedAt = performance.now();

    try {
      const input = new Input({
        source: new BlobSource(file),
        formats: ALL_FORMATS,
      });
      const track = await input.getPrimaryVideoTrack();
      if (!track) throw new Error('No video track in file');

      const W = track.displayWidth;
      const H = track.displayHeight;

      const composite = document.createElement('canvas');
      composite.width = W;
      composite.height = H;
      const ctx = composite.getContext('2d');
      if (!ctx) throw new Error('No 2D context');

      const sink = new CanvasSink(track);
      const output = new Output({
        format: new Mp4OutputFormat(),
        target: new BufferTarget(),
      });
      const source = new CanvasSource(composite, {
        codec: 'avc',
        bitrate: QUALITY_MEDIUM,
      });
      output.addVideoTrack(source);
      await output.start();

      const fontSize = Math.round(W * 0.05);
      let count = 0;

      // Decode → composite overlay → encode, frame by frame.
      for await (const frame of sink.canvases()) {
        ctx.drawImage(frame.canvas, 0, 0, W, H);

        // Overlay: translucent bottom band + brand-coloured centered text.
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, H - fontSize * 2.4, W, fontSize * 2.4);
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${fontSize}px Geist, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, W / 2, H - fontSize * 1.2);

        await source.add(frame.timestamp, frame.duration);
        count += 1;
        if (count % 5 === 0) setFrames(count);
      }

      source.close();
      await output.finalize();

      const buffer = (output.target as BufferTarget).buffer;
      if (!buffer) throw new Error('Empty output buffer');
      const blob = new Blob([buffer], { type: 'video/mp4' });
      setResultUrl(URL.createObjectURL(blob));
      setFrames(count);
      setElapsedMs(Math.round(performance.now() - startedAt));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Postra:compositor-prototype] failed:', err);
      toaster.show(
        t('compositor_failed', 'Prototyp compositora padł — sprawdź konsolę.'),
        'warning'
      );
    } finally {
      setBusy(false);
    }
  }, [file, busy, text, t, toaster]);

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
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="text-xs px-3 py-2 rounded bg-newColColor hover:bg-forth text-textColor transition-colors disabled:opacity-50"
      >
        📁 {file ? file.name.slice(0, 32) : t('compositor_pick', 'Wybierz klip')}
      </button>

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
          ? `${t('compositor_running', 'Renderuję…')} ${frames} ${t('compositor_frames', 'klatek')}`
          : t('compositor_run', '🎬 Wypal tekst w wideo')}
      </button>

      {resultUrl && (
        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-green-400">
            ✓ {frames} {t('compositor_frames', 'klatek')} · {elapsedMs} ms
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
    </div>
  );
};
