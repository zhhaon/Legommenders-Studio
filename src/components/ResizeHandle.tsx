import { tr, useLocale } from '@/i18n';
import { useEffect, useRef, type PointerEvent } from 'react';

export function ResizeHandle({ label, horizontal = false, disabled = false, value, min, max, onChange }: {
  label: string; horizontal?: boolean; disabled?: boolean; value: number; min: number; max: number; onChange: (value: number) => void;
}) {
  useLocale();
  const drag = useRef<{ start: number; value: number } | null>(null);
  useEffect(() => { if (disabled) drag.current = null; }, [disabled]);
  const clamp = (next: number) => Math.max(min, Math.min(max, next));
  const coordinate = (event: PointerEvent) => horizontal ? event.clientY : event.clientX;
  const reverse = label !== 'Resize left panel';
  return <div role="separator" tabIndex={disabled ? -1 : 0} aria-hidden={disabled || undefined} aria-disabled={disabled || undefined}
    style={disabled ? { visibility: 'hidden', pointerEvents: 'none' } : undefined} aria-label={label} aria-orientation={horizontal ? 'horizontal' : 'vertical'}
    aria-valuenow={Math.round(value)} aria-valuemin={min} aria-valuemax={Math.round(max)}
    title={tr("ui.drag_to_resize_use_arrow_keys_to_adjust_725e89")}
    className={`panel-resizer ${horizontal ? 'panel-resizer-horizontal' : ''}`}
    onPointerDown={event => {
      if (disabled || event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { start: coordinate(event), value };
    }}
    onPointerMove={event => {
      if (disabled || !drag.current) return;
      onChange(clamp(drag.current.value + (coordinate(event) - drag.current.start) * (reverse ? -1 : 1)));
    }}
    onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
    onKeyDown={event => {
      if (disabled) return;
      const negative = horizontal ? 'ArrowUp' : 'ArrowLeft';
      const positive = horizontal ? 'ArrowDown' : 'ArrowRight';
      if (![negative, positive, 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      onChange(event.key === 'Home' ? min : event.key === 'End' ? max : clamp(value + (event.key === positive ? 16 : -16) * (reverse ? -1 : 1)));
    }} />;
}
