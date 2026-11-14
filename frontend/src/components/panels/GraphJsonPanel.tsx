import { useState } from 'react';
import { Braces, Clipboard, Download, Upload } from 'lucide-react';
import { downloadText } from '@/api/client';
import { useStudio } from '@/store/graphStore';

export function GraphJsonPanel() {
  const graph = useStudio((s) => s.graph);
  const exportGraph = useStudio((s) => s.exportGraph);
  const importGraphJson = useStudio((s) => s.importGraphJson);
  const savedGraphs = useStudio((s) => s.savedGraphs);
  const loadSaved = useStudio((s) => s.loadSaved);
  const toast = useStudio((s) => s.toast);
  const [saved, setSaved] = useState<{ graph_id: string; name: string }[]>([]);
  const [text, setText] = useState('');
  const textValue = JSON.stringify(graph, null, 2);

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_280px] divide-x divide-line">
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted"><Braces size={12} /> Graph JSON · {graph.nodes.length} nodes / {graph.edges.length} edges</span>
          <div className="flex gap-1">
            <button className="tool-btn !h-6 !px-1.5 !text-[9.5px]" onClick={() => { void navigator.clipboard?.writeText(textValue); toast('success', 'Copied Graph JSON'); }}><Clipboard size={11} /> Copy</button>
            <button className="tool-btn !h-6 !px-1.5 !text-[9.5px]" onClick={exportGraph}><Download size={11} /> Export</button>
            <button className="tool-btn !h-6 !px-1.5 !text-[9.5px]" onClick={() => downloadText(`${graph.graph_id}.json`, textValue, 'application/json')}><Download size={11} /> Download</button>
          </div>
        </div>
        <pre className="code-view min-h-0 flex-1 overflow-auto bg-[#fbfcfe] px-3 py-2 text-[#263244] dark:bg-[#141a22] dark:text-[#d5dde8]">{textValue}</pre>
      </div>
      <div className="min-h-0 overflow-y-auto p-3">
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Saved projects</h3>
        <button className="tool-btn outline mb-2 w-full justify-center !text-[10px]" onClick={async () => {
          try { setSaved((await savedGraphs()).graphs); } catch (error) { toast('error', 'Cannot list projects', String(error)); }
        }}>Refresh list</button>
        <div className="space-y-1">
          {saved.map((item) => (
            <button key={item.graph_id} className="flex w-full items-center justify-between rounded-md border border-line px-2 py-1.5 text-left text-[10px] hover:bg-[var(--hover)]"
              onClick={() => void loadSaved(item.graph_id)}>
              <span className="truncate font-medium">{item.name}</span>
              <span className="font-mono text-[9px] text-muted">{item.graph_id}</span>
            </button>
          ))}
          {!saved.length && <p className="text-[10px] text-muted">Click refresh to list projects saved in this browser.</p>}
        </div>
        <h3 className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-muted">Paste Graph JSON</h3>
        <textarea className="field-input !h-28 !py-1 font-mono !text-[9px]" placeholder="{ ... }" value={text} onChange={(event) => setText(event.target.value)} />
        <button className="tool-btn primary mt-1.5 w-full justify-center !text-[10px]" disabled={!text.trim()}
          onClick={() => { void importGraphJson(text); setText(''); }}><Upload size={11} /> Import Graph JSON</button>
      </div>
    </div>
  );
}
