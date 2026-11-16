import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { tr } from '@/i18n';

/** A keyboard-accessible detail layer with focus trapping and restoration. */
export function BenchmarkDrawer({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, summary, [tabindex="0"]') || []).filter(el => el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return createPortal(<div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25 backdrop-blur-[2px]" onClick={onClose}>
    <div ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="benchmark-detail-title" className={`flex h-full flex-col border-l border-line bg-surface shadow-2xl outline-none ${wide ? 'w-[min(1280px,96vw)]' : 'w-[min(780px,95vw)]'}`} onClick={event => event.stopPropagation()}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line p-5"><div><p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Benchmark</p><h2 id="benchmark-detail-title" className="text-sm font-bold">{title}</h2></div><button className="tool-btn outline" onClick={onClose} aria-label={tr('benchmark.close')}><X size={16} /></button></header>
      <div className="min-h-0 flex-1 overflow-auto p-5 text-[11px]">{children}</div>
    </div>
  </div>, document.body);
}
