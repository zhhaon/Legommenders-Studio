import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudio } from './graphStore';
import type { ComponentCatalog, ComponentSpec } from '@/types/catalog';
import { emptyGraph } from '@/types/graph';
import type { PortSpec } from '@/types/catalog';

vi.mock('@/api/client', () => ({
  downloadText: vi.fn(),
  api: {
    health: vi.fn(), components: vi.fn(), compatible: vi.fn(), templates: vi.fn(), template: vi.fn(),
    validate: vi.fn(), compile: vi.fn(), importGraph: vi.fn(), environment: vi.fn(), verify: vi.fn(),
    train: vi.fn(), evaluate: vi.fn(), runStatus: vi.fn(), runLogs: vi.fn(), cancel: vi.fn(),
    runs: vi.fn(), run: vi.fn(), saveGraph: vi.fn().mockResolvedValue({ saved: true, graph_id: 'x' }),
    savedGraphs: vi.fn(), loadGraph: vi.fn(), referenceYaml: vi.fn(),
  },
}));

const port = (name: string, type: string, required = false): PortSpec => ({ name, type, required, description: '' });

function spec(id: string, role: string, inputs: PortSpec[], outputs: PortSpec[]): ComponentSpec {
  return {
    id, name: id, category: role as ComponentSpec['category'], role,
    description: '', icon: 'Box', status: 'verified', executable: true, conceptual: false,
    backend_class: null, meta_value: id, inputs, outputs,
    parameters: [
      { name: 'hidden_size', type: 'integer', default: 256, required: true, minimum: 8, maximum: 8192, choices: [], description: '', source: 'introspected', config_path: 'global.hidden_size', advanced: false },
      { name: 'kernel_size', type: 'integer', default: 3, required: false, minimum: 1, maximum: 31, choices: [], description: '', source: 'introspected', config_path: 'config.item_config.kernel_size', advanced: false },
    ],
    tasks: ['matching', 'ranking'], source: {}, detail: '', status_note: '',
  };
}

const dataset = spec('dataset.mind', 'dataset', [], [port('content', 'ItemContent'), port('dataset', 'Dataset'), port('history', 'ItemEmbeddingSequence')]);
const item = spec('item.cnn', 'item_encoder', [port('content', 'ItemContent', true)],
  [port('embedding', 'ItemEmbedding'), port('history', 'ItemEmbeddingSequence'), port('candidate', 'CandidateItemEmbedding')]);
const user = spec('user.ada', 'user_encoder', [port('history', 'ItemEmbeddingSequence', true)], [port('user', 'UserEmbedding')]);
const gru: ComponentSpec = {
  ...spec('user.gru', 'user_encoder', [port('history', 'ItemEmbeddingSequence', true)], [port('user', 'UserEmbedding')]),
  parameters: [
    { name: 'hidden_size', type: 'integer', default: 256, required: true, minimum: 8, maximum: 8192, choices: [], description: '', source: 'introspected', config_path: 'global.hidden_size', advanced: false },
    { name: 'num_layers', type: 'integer', default: 1, required: false, minimum: 1, maximum: 8, choices: [], description: '', source: 'introspected', config_path: 'config.user_config.num_layers', advanced: false },
  ],
};
const predictor = spec('predictor.dot', 'predictor', [port('user', 'UserEmbedding', true), port('candidate', 'CandidateItemEmbedding')], [port('score', 'PredictionScore')]);
const training = { ...spec('training.matching_task', 'training', [port('score', 'PredictionScore')], [port('run', 'TrainingData')]), tasks: ['matching'] };
const ranking = { ...training, id: 'training.ranking_task', name: 'Ranking Task', tasks: ['ranking'] };
const din = { ...predictor, id: 'predictor.din', name: 'DIN', tasks: ['ranking'] };

