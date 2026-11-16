import { DatasetInputSummary } from './DatasetInputSummary';
import { visiblePropertyParameters } from '@/utils/propertyParameters';
import { tokenResources } from '@/utils/tokenResources';
import { categoryLabel, componentText, paramLabel, parameterDefaultText } from '@/i18n/display';
import { text, tr, useLocale } from '@/i18n';
import i18next from '@/i18n';
import { ResourceButton } from './ResourceButton';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Info, Search, X } from 'lucide-react';
import { useStudio } from '@/store/graphStore';
import type { ComponentSpec } from '@/types/catalog';
import { CATEGORY_COLORS, iconFor } from '@/utils/ui';

export function ComponentLibrary() {
  const locale = useLocale();
  const components = useStudio((s) => s.catalog?.components || []);
  const categories = useStudio((s) => s.categories);
  const collapsed = useStudio((s) => s.libraryCollapsed);
  const toggleCategory = useStudio((s) => s.toggleCategory);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<ComponentSpec | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return components;
    return components.filter((component) =>
      `${component.name} ${i18next.getFixedT("zh-CN")("catalog." + component.id + ".name", { defaultValue: component.name })} ${componentText(component, 'name')} ${component.id} ${componentText(component, 'description')} ${component.category}`.toLowerCase().includes(needle),
    );
  }, [components, query, locale]);

  const grouped = useMemo(() => {
    const byCategory: Record<string, ComponentSpec[]> = {};
    for (const component of filtered) (byCategory[component.category] ||= []).push(component);
    return byCategory;
  }, [filtered]);

  return (
    <aside className="panel flex min-h-0 flex-col border-r">
      <div className="border-b border-line px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">{tr("ui.component_library_edbe6c")}</h2>
          <span className="badge">{components.length}</span>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr("ui.search_components__e05390")}
            className="field-input !pl-8 !pr-7"
            aria-label={tr("ui.search_components_8834df")}
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
                <span className="flex-1 text-[11px] font-semibold">{categoryLabel(category.id)}</span>
                <span className="text-[10px] text-muted">{items.length}</span>
              </button>
              {isOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {items.map((component) => {
                    const Icon = iconFor(component.icon);
                    return (
                      <div
                        key={component.id}
                        data-component-id={component.id}
                        className="lib-item group"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('application/legommenders-component', component.id);
                          event.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => setDetail(component)}
                        title={tr("ui.drag_onto_the_canvas_click_for_details_381990")}
                      >
                        <div className="icon-tile" style={{ background: category.color }}>
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[11.5px] font-semibold leading-tight">{componentText(component, 'name')}</span>
                            {component.conceptual && <span className="badge !px-1 !py-0 !text-[8px] text-amber-600">{tr("ui.concept_04923d")}</span>}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[9.5px] leading-snug text-muted">{componentText(component, 'description')}</p>
                        </div>
                        {['dataset', 'item_encoder'].includes(component.category) && <ResourceButton component={component.id} />}
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
          <div className="px-3 py-8 text-center text-[11px] text-muted"> {tr("ui.no_components_match__4ebc48")}{query}”.
          </div>
        )}
      </div>

      {detail && <ComponentDetail component={detail} onClose={() => setDetail(null)} />}
    </aside>
  );
}

function ComponentDetail({ component, onClose }: { component: ComponentSpec; onClose: () => void }) {
  useLocale();
  const dropComponent = useStudio((s) => s.dropComponent);
  const hasSameRole = useStudio(s => s.graph.nodes.some(node => s.components[node.component]?.role === component.role));
  const item = useStudio(state => state.graph.nodes.find(node => node.component.startsWith('item.')));
  const itemSpec = useStudio(state => state.components[item?.component || '']);
  const { managedByItem } = tokenResources(undefined, component, item, itemSpec);
  const parameters = visiblePropertyParameters(component, managedByItem);
  const color = CATEGORY_COLORS[component.category];
  const Icon = iconFor(component.icon);
  const description = componentText(component, 'description')
    .replace(/\s+backed by `[A-Za-z_]\w*`\.$/, '.')
    .replace(/，使用 [A-Za-z_]\w*。$/, '。');
  return (
    <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center p-6" onClick={onClose}>
      <div className="w-[460px] max-h-[80vh] overflow-y-auto rounded-xl border border-line bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 border-b border-line p-4" style={{ background: `${color}12` }}>
          <div className="icon-tile !h-9 !w-9" style={{ background: color }}><Icon size={18} /></div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold">{componentText(component, 'name')}</h3>
            <p className="text-[10px] uppercase tracking-wide" style={{ color }}>{tr('componentDetail.category.' + component.category, {}, component.category.replace(/_/g, ' '))} · {component.id}</p>
          </div>
          <button className="tool-btn !h-7 !px-2" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="space-y-3 p-4 text-[11px] leading-relaxed">
          <p>{description}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 font-semibold">{tr("ui.inputs_bbcf64")}</p>
              {component.inputs.length ? component.inputs.map((port) => (
                <p key={port.name} className="text-[10px] text-muted">· {tr('portNames.' + port.name, {}, port.name)}: {tr('portTypes.' + port.type, {}, port.type)}{port.required ? ' *' : ''}</p>
              )) : <p className="text-[10px] text-muted">{tr("ui.none_71f8e7")}</p>}
            </div>
            <div>
              <p className="mb-1 font-semibold">{tr("ui.outputs_7835db")}</p>
              {component.outputs.map((port) => (
                <p key={port.name} className="text-[10px] text-muted">· {tr('portNames.' + port.name, {}, port.name)}: {tr('portTypes.' + port.type, {}, port.type)}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 font-semibold">{tr("ui.parameters__86599e")}{parameters.length})</p>
            {!parameters.length && <p className="text-[10px] text-muted">{tr('componentDetail.noParameters')}</p>}
            {parameters.length > 0 && <div className="max-h-32 overflow-y-auto rounded-md border border-line">
              {parameters.map((param) => (
                <div key={param.name} data-param-name={param.name} data-property-parameter={param.name} className="flex justify-between gap-2 border-b border-line px-2 py-1 last:border-0">
                  <span className="font-mono text-[10px]">{component.role === 'dataset' && param.name === 'item_inputs' ? tr('ui.dataset_item_inputs_368dcb') : paramLabel(param.name)}</span>
                  {component.role === 'dataset' && param.name === 'item_inputs'
                    ? <DatasetInputSummary component={component} />
                    : <span className="text-[10px] text-muted">{text(param.type)} {tr("ui._default_0044b4")} <span data-default-value>{parameterDefaultText(component, param)}</span></span>}
                </div>
              ))}
            </div>}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line p-3">
          <button className="tool-btn outline" onClick={onClose}>{tr("ui.close_bbfa77")}</button>
          <button className="tool-btn primary" onClick={() => {
            const state = useStudio.getState();
            const matches = state.graph.nodes.filter(node => state.components[node.component]?.role === component.role);
            const target = matches.find(node => node.id === state.selectedNodeId) || matches[0];
            dropComponent(component.id, { x: 260 + Math.random() * 100, y: 160 + Math.random() * 100 }, target?.id);
            onClose();
          }}>{hasSameRole ? tr("ui.replace_component_46b0df") : tr("ui.add_to_canvas_d9ac65")}</button>
        </div>
      </div>
    </div>
  );
}
