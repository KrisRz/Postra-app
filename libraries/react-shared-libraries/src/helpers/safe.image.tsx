'use client';

import { FC } from 'react';
import { ImageProps } from 'next/image';

type SafeImageProps = Omit<ImageProps, 'src'> & {
  src: string;
  fallbackSrc?: string;
};

const SafeImage: FC<SafeImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  style,
  fallbackSrc = '/no-picture.jpg',
  ...rest
}) => {
  return (
    <img
      src={src}
      alt={alt?.toString() || ''}
      width={typeof width === 'number' ? width : undefined}
      height={typeof height === 'number' ? height : undefined}
      className={className}
      style={style}
      // A dead/expired src (e.g. an old Facebook CDN avatar that now 403s)
      // would otherwise render a broken image. Swap to the placeholder once.
      onError={(e) => {
        const img = e.currentTarget;
        if (!fallbackSrc || img.getAttribute('src') === fallbackSrc) {
          return;
        }
        img.src = fallbackSrc;
      }}
    />
  );
};

export default SafeImage;
