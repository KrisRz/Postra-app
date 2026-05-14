'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

const PostDesignEditor = dynamic(
  () =>
    import(
      '@gitroom/frontend/components/design-editor/post-design-editor'
    ),
  { ssr: false }
);

export const StudioComponent = () => {
  const searchParams = useSearchParams();
  const mediaId = searchParams.get('mediaId') ?? undefined;

  return (
    <div className="h-[calc(100vh-110px)] w-full rounded-lg overflow-hidden border border-newBorder">
      <PostDesignEditor
        mode="studio"
        loadMediaId={mediaId}
        setMedia={() => {}}
        closeModal={() => {}}
      />
    </div>
  );
};
