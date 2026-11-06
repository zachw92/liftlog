import type { ReactNode } from 'react';

interface Props {
  tone?: 'info' | 'warn' | 'bad';
  children: ReactNode;
}

const TONE_CLASSES = {
  info: 'bg-accent/10 border-accent/40 text-ink',
  warn: 'bg-warn/10 border-warn/50 text-warn',
  bad: 'bg-bad/10 border-bad/50 text-bad',
} as const;

export function Banner({ tone = 'info', children }: Props) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${TONE_CLASSES[tone]}`}>
      {children}
    </div>
  );
}
