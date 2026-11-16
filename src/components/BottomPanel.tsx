import { tr, useLocale } from '@/i18n';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useStudio, type BottomTab } from '@/store/graphStore';
import { ConsolePanel } from './panels/ConsolePanel';
import { ComparisonPanel } from './panels/ComparisonPanel';
import { GraphJsonPanel } from './panels/GraphJsonPanel';

const TABS: { id: BottomTab; label: string }[] = [
  { id: 'console', label: "ui.console_validation_82618f" },
  { id: 'yaml', label: "ui.yaml_preview_ad796c" },
  { id: 'training', label: "ui.training_b6fe7f" },
  { id: 'evaluation', label: "ui.evaluation_ff7513" },
  { id: 'comparison', label: "ui.comparison_2dfcf8" },
  { id: 'graph', label: 'Graph JSON' },
];

export function BottomPanel({ height = 264 }: { height?: number }) {
  useLocale();
  const tab = useStudio((s) => s.bottomTab);
  const open = useStudio((s) => s.bottomOpen);
  const setTab = useStudio((s) => s.setBottomTab);
  const setOpen = useStudio((s) => s.setBottomOpen);
  const validation = useStudio((s) => s.validation);
  const compileResult = useStudio((s) => s.compileResult);
  const training = useStudio((s) => s.training);
  const currentRun = useStudio((s) => s.currentRun);

  return (
    <div className="panel flex shrink-0 flex-col border-t" style={{ height: open ? height : 34 }}>
      <div className="flex h-[33px] shrink-0 items-center justify-between border-b border-line px-2">
        <div className="flex h-full items-center">
          {TABS.map((item) => (
            <button key={item.id} className={`tab-btn ${tab === item.id && open ? 'active' : ''}`} disabled={['yaml', 'training', 'evaluation'].includes(item.id)} title={['yaml', 'training', 'evaluation'].includes(item.id) ? tr('demo.disabled') : undefined} onClick={() => setTab(item.id)}>
              {tr(item.label)}
              {item.id === 'console' && validation && !validation.valid && <span className="ml-1 rounded-full bg-red-500 px-1 text-[8px] text-white">{validation.errors.length}</span>}
              {item.id === 'yaml' && compileResult && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
              {item.id === 'training' && training && <span className="status-dot running ml-1.5" />}
              {item.id === 'evaluation' && currentRun?.status === 'completed' && Object.keys(currentRun.metrics).length > 0 && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
            </button>
          ))}
        </div>
        <button className="tool-btn !h-6 !px-1.5" onClick={() => setOpen(!open)} title={open ? tr("ui.collapse_panel_02d7f3") : tr("ui.expand_panel_83bc97")}>
          {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
      {open && <div className="min-h-0 flex-1">{content(tab)}</div>}
    </div>
  );
}

function content(tab: BottomTab) {
  switch (tab) {
    case 'yaml': return <p className="p-4 text-muted">{tr('demo.disabled')}</p>;
    case 'training': return <p className="p-4 text-muted">{tr('demo.disabled')}</p>;
    case 'evaluation': return <p className="p-4 text-muted">{tr('demo.disabled')}</p>;
    case 'comparison': return <ComparisonPanel />;
    case 'graph': return <GraphJsonPanel />;
    default: return <ConsolePanel />;
  }
}
