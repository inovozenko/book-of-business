import type {HTMLAttributes, ReactNode} from 'react';

import styles from './Card.module.scss';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Element to render: a figure for a chart, a section for a block with a heading. */
  as?: 'div' | 'section' | 'figure';
  children?: ReactNode;
}

/** White rounded surface that holds a chart or a table. */
export function Card({as: Element = 'div', className, children, ...rest}: CardProps) {
  return (
    <Element className={[styles.card, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Element>
  );
}
