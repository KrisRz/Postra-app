import { FC } from 'react';
import { clsx } from 'clsx';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
export const VideoOrImage: FC<{
  src: string;
  autoplay: boolean;
  isContain?: boolean;
  imageClassName?: string;
  videoClassName?: string;
  // Native player chrome (seek bar, time/duration, play-pause, volume,
  // fullscreen). Off by default so social previews stay clean autoplay loops.
  controls?: boolean;
}> = (props) => {
  const { src, autoplay, isContain, imageClassName, videoClassName, controls } =
    props;
  if (hasExtension(src, 'mp4')) {
    return (
      <video
        src={src}
        autoPlay={autoplay}
        controls={!!controls}
        className={clsx('w-full h-full', videoClassName)}
        muted={true}
        // With controls visible let the clip play through (so the seek bar
        // spans the full duration) instead of silently looping.
        loop={!controls}
      />
    );
  }
  return (
    <img
      className={clsx(
        isContain ? 'object-contain' : 'object-cover',
        'w-full h-full',
        imageClassName
      )}
      src={src}
    />
  );
};