const componentList = [dataset, item, user, gru, predictor, training, ranking, din];
const catalog: ComponentCatalog = {
  components: componentList,
  categories: [],
  port_types: [
    { id: 'ItemContent', label: '', color: '', accepts: ['ItemContent'], description: '' },
    { id: 'Dataset', label: '', color: '', accepts: ['Dataset'], description: '' },
    { id: 'ItemEmbeddingSequence', label: '', color: '', accepts: ['ItemEmbeddingSequence'], description: '' },
    { id: 'ItemEmbedding', label: '', color: '', accepts: ['ItemEmbedding', 'ItemEmbeddingSequence', 'CandidateItemEmbedding'], description: '' },
    { id: 'CandidateItemEmbedding', label: '', color: '', accepts: ['ItemEmbedding', 'CandidateItemEmbedding'], description: '' },
    { id: 'UserEmbedding', label: '', color: '', accepts: ['UserEmbedding'], description: '' },
    { id: 'PredictionScore', label: '', color: '', accepts: ['PredictionScore'], description: '' },
    { id: 'TrainingData', label: '', color: '', accepts: ['TrainingData'], description: '' },
  ],
  generated_from: 'test',
};

function seed() {
  const graph = emptyGraph('Test Model');
  useStudio.setState({
    graph,
    catalog,
    components: Object.fromEntries(componentList.map((c) => [c.id, c])),
    portTypes: catalog.port_types,
    past: [], future: [], pending: null, dirty: false,
    selectedNodeId: null, selectedEdgeId: null, toasts: [], consoleLines: [],
    validation: null, compileResult: null,
  });
}

