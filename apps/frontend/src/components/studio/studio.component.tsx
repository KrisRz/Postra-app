'use client';

import { useSearchParams } from 'next/navigation';
import { StudioWorkspace } from './studio-workspace';

// Standalone /studio is a workspace — there's no post to attach to, so
// setMedia/closeModal are no-ops (the editors expose their own save/download).
const noop = () => {};

export const StudioComponent = () => {
  const searchParams = useSearchParams();
  const mediaId = searchParams.get('mediaId') ?? undefined;

  return (
    <div className="h-[calc(100vh-110px)] w-full">
      <StudioWorkspace
        setMedia={noop}
        closeModal={noop}
        graphicMode="studio"
        loadMediaId={mediaId}
      />
    </div>
  );
};
