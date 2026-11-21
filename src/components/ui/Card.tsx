import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  animate?: boolean;
}

export function Card({ animate = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl bg-white p-5 shadow-soft',
        animate ? 'animate-fadeSlideIn' : '',
        className,
      ].join(' ')}
      {...props}
    />
  );
}
