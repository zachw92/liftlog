import { useRef, type PointerEvent } from 'react';

interface Options {
  onTap: () => void;
  onLongPress: () => void;
  thresholdMs?: number;
}

export function useLongPress({ onTap, onLongPress, thresholdMs = 500 }: Options) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggered = useRef(false);
  const moved = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const start = (e: PointerEvent) => {
    triggered.current = false;
    moved.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    timer.current = setTimeout(() => {
      triggered.current = true;
      onLongPress();
    }, thresholdMs);
  };

  const move = (e: PointerEvent) => {
    if (!startPos.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.hypot(dx, dy) > 10) {
      moved.current = true;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    }
  };

  const end = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!triggered.current && !moved.current) onTap();
    startPos.current = null;
  };

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    startPos.current = null;
  };

  return {
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}
