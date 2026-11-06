import { useLongPress } from './useLongPress';
import type { Side } from '../data/types';

interface Props {
  weight: number;
  reps: number;
  done: boolean;
  side?: Side;
  kind: 'warmup' | 'work';
  isPlusSet: boolean;
  label?: string;
  repsToBeat?: number;
  onTap: () => void;
  onLongPress: () => void;
}

export function SetRow({
  weight,
  reps,
  done,
  side,
  kind,
  isPlusSet,
  label,
  repsToBeat,
  onTap,
  onLongPress,
}: Props) {
  const handlers = useLongPress({ onTap, onLongPress });
  const base =
    'w-full flex items-center justify-between px-4 py-4 rounded-xl border text-left select-none touch-manipulation';
  const stateCls = done
    ? 'bg-ok/15 border-ok/60'
    : kind === 'warmup'
      ? 'bg-surface/60 border-line'
      : 'bg-surface border-line';
  return (
    <div {...handlers} className={`${base} ${stateCls}`}>
      <div className="flex items-center gap-3 min-w-0">
        {side ? (
          <span className="text-xs px-2 py-0.5 rounded-md bg-line text-muted shrink-0">
            {side}
          </span>
        ) : null}
        {label ? <span className="text-sm text-muted">{label}</span> : null}
        <span className="text-lg font-medium tabular-nums">
          {weight > 0 ? `${weight}` : '—'} × {reps}
          {isPlusSet ? <span className="text-accent">+</span> : null}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {isPlusSet && repsToBeat !== undefined && !done ? (
          <span className="text-xs text-muted">to beat: {repsToBeat}</span>
        ) : null}
        <span
          className={`h-7 w-7 rounded-full border flex items-center justify-center text-sm ${
            done ? 'bg-ok text-bg border-ok' : 'border-line text-muted'
          }`}
        >
          {done ? '✓' : ''}
        </span>
      </div>
    </div>
  );
}
