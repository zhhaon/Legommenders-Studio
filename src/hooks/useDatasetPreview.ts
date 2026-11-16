import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { DatasetInput, GraphNode } from '@/types/graph';

type Preview = { defaults: DatasetInput[]; columns: string[] };
const requests = new Map<string, Promise<Preview>>();

/** All aliases of a dataset share the panel's preview request. */
export function useDatasetPreview(node: GraphNode, itemComponent?: string) {
  const { data_config, embed_config, lm, lang, token_source } = node.params;
  const request = JSON.stringify({ nodes: [
    { id: node.id, component: node.component, params: { data_config, embed_config, lm, lang, token_source } },
    ...(itemComponent ? [{ id: 'preview_encoder', component: itemComponent }] : []),
  ] });
  const [state, setState] = useState<{ request: string; preview?: Preview; error?: string }>();
  useEffect(() => {
    let active = true;
    let pending = requests.get(request);
    if (!pending) {
      pending = api.datasetInputs(JSON.parse(request));
      requests.set(request, pending);
      // Bound the cache when exploring many datasets; failed requests can be retried.
      if (requests.size > 64) requests.delete(requests.keys().next().value!);
      void pending.catch(() => requests.delete(request));
    }
    void pending.then(
      preview => { if (active) setState({ request, preview }); },
      (reason: Error) => { if (active) setState({ request, error: reason.message }); },
    );
    return () => { active = false; };
  }, [request]);
  return state?.request === request ? state : undefined;
}
