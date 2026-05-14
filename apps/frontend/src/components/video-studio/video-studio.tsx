'use client';

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { VideoTrimmer } from './video-trimmer';
import { VideoMultiFormat, VideoFormat } from './video-multi-format';

interface VideoStudioProps {
  setMedia: (params: { id: string; path: string }[]) => void;
  closeModal: () => void;
}

type Tab = 'trim' | 'formats';

export const VideoStudio: FC<VideoStudioProps> = ({ setMedia, closeModal }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [trimmedBlob, setTrimmedBlob] = useState<Blob | null>(null);
  const [tab, setTab] = useState<Tab>('trim');
  const [isUploading, setIsUploading] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof (window as unknown as { VideoEncoder?: unknown }).VideoEncoder === 'undefined') {
      setBrowserSupported(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      toaster.show(t('video_bad_type', 'Wybierz plik wideo (MP4, WebM, MOV).'), 'warning');
      return;
    }
    setFile(f);
    setTrimmedBlob(null);
    setTab('trim');
  };

  const uploadBlob = useCallback(
    async (blob: Blob, name: string): Promise<{ id: string; path: string } | null> => {
      const formData = new FormData();
      formData.append('file', blob, name);
      try {
        const data = await (
          await fetch('/media/upload-simple', {
            method: 'POST',
            body: formData,
          })
        ).json();
        return { id: data.id, path: data.path };
      } catch {
        return null;
      }
    },
    [fetch]
  );

  const handleTrimmedExport = useCallback(
    async (blob: Blob) => {
      setTrimmedBlob(blob);
      setTab('formats');
    },
    []
  );

  const handleUploadTrimmedToPost = useCallback(async () => {
    if (!trimmedBlob) return;
    setIsUploading(true);
    const result = await uploadBlob(trimmedBlob, `trimmed-${Date.now()}.mp4`);
    setIsUploading(false);
    if (result) {
      setMedia([result]);
      closeModal();
    } else {
      toaster.show(t('video_upload_failed', 'Upload nie powiódł się.'), 'warning');
    }
  }, [trimmedBlob, uploadBlob, setMedia, closeModal, toaster, t]);

  const handleFormatsExported = useCallback(
    async (results: { format: VideoFormat; blob: Blob }[]) => {
      setIsUploading(true);
      const uploaded: { id: string; path: string }[] = [];
      for (const r of results) {
        const result = await uploadBlob(r.blob, `${r.format.key}-${Date.now()}.mp4`);
        if (result) uploaded.push(result);
      }
      setIsUploading(false);
      if (uploaded.length) {
        setMedia(uploaded);
        closeModal();
      } else {
        toaster.show(t('video_upload_failed', 'Upload nie powiódł się.'), 'warning');
      }
    },
    [uploadBlob, setMedia, closeModal, toaster, t]
  );

  if (!browserSupported) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <div className="text-sm text-textColor">
          ⚠️{' '}
          {t(
            'video_unsupported_browser',
            'Twoja przeglądarka nie wspiera edycji wideo (WebCodecs). Użyj Chrome, Edge lub Safari 16.4+.'
          )}
        </div>
        <Button onClick={closeModal}>{t('close', 'Zamknij')}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-newBgColorInner rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-newBorder">
        <div className="flex gap-3">
          <button
            onClick={() => setTab('trim')}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              tab === 'trim'
                ? 'bg-newAccent text-white'
                : 'bg-newColColor text-textColor hover:bg-forth'
            }`}
          >
            ✂ {t('video_tab_trim', 'Wytnij')}
          </button>
          <button
            onClick={() => setTab('formats')}
            disabled={!trimmedBlob}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              tab === 'formats'
                ? 'bg-newAccent text-white'
                : 'bg-newColColor text-textColor hover:bg-forth'
            } disabled:opacity-40`}
          >
            📐 {t('video_tab_formats', 'Formaty')}
          </button>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-3 py-1 rounded bg-newColColor text-textColor hover:bg-forth transition-colors"
          >
            📁 {t('video_choose_file', 'Wybierz wideo')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'trim' && (
          <VideoTrimmer file={file} onTrimmed={handleTrimmedExport} />
        )}
        {tab === 'formats' && (
          <VideoMultiFormat
            source={trimmedBlob}
            onExported={handleFormatsExported}
          />
        )}
      </div>

      {trimmedBlob && tab === 'trim' && (
        <div className="px-4 py-2 border-t border-newBorder flex items-center justify-between">
          <div className="text-[11px] text-textColor/60">
            {t('video_trim_done', 'Wycięto. Kliknij dalej, aby wybrać formaty lub użyć pojedynczego pliku.')}
          </div>
          <Button
            loading={isUploading}
            onClick={handleUploadTrimmedToPost}
            className="!h-[28px] !text-xs"
          >
            {t('video_use_in_post', 'Użyj w poście')}
          </Button>
        </div>
      )}
    </div>
  );
};