describe('graph store — interactive node editor', () => {
  beforeEach(seed);

  it('adds a node with defaults from the registry and selects it', () => {
    const id = useStudio.getState().addNode('item.cnn', { x: 100, y: 200 });
    expect(id).toBeTruthy();
    const state = useStudio.getState();
    const node = state.graph.nodes.find((n) => n.id === id);
    expect(node?.component).toBe('item.cnn');
    expect(node?.position).toEqual({ x: 100, y: 200 });
    expect(node?.params.kernel_size).toBe(3);
    expect(state.selectedNodeId).toBe(id);
  });

  it('moves a node and restores the position with undo', () => {
    const id = useStudio.getState().addNode('item.cnn', { x: 0, y: 0 })!;
    useStudio.getState().moveNode(id, { x: 321, y: 123 });
    expect(useStudio.getState().graph.nodes[0].position).toEqual({ x: 321, y: 123 });
    useStudio.getState().undo();
    expect(useStudio.getState().graph.nodes[0].position).toEqual({ x: 0, y: 0 });
  });

  it('creates a type-compatible connection and rejects an incompatible one', () => {
    const ds = useStudio.getState().addNode('dataset.mind', { x: 0, y: 0 })!;
    const enc = useStudio.getState().addNode('item.cnn', { x: 200, y: 0 })!;
    const ok = useStudio.getState().connect({ source: ds, sourceHandle: 'content', target: enc, targetHandle: 'content' });
    expect(ok.ok).toBe(true);
    expect(useStudio.getState().graph.edges).toHaveLength(1);
    const bad = useStudio.getState().connect({ source: ds, sourceHandle: 'dataset', target: enc, targetHandle: 'content' });
    expect(bad.ok).toBe(false);
    expect(bad.reason).toContain('Incompatible ports');
    expect(useStudio.getState().graph.edges).toHaveLength(1);
  });

  it('rejects duplicate and self connections', () => {
    const ds = useStudio.getState().addNode('dataset.mind', { x: 0, y: 0 })!;
    const enc = useStudio.getState().addNode('item.cnn', { x: 200, y: 0 })!;
    const payload = { source: ds, sourceHandle: 'content', target: enc, targetHandle: 'content' };
    expect(useStudio.getState().connect(payload).ok).toBe(true);
    expect(useStudio.getState().connect(payload).ok).toBe(false);
    expect(useStudio.getState().connect({ ...payload, target: ds, targetHandle: 'content' }).ok).toBe(false);
  });

  it('deletes a node together with its edges', () => {
    const ds = useStudio.getState().addNode('dataset.mind', { x: 0, y: 0 })!;
    const enc = useStudio.getState().addNode('item.cnn', { x: 200, y: 0 })!;
    useStudio.getState().connect({ source: ds, sourceHandle: 'content', target: enc, targetHandle: 'content' });
    useStudio.getState().deleteNodes([enc]);
    expect(useStudio.getState().graph.nodes).toHaveLength(1);
    expect(useStudio.getState().graph.edges).toHaveLength(0);
  });

  it('deletes edges by id', () => {
    const ds = useStudio.getState().addNode('dataset.mind', { x: 0, y: 0 })!;
    const enc = useStudio.getState().addNode('item.cnn', { x: 200, y: 0 })!;
    useStudio.getState().connect({ source: ds, sourceHandle: 'content', target: enc, targetHandle: 'content' });
    const edgeId = useStudio.getState().graph.edges[0].id;
    useStudio.getState().deleteEdges([edgeId]);
    expect(useStudio.getState().graph.edges).toHaveLength(0);
  });

  it('updates node parameters and keeps the global hidden_size in sync', () => {
    const id = useStudio.getState().addNode('item.cnn', { x: 0, y: 0 })!;
    useStudio.getState().updateParam(id, 'kernel_size', 7);
    useStudio.getState().updateParam(id, 'hidden_size', 512);
    expect(useStudio.getState().graph.nodes[0].params.kernel_size).toBe(7);
    expect(useStudio.getState().graph.train.hidden_size).toBe(512);
  });

  it('restores default parameters', () => {
    const id = useStudio.getState().addNode('item.cnn', { x: 0, y: 0 })!;
    useStudio.getState().updateParam(id, 'kernel_size', 11);
    useStudio.getState().resetParams(id);
    expect(useStudio.getState().graph.nodes[0].params.kernel_size).toBe(3);
  });

  it('duplicates a node with a new id and offset position', () => {
    const id = useStudio.getState().addNode('item.cnn', { x: 50, y: 60 })!;
    useStudio.getState().duplicateNode(id);
    const nodes = useStudio.getState().graph.nodes;
    expect(nodes).toHaveLength(2);
    expect(nodes[1].id).not.toBe(id);
    expect(nodes[1].position).toEqual({ x: 98, y: 108 });
  });

  it('serialises Graph JSON and restores it from local storage', async () => {
    const ds = useStudio.getState().addNode('dataset.mind', { x: 0, y: 0 })!;
    const enc = useStudio.getState().addNode('item.cnn', { x: 200, y: 0 })!;
    useStudio.getState().connect({ source: ds, sourceHandle: 'content', target: enc, targetHandle: 'content' });
    useStudio.getState().renameGraph('Round Trip');
    const snapshot = JSON.parse(JSON.stringify(useStudio.getState().graph));
    await useStudio.getState().save(true);
    seed();
    expect(useStudio.getState().restoreLocal()).toBe(true);
    const restored = useStudio.getState().graph;
    expect(restored.name).toBe('Round Trip');
    expect(restored.nodes).toEqual(snapshot.nodes);
    expect(restored.edges).toEqual(snapshot.edges);
    expect(restored.train).toEqual(snapshot.train);
  });

  it('supports undo and redo across multiple operations', () => {
    const a = useStudio.getState().addNode('dataset.mind', { x: 0, y: 0 })!;
    const b = useStudio.getState().addNode('item.cnn', { x: 200, y: 0 })!;
    useStudio.getState().connect({ source: a, sourceHandle: 'content', target: b, targetHandle: 'content' });
    expect(useStudio.getState().graph.edges).toHaveLength(1);
    useStudio.getState().undo();
    expect(useStudio.getState().graph.edges).toHaveLength(0);
    useStudio.getState().undo();
    expect(useStudio.getState().graph.nodes).toHaveLength(1);
    useStudio.getState().redo();
    expect(useStudio.getState().graph.nodes).toHaveLength(2);
    useStudio.getState().redo();
    expect(useStudio.getState().graph.edges).toHaveLength(1);
  });

  it('morphs Additive Attention into GRU while preserving connections and migrating parameters', () => {
    const ds = useStudio.getState().addNode('dataset.mind', { x: 0, y: 0 })!;
    const enc = useStudio.getState().addNode('item.cnn', { x: 200, y: 0 })!;
    const usr = useStudio.getState().addNode('user.ada', { x: 400, y: 0 })!;
    const pred = useStudio.getState().addNode('predictor.dot', { x: 600, y: 0 })!;
    useStudio.getState().connect({ source: ds, sourceHandle: 'content', target: enc, targetHandle: 'content' });
    useStudio.getState().connect({ source: enc, sourceHandle: 'history', target: usr, targetHandle: 'history' });
    useStudio.getState().connect({ source: usr, sourceHandle: 'user', target: pred, targetHandle: 'user' });
    useStudio.getState().updateParam(usr, 'hidden_size', 384);
    const before = useStudio.getState().graph.edges.length;
    const result = useStudio.getState().replaceComponent(usr, 'user.gru');
    expect(result.ok).toBe(true);
    expect(result.migrated).toContain('hidden_size');
    expect(result.dropped).toContain('kernel_size');
    const state = useStudio.getState();
    expect(state.graph.nodes.find((n) => n.id === usr)?.component).toBe('user.gru');
    expect(state.graph.nodes.find((n) => n.id === usr)?.params.hidden_size).toBe(384);
    expect(state.graph.edges).toHaveLength(before);
  });

  it('auto layout separates disconnected nodes without inventing dependencies', () => {
    useStudio.getState().addNode('dataset.mind', { x: 900, y: 900 });
    useStudio.getState().addNode('predictor.dot', { x: 900, y: 900 });
    useStudio.getState().autoLayout();
    const nodes = useStudio.getState().graph.nodes;
    expect(nodes[0].position.y).not.toBe(nodes[1].position.y);
  });
});


