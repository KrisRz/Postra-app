'use client';

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { VideoTrimmer } from './video-trimmer';
import { VideoMultiFormat, VideoFormat } from './video-multi-format';
import { VideoCaptions } from './video-captions';
import { VideoStock } from './video-stock';
import { VideoTextOverlay } from './video-text-overlay';
import { VideoSlideshow } from './video-slideshow';
import { VideoLibraryPicker, LibraryMedia } from './video-library-picker';
import {
  fetchLibraryVideoAsFile,
  VideoTooLargeError,
} from './load-library-media';

interface VideoStudioProps {
  setMedia: (params: { id: string; path: string }[]) => void;
  closeModal: () => void;
}

type Tab = 'trim' | 'formats' | 'captions' | 'stock' | 'text' | 'slideshow';

export const VideoStudio: FC<VideoStudioProps> = ({ setMedia, closeModal }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const mediaDirectory = useMediaDirectory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [trimmedBlob, setTrimmedBlob] = useState<Blob | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<{ id: string; path: string } | null>(null);
  const [tab, setTab] = useState<Tab>('trim');
  const [isUploading, setIsUploading] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isImportingLibrary, setIsImportingLibrary] = useState(false);

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
    setUploadedMedia(null);
    setTab('trim');
  };

  const loadFromLibrary = useCallback(
    async (media: LibraryMedia) => {
      setIsImportingLibrary(true);
      try {
        const loaded = await fetchLibraryVideoAsFile(mediaDirectory.set(media.path));
        setFile(loaded);
        setTrimmedBlob(null);
        // It already lives in the library, so remember its id/path — "Użyj w
        // poście" and captions can then skip re-uploading the same bytes.
        setUploadedMedia({ id: media.id, path: media.path });
        setTab('trim');
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
        setIsImportingLibrary(false);
      }
    },
    [mediaDirectory, toaster, t]
  );

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
      setUploadedMedia(null);
    },
    []
  );

  const ensureUploaded = useCallback(async (): Promise<{ id: string; path: string } | null> => {
    if (uploadedMedia) return uploadedMedia;
    if (!trimmedBlob) return null;
    setIsUploading(true);
    const result = await uploadBlob(trimmedBlob, `trimmed-${Date.now()}.mp4`);
    setIsUploading(false);
    if (result) setUploadedMedia(result);
    return result;
  }, [uploadedMedia, trimmedBlob, uploadBlob]);

  const handleSwitchToCaptions = useCallback(async () => {
    const m = await ensureUploaded();
    if (!m) {
      toaster.show(t('video_upload_first', 'Najpierw wytnij i upload wideo.'), 'warning');
      return;
    }
    setTab('captions');
  }, [ensureUploaded, toaster, t]);

  const handleUseInPost = useCallback(async () => {
    if (uploadedMedia) {
      setMedia([uploadedMedia]);
      closeModal();
      return;
    }
    if (!trimmedBlob) return;
    const m = await ensureUploaded();
    if (m) {
      setMedia([m]);
      closeModal();
    } else {
      toaster.show(t('video_upload_failed', 'Upload nie powiódł się.'), 'warning');
    }
  }, [uploadedMedia, trimmedBlob, ensureUploaded, setMedia, closeModal, toaster, t]);

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

  const handleCaptionedReady = useCallback(
    (newMedia: { id: string; path: string }) => {
      setUploadedMedia(newMedia);
      setMedia([newMedia]);
      closeModal();
    },
    [setMedia, closeModal]
  );

  const handleStockImported = useCallback(
    (newMedia: { id: string; path: string }) => {
      setMedia([newMedia]);
      closeModal();
    },
    [setMedia, closeModal]
  );

  const handleComposedReady = useCallback(
    (newMedia: { id: string; path: string }) => {
      setMedia([newMedia]);
      closeModal();
    },
    [setMedia, closeModal]
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

  const tabs: { key: Tab; label: string; icon: string; needsTrim: boolean; onClick?: () => void }[] = [
    { key: 'trim', label: t('video_tab_trim', 'Wytnij'), icon: '✂', needsTrim: false },
    { key: 'formats', label: t('video_tab_formats', 'Formaty'), icon: '📐', needsTrim: true },
    { key: 'captions', label: t('video_tab_captions', 'Napisy AI'), icon: '💬', needsTrim: true, onClick: handleSwitchToCaptions },
    { key: 'stock', label: t('video_tab_stock', 'Stock B-roll'), icon: '🎞', needsTrim: false },
    { key: 'text', label: t('video_tab_text', 'Tekst'), icon: '✍️', needsTrim: false },
    { key: 'slideshow', label: t('video_tab_slideshow', 'Zdjęcia→wideo'), icon: '🖼', needsTrim: false },
  ];

  return (
    <div className="flex flex-col h-full bg-white/[0.03] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-newBorder">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tDef) => (
            <button
              key={tDef.key}
              onClick={() => (tDef.onClick ? tDef.onClick() : setTab(tDef.key))}
              disabled={tDef.needsTrim && !trimmedBlob}
              className={`text-xs px-3 py-1 rounded transition-colors ${
                tab === tDef.key
                  ? 'bg-newAccent text-white'
                  : 'bg-newColColor text-textColor hover:bg-forth'
              } disabled:opacity-40`}
            >
              {tDef.icon} {tDef.label}
            </button>
          ))}
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
            📁 {t('video_source_disk', 'Z dysku')}
          </button>
          <button
            onClick={() => setShowLibrary(true)}
            className="text-xs px-3 py-1 rounded bg-newColColor text-textColor hover:bg-forth transition-colors"
          >
            🗂 {t('video_source_library', 'Z biblioteki')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative">
        {showLibrary && (
          <div className="absolute inset-0 z-[20]">
            <VideoLibraryPicker
              onPick={loadFromLibrary}
              onClose={() => setShowLibrary(false)}
              busy={isImportingLibrary}
            />
          </div>
        )}
        {tab === 'trim' && (
          <VideoTrimmer file={file} onTrimmed={handleTrimmedExport} />
        )}
        {tab === 'formats' && (
          <VideoMultiFormat source={trimmedBlob} onExported={handleFormatsExported} />
        )}
        {tab === 'captions' && (
          <VideoCaptions mediaId={uploadedMedia?.id ?? null} onCaptioned={handleCaptionedReady} />
        )}
        {tab === 'stock' && (
          <VideoStock onImported={handleStockImported} />
        )}
        {tab === 'text' && <VideoTextOverlay onReady={handleComposedReady} />}
        {tab === 'slideshow' && <VideoSlideshow onReady={handleComposedReady} />}
      </div>

      {trimmedBlob && tab === 'trim' && (
        <div className="px-4 py-2 border-t border-newBorder flex items-center justify-between">
          <div className="text-[11px] text-textColor/60">
            {t('video_trim_done', 'Wycięto. Kliknij dalej, aby wybrać formaty lub użyć pojedynczego pliku.')}
          </div>
          <Button
            loading={isUploading}
            onClick={handleUseInPost}
            className="!h-[28px] !text-xs"
          >
            {t('video_use_in_post', 'Użyj w poście')}
          </Button>
        </div>
      )}
    </div>
  );
};
