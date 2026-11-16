import { tr, useLocale } from '@/i18n';
import { useEffect, useState } from 'react';
import { Check, Clipboard, Download, FileCode2, RefreshCw, Upload } from 'lucide-react';
import { api, downloadText } from '@/api/client';
import { useStudio } from '@/store/graphStore';

export function YamlPanel() {
  useLocale();
  const result = useStudio((s) => s.compileResult);
  const compiling = useStudio((s) => s.compiling);
  const compileGraph = useStudio((s) => s.compileGraph);
  const importYaml = useStudio((s) => s.importYaml);
  const verifyGraph = useStudio((s) => s.verifyGraph);
  const toast = useStudio((s) => s.toast);
  const [reference, setReference] = useState('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!result?.reference_yaml) { setReference(''); return; }
    api.referenceYaml(result.reference_yaml).then(setReference).catch(() => setReference(''));
  }, [result?.reference_yaml]);

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_240px] divide-x divide-line">
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <FileCode2 size={12} /> {tr("ui.generated_legommenders_yaml_40c9ef")} {result && <span className="badge !py-0 !text-[8px]">{result.model_label}</span>}
          </span>
          <div className="flex gap-1">
            <button className="tool-btn !h-6 !px-1.5 !text-[9.5px]" disabled={compiling} onClick={() => void compileGraph()}>
              <RefreshCw size={11} /> {compiling ? tr('actions.compiling') : tr('actions.regenerate')}
            </button>
            <button className="tool-btn !h-6 !px-1.5 !text-[9.5px]" disabled={!result} onClick={() => {
              if (!result) return;
              void navigator.clipboard?.writeText(result.yaml_text);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}>{copied ? <Check size={11} /> : <Clipboard size={11} />} {tr("ui.copy_af74f7")}</button>
            <button className="tool-btn !h-6 !px-1.5 !text-[9.5px]" disabled={!result} onClick={() => {
              if (result) downloadText(`${result.model_label.replace(/\s+/g, '_')}.yaml`, result.yaml_text, 'application/yaml');
            }}><Download size={11} /> {tr("ui.download_a479c9")}</button>
          </div>
        </div>
        <pre className="code-view min-h-0 flex-1 overflow-auto bg-[#fbfcfe] px-3 py-2 text-[#263244] dark:bg-[#141a22] dark:text-[#d5dde8]">
          {result ? result.yaml_text : tr("ui._click_generate_model_to_compile_the_graph_into_a_re_f3e013")}
        </pre>
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="border-b border-line px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
          {result?.reference_yaml ? tr("messages.8c22a8867d79", { p0: result.reference_yaml }) : tr("ui.reference_yaml_e57ad1")}
        </div>
        <pre className="code-view min-h-0 flex-1 overflow-auto bg-[#fbfcfe] px-3 py-2 text-muted dark:bg-[#141a22]">
          {reference || (result?.reference_yaml ? tr('actions.loading') : tr("ui.no_matching_official_template_this_is_a_custom_model_7084b5"))}
        </pre>
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="border-b border-line px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted"> {tr("ui.compile_diagnostics_89b87b")} </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5 text-[10px] leading-snug">
          {!result && <p className="text-muted">{tr("ui.compiler_output_verification_notes_and_model_identit_cf6e97")}</p>}
          {result && (
            <>
              <div className={`mb-2 rounded-md border p-2 ${result.compatible_with_reference ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30' : 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30'}`}>
                <b>{result.compatible_with_reference ? tr("ui.verified_by_legommenders_82323e") : tr("ui.verification_issues_5de79d")}</b>
                <p className="mt-1 opacity-80">{tr("ui.trainer_get_configurations_classhub_and_real_config__614349")}</p>
              </div>
              <div className="mb-2 space-y-1 text-muted">
                <p><b>{tr("ui.model__9e1279")}</b> {result.model_label}</p>
                <p><b>{tr("ui.data_config__28c99e")}</b> <span className="font-mono text-[9px]">{result.data_config}</span></p>
                <p><b>{tr("ui.embed_config__712df5")}</b> <span className="font-mono text-[9px]">{result.embed_config}</span></p>
                <p><b>{tr("ui.generated_file__38e996")}</b> <span className="font-mono text-[9px]">{result.generated_file}</span></p>
              </div>
              <div className="space-y-1">
                {result.notes.map((note, index) => (
                  <p key={index} className="rounded border border-line bg-[var(--hover)] px-2 py-1 text-muted">· {result.note_translations?.[index] ? tr(result.note_translations[index]!.key, result.note_translations[index]!.params, note) : note}</p>
                ))}
              </div>
              <button className="tool-btn outline mt-2 w-full justify-center !text-[10px]" onClick={() => void verifyGraph()}> {tr("ui.re_run_framework_check_73678c")} </button>
            </>
          )}
          <div className="mt-3 border-t border-line pt-2">
            <button className="tool-btn outline w-full justify-center !text-[10px]" onClick={() => setShowImport(!showImport)}>
              <Upload size={11} /> {tr("ui.import_yaml_9c6326")} </button>
            {showImport && (
              <div className="mt-2">
                <textarea
                  className="field-input !h-24 !py-1 font-mono !text-[9.5px]"
                  placeholder={tr("ui.paste_a_legommenders_model_yaml_name_meta_config__715c10")}
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                />
                <button className="tool-btn primary mt-1 w-full justify-center !text-[10px]" onClick={() => {
                  if (!importText.trim()) { toast('warning', 'Nothing to import'); return; }
                  void importYaml(importText);
                  setShowImport(false);
                }}>{tr("ui.import_into_canvas_eef954")}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
