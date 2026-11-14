import { configLayout, type Sizes } from '@/canvas/layout';
import { create } from 'zustand';
import { api, downloadText } from '@/api/client';
import type {
  CompileResult,
  EnvironmentReport,
  RunRecord,
  ValidationReport,
} from '@/types/api';
import type { CategoryMeta, ComponentCatalog, ComponentSpec, PortTypeMeta, TemplateSummary } from '@/types/catalog';
import { canMigrate, FIXED_ROLES, rebindDatasetInputs, reconcileReplacement, syncTaskObjective, taskSwitchError } from './replacement';
import { DEFAULT_TRAIN, emptyGraph } from '@/types/graph';
import type { GraphEdge, GraphJson, ParamValue, Position, TaskType, TrainConfig } from '@/types/graph';

const STORAGE_KEY = 'legommenders-demo-studio:graph:v1';
const THEME_KEY = 'legommenders-studio:theme';
const WELCOME_KEY = 'legommenders-studio:welcome-seen';

export type BottomTab = 'console' | 'yaml' | 'training' | 'evaluation' | 'comparison' | 'graph';
export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
}

export interface ConnectResult {
  ok: boolean;
  reason?: string;
}

export interface ReplaceResult {
  migrated: string[];
  dropped: string[];
  ok: boolean;
  reason?: string;
}

interface StudioState {
  graph: GraphJson;
  catalog: ComponentCatalog | null;
  components: Record<string, ComponentSpec>;
  categories: CategoryMeta[];
  portTypes: PortTypeMeta[];
  templates: TemplateSummary[];
  environment: EnvironmentReport | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  focusNodeId: string | null;
  fitViewSignal: number;
  hoveredNodeId: string | null;
  past: GraphJson[];
  future: GraphJson[];
  pending: GraphJson | null;
  dirty: boolean;
  loading: boolean;
  validation: ValidationReport | null;
  compileResult: CompileResult | null;
  validating: boolean;
  compiling: boolean;
  consoleLines: string[];
  bottomTab: BottomTab;
  bottomOpen: boolean;
  theme: 'light' | 'dark';
  welcomeVisible: boolean;
  toasts: Toast[];
  currentRunId: string | null;
  currentRun: RunRecord | null;
  runs: RunRecord[];
  training: boolean;
  contextMenu: { x: number; y: number; nodeId: string | null } | null;
  dialog: 'reset' | 'replace' | 'compatible' | null;
  libraryCollapsed: Record<string, boolean>;

  init: () => Promise<void>;
  refreshEnvironment: () => Promise<void>;
  refreshRuns: () => Promise<void>;
  loadTemplate: (id: string) => Promise<void>;
  setGraph: (graph: GraphJson, message?: string) => void;
  resetGraph: () => void;
  renameGraph: (name: string) => void;
  setTask: (task: TaskType) => void;
  updateTrain: (patch: Partial<TrainConfig>) => void;
  addNode: (componentId: string, position: Position) => string | null;
  dropComponent: (componentId: string, position: Position, targetId?: string) => void;
  moveNode: (id: string, position: Position) => void;
  setNodePositionLive: (id: string, position: Position) => void;
  beginInteraction: () => void;
  endInteraction: () => void;
  deleteNodes: (ids: string[]) => void;
  duplicateNode: (id: string) => void;
  updateParam: (id: string, name: string, value: ParamValue) => void;
  setNodeLabel: (id: string, label: string) => void;
  resetParams: (id: string) => void;
  connect: (edge: Omit<GraphEdge, 'id'>) => ConnectResult;
  deleteEdges: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  autoLayout: (sizes?: Sizes) => void;
  requestFitView: () => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  focusNode: (id: string) => void;
  setHovered: (id: string | null) => void;
  setContextMenu: (menu: StudioState['contextMenu']) => void;
  setDialog: (dialog: StudioState['dialog']) => void;
  toggleCategory: (id: string) => void;
  setBottomTab: (tab: BottomTab) => void;
  setBottomOpen: (open: boolean) => void;
  toggleTheme: () => void;
  dismissWelcome: () => void;
  pushConsole: (line: string) => void;
  clearConsole: () => void;
  toast: (kind: ToastKind, title: string, message?: string) => void;
  dismissToast: (id: string) => void;
  validateGraph: (silent?: boolean) => Promise<ValidationReport | null>;
  compileGraph: () => Promise<CompileResult | null>;
  verifyGraph: () => Promise<void>;
  save: (silent?: boolean) => Promise<void>;
  restoreLocal: () => boolean;
  savedGraphs: () => Promise<{ graphs: { graph_id: string; name: string; task: string; nodes: number; saved_at: number }[] }>;
  loadSaved: (graphId: string) => Promise<void>;
  exportGraph: () => void;
  exportYaml: () => void;
  importGraphJson: (text: string) => Promise<void>;
  importYaml: (text: string) => Promise<void>;
  replaceComponent: (nodeId: string, componentId: string) => ReplaceResult;
  addCompatibleComponent: (componentId: string) => void;
  train: (preflightOnly?: boolean, hfToken?: string) => Promise<void>;
  evaluate: () => Promise<void>;
  cancelRun: () => Promise<void>;
  pollRun: () => Promise<void>;
  openRun: (runId: string) => Promise<void>;
}

