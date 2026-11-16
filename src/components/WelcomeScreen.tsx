import { tr, useLocale } from '@/i18n';
import { LanguageSelect } from './LanguageSelect';
import { ArrowRight, Boxes, FileCode2, FolderOpen, Layers3, Sparkles, X } from 'lucide-react';
import { useStudio } from '@/store/graphStore';

export function WelcomeScreen() {
  useLocale();
  const visible = useStudio((s) => s.welcomeVisible);
  const templates = useStudio((s) => s.templates);
  const dismiss = useStudio((s) => s.dismissWelcome);
  const loadTemplate = useStudio((s) => s.loadTemplate);
  const resetGraph = useStudio((s) => s.resetGraph);
  const savedGraphs = useStudio((s) => s.savedGraphs);
  const loadSaved = useStudio((s) => s.loadSaved);
  const setBottomTab = useStudio((s) => s.setBottomTab);
  const toast = useStudio((s) => s.toast);
  const featured = templates.filter((t) => t.featured && t.available).slice(0, 3);

  if (!visible) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto p-6">
      <div className="relative w-[860px] max-w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <button className="tool-btn absolute right-3 top-3 !h-7 !px-2" onClick={dismiss}><X size={15} /></button>
        <div className="border-b border-line bg-gradient-to-br from-blue-50 to-white px-8 py-7 dark:from-slate-900 dark:to-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Boxes size={20} /></div>
            <LanguageSelect /><span className="badge">{tr('demo.title')}</span>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight">{tr("ui.welcome_to_legommenders_studio_34fe54")}</h1>
          <p className="mt-1.5 max-w-[620px] text-[12.5px] leading-relaxed text-muted"> {tr("ui.build_recommendation_models_visually_drag_real_legom_2ab9ad")} </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-muted">
            <span className="badge">{tr("ui.drag_79d0e9")}</span><span className="badge">{tr("ui.connect_b65463")}</span><span className="badge">{tr("ui.configure_792c81")}</span>
            <span className="badge">{tr("ui.validate_6752f1")}</span>
            
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
          <Entry
            icon={<Sparkles size={18} />} title={tr("ui.start_from_scratch_799a54")} color="#2563eb"
            description={tr("ui.open_an_empty_canvas_and_assemble_your_own_model_fro_081524")}
            action={tr("ui.new_canvas_6cd287")}
            onClick={() => { resetGraph(); dismiss(); }}
          />
          <Entry
            icon={<FolderOpen size={18} />} title={tr("ui.load_existing_model_9de2c8")} color="#16a34a"
            description={tr("ui.open_a_saved_graph_json_project_or_import_a_legommen_e89cf7")}
            action={tr("ui.load_project_e1f4fa")}
            onClick={async () => {
              dismiss();
              setBottomTab('graph');
              try {
                const response = await savedGraphs();
                if (response.graphs.length) void loadSaved(response.graphs[response.graphs.length - 1].graph_id);
                else toast('info', 'No saved projects', 'Import a Graph JSON from the Graph JSON tab.');
              } catch (error) { toast('error', 'Cannot list projects', String(error)); }
            }}
          />
          <Entry
            icon={<Layers3 size={18} />} title={tr("ui.explore_templates_53c712")} color="#7c3aed"
            description={tr("ui.start_from_a_verified_model_configuration_loaded_fro_6887ba")}
            action={tr("ui.browse_templates_6d9e4b")}
            onClick={() => { dismiss(); toast('info', 'Templates', 'Use the Templates menu in the toolbar.'); }}
          />
        </div>

        <div className="px-8 py-6">
          <button className="tool-btn outline mb-4 w-full justify-center" onClick={() => { dismiss(); window.location.hash = '/benchmark'; }}>{tr('benchmark.browse')} <ArrowRight size={12} /></button>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[12px] font-bold">{tr("ui.demo_templates_2dea33")}</h2>
            <span className="text-[10px] text-muted">{tr("ui.recommended_naml_then_swap_additive_attention_for_gr_7406e3")}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(featured.length ? featured : templates.filter((t) => t.available).slice(0, 3)).map((template, index) => (
              <button key={template.id}
                className={`group rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-node ${index === 0 ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-950/20' : 'border-line'}`}
                onClick={() => void loadTemplate(template.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold">{template.name}</span>
                  {index === 0 ? <span className="badge text-blue-600">{tr("ui.recommended_9ef937")}</span> : <ArrowRight size={13} className="text-muted opacity-0 transition-opacity group-hover:opacity-100" />}
                </div>
                <p className="mt-1.5 min-h-[32px] text-[10px] leading-snug text-muted">{tr('templates.' + template.id + '.description', {}, template.description)}</p>
                <p className="mt-2 flex items-center gap-1 font-mono text-[9px] text-muted"><FileCode2 size={10} /> {template.source_yaml}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-[var(--hover)] px-3 py-2">
            <p className="text-[10px] text-muted">
              <b>{tr("ui.demo_path__f0ca8a")}</b> {tr("ui.naml_replace_additive_attention_with_gru_validate_ge_ffea6c")} </p>
            <button className="tool-btn primary !text-[10.5px]" onClick={() => void loadTemplate('naml-demo')}> {tr("ui.open_naml_demo_99e6e3")} <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Entry({ icon, title, description, action, color, onClick }: {
  icon: React.ReactNode; title: string; description: string; action: string; color: string; onClick: () => void;
}) {
  useLocale();
  return (
    <button className="group p-5 text-left transition-colors hover:bg-[var(--hover)]" onClick={onClick}>
      <div className="mb-2 grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${color}18`, color }}>{icon}</div>
      <h3 className="text-[12px] font-bold">{title}</h3>
      <p className="mt-1 min-h-[42px] text-[10.5px] leading-snug text-muted">{description}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-semibold" style={{ color }}>
        {action} <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
      </span>
    </button>
  );
}
