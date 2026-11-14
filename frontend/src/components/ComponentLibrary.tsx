import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Info, Search, X } from 'lucide-react';
import { useStudio } from '@/store/graphStore';
import type { ComponentSpec } from '@/types/catalog';
import { CATEGORY_COLORS, iconFor } from '@/utils/ui';

export function ComponentLibrary() {
  const components = useStudio((s) => s.catalog?.components || []);
  const categories = useStudio((s) => s.categories);
  const collapsed = useStudio((s) => s.libraryCollapsed);
  const toggleCategory = useStudio((s) => s.toggleCategory);
  const addNode = useStudio((s) => s.addNode);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<ComponentSpec | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return components;
    return components.filter((component) =>
      `${component.name} ${component.id} ${component.description} ${component.category}`.toLowerCase().includes(needle),
    );
  }, [components, query]);

  const grouped = useMemo(() => {
    const byCategory: Record<string, ComponentSpec[]> = {};
    for (const component of filtered) (byCategory[component.category] ||= []).push(component);
    return byCategory;
  }, [filtered]);

  return (
    <aside className="panel flex min-h-0 flex-col border-r">
      <div className="border-b border-line px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">Component Library</h2>
          <span className="badge">{components.length}</span>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search components…"
            className="field-input !pl-8 !pr-7"
            aria-label="Search components"
          />
          {query && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink" onClick={() => setQuery('')}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {categories.map((category) => {
          const items = grouped[category.id] || [];
          if (!items.length) return null;
          const isOpen = !!query.trim() || !collapsed[category.id];
          return (
            <section key={category.id} className="mb-2">
              <button
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--hover)]"
                onClick={() => toggleCategory(category.id)}
              >
                {isOpen ? <ChevronDown size={13} className="text-muted" /> : <ChevronRight size={13} className="text-muted" />}
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: category.color }} />
                <span className="flex-1 text-[11px] font-semibold">{category.label}</span>
                <span className="text-[10px] text-muted">{items.length}</span>
              </button>
              {isOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {items.map((component) => {
                    const Icon = iconFor(component.icon);
                    return (
                      <div
                        key={component.id}
                        className="lib-item group"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('application/legommenders-component', component.id);
                          event.dataTransfer.effectAllowed = 'copy';
                        }}
                        onDoubleClick={() => addNode(component.id, { x: 220 + Math.random() * 120, y: 140 + Math.random() * 120 })}
                        onClick={() => setDetail(component)}
                        title="Drag onto the canvas · double-click to add · click for details"
                      >
                        <div className="icon-tile" style={{ background: category.color }}>
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[11.5px] font-semibold leading-tight">{component.name}</span>
                            {component.conceptual && <span className="badge !px-1 !py-0 !text-[8px] text-amber-600">CONCEPT</span>}
                            {component.status === 'available' && <span className="badge !px-1 !py-0 !text-[8px]">AUTO</span>}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[9.5px] leading-snug text-muted">{component.description}</p>
                        </div>
                        <Info size={11} className="mt-1 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
        {!filtered.length && (
          <div className="px-3 py-8 text-center text-[11px] text-muted">
            No components match “{query}”.
          </div>
        )}
      </div>

      {detail && <ComponentDetail component={detail} onClose={() => setDetail(null)} />}
    </aside>
  );
}

function ComponentDetail({ component, onClose }: { component: ComponentSpec; onClose: () => void }) {
  const addNode = useStudio((s) => s.addNode);
  const color = CATEGORY_COLORS[component.category];
  const Icon = iconFor(component.icon);
  return (
    <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center p-6" onClick={onClose}>
      <div className="w-[460px] max-h-[80vh] overflow-y-auto rounded-xl border border-line bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 border-b border-line p-4" style={{ background: `${color}12` }}>
          <div className="icon-tile !h-9 !w-9" style={{ background: color }}><Icon size={18} /></div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold">{component.name}</h3>
            <p className="text-[10px] uppercase tracking-wide" style={{ color }}>{component.category.replace(/_/g, ' ')} · {component.id}</p>
          </div>
          <button className="tool-btn !h-7 !px-2" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="space-y-3 p-4 text-[11px] leading-relaxed">
          <p>{component.description}</p>
          <div className="rounded-lg border border-line bg-[var(--hover)] p-3">
            <p className="font-semibold">Implementation</p>
            <p className="mt-1 text-muted">{component.detail}</p>
            {component.backend_class && <p className="mt-1 font-mono text-[10px] text-muted">{component.backend_class}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 font-semibold">Inputs</p>
              {component.inputs.length ? component.inputs.map((port) => (
                <p key={port.name} className="text-[10px] text-muted">· {port.name}: {port.type}{port.required ? ' *' : ''}</p>
              )) : <p className="text-[10px] text-muted">none</p>}
            </div>
            <div>
              <p className="mb-1 font-semibold">Outputs</p>
              {component.outputs.map((port) => (
                <p key={port.name} className="text-[10px] text-muted">· {port.name}: {port.type}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 font-semibold">Parameters ({component.parameters.length})</p>
            <div className="max-h-32 overflow-y-auto rounded-md border border-line">
              {component.parameters.map((param) => (
                <div key={param.name} className="flex justify-between gap-2 border-b border-line px-2 py-1 last:border-0">
                  <span className="font-mono text-[10px]">{param.name}</span>
                  <span className="text-[10px] text-muted">{param.type} · default {JSON.stringify(param.default)}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="rounded-md bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            {component.status_note}
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-line p-3">
          <button className="tool-btn outline" onClick={onClose}>Close</button>
          <button className="tool-btn primary" onClick={() => {
            addNode(component.id, { x: 260 + Math.random() * 100, y: 160 + Math.random() * 100 });
            onClose();
          }}>Add to canvas</button>
        </div>
      </div>
    </div>
  );
}
