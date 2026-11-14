import { useTrainingCredentials } from '@/components/TrainingCredentials';
import { useRef, useState } from 'react';
import {
  Activity, BarChart3, Boxes, CheckCircle2, ChevronDown, Download, FileCode2, FolderOpen,
  HelpCircle, Menu, Moon, Play, Redo2, RotateCcw, Save, Sun, Undo2, Upload, Wand2,
} from 'lucide-react';
import { useStudio } from '@/store/graphStore';
import { downloadText } from '@/api/client';

export function Toolbar() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const { startTraining } = useTrainingCredentials();
  const graph = useStudio((s) => s.graph);
  const validation = useStudio((s) => s.validation);
  const past = useStudio((s) => s.past.length);
  const future = useStudio((s) => s.future.length);
  const dirty = useStudio((s) => s.dirty);
  const templates = useStudio((s) => s.templates);
  const validating = useStudio((s) => s.validating);
  const compiling = useStudio((s) => s.compiling);
  const training = useStudio((s) => s.training);
  const theme = useStudio((s) => s.theme);
  const environment = useStudio((s) => s.environment);
  const {
    undo, redo, save, exportGraph, setDialog, loadTemplate, toggleTheme,
    validateGraph, compileGraph, evaluate, renameGraph, toast, setBottomTab,
    importGraphJson, importYaml,
  } = useStudio.getState();

  const modelLabel = validation?.summary.model_label || compileLabel();
  function compileLabel() { return graph.template_id ? graph.name : 'Custom Model'; }

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
      await importYaml(text);
    } else {
      await importGraphJson(text);
    }
  };

  return (
    <header className="panel z-20 flex items-center gap-2 border-b px-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Boxes size={17} strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="whitespace-nowrap text-[12.5px] font-bold">Legommenders Studio</span>
            <span className="badge !py-0 !text-[8px]">Static Demo</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[9.5px] text-muted">
            <input
              className="w-[150px] truncate bg-transparent outline-none hover:underline focus:underline"
              value={graph.name}
              onChange={(event) => renameGraph(event.target.value)}
              title="Project name"
            />
            <span className="opacity-40">/</span>
            <span className="truncate font-medium" style={{ color: 'var(--accent)' }}>{modelLabel}</span>
            {dirty && <span className="text-amber-500" title="Unsaved changes">●</span>}
          </div>
        </div>
      </div>

      <div className="mx-2 h-6 w-px bg-line" />

      <div className="flex items-center gap-0.5">
        <button className="tool-btn tooltip" data-tip="Undo (Ctrl+Z)" disabled={!past} onClick={undo}><Undo2 size={15} /></button>
        <button className="tool-btn tooltip" data-tip="Redo (Ctrl+Shift+Z)" disabled={!future} onClick={redo}><Redo2 size={15} /></button>
        <button className="tool-btn tooltip" data-tip="Save (Ctrl+S)" onClick={() => void save()}><Save size={15} /></button>
        <button className="tool-btn tooltip" data-tip="Import Graph JSON" onClick={() => fileInput.current?.click()}><Upload size={15} /></button>
        <button className="tool-btn tooltip" data-tip="Export Graph JSON" onClick={exportGraph}><Download size={15} /></button>
        <button className="tool-btn tooltip danger" data-tip="Reset canvas" onClick={() => setDialog('reset')}><RotateCcw size={15} /></button>
        <input
          ref={fileInput} type="file" accept=".json" className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImportFile(file);
            event.target.value = '';
          }}
        />
      </div>

      <div className="relative">
        <button className="tool-btn outline !text-[10.5px]" onClick={() => setTemplateOpen(!templateOpen)}>
          <FolderOpen size={13} /> Templates <ChevronDown size={11} />
        </button>
        {templateOpen && (
          <div className="absolute left-0 top-9 z-40 max-h-[420px] w-72 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-xl">
            <div className="px-3 py-1.5 text-[9.5px] font-bold uppercase tracking-wider text-muted">Verified model templates</div>
            {templates.map((template) => (
              <button
                key={template.id}
                disabled={!template.available}
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[var(--hover)] disabled:opacity-45"
                onClick={() => { void loadTemplate(template.id); setTemplateOpen(false); }}
                title={template.error || template.source_yaml}
              >
                <FileCode2 size={13} className="mt-0.5 shrink-0 text-blue-500" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                    {template.name}
                    <span className="badge !px-1 !py-0 !text-[8px]">{template.task}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[9.5px] text-muted">{template.description}</span>
                  <span className="mt-0.5 block font-mono text-[8.5px] text-muted">{template.source_yaml}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="hidden items-center gap-1.5 xl:flex">
        {environment && (
          <span className={`badge ${environment.cuda_available ? 'text-emerald-600' : 'text-muted'}`} title={`Python ${environment.python} · torch ${environment.torch}`}>
            <Activity size={10} /> Browser only · no backend
          </span>
        )}
        {validation && (
          <span className={`badge ${validation.valid ? 'text-emerald-600' : 'text-red-600'}`}>
            {validation.valid ? <CheckCircle2 size={10} /> : <HelpCircle size={10} />}
            {validation.valid ? 'Basic checks passed' : `${validation.errors.length} errors`}
          </span>
        )}
      </div>

      <div className="mx-1 h-6 w-px bg-line" />

      <div className="flex items-center gap-1">
        <button className="tool-btn outline !text-[10.5px]" disabled={validating} onClick={() => void validateGraph()}>
          <Wand2 size={13} /> {validating ? 'Validating…' : 'Check graph'}
        </button>
        <button className="tool-btn outline !text-[10.5px]" disabled={true} title="Requires the Python backend; unavailable in this static demo" onClick={() => void compileGraph()}>
          <FileCode2 size={13} /> {compiling ? 'Generating…' : 'Generate Model'}
        </button>
        <button
          className="tool-btn outline !text-[10.5px]"
          disabled={true}
          onClick={() => void evaluate()}
          title="Evaluation requires the backend and is disabled"
        >
          <BarChart3 size={13} /> Evaluate
        </button>
        <button
          className="tool-btn primary !text-[10.5px]"
          disabled={true}
          onClick={startTraining}
          title="Training requires the backend and is disabled"
        >
          <Play size={13} fill="currentColor" /> {training ? 'Training…' : 'Train'}
        </button>
      </div>

      <div className="mx-1 h-6 w-px bg-line" />
      <button className="tool-btn tooltip" data-tip="Toggle theme" onClick={toggleTheme}>
        {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
      </button>
      <div className="relative">
        <button className="tool-btn" onClick={() => setMenuOpen(!menuOpen)}><Menu size={16} /></button>
        {menuOpen && (
          <div className="absolute right-0 top-9 z-40 w-56 rounded-lg border border-line bg-surface py-1 shadow-xl">
            <MenuItem label="Welcome screen" onClick={() => { useStudio.setState({ welcomeVisible: true }); setMenuOpen(false); }} />
            <MenuItem label="Export compiled YAML" onClick={() => {
              const result = useStudio.getState().compileResult;
              if (result) downloadText(`${result.model_label}.yaml`, result.yaml_text, 'application/yaml');
              else toast('warning', 'No YAML yet', 'Click Generate Model first.');
              setMenuOpen(false);
            }} />
            <MenuItem label="Demo capabilities" onClick={() => { setBottomTab('training'); setMenuOpen(false); }} />
            <MenuItem label="Training unavailable" onClick={() => { setBottomTab('comparison'); setMenuOpen(false); }} />
            <MenuItem label="Graph JSON view" onClick={() => { setBottomTab('graph'); setMenuOpen(false); }} />
          </div>
        )}
      </div>
    </header>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="block w-full px-3 py-1.5 text-left text-[11px] hover:bg-[var(--hover)]" onClick={onClick}>{label}</button>;
}