describe('library drop replacement', () => {
  beforeEach(seed);

  it('preserves the slot, migrates connections, and adjusts attention heads in the same undo step', () => {
    const transformer = spec('user.transformer', 'user_encoder', user.inputs, user.outputs);
    transformer.parameters.push({
      ...transformer.parameters[1], name: 'num_attention_heads', default: 3, maximum: null,
    });
    useStudio.setState((state) => ({ components: { ...state.components, [transformer.id]: transformer } }));
    const store = useStudio.getState();
    const itemId = store.addNode(item.id, { x: 50, y: 90 })!;
    const userId = store.addNode(user.id, { x: 200, y: 90 })!;
    store.connect({ source: itemId, sourceHandle: 'history', target: userId, targetHandle: 'history' });
    store.updateTrain({ hidden_size: 256 });
    store.dropComponent(transformer.id, { x: 10, y: 20 });

    const { graph, consoleLines } = useStudio.getState();
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes[1]).toMatchObject({
      id: userId, component: transformer.id, position: { x: 200, y: 90 }, params: { num_attention_heads: 2 },
    });
    expect(graph.edges).toHaveLength(1);
    expect(consoleLines.join(' ')).toContain('num_attention_heads → 2');
    store.undo();
    expect(useStudio.getState().graph.nodes[1].component).toBe(user.id);
  });

  it('adjusts a downstream user encoder when the replacement changes its input width', () => {
    const adaItem = spec('item.ada', 'item_encoder', item.inputs, item.outputs);
    adaItem.parameters.push({ ...adaItem.parameters[1], name: 'item_hidden_size', default: 30, maximum: null });
    const transformer = spec('user.transformer', 'user_encoder', user.inputs, user.outputs);
    transformer.parameters.push({
      ...transformer.parameters[1], name: 'num_attention_heads', default: 4, maximum: null,
    });
    useStudio.setState((state) => ({ components: {
      ...state.components, [adaItem.id]: adaItem, [transformer.id]: transformer,
    } }));
    const store = useStudio.getState();
    const itemId = store.addNode(item.id, { x: 0, y: 0 })!;
    const userId = store.addNode(transformer.id, { x: 300, y: 0 })!;
    store.connect({ source: itemId, sourceHandle: 'history', target: userId, targetHandle: 'history' });
    store.dropComponent(adaItem.id, { x: 0, y: 0 });

    const { graph, toasts } = useStudio.getState();
    expect(graph.train.item_hidden_size).toBe(30);
    expect(graph.nodes.find((node) => node.id === userId)?.params.num_attention_heads).toBe(3);
    expect(toasts.at(-1)?.message).toContain('user.transformer · num_attention_heads → 3');
  });

});


