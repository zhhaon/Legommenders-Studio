import { tr, useLocale } from '@/i18n';
import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import { Trash2, Download } from 'lucide-react';

export function ResourceButton(_props: { component: string; params?: Record<string, unknown> }) {
  useLocale();
  return <button className="shrink-0 rounded p-1 text-muted" disabled title={tr('demo.disabled')} aria-label={tr('demo.disabled')}><Download size={14} /></button>;
}


export function DeleteResourceDialog({ onCancel, onDelete, title = tr("ui.delete_local_resources__ca91fd"), description = tr("ui.these_local_resources_will_be_deleted_components_tha_40551d") }: { onCancel: () => void; onDelete: () => void; title?: string; description?: string }) {
  useLocale();
  const cancel = useRef<HTMLButtonElement>(null);
  const remove = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    return () => previous?.focus();
  }, []);
  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[100] grid place-items-center p-6"
      onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onCancel(); }}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
        if (event.key === 'Tab') {
          event.preventDefault();
          (document.activeElement === cancel.current ? remove.current : cancel.current)?.focus();
        }
      }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="resource-delete-title" aria-describedby="resource-delete-description"
        className="w-full max-w-[420px] rounded-xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line p-4">
          <div className="rounded-lg bg-red-500/10 p-2 text-red-500"><Trash2 size={18} /></div>
          <h3 id="resource-delete-title" className="text-sm font-bold">{title}</h3>
        </div>
        <p id="resource-delete-description" className="p-4 text-[11px] leading-relaxed text-muted">
          {description}
        </p>
        <div className="flex justify-end gap-2 border-t border-line p-3">
          <button ref={cancel} className="tool-btn outline" onClick={onCancel}>{tr("ui.cancel_77dfd2")}</button>
          <button ref={remove} className="tool-btn !border-red-600 !bg-red-600 !text-white hover:!bg-red-700" onClick={onDelete}>{tr("ui.delete_f6fdbe")}</button>
        </div>
      </div>
    </div>, document.body,
  );
}
