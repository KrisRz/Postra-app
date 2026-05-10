'use client';

import dynamic from 'next/dynamic';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const PostDesignEditor = dynamic(
  () =>
    import(
      '@gitroom/frontend/components/design-editor/post-design-editor'
    ),
  { ssr: false }
);

export const StudioComponent = () => {
  const t = useT();
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-110px)] w-full">
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-[20px] font-[700] text-textColor">
            {t('studio', 'Studio')}
          </h1>
          <p className="text-[12px] text-textColor/60">
            {t(
              'studio_subtitle',
              'Projektuj grafiki dla social media — AI Generuj, Brand Kit, eksport PNG'
            )}
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-newBorder">
        <PostDesignEditor
          mode="studio"
          setMedia={() => {}}
          closeModal={() => {}}
        />
      </div>
    </div>
  );
};