describe('task switching', () => {
  beforeEach(seed);

  it('switches objective atomically, preserves nodes and edges, and supports undo', () => {
    const store = useStudio.getState;
    const enc = store().addNode('item.cnn', { x: 0, y: 0 })!;
    const pred = store().addNode('predictor.dot', { x: 200, y: 0 })!;
    const objective = store().addNode('training.matching_task', { x: 400, y: 0 })!;
    store().connect({ source: pred, sourceHandle: 'score', target: objective, targetHandle: 'score' });
    const before = structuredClone(store().graph);
    store().setTask('ranking');
    expect(store().graph.task).toBe('ranking');
    expect(store().graph.nodes.find(n => n.id === objective)?.component).toBe('training.ranking_task');
    expect(store().graph.nodes.find(n => n.id === enc)?.component).toBe('item.cnn');
    expect(store().graph.edges).toEqual(before.edges);
    store().undo();
    expect(store().graph).toEqual(before);
    store().setTask('ranking');
    store().setTask('matching');
    expect(store().graph.nodes.find(n => n.id === objective)?.component).toBe('training.matching_task');
  });

  it('blocks DIN switching through both task selection and objective replacement', () => {
    const store = useStudio.getState;
    store().addNode('predictor.din', { x: 0, y: 0 });
    const objective = store().addNode('training.ranking_task', { x: 300, y: 0 })!;
    const before = structuredClone(store().graph);
    store().setTask('matching');
    expect(store().graph).toEqual(before);
    expect(store().toasts.at(-1)?.message).toContain('does not support');
    expect(store().replaceComponent(objective, 'training.matching_task').ok).toBe(false);
    expect(store().addNode('training.matching_task', { x: 600, y: 0 })).toBeNull();
    expect(store().graph).toEqual(before);
  });

  it('synchronizes the task when replacing either the objective or predictor', () => {
    const store = useStudio.getState;
    const pred = store().addNode('predictor.dot', { x: 0, y: 0 })!;
    const objective = store().addNode('training.matching_task', { x: 300, y: 0 })!;
    expect(store().replaceComponent(objective, 'training.ranking_task').ok).toBe(true);
    expect(store().graph.task).toBe('ranking');
    store().setTask('matching');
    expect(store().replaceComponent(pred, 'predictor.din').ok).toBe(true);
    expect(store().graph.task).toBe('ranking');
    expect(store().graph.nodes.find(n => n.id === objective)?.component).toBe('training.ranking_task');
  });
});


it('removes legacy feature annotations and their edges when opening a graph', () => {
  const graph = emptyGraph('Legacy features');
  graph.nodes = [
    { id: 'data', component: 'dataset.mind', params: {}, position: { x: 0, y: 0 } },
    { id: 'feature', component: 'feature.item_text', params: {}, position: { x: 1, y: 0 } },
  ];
  graph.edges = [{ id: 'annotation', source: 'data', sourceHandle: 'dataset', target: 'feature', targetHandle: 'dataset' }];
  useStudio.getState().setGraph(graph);
  expect(useStudio.getState().graph.nodes.map(n => n.id)).toEqual(['data']);
  expect(useStudio.getState().graph.edges).toEqual([]);
});
