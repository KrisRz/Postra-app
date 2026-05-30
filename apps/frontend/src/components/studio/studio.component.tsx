'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const PostDesignEditor = dynamic(
  () =>
    import('@gitroom/frontend/components/design-editor/post-design-editor'),
  { ssr: false }
);

const VideoStudio = dynamic(
  () =>
    import('@gitroom/frontend/components/video-studio/video-studio').then(
      (m) => m.VideoStudio
    ),
  { ssr: false }
);

type StudioMode = 'graphic' | 'video';

// Standalone /studio is a workspace — there's no post to attach to, so
// setMedia/closeModal are no-ops (the editors expose their own Download).
const noop = () => {};

export const StudioComponent = () => {
  const searchParams = useSearchParams();
  const mediaId = searchParams.get('mediaId') ?? undefined;
  const t = useT();
  const [mode, setMode] = useState<StudioMode>('graphic');

  const tabs: { key: StudioMode; label: string }[] = [
    { key: 'graphic', label: t('studio_tab_graphic', '🎨 Grafika') },
    { key: 'video', label: t('studio_tab_video', '🎬 Wideo') },
  ];

  return (
    <div className="h-[calc(100vh-110px)] w-full flex flex-col gap-2">
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
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
      <div className="flex-1 min-h-0 w-full rounded-lg overflow-hidden border border-newBorder">
        {mode === 'graphic' ? (
          <PostDesignEditor
            mode="studio"
            loadMediaId={mediaId}
            setMedia={noop}
            closeModal={noop}
          />
        ) : (
          <VideoStudio setMedia={noop} closeModal={noop} />
        )}
      </div>
    </div>
  );
};
