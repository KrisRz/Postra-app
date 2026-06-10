'use client';

import { FC, useCallback, useState } from 'react';
import {
  Input,
  Output,
  Conversion,
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
} from 'mediabunny';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { VIDEO_FORMATS, VideoFormat } from './video-formats';

interface VideoMultiFormatProps {
  source: Blob | null;
  onExported: (results: { format: VideoFormat; blob: Blob }[]) => void;
}

export const VideoMultiFormat: FC<VideoMultiFormatProps> = ({ source, onExported }) => {
  const t = useT();
  const toaster = useToaster();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(VIDEO_FORMATS.map((f) => f.key))
  );
  const [isExporting, setIsExporting] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const handleExport = useCallback(async () => {
    if (!source) return;
    if (selected.size === 0) {
      toaster.show(
        t('video_format_select_one', 'Select at least one format'),
        'warning'
      );
      return;
    }
    setIsExporting(true);
    const results: { format: VideoFormat; blob: Blob }[] = [];
    try {
      const targets = VIDEO_FORMATS.filter((f) => selected.has(f.key));
      for (const fmt of targets) {
        const input = new Input({
          source: new BlobSource(source),
          formats: ALL_FORMATS,
        });
        const output = new Output({
          format: new Mp4OutputFormat(),
          target: new BufferTarget(),
        });
        const conversion = await Conversion.init({
          input,
          output,
          video: { width: fmt.width, height: fmt.height, fit: 'cover' },
        });
        conversion.onProgress = (p) =>
          setProgressMap((prev) => ({ ...prev, [fmt.key]: Math.round(p * 100) }));
        await conversion.execute();
        const buffer = (output.target as BufferTarget).buffer;
        if (!buffer) throw new Error(`empty buffer for ${fmt.key}`);
        results.push({ format: fmt, blob: new Blob([buffer], { type: 'video/mp4' }) });
      }
      onExported(results);
    } catch {
      toaster.show(
        t(
          'video_format_failed',
          'Multi-format export failed. Check that your browser supports WebCodecs.'
        ),
        'warning'
      );
    } finally {
      setIsExporting(false);
    }
  }, [source, selected, onExported, t, toaster]);

  if (!source) {
    return (
      <div className="text-xs text-textColor/60 p-4 text-center">
        {t('video_no_source', 'Load a video first (From disk / From library) to pick formats.')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="text-xs text-textColor/80">
        {t(
          'video_format_explainer',
          'Generates a separate MP4 file for each selected format (smart center-crop).'
        )}
      </div>
      <div className="flex flex-col gap-2">
        {VIDEO_FORMATS.map((fmt) => {
          const checked = selected.has(fmt.key);
          const progress = progressMap[fmt.key];
          return (
            <label
              key={fmt.key}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${
                checked
                  ? 'bg-newAccent/10 border-newAccent'
                  : 'bg-newColColor border-newBorder'
              } ${isExporting ? 'opacity-60 cursor-not-allowed' : 'hover:border-newAccent/60'}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(fmt.key)}
                  disabled={isExporting}
                />
                <div className="text-xs">
                  <div className="text-textColor">{fmt.label}</div>
                  <div className="text-[10px] text-textColor/50">
                    {fmt.width}×{fmt.height}
                  </div>
                </div>
              </div>
              {progress !== undefined && progress < 100 && (
                <div className="text-[10px] text-textColor/70">{progress}%</div>
              )}
              {progress === 100 && <div className="text-[10px] text-green-400">✓</div>}
            </label>
          );
        })}
      </div>
      <button
        onClick={handleExport}
        disabled={isExporting || selected.size === 0}
        className="px-3 py-2 text-sm rounded bg-newAccent text-white hover:bg-forth disabled:opacity-50 transition-colors"
      >
        {isExporting
          ? t('video_format_exporting', 'Exporting {n} formats...').replace(
              '{n}',
              String(selected.size)
            )
          : t('video_format_export', 'Export {n} formats').replace(
              '{n}',
              String(selected.size)
            )}
      </button>
    </div>
  );
};

export type { VideoFormat };
