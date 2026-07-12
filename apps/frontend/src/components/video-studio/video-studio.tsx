'use client';

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/frontend/components/ui/button';
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
  assertVideoSize,
} from './load-library-media';

interface VideoStudioProps {
  setMedia: (params: { id: string; path: string }[]) => void;
  closeModal: () => void;
  /** Reports whether a clip is loaded — video work lives only in this
   *  component's state, so the host warns before unmounting it. */
  onDirtyChange?: (dirty: boolean) => void;
}

type Tab = 'trim' | 'formats' | 'captions' | 'stock' | 'text' | 'slideshow';

export const VideoStudio: FC<VideoStudioProps> = ({
  setMedia,
  closeModal,
  onDirtyChange,
}) => {
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
  // Goal-based start screen: tools are tabs, but users think in outcomes
  // ("photos → Reels"), so the content area opens on goals until one is
  // picked (or a tab is clicked directly). 🎯 in the header brings it back.
  const [showGoals, setShowGoals] = useState(true);
  // A goal that needs a clip first (captions) is parked here until the file
  // the user just picked lands in state.
  const [pendingGoal, setPendingGoal] = useState<Tab | null>(null);
  const [lastGoal, setLastGoal] = useState<Tab | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('postra:video-last-goal');
      if (saved) setLastGoal(saved as Tab);
    } catch {
      // private mode — no memory of the last goal, nothing breaks
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof (window as unknown as { VideoEncoder?: unknown }).VideoEncoder === 'undefined') {
      setBrowserSupported(false);
    }
  }, []);

  useEffect(() => {
    onDirtyChange?.(!!file);
    return () => onDirtyChange?.(false);
  }, [file, onDirtyChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      toaster.show(t('video_bad_type', 'Choose a video file (MP4, WebM, MOV).'), 'warning');
      return;
    }
    try {
      assertVideoSize(f);
    } catch {
      toaster.show(
        t('video_disk_too_big', 'File is too large to edit in the browser (200 MB limit).'),
        'warning'
      );
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
                'This clip is too large to edit in the browser (200 MB limit). Use a shorter one.'
              )
            : t('video_library_load_failed', 'Failed to load the video from the library.'),
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

  // Upload whatever clip is loaded — the trimmed version if present, otherwise
  // the original source — so captions don't force a trim first.
  const ensureUploaded = useCallback(async (): Promise<{ id: string; path: string } | null> => {
    if (uploadedMedia) return uploadedMedia;
    const blob = trimmedBlob ?? file;
    if (!blob) return null;
    setIsUploading(true);
    const result = await uploadBlob(blob, `clip-${Date.now()}.mp4`);
    setIsUploading(false);
    if (result) setUploadedMedia(result);
    return result;
  }, [uploadedMedia, trimmedBlob, file, uploadBlob]);

  const handleSwitchToCaptions = useCallback(async () => {
    const m = await ensureUploaded();
    if (!m) {
      toaster.show(
        t('video_upload_first', 'Load a video first (From disk / From library).'),
        'warning'
      );
      return;
    }
    setTab('captions');
  }, [ensureUploaded, toaster, t]);

  // Finish a clip-dependent goal once the picked file lands in state.
  useEffect(() => {
    if (!pendingGoal || !file) return;
    if (pendingGoal === 'captions') {
      handleSwitchToCaptions();
    } else {
      setTab(pendingGoal);
    }
    setPendingGoal(null);
  }, [file, pendingGoal, handleSwitchToCaptions]);

  const pickGoal = useCallback(
    (goal: Tab) => {
      setShowGoals(false);
      setLastGoal(goal);
      try {
        window.localStorage.setItem('postra:video-last-goal', goal);
      } catch {
        // private mode — fine
      }
      const hasSource = !!(file || trimmedBlob);
      if (goal === 'captions' && !hasSource) {
        // Captions need a clip — send the user straight to picking one and
        // continue to the captions tab as soon as it loads.
        setPendingGoal('captions');
        setTab('trim');
        fileInputRef.current?.click();
        return;
      }
      if (goal === 'captions') {
        handleSwitchToCaptions();
        return;
      }
      setTab(goal);
      if (goal === 'trim' && !hasSource) {
        fileInputRef.current?.click();
      }
    },
    [file, trimmedBlob, handleSwitchToCaptions]
  );

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
      toaster.show(t('video_upload_failed', 'Upload failed.'), 'warning');
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
        toaster.show(t('video_upload_failed', 'Upload failed.'), 'warning');
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
            'Your browser does not support video editing (WebCodecs). Use Chrome, Edge or Safari 16.4+.'
          )}
        </div>
        <Button onClick={closeModal}>{t('close', 'Close')}</Button>
      </div>
    );
  }

  // Formats/captions work on whatever clip is loaded — no forced trim first.
  const hasClip = !!(file || trimmedBlob);
  const tabs: { key: Tab; label: string; icon: string; needsClip: boolean; onClick?: () => void }[] = [
    { key: 'trim', label: t('video_tab_trim', 'Trim'), icon: '✂', needsClip: false },
    { key: 'formats', label: t('video_tab_formats', 'Formats'), icon: '📐', needsClip: true },
    { key: 'captions', label: t('video_tab_captions', 'AI Captions'), icon: '💬', needsClip: true, onClick: handleSwitchToCaptions },
    { key: 'stock', label: t('video_tab_stock', 'Stock B-roll'), icon: '🎞', needsClip: false },
    { key: 'text', label: t('video_tab_text', 'Text'), icon: '✍️', needsClip: false },
    { key: 'slideshow', label: t('video_tab_slideshow', 'Photos→video'), icon: '🖼', needsClip: false },
  ];

  return (
    <div className="flex flex-col h-full bg-white/[0.03] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-newBorder">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowGoals(true)}
            title={t('video_goals_back', 'What do you want to make? — back to goals')}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showGoals
                ? 'bg-newAccent text-white'
                : 'bg-newColColor text-textColor hover:bg-forth'
            }`}
          >
            🎯
          </button>
          {tabs.map((tDef) => (
            <button
              key={tDef.key}
              onClick={() => {
                setShowGoals(false);
                if (tDef.onClick) tDef.onClick();
                else setTab(tDef.key);
              }}
              disabled={tDef.needsClip && !hasClip}
              className={`text-xs px-3 py-1 rounded transition-colors ${
                tab === tDef.key && !showGoals
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
            📁 {t('video_source_disk', 'From disk')}
          </button>
          <button
            onClick={() => setShowLibrary(true)}
            className="text-xs px-3 py-1 rounded bg-newColColor text-textColor hover:bg-forth transition-colors"
          >
            🗂 {t('video_source_library', 'From library')}
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
        {showGoals && (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
            <div className="text-sm font-semibold text-textColor">
              {t('video_goals_title', 'What do you want to make?')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-[560px]">
              {(
                [
                  { goal: 'slideshow' as Tab, icon: '📸', label: t('video_goal_slideshow', 'Photos → Reels'), desc: t('video_goal_slideshow_desc', 'Turn a few photos into a video with motion') },
                  { goal: 'trim' as Tab, icon: '✂', label: t('video_goal_trim', 'Trim a video'), desc: t('video_goal_trim_desc', 'Cut a clip to the right length') },
                  { goal: 'captions' as Tab, icon: '💬', label: t('video_goal_captions', 'Add captions'), desc: t('video_goal_captions_desc', 'AI transcribes and burns in subtitles') },
                  { goal: 'text' as Tab, icon: '🅰', label: t('video_goal_text', 'Text on video'), desc: t('video_goal_text_desc', 'Overlay your message in brand style') },
                  { goal: 'stock' as Tab, icon: '🎞', label: t('video_goal_stock', 'Find stock B-roll'), desc: t('video_goal_stock_desc', 'Free clips to post or mix in') },
                ]
              ).map((g) => (
                <button
                  key={g.goal}
                  onClick={() => pickGoal(g.goal)}
                  className="relative text-left p-3 rounded-lg bg-newColColor hover:bg-forth hover:text-white text-textColor transition-colors group"
                >
                  <div className="text-sm font-semibold">
                    {g.icon} {g.label}
                  </div>
                  <div className="text-[11px] text-textColor/60 group-hover:text-white/70 mt-0.5">
                    {g.desc}
                  </div>
                  {lastGoal === g.goal && (
                    <span className="absolute top-1.5 right-2 text-[9px] uppercase tracking-wide text-textColor/40 group-hover:text-white/60">
                      {t('video_goal_last', 'last used')}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-textColor/40">
              {t('video_goals_hint', 'Same tools as the tabs above — this is just the quickest way in.')}
            </div>
          </div>
        )}
        {!showGoals && tab === 'trim' && (
          <VideoTrimmer file={file} onTrimmed={handleTrimmedExport} />
        )}
        {!showGoals && tab === 'formats' && (
          <VideoMultiFormat source={trimmedBlob ?? file} onExported={handleFormatsExported} />
        )}
        {!showGoals && tab === 'captions' && (
          <VideoCaptions
            mediaId={uploadedMedia?.id ?? null}
            source={trimmedBlob ?? file}
            onCaptioned={handleCaptionedReady}
          />
        )}
        {!showGoals && tab === 'stock' && (
          <VideoStock onImported={handleStockImported} />
        )}
        {!showGoals && tab === 'text' && <VideoTextOverlay onReady={handleComposedReady} />}
        {!showGoals && tab === 'slideshow' && <VideoSlideshow onReady={handleComposedReady} />}
      </div>

      {trimmedBlob && !showGoals && tab === 'trim' && (
        <div className="px-4 py-2 border-t border-newBorder flex items-center justify-between">
          <div className="text-[11px] text-textColor/60">
            {t('video_trim_done', 'Trimmed. Continue to pick formats or use the single file.')}
          </div>
          <Button
            loading={isUploading}
            onClick={handleUseInPost}
            className="!h-[28px] !text-xs"
          >
            {t('video_use_in_post', 'Use in post')}
          </Button>
        </div>
      )}
    </div>
  );
};