const clone = <T,>(value: T): T => structuredClone(value);
const uid = () => Math.random().toString(36).slice(2, 9);

// Works in a browser and in the Node-based Vitest environment.
const memoryStorage: Record<string, string> = {};
const storage = {
  getItem: (key: string): string | null => {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    return memoryStorage[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    else memoryStorage[key] = value;
  },
};
const schedule = (fn: () => void, delay: number): void => {
  if (typeof window !== 'undefined') window.setTimeout(fn, delay);
  else setTimeout(fn, delay);
};

function catalogueIndex(catalog: ComponentCatalog): Record<string, ComponentSpec> {
  return Object.fromEntries(catalog.components.map((c) => [c.id, c]));
}

function defaultParams(component?: ComponentSpec): Record<string, ParamValue> {
  if (!component) return {};
  const result: Record<string, ParamValue> = {};
  for (const param of component.parameters) {
    if (param.default !== null && param.default !== undefined) {
      result[param.name] = clone(param.default) as ParamValue;
    }
  }
  return result;
}

function syncHiddenSize(graph: GraphJson, value: number): void {
  graph.train.hidden_size = value;
  for (const node of graph.nodes) {
    if (Object.prototype.hasOwnProperty.call(node.params, 'hidden_size')) {
      node.params.hidden_size = value;
    }
  }
}

function normaliseGraph(raw: GraphJson): GraphJson {
  const nodes = raw.nodes || [];
  const legacy = nodes.filter((node) => node.component.startsWith('evaluation.'));
  const legacyIds = new Set([...legacy, ...nodes.filter((node) => node.component.startsWith('feature.'))].map((node) => node.id));
  const defaults: Record<string, string> = {
    ndcg1: 'NDCG@1', ndcg5: 'NDCG@5', ndcg10: 'NDCG@10', ndcg: 'NDCG@10',
    recall: 'Recall@10', hitratio: 'HitRatio@10', f1: 'F1@0.5', logloss: 'LogLoss',
  };
  const train = { ...DEFAULT_TRAIN, ...(raw.train || {}), extra_cli: raw.train?.extra_cli || {} };
  if (legacy.length) {
    train.metrics = [...new Set(legacy.map((node) => {
      const key = node.component.slice('evaluation.'.length);
      const metric = String(node.params?.metric || defaults[key] || key.toUpperCase());
      return typeof node.params?.k === 'number' && metric.includes('@')
        ? metric.split('@')[0] + '@' + node.params.k : metric;
    }))];
  }
  if (!train.metrics.includes(train.dev_metric)) {
    train.metrics = [train.dev_metric, ...train.metrics];
  }
  return {
    ...emptyGraph(),
    ...raw,
    train,
    nodes: nodes.filter((node) => !legacyIds.has(node.id))
      .map((n) => ({ ...n, params: n.params || {}, position: n.position || { x: 0, y: 0 } })),
    edges: (raw.edges || []).filter((edge) => !legacyIds.has(edge.source) && !legacyIds.has(edge.target)),
  };
}



let validationTimer: ReturnType<typeof setTimeout> | undefined;

export const useStudio = create<StudioState>((set, get) => {
  const autoValidate = () => {
    if (validationTimer) clearTimeout(validationTimer);
    validationTimer = setTimeout(() => void get().validateGraph(true), 650);
  };

  const commit = (mutate: (graph: GraphJson) => void) => {
    set((state) => {
      const before = state.pending ?? clone(state.graph);
      const graph = clone(state.graph);
      mutate(graph);
      return {
        graph,
        past: [...state.past, before].slice(-100),
        future: [],
        pending: null,
        dirty: true,
        validation: null,
        compileResult: null,
      };
    });
    autoValidate();
  };

  const log = (line: string) => {
    set((state) => ({ consoleLines: [...state.consoleLines.slice(-400), `[${new Date().toLocaleTimeString()}] ${line}`] }));
  };

  const notify = (kind: ToastKind, title: string, message?: string) => {
    const toast: Toast = { id: uid(), kind, title, message };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    schedule(() => get().dismissToast(toast.id), 4800);
  };

  return {
    graph: emptyGraph('NAML — Visual Model'),
    catalog: null,
    components: {},
    categories: [],
    portTypes: [],
    templates: [],
    environment: null,
    selectedNodeId: null,
    selectedEdgeId: null,
    focusNodeId: null,
    fitViewSignal: 0,
    hoveredNodeId: null,
    past: [],
    future: [],
    pending: null,
    dirty: false,
    loading: true,
    validation: null,
    compileResult: null,
    validating: false,
    compiling: false,
    consoleLines: [],
    bottomTab: 'console',
    bottomOpen: true,
    theme: (storage.getItem(THEME_KEY) as 'light' | 'dark') || 'light',
    welcomeVisible: storage.getItem(WELCOME_KEY) !== 'true',
    toasts: [],
    currentRunId: null,
    currentRun: null,
    runs: [],
    training: false,
    contextMenu: null,
    dialog: null,
    libraryCollapsed: {},

    init: async () => {
      set({ loading: true });
      try {
        const [catalog, templateResponse, environment, runs] = await Promise.all([
          api.components(),
          api.templates(),
          api.environment(),
          api.runs(),
        ]);
        set({
          catalog,
          components: catalogueIndex(catalog),
          categories: catalog.categories,
          portTypes: catalog.port_types,
          templates: templateResponse.templates,
          environment,
          runs: runs.runs,
          loading: false,
        });
        log(`Registry ready: ${catalog.components.length} components from ${catalog.generated_from}`);
        log(`Templates ready: ${templateResponse.templates.filter((t) => t.available).length} static model templates`);
        for (const warning of environment.warnings) log(`ENV: ${warning}`);
        const restored = get().restoreLocal();
        if (!restored) {
          const naml = templateResponse.templates.find((t) => t.id === 'naml' && t.available);
          if (naml?.graph) {
            set({ graph: normaliseGraph(naml.graph), dirty: false });
            log('Loaded the NAML template (config/model/naml.yaml) as the demo starting point.');
          }
        }
        if (get().graph.nodes.length) get().requestFitView();
        void get().validateGraph();
      } catch (error) {
        set({ loading: false });
        notify('error', 'Demo initialization failed', String(error));
        log(`ERROR: ${String(error)}`);
      }
    },

    refreshEnvironment: async () => {
      try {
        set({ environment: await api.environment() });
      } catch (error) {
        notify('error', 'Cannot read environment', String(error));
      }
    },

    refreshRuns: async () => {
      try {
        set({ runs: (await api.runs()).runs });
      } catch (error) {
        notify('error', 'Cannot list runs', String(error));
      }
    },

    loadTemplate: async (id: string) => {
      try {
        const template = await api.template(id);
        if (!template.available || !template.graph) {
          throw new Error(template.error || 'Template is not available');
        }
        get().setGraph(template.graph, `Loaded ${template.name} from ${template.source_yaml}`);
        set({ welcomeVisible: false, selectedNodeId: null, selectedEdgeId: null, bottomTab: 'console' });
        storage.setItem(WELCOME_KEY, 'true');
        get().requestFitView();
      } catch (error) {
        notify('error', 'Cannot load template', String(error));
      }
    },

    setGraph: (raw, message) => {
      const graph = normaliseGraph(raw);
      set((state) => ({
        graph,
        past: [...state.past, clone(state.graph)].slice(-100),
        future: [],
        pending: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        validation: null,
        compileResult: null,
        dirty: false,
      }));
      if (message) {
        log(message);
        notify('success', 'Model graph loaded', message);
      }
    },

    resetGraph: () => {
      const graph = emptyGraph('Untitled Recommender');
      set((state) => ({
        graph,
        past: [...state.past, clone(state.graph)].slice(-100),
        future: [],
        pending: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        validation: null,
        compileResult: null,
        dirty: true,
        dialog: null,
      }));
      log('Canvas reset to an empty graph.');
      notify('info', 'Canvas cleared');
    },

    renameGraph: (name) => commit((graph) => { graph.name = name; }),
    setTask: (task) => {
      const { graph, components } = get();
      const reason = taskSwitchError(graph, task, components);
      if (reason) {
        notify('error', 'Task switch blocked', reason);
        return;
      }
      commit((draft) => { syncTaskObjective(draft, task, components); });
      log(`Task switched to ${task}. Training objective synchronized.`);
    },
    updateTrain: (patch) => commit((graph) => {
      graph.train = { ...graph.train, ...patch };
      if (typeof patch.hidden_size === 'number') syncHiddenSize(graph, patch.hidden_size);
    }),

    addNode: (componentId, position) => {
      const component = get().components[componentId];
      if (!component) {
        notify('error', 'Unknown component', componentId);
        return null;
      }
      if (component.role === 'training' && component.tasks.length === 1) {
        const reason = taskSwitchError(get().graph, component.tasks[0] as TaskType, get().components);
        if (reason) {
          notify('error', 'Task switch blocked', reason);
          return null;
        }
      }
      const id = `${component.role}_${uid()}`;
      commit((graph) => {
        const hasObjective = graph.nodes.some((node) => node.component.startsWith('training.'));
        if (component.role === 'training' && !hasObjective && component.tasks.length === 1) {
          graph.task = component.tasks[0] === 'ranking' ? 'ranking' : 'matching';
        }
        graph.nodes.push({
          id,
          component: componentId,
          type: component.role,
          params: defaultParams(component),
          position,
        });
      });
      set({ selectedNodeId: id, selectedEdgeId: null });
      log(`Added ${component.name} (${componentId}).`);
      if (!component.executable) {
        notify('warning', 'Conceptual component', `${component.name} is an annotation only — it will not emit YAML.`);
      }
      return id;
    },

    dropComponent: (componentId, position, targetId) => {
      const { components, graph, selectedNodeId, addNode, replaceComponent } = get();
      const role = components[componentId]?.role;
      const matches = graph.nodes.filter((node) => components[node.component]?.role === role);
      const target = role && FIXED_ROLES.has(role)
        ? matches.find((node) => node.id === targetId)
          ?? matches.find((node) => node.id === selectedNodeId)
          ?? matches[0]
        : matches.find((node) => node.id === targetId);
      if (!target) addNode(componentId, position);
      else if (target.component === componentId) get().selectNode(target.id);
      else replaceComponent(target.id, componentId);
    },

    moveNode: (id, position) => commit((graph) => {
      const node = graph.nodes.find((n) => n.id === id);
      if (node) node.position = position;
    }),

    setNodePositionLive: (id, position) => set((state) => ({
      graph: {
        ...state.graph,
        nodes: state.graph.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
      },
    })),

    beginInteraction: () => set((state) => ({ pending: state.pending ?? clone(state.graph) })),
    endInteraction: () => set((state) => {
      if (!state.pending) return {};
      return {
        past: [...state.past, state.pending].slice(-100),
        future: [],
        pending: null,
        dirty: true,
      };
    }),

    deleteNodes: (ids) => {
      if (!ids.length) return;
      commit((graph) => {
        graph.nodes = graph.nodes.filter((n) => !ids.includes(n.id));
        graph.edges = graph.edges.filter((e) => !ids.includes(e.source) && !ids.includes(e.target));
      });
      set({ selectedNodeId: null });
      log(`Deleted ${ids.length} node(s).`);
    },

    duplicateNode: (id) => {
      const node = get().graph.nodes.find((n) => n.id === id);
      if (!node) return;
      const newId = `${node.type || 'node'}_${uid()}`;
      commit((graph) => {
        graph.nodes.push({
          ...clone(node),
          id: newId,
          position: { x: node.position.x + 48, y: node.position.y + 48 },
        });
      });
      set({ selectedNodeId: newId });
      log(`Duplicated ${node.component} → ${newId}.`);
      notify('success', 'Node duplicated');
    },

    updateParam: (id, name, value) => {
      if (name === 'data_config') {
        const { graph, components, replaceComponent } = get();
        const node = graph.nodes.find((candidate) => candidate.id === id);
        const dataset = Object.values(components).find((spec) => spec.role === 'dataset' && spec.source.yaml === value);
        if (node?.component.startsWith('dataset.') && dataset && dataset.id !== node.component) {
          replaceComponent(id, dataset.id);
          return;
        }
      }
      commit((graph) => {
        const node = graph.nodes.find((n) => n.id === id);
        if (!node) return;
        if (name === 'token_source' && node.component.startsWith('dataset.') &&
            node.params.token_source !== value && node.params.item_inputs != null) {
          node.params.item_inputs = value === 'external_hf'
            ? rebindDatasetInputs(node.params.item_inputs, 'external_hf', true) : null;
        }
        node.params[name] = value;
        if (name === 'hidden_size' && typeof value === 'number') {
          syncHiddenSize(graph, value);
        }
        if (name === 'item_hidden_size' && (typeof value === 'number' || value === null)) {
          graph.train.item_hidden_size = value;
        }
      });
      const component = get().components[get().graph.nodes.find((n) => n.id === id)?.component || ''];
      log(`${component?.name ?? id}: ${name} = ${JSON.stringify(value)}`);
    },

    setNodeLabel: (id, label) => commit((graph) => {
      const node = graph.nodes.find((n) => n.id === id);
      if (node) node.label = label;
    }),

    resetParams: (id) => {
      const node = get().graph.nodes.find((n) => n.id === id);
      if (!node) return;
      const component = get().components[node.component];
      commit((graph) => {
        const target = graph.nodes.find((n) => n.id === id);
        if (target) target.params = defaultParams(component);
      });
      log(`Restored default parameters for ${component?.name ?? id}.`);
      notify('success', 'Defaults restored');
    },

    connect: (edge) => {
      const { components, portTypes, graph } = get();
      const source = graph.nodes.find((n) => n.id === edge.source);
      const target = graph.nodes.find((n) => n.id === edge.target);
      if (!source || !target) return { ok: false, reason: 'One of the nodes no longer exists.' };
      if (source.id === target.id) return { ok: false, reason: 'A node cannot connect to itself.' };
      const out = components[source.component]?.outputs.find((p) => p.name === edge.sourceHandle);
      const inp = components[target.component]?.inputs.find((p) => p.name === edge.targetHandle);
      if (!out || !inp) return { ok: false, reason: 'Unknown input or output port.' };
      const accepted = portTypes.find((p) => p.id === inp.type)?.accepts || [inp.type];
      if (!accepted.includes(out.type)) {
        return {
          ok: false,
          reason: `Incompatible ports: ${out.type} → ${inp.type}. ${inp.name} accepts ${accepted.join(', ')}.`,
        };
      }
      if (graph.edges.some((e) => e.source === edge.source && e.sourceHandle === edge.sourceHandle
        && e.target === edge.target && e.targetHandle === edge.targetHandle)) {
        return { ok: false, reason: 'This connection already exists.' };
      }
      if (graph.edges.some((e) => e.target === edge.target && e.targetHandle === edge.targetHandle)) {
        return { ok: false, reason: `Input ${inp.name} already has an incoming connection.` };
      }
      commit((draft) => {
        draft.edges.push({ ...edge, id: `e_${uid()}` });
      });
      log(`Connected ${source.component}.${out.name} → ${target.component}.${inp.name}`);
      return { ok: true };
    },

    deleteEdges: (ids) => {
      if (!ids.length) return;
      commit((graph) => { graph.edges = graph.edges.filter((e) => !ids.includes(e.id)); });
      set({ selectedEdgeId: null });
      log(`Removed ${ids.length} connection(s).`);
    },

    undo: () => set((state) => {
      if (!state.past.length) return {};
      const previous = state.past[state.past.length - 1];
      return {
        graph: clone(previous),
        past: state.past.slice(0, -1),
        future: [clone(state.graph), ...state.future].slice(0, 100),
        validation: null,
        compileResult: null,
        dirty: true,
      };
    }),

    redo: () => set((state) => {
      if (!state.future.length) return {};
      const next = state.future[0];
      return {
        graph: clone(next),
        past: [...state.past, clone(state.graph)].slice(-100),
        future: state.future.slice(1),
        validation: null,
        compileResult: null,
        dirty: true,
      };
    }),

    autoLayout: (sizes = {}) => {
      const positions = configLayout(get().graph, sizes);
      if (get().graph.nodes.every(n => n.position.x === positions[n.id].x && n.position.y === positions[n.id].y)) return;
      commit(draft => { draft.nodes.forEach(n => { n.position = positions[n.id]; }); });
      get().requestFitView();
    },

    requestFitView: () => set((state) => ({ fitViewSignal: state.fitViewSignal + 1 })),
    selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
    selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
    focusNode: (id) => set((state) => ({ focusNodeId: id, selectedNodeId: id, fitViewSignal: state.fitViewSignal + 1 })),
    setHovered: (id) => set({ hoveredNodeId: id }),
    setContextMenu: (menu) => set({ contextMenu: menu }),
    setDialog: (dialog) => set({ dialog }),
    toggleCategory: (id) => set((state) => ({ libraryCollapsed: { ...state.libraryCollapsed, [id]: !state.libraryCollapsed[id] } })),
    setBottomTab: (tab) => set({ bottomTab: tab, bottomOpen: true }),
    setBottomOpen: (open) => set({ bottomOpen: open }),
    toggleTheme: () => set((state) => {
      const theme = state.theme === 'light' ? 'dark' : 'light';
      storage.setItem(THEME_KEY, theme);
      return { theme };
    }),
    dismissWelcome: () => {
      storage.setItem(WELCOME_KEY, 'true');
      set({ welcomeVisible: false });
    },
    pushConsole: (line) => log(line),
    clearConsole: () => set({ consoleLines: [] }),
    toast: notify,
    dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

    validateGraph: async (silent = false) => {
      const graph = get().graph;
      set({ validating: true });
      try {
        const report = await api.validate(graph);
        if (get().graph !== graph) { set({ validating: false }); return null; }
        set({ validation: report, validating: false });
        log(report.valid
          ? `VALIDATION OK — ${report.summary.model_label}, ${report.summary.nodes} nodes / ${report.summary.edges} edges.`
          : `VALIDATION FAILED — ${report.errors.length} error(s).`);
        for (const issue of report.errors.slice(0, 6)) log(`  ERROR [${issue.code}] ${issue.message}`);
        if (!silent) {
          notify(report.valid ? 'success' : 'error',
            report.valid ? 'Basic graph checks passed' : `${report.errors.length} validation error(s)`,
            report.valid ? `${report.summary.model_label} · ${report.warnings.length} warning(s)` : report.errors[0]?.message);
        }
        return report;
      } catch (error) {
        set({ validating: false });
        if (!silent) notify('error', 'Validation failed', String(error));
        log(`ERROR: ${String(error)}`);
        return null;
      }
    },

    compileGraph: async () => {
      set({ compiling: true, bottomTab: 'yaml', bottomOpen: true });
      try {
        const result = await api.compile(get().graph);
        set({ compileResult: result, validation: result.validation, compiling: false });
        log(`COMPILE OK — ${result.model_label}; generated ${result.generated_file}`);
        for (const note of result.notes.slice(-4)) log(`  ${note}`);
        notify(result.compatible_with_reference ? 'success' : 'warning',
          `${result.model_label} configuration generated`,
          result.compatible_with_reference ? 'Verified by trainer.get_configurations()' : result.notes.at(-1));
        return result;
      } catch (error) {
        set({ compiling: false });
        notify('error', 'Compilation failed', String(error));
        log(`ERROR: ${String(error)}`);
        return null;
      }
    },

    verifyGraph: async () => {
      notify('info', 'Unavailable in static demo', 'Training, evaluation and Python checks require the backend.');
    },

    save: async (silent = false) => {
      const graph = get().graph;
      try {
        await api.saveGraph(graph);
        storage.setItem(STORAGE_KEY, JSON.stringify(graph));
        set({ dirty: false });
        log(`SAVED LOCALLY — ${graph.name} (${graph.nodes.length} nodes)`);
        if (!silent) notify('success', 'Saved in this browser', 'Export Graph JSON for a portable backup.');
      } catch (error) {
        if (!silent) notify('error', 'Browser save failed', 'Storage may be full or blocked. Export Graph JSON to keep your changes.');
        log(`Local save failed: ${String(error)}`);
      }
    },

    restoreLocal: () => {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return false;
      try {
        const graph = normaliseGraph(JSON.parse(raw) as GraphJson);
        set({ graph, past: [], future: [], dirty: false });
        log(`Restored saved project "${graph.name}" from local storage.`);
        return true;
      } catch {
        return false;
      }
    },

    savedGraphs: () => api.savedGraphs(),

    loadSaved: async (graphId) => {
      try {
        const response = await api.loadGraph(graphId);
        get().setGraph(response.graph, `Opened saved project "${response.graph.name}".`);
        set({ welcomeVisible: false });
        get().requestFitView();
      } catch (error) {
        notify('error', 'Cannot open project', String(error));
      }
    },

    exportGraph: () => {
      const graph = get().graph;
      downloadText(`${graph.graph_id || 'model'}.json`, JSON.stringify(graph, null, 2), 'application/json');
      log(`Exported Graph JSON (${graph.nodes.length} nodes).`);
      notify('success', 'Graph JSON exported');
    },

    exportYaml: () => {
      const result = get().compileResult;
      if (!result) {
        notify('warning', 'No compiled YAML yet', 'Click Generate Model first.');
        return;
      }
      downloadText(`${result.model_label.replace(/\s+/g, '_')}.yaml`, result.yaml_text, 'application/yaml');
      notify('success', 'YAML downloaded');
    },

    importGraphJson: async (text) => {
      try {
        const parsed = JSON.parse(text) as GraphJson;
        const result = await api.importGraph({ graph: parsed });
        get().setGraph(result.graph, `Imported Graph JSON "${result.graph.name}".`);
        set({ validation: result.validation, welcomeVisible: false });
        get().requestFitView();
      } catch (error) {
        notify('error', 'Import failed', String(error));
      }
    },

    importYaml: async (text) => {
      try {
        const result = await api.importGraph({ yaml: text });
        get().setGraph(result.graph, `Imported Legommenders YAML "${result.graph.name}".`);
        set({ validation: result.validation, welcomeVisible: false });
        get().requestFitView();
      } catch (error) {
        notify('error', 'YAML import failed', String(error));
      }
    },

    replaceComponent: (nodeId, componentId) => {
      const { graph, components } = get();
      const node = graph.nodes.find((n) => n.id === nodeId);
      const oldSpec = node ? components[node.component] : undefined;
      const newSpec = components[componentId];
      if (!node || !oldSpec || !newSpec) return { ok: false, migrated: [], dropped: [], reason: 'Unknown node or component.' };
      if (oldSpec.role !== newSpec.role) return { ok: false, migrated: [], dropped: [], reason: 'Only components of the same role can be swapped.' };
      if (newSpec.role === 'training' && newSpec.tasks.length === 1) {
        const reason = taskSwitchError(graph, newSpec.tasks[0] as TaskType, components);
        if (reason) {
          notify('error', 'Task switch blocked', reason);
          return { ok: false, migrated: [], dropped: [], reason };
        }
      }
      const newDefaults = defaultParams(newSpec);
      const migrated: string[] = [];
      const dropped: string[] = [];
      const params: Record<string, ParamValue> = { ...newDefaults };
      for (const [name, value] of Object.entries(node.params)) {
        if (newSpec.role === 'dataset') continue;
        const targetParam = newSpec.parameters.find((p) => p.name === name);
        if (!targetParam || !canMigrate(value, targetParam)) { dropped.push(name); continue; }
        params[name] = value;
        migrated.push(name);
      }
      let adjustments: string[] = [];
      commit((draft) => {
        const target = draft.nodes.find((n) => n.id === nodeId)!;
        target.component = componentId;
        target.params = params;
        adjustments = reconcileReplacement(draft, target, oldSpec, components, get().portTypes);
      });
      set({ dialog: null, selectedNodeId: nodeId, selectedEdgeId: null });
      log(`Replaced ${oldSpec.name} with ${newSpec.name}. Kept ${migrated.length} parameter(s), reset ${dropped.length}.`);
      for (const adjustment of adjustments) log(`  ${adjustment}`);
      notify(adjustments.length ? 'info' : 'success', `Replaced with ${newSpec.name}`, adjustments.join(' · ') || undefined);
      clearTimeout(validationTimer);
      void get().validateGraph();
      return { ok: true, migrated, dropped };
    },

    addCompatibleComponent: (componentId) => {
      const selected = get().selectedNodeId;
      const node = get().graph.nodes.find((n) => n.id === selected);
      if (!node) return;
      const newId = get().addNode(componentId, { x: node.position.x + 330, y: node.position.y + 120 });
      if (!newId) return;
      const spec = get().components[componentId];
      const source = get().components[node.component];
      let connected = false;
      for (const out of source.outputs) {
        for (const inp of spec.inputs) {
          if (get().connect({ source: node.id, sourceHandle: out.name, target: newId, targetHandle: inp.name }).ok) {
            connected = true;
            break;
          }
        }
        if (connected) break;
      }
      if (!connected) {
        for (const out of spec.outputs) {
          for (const inp of source.inputs) {
            if (get().connect({ source: newId, sourceHandle: out.name, target: node.id, targetHandle: inp.name }).ok) {
              connected = true;
              break;
            }
          }
          if (connected) break;
        }
      }
      set({ dialog: null });
      if (!connected) notify('info', 'Component added', 'No compatible port was free; connect it manually.');
    },

    train: async (_preflightOnly = false, _hfToken) => {
      notify('info', 'Unavailable in static demo', 'Training, evaluation and Python checks require the backend.');
    },

    evaluate: async () => {
      notify('info', 'Unavailable in static demo', 'Training, evaluation and Python checks require the backend.');
    },

    cancelRun: async () => {
      const runId = get().currentRunId;
      if (!runId) return;
      try {
        const record = await api.cancel(runId);
        set({ currentRun: record, training: false });
        notify('info', 'Run cancelled', runId);
      } catch (error) {
        notify('error', 'Cancel failed', String(error));
      }
    },

    pollRun: async () => {
      const runId = get().currentRunId;
      if (!runId) return;
      try {
        const record = await api.runStatus(runId);
        if (get().currentRunId !== runId) return;
        set({ currentRun: record, training: record.status === 'running' || record.status === 'pending' });
        if (record.status === 'running' || record.status === 'pending') {
          schedule(() => void get().pollRun(), 1200);
        } else {
          const runs = await api.runs();
          set({ runs: runs.runs });
          if (record.status === 'completed') {
            notify('success', 'Run completed', Object.keys(record.metrics).length
              ? `${Object.keys(record.metrics).length} real test metric(s) available.` : 'No metrics were emitted by tester.py.');
            get().setBottomTab('evaluation');
          } else if (record.status === 'failed') {
            notify('error', 'Run failed', record.error.slice(0, 180));
            get().setBottomTab('training');
          }
          log(`RUN ${runId} finished: ${record.status} (exit ${record.exit_code})`);
        }
      } catch (error) {
        set({ training: false });
        log(`Polling error: ${String(error)}`);
      }
    },

    openRun: async (runId) => {
      try {
        const record = await api.run(runId);
        set({ currentRunId: runId, currentRun: record, bottomTab: 'evaluation', bottomOpen: true });
      } catch (error) {
        notify('error', 'Cannot open run', String(error));
      }
    },
  };
});
