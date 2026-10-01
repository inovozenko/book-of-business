import type {CSSProperties} from 'react';

import styles from './Skeleton.module.scss';

export interface SkeletonProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  radius?: CSSProperties['borderRadius'];
  className?: string;
}

/** Placeholder block shown while content loads. Hidden from screen readers; the container announces the loading. */
export function Skeleton({width = '100%', height = 16, radius = 4, className}: SkeletonProps) {
  return (
    <span className={[styles.skeleton, className].filter(Boolean).join(' ')} aria-hidden="true" style={{width, height, borderRadius: radius}} />
  );
}
