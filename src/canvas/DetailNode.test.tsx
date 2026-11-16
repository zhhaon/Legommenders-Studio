import { expect, it, vi } from 'vitest';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReactFlowProvider } from '@xyflow/react';
import { DetailNode } from './DetailNode';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { useStudio } from '@/store/graphStore';
import { emptyGraph } from '@/types/graph';
import type { ComponentSpec } from '@/types/catalog';

vi.mock('@/components/TrainingCredentials', () => ({ useTrainingCredentials: () => ({ token: '' }) }));

vi.mock('@/hooks/useDatasetPreview', () => ({
  useDatasetPreview: () => ({ preview: { defaults: [{ column: 'title@glove', truncate: 30 }, { column: 'abstract@glove', truncate: null }], columns: [] } }),
}));

// Server rendering otherwise uses Zustand's initial snapshot, rather than the test's live state.
vi.mock('@/store/graphStore', async importOriginal => {
  const actual = await importOriginal<typeof import('@/store/graphStore')>();
  const live = Object.assign((selector: (state: ReturnType<typeof actual.useStudio.getState>) => unknown) => selector(actual.useStudio.getState()), actual.useStudio);
  return { ...actual, useStudio: live };
});

it('renders numbered dataset cards and the same editable panel, reflecting shared values', () => {
  const graph = emptyGraph();
  graph.nodes = [{ id: 'data', component: 'dataset.mind', label: 'MIND-small', params: { lang: 'en' }, position: { x: 0, y: 0 } }];
  const spec = { id: 'dataset.mind', name: 'MIND', category: 'dataset', role: 'dataset', source: {}, inputs: [], outputs: [], parameters: [
    { name: 'lang', type: 'string', default: 'en', description: '', choices: [], minimum: null, maximum: null, advanced: false },
    { name: 'internal', type: 'boolean', default: false, advanced: true },
  ] } as unknown as ComponentSpec;
  useStudio.setState({ graph, components: { [spec.id]: spec }, selectedNodeId: 'data', validation: null });
  const render = (title: string) => renderToStaticMarkup(createElement(ReactFlowProvider, null,
    createElement(DetailNode, { data: { title, originalId: 'data', color: '#3b82f6', datasetProxy: true } } as ComponentProps<typeof DetailNode>)));
  for (const title of ['Item 1', 'Negative Candidate 4']) {
    const markup = render(title);
    expect(markup).toContain(title);
    expect(markup).toContain('MIND-small');
    expect(markup).not.toContain('Dataset ·');
    expect(markup).toContain('data-param-name="lang"');
    expect(markup.indexOf('data-param-name="lm"')).toBeLessThan(markup.indexOf('data-param-name="item_inputs"'));
    expect(markup).toContain('>30</span>');
    expect(markup).not.toContain('>Full</span>');
    expect(markup).toContain('>title</span>');
    expect(markup).not.toContain('title@glove');
    expect(markup).not.toContain('Dataset defaults');
    expect(markup).not.toContain('data-param-name="internal"');
    expect(markup).toContain('rgba(59, 130, 246, 0.09)');
  }
  expect(renderToStaticMarkup(createElement(PropertiesPanel))).toContain('value="en"');
  useStudio.getState().updateParam('data', 'lang', 'zh');
  useStudio.getState().setNodeLabel('data', 'Updated dataset');
  for (const title of ['Item 1', 'Negative Candidate 4']) {
    expect(render(title)).toContain('Updated dataset');
    expect(render(title)).toContain('title="zh"');
  }
  expect(renderToStaticMarkup(createElement(PropertiesPanel))).toContain('value="zh"');
  useStudio.getState().updateParam('data', 'item_inputs', [{ column: 'category@glove', truncate: 5 }]);
  const custom = render('Item 1');
  expect(custom).toContain('>category</span>');
  expect(custom).toContain('>5</span>');
  expect(custom).not.toContain('>30</span>');
  expect(custom).not.toContain('&quot;column&quot;');
  useStudio.getState().updateParam('data', 'item_inputs', null);
  expect(render('Item 1')).toContain('>30</span>');
  useStudio.setState({ graph: { ...useStudio.getState().graph, nodes: [...useStudio.getState().graph.nodes, { id: 'encoder', component: 'item.externalhf', params: { model_id: 'my-model', tokenizer_id: 'my-tokenizer' }, position: { x: 0, y: 0 } }] }, components: { ...useStudio.getState().components, 'item.externalhf': { ...spec, id: 'item.externalhf', role: 'item_encoder', category: 'item_encoder' } } });
  expect(render('Item 1')).toContain('title="my-tokenizer"');
});


it('renders vectors with configured dimensions and scores without card chrome', () => {
  const graph = emptyGraph();
  graph.train.hidden_size = 32;
  graph.train.item_hidden_size = 32;
  useStudio.setState({ graph, components: {} });
  const render = (data: Record<string, unknown>) => renderToStaticMarkup(createElement(ReactFlowProvider, null,
    createElement(DetailNode, { data } as ComponentProps<typeof DetailNode>)));
  const item = render({ title: 'Item Embedding', valueKind: 'item-vector', color: '#16a34a' });
  expect(item).toContain('Item Embedding</div><div>32 dims</div>');
  expect(item).toContain('⋮');
  expect(item).toContain('Column vector');
  expect(item).not.toContain('lego-node');
  graph.train.item_hidden_size = 64;
  useStudio.setState({ graph: { ...graph } });
  expect(render({ title: 'Item Embedding', valueKind: 'item-vector' })).toContain('64 dims');
  const score = render({ title: 'Score', valueKind: 'score', positiveScore: true, exampleScore: '0.732' });
  expect(score).toContain('0.732');
  expect(score).toContain('border-b-4');
  expect(score).not.toContain('lego-node');
  expect(render({ title: 'Score', valueKind: 'score', positiveScore: false, exampleScore: '0.218' })).not.toContain('border-b-4');
});
