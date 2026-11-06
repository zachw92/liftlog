interface Props {
  value: number;
  step: number;
  min?: number;
  max?: number;
  suffix?: string;
  onChange: (next: number) => void;
}

export function Stepper({ value, step, min, max, suffix, onChange }: Props) {
  const clamp = (n: number) => {
    let v = n;
    if (min !== undefined && v < min) v = min;
    if (max !== undefined && v > max) v = max;
    return v;
  };
  const stepEffective = step > 0 ? step : 1;
  const dec = () => onChange(clamp(value - stepEffective));
  const inc = () => onChange(clamp(value + stepEffective));
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-label="decrement"
        onClick={dec}
        className="h-12 w-12 rounded-xl bg-surface border border-line text-2xl leading-none active:opacity-70"
      >
        −
      </button>
      <span className="min-w-[4ch] text-center text-lg font-medium tabular-nums">
        {value}
        {suffix ? <span className="text-muted ml-1">{suffix}</span> : null}
      </span>
      <button
        type="button"
        aria-label="increment"
        onClick={inc}
        className="h-12 w-12 rounded-xl bg-surface border border-line text-2xl leading-none active:opacity-70"
      >
        +
      </button>
    </div>
  );
}
