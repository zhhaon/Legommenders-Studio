import { ChevronDown, ChevronUp } from 'lucide-react';
import { useStudio, type BottomTab } from '@/store/graphStore';
import { ConsolePanel } from './panels/ConsolePanel';
import { YamlPanel } from './panels/YamlPanel';
import { GraphJsonPanel } from './panels/GraphJsonPanel';

const TABS: { id: BottomTab; label: string }[] = [
  { id: 'console', label: 'Console / Validation' },
  { id: 'yaml', label: 'Reference YAML' },
  { id: 'training', label: 'Training' },
  { id: 'evaluation', label: 'Evaluation' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'graph', label: 'Graph JSON' },
];

export function BottomPanel() {
  const tab = useStudio((s) => s.bottomTab);
  const open = useStudio((s) => s.bottomOpen);
  const setTab = useStudio((s) => s.setBottomTab);
  const setOpen = useStudio((s) => s.setBottomOpen);
  const validation = useStudio((s) => s.validation);
  const compileResult = useStudio((s) => s.compileResult);
  const training = useStudio((s) => s.training);
  const currentRun = useStudio((s) => s.currentRun);

  return (
    <div className={`panel flex shrink-0 flex-col border-t transition-[height] duration-150 ${open ? 'h-[264px]' : 'h-[34px]'}`}>
      <div className="flex h-[33px] shrink-0 items-center justify-between border-b border-line px-2">
        <div className="flex h-full items-center">
          {TABS.map((item) => (
            <button key={item.id} className={`tab-btn ${tab === item.id && open ? 'active' : ''}`} onClick={() => setTab(item.id)}>
              {item.label}
              {item.id === 'console' && validation && !validation.valid && <span className="ml-1 rounded-full bg-red-500 px-1 text-[8px] text-white">{validation.errors.length}</span>}
              {item.id === 'yaml' && compileResult && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
              {item.id === 'training' && training && <span className="status-dot running ml-1.5" />}
              {item.id === 'evaluation' && currentRun?.status === 'completed' && Object.keys(currentRun.metrics).length > 0 && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
            </button>
          ))}
        </div>
        <button className="tool-btn !h-6 !px-1.5" onClick={() => setOpen(!open)} title={open ? 'Collapse panel' : 'Expand panel'}>
          {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
      {open && <div className="min-h-0 flex-1">{content(tab)}</div>}
    </div>
  );
}

function content(tab: BottomTab) {
  switch (tab) {
    case 'yaml': return <YamlPanel />;
    case 'training': return <div className="p-5 text-[12px] text-muted">Training is disabled in this static demo. This feature requires the Python backend. No jobs or results are simulated.</div>;
    case 'evaluation': return <div className="p-5 text-[12px] text-muted">Evaluation is disabled in this static demo. This feature requires the Python backend. No jobs or results are simulated.</div>;
    case 'comparison': return <div className="p-5 text-[12px] text-muted">Comparison is disabled in this static demo. This feature requires the Python backend. No jobs or results are simulated.</div>;
    case 'graph': return <GraphJsonPanel />;
    default: return <ConsolePanel />;
  }
}
