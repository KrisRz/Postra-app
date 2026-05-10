'use client';

import dynamic from 'next/dynamic';

const PostDesignEditor = dynamic(
  () =>
    import(
      '@gitroom/frontend/components/design-editor/post-design-editor'
    ),
  { ssr: false }
);

export const StudioComponent = () => {
  return (
    <div className="h-[calc(100vh-110px)] w-full rounded-lg overflow-hidden border border-newBorder">
      <PostDesignEditor
        mode="studio"
        setMedia={() => {}}
        closeModal={() => {}}
      />
    </div>
  );
};
