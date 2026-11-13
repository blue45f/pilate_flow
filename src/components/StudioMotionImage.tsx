import { useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { getLosslessMotionFrame, MOTION_FRAME_HEIGHT, MOTION_FRAME_WIDTH } from '../utils/motionFrameAssets';

/** Keeps original PNG fallback and decoded dimensions; compression changes no pose pixels. */
export function StudioMotionImage({ src, alt, onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const optimized = getLosslessMotionFrame(src);
  const [failedSource, setFailedSource] = useState<string>();
  return (
    <picture className="pf-motion-picture" style={{ display: 'contents' }}>
      {optimized && failedSource !== optimized && <source type="image/webp" srcSet={optimized} />}
      <img
        width={optimized ? MOTION_FRAME_WIDTH : undefined}
        height={optimized ? MOTION_FRAME_HEIGHT : undefined}
        decoding="async"
        loading="lazy"
        {...props}
        src={src}
        alt={alt}
        onError={(event) => {
          if (optimized && failedSource !== optimized) setFailedSource(optimized);
          else onError?.(event);
        }}
      />
    </picture>
  );
}
