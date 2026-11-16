import { tr, useLocale } from '@/i18n';
import { LanguageSelect } from './LanguageSelect';
import { useTrainingCredentials } from '@/components/TrainingCredentials';
import { useRef, useState } from 'react';
import {
  BarChart3, Boxes, CheckCircle2, ChevronDown, Download, FileCode2, FolderOpen,
  HelpCircle, Menu, Moon, Play, Redo2, RotateCcw, Save, Sun, Undo2, Upload, Wand2,
} from 'lucide-react';
import { useStudio } from '@/store/graphStore';
import { downloadText } from '@/api/client';

export function Toolbar() {
  useLocale();
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
  
  const {
    undo, redo, save, exportGraph, setDialog, loadTemplate, toggleTheme,
    validateGraph, compileGraph, evaluate, toast, setBottomTab,
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
    <header className="studio-toolbar panel relative z-40 flex items-center gap-2 border-b px-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Boxes size={17} strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="whitespace-nowrap text-[12.5px] font-bold">Legoizer</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[9.5px] text-muted">
            <span className="truncate font-medium" style={{ color: 'var(--accent)' }}>{modelLabel}</span>
            {dirty && <span className="text-amber-500" title={tr("ui.unsaved_changes_292672")}>●</span>}
          </div>
        </div>
      </div>

      <div className="mx-2 h-6 w-px bg-line" />

      <div className="flex items-center gap-0.5">
        <button className="tool-btn tooltip" data-tip={tr("ui.undo_ctrl_z__26039c")} disabled={!past} onClick={undo}><Undo2 size={15} /></button>
        <button className="tool-btn tooltip" data-tip={tr("ui.redo_ctrl_shift_z__c4d794")} disabled={!future} onClick={redo}><Redo2 size={15} /></button>
        <button className="tool-btn tooltip" data-tip={tr("ui.save_ctrl_s__0b80b1")} onClick={() => void save()}><Save size={15} /></button>
        <button className="tool-btn tooltip" data-tip={tr('demo.import')} onClick={() => fileInput.current?.click()}><Upload size={15} /></button>
        <button className="tool-btn tooltip" data-tip={tr("ui.export_graph_json_ee54c5")} onClick={exportGraph}><Download size={15} /></button>
        <button className="tool-btn tooltip danger" data-tip={tr("ui.reset_canvas_c40c34")} onClick={() => setDialog('reset')}><RotateCcw size={15} /></button>
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
          <FolderOpen size={13} /> {tr("ui.templates_f25b70")} <ChevronDown size={11} />
        </button>
        {templateOpen && (
          <div className="absolute left-0 top-9 z-40 max-h-[420px] w-72 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-xl">
            <div className="px-3 py-1.5 text-[9.5px] font-bold uppercase tracking-wider text-muted">{tr("ui.verified_model_templates_c6f408")}</div>
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
                    <span className="badge !px-1 !py-0 !text-[8px]">{tr('labels.' + template.task, {}, template.task)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[9.5px] text-muted">{tr('templates.' + template.id + '.description', {}, template.description)}</span>
                  <span className="mt-0.5 block font-mono text-[8.5px] text-muted">{template.source_yaml}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <a className="tool-btn outline !text-[10.5px]" href="#/benchmark">{tr('benchmark.title')}</a>
      <div className="flex-1" />
      <span className="badge text-blue-500" title={tr('demo.notice')}>{tr('demo.title')}</span><LanguageSelect />

      <div className="hidden items-center gap-1.5 xl:flex">
        {validation && (
          <span className={`badge ${validation.valid ? 'text-emerald-600' : 'text-red-600'}`}>
            {validation.valid ? <CheckCircle2 size={10} /> : <HelpCircle size={10} />}
            {validation.valid ? tr("ui.valid_a4aefa") : `${validation.errors.length} errors`}
          </span>
        )}
      </div>

      <div className="mx-1 h-6 w-px bg-line" />

      <div className="flex items-center gap-1">
        <button className="tool-btn outline !text-[10.5px]" disabled={validating} onClick={() => void validateGraph()}>
          <Wand2 size={13} /> {validating ? tr("ui.validating__c07434") : tr("ui.validate_6752f1")}
        </button>
        <button className="tool-btn outline !text-[10.5px]" disabled={true} title={tr('demo.disabled')} onClick={() => void compileGraph()}>
          <FileCode2 size={13} /> {compiling ? tr("ui.generating__11edad") : tr("ui.generate_model_e6c2a2")}
        </button>
        <button
          className="tool-btn outline !text-[10.5px]"
          disabled={true}
          onClick={() => void evaluate()}
          title={tr('demo.disabled')}
        >
          <BarChart3 size={13} /> {tr("ui.evaluate_d71325")} </button>
        <button
          className="tool-btn primary !text-[10.5px]"
          disabled={true}
          onClick={startTraining}
          title={tr('demo.disabled')}
        >
          <Play size={13} fill="currentColor" /> {training ? tr("ui.training__76e2b2") : tr("ui.train_3b278e")}
        </button>
      </div>

      <div className="mx-1 h-6 w-px bg-line" />
      <button className="tool-btn tooltip" data-tip={tr("ui.toggle_theme_9b0eaf")} onClick={toggleTheme}>
        {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
      </button>
      <div className="relative">
        <button className="tool-btn" onClick={() => setMenuOpen(!menuOpen)}><Menu size={16} /></button>
        {menuOpen && (
          <div className="absolute right-0 top-9 z-40 w-56 rounded-lg border border-line bg-surface py-1 shadow-xl">
            <MenuItem label={tr("ui.welcome_screen_15b3fc")} onClick={() => { useStudio.setState({ welcomeVisible: true }); setMenuOpen(false); }} />
            <MenuItem label={tr("ui.export_compiled_yaml_a5932f")} onClick={() => {
              const result = useStudio.getState().compileResult;
              if (result) downloadText(`${result.model_label}.yaml`, result.yaml_text, 'application/yaml');
              else toast('warning', 'No YAML yet', 'Click Generate Model first.');
              setMenuOpen(false);
            }} />
            <MenuItem label={tr('demo.disabled')} onClick={() => { setBottomTab('training'); setMenuOpen(false); }} />
            <MenuItem label={tr("ui.experiment_comparison_4d929f")} onClick={() => { setBottomTab('comparison'); setMenuOpen(false); }} />
            <MenuItem label={tr("ui.graph_json_view_e683e3")} onClick={() => { setBottomTab('graph'); setMenuOpen(false); }} />
          </div>
        )}
      </div>
    </header>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  useLocale();
  return <button className="block w-full px-3 py-1.5 text-left text-[11px] hover:bg-[var(--hover)]" onClick={onClick}>{label}</button>;
}
