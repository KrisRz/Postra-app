'use client';

import { FC, useState } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const PostDesignEditor = dynamic(
  () => import('@gitroom/frontend/components/design-editor/post-design-editor'),
  { ssr: false }
);

const VideoStudio = dynamic(
  () =>
    import('@gitroom/frontend/components/video-studio/video-studio').then(
      (m) => m.VideoStudio
    ),
  { ssr: false }
);

export type StudioMode = 'graphic' | 'video';

interface StudioWorkspaceProps {
  setMedia: (params: { id: string; path: string }[]) => void;
  closeModal: () => void;
  /**
   * 'composer' shows the editors' "Use in post" action (output flows straight
   * into the post being composed); 'studio' is the standalone workspace where
   * there's no post, so the graphic editor offers save-to-library / download.
   */
  graphicMode?: 'composer' | 'studio';
  loadMediaId?: string;
  initialMode?: StudioMode;
}

/**
 * Graphic | Video toggle hosting both editors behind one entry. Shared by the
 * standalone /studio route and the composer's "Studio" button so the two stay
 * in sync — the only difference is whether output goes to a post or the library.
 */
export const StudioWorkspace: FC<StudioWorkspaceProps> = ({
  setMedia,
  closeModal,
  graphicMode = 'composer',
  loadMediaId,
  initialMode = 'graphic',
}) => {
  const t = useT();
  const [mode, setMode] = useState<StudioMode>(initialMode);
  // Switching tabs unmounts the current editor. The graphic editor snapshots
  // itself to a restorable draft on unmount; video work has no such net, so a
  // loaded clip asks for confirmation before it's thrown away.
  const [videoDirty, setVideoDirty] = useState(false);
  const [pendingMode, setPendingMode] = useState<StudioMode | null>(null);

  const switchMode = (next: StudioMode) => {
    if (next === mode) return;
    if (mode === 'video' && videoDirty) {
      setPendingMode(next);
      return;
    }
    setPendingMode(null);
    setMode(next);
  };

  const tabs: { key: StudioMode; label: string }[] = [
    { key: 'graphic', label: t('studio_tab_graphic', '🎨 Graphics') },
    { key: 'video', label: t('studio_tab_video', '🎬 Video') },
  ];

  return (
    <div className="flex flex-col gap-2 h-full w-full">
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchMode(tab.key)}
            className={clsx(
              'h-9 px-4 text-sm rounded-lg border transition-colors',
              mode === tab.key
                ? 'bg-forth text-white border-forth'
                : 'bg-newColColor text-textColor border-newBorder hover:bg-forth/40'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {pendingMode !== null && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-textColor">
          <span>
            ⚠️{' '}
            {t(
              'studio_leave_video_confirm',
              'Leaving the Video tab discards your loaded clip and edits. Continue?'
            )}
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                setVideoDirty(false);
                setMode(pendingMode);
                setPendingMode(null);
              }}
              className="px-3 py-1 text-xs rounded bg-forth text-white hover:bg-forth/80 transition-colors"
            >
              {t('studio_leave_video_btn', 'Leave anyway')}
            </button>
            <button
              onClick={() => setPendingMode(null)}
              className="px-3 py-1 text-xs rounded bg-newColColor text-textColor hover:bg-forth/40 transition-colors"
            >
              {t('studio_stay_video_btn', 'Stay')}
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 w-full rounded-lg overflow-hidden border border-newBorder">
        {mode === 'graphic' ? (
          <PostDesignEditor
            mode={graphicMode}
            loadMediaId={loadMediaId}
            setMedia={setMedia}
            closeModal={closeModal}
          />
        ) : (
          <VideoStudio
            setMedia={setMedia}
            closeModal={closeModal}
            onDirtyChange={setVideoDirty}
          />
        )}
      </div>
    </div>
  );
};
