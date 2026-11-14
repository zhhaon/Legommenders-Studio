import { useStudio } from '@/store/graphStore';
import { downloadText } from '@/api/client';
import { references } from '@/demo/runtime';

export function YamlPanel() {
  const templateId = useStudio((s) => s.graph.template_id);
  const templates = useStudio((s) => s.templates);
  const reference = templates.find((t) => t.id === templateId)?.source_yaml;
  const text = reference ? references[reference] : '';
  return <div className="flex h-full flex-col">
    <div className="flex items-center justify-between border-b border-line px-3 py-2 text-[11px]">
      <span>Static reference YAML {reference ? `· ${reference}` : ''} — canvas edits are not compiled.</span>
      <button className="tool-btn outline" disabled={!text} onClick={() => {
        if (text) downloadText('reference.yaml', text, 'application/yaml');
      }}>Download reference</button>
    </div>
    <pre className="code-view min-h-0 flex-1 overflow-auto px-3 py-2">{text || 'Load a template to view its bundled reference YAML. Export Graph JSON to keep canvas changes. Python compilation and YAML import are disabled in this demo.'}</pre>
  </div>;
}
