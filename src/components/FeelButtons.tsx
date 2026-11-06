import type { Feel } from '../data/types';

interface Props {
  value?: Feel;
  onChange: (feel: Feel) => void;
}

const OPTIONS: ReadonlyArray<{ feel: Feel; label: string; cls: string }> = [
  { feel: 'bad', label: 'Bad', cls: 'bg-bad/10 border-bad/60 text-bad' },
  { feel: 'fine', label: 'Fine', cls: 'bg-surface border-line text-ink' },
  { feel: 'great', label: 'Great', cls: 'bg-ok/10 border-ok/60 text-ok' },
];

export function FeelButtons({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 justify-stretch">
      {OPTIONS.map((opt) => {
        const selected = value === opt.feel;
        return (
          <button
            key={opt.feel}
            type="button"
            onClick={() => onChange(opt.feel)}
            className={`
              flex-1 h-14 rounded-xl border text-lg font-medium
              ${opt.cls}
              ${selected ? 'ring-2 ring-accent' : 'opacity-80'}
              active:opacity-60
            `}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
