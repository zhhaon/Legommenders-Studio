import { text, tr, useLocale } from '@/i18n';
import { alignDetailValues, configLayout, detailLayout, rectangles, type Sizes } from './layout';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type IsValidConnection,
  type NodeChange,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Copy, Focus, GitBranch, LayoutGrid, MousePointer2, RefreshCw, Trash2, ZoomIn,
} from 'lucide-react';
import { useStudio } from '@/store/graphStore';
import type { Position } from '@/types/graph';
import type { ComponentSpec } from '@/types/catalog';
import { LegoNode, type LegoFlowNode } from '@/nodes/LegoNode';

import { DetailEdge } from './DetailEdge';
import { DetailNode } from './DetailNode';
import { detailedGraph, detailConnection, selectedDetailInstanceId, selectedDetailEdgeInstanceId, type DetailNode as DetailFlowNode } from './detailedGraph';

const viewPadding = { top: '90px', bottom: '35px', left: '40px', right: '40px' } as const;
const edgeTypes = { detail: DetailEdge };
const nodeTypes = { lego: LegoNode, detail: DetailNode };

export function ModelCanvas({ focused: wide, onFocusChange: setWide }: {
  focused: boolean; onFocusChange: (focused: boolean) => void;
}) {
  const locale = useLocale();
  const wrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView, setCenter, setViewport } = useReactFlow();
  const graph = useStudio((s) => s.graph);
  const components = useStudio((s) => s.components);
  const graphLoadVersion = useStudio(s => s.graphLoadVersion);
  const [measurements, setMeasurements] = useState<{ key: string; sizes: Sizes }>({ key: '', sizes: {} });
  const [expanded, setExpanded] = useState(true);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [selectedDetailEdgeId, setSelectedDetailEdgeId] = useState<string | null>(null);
  const measurementKey = `${locale}:${graphLoadVersion}:${graph.graph_id}:${expanded ? 'detail' : 'config'}`;
  const sizes = useMemo(() => measurements.key === measurementKey ? measurements.sizes : {}, [measurements, measurementKey]);
  const [readyKey, setReadyKey] = useState('');
  // Each expanded invocation has its own visual position, independent of the
  // shared operator configuration and Config layout. New/imported models reset it.
  const detailPositionKey = `${graphLoadVersion}:${graph.graph_id}`;
  useEffect(() => { setSelectedDetailId(null); setSelectedDetailEdgeId(null); }, [graphLoadVersion, graph.graph_id]);
  const [detailPositions, setDetailPositions] = useState<{ key: string; positions: Record<string, Position> }>({ key: '', positions: {} });
  const detail = useMemo(() => {
    const d = detailedGraph(graph, components);
    if (!d) return null;
    const positions = detailPositions.key === detailPositionKey ? detailPositions.positions : {};
    return { ...d, nodes: alignDetailValues(detailLayout(d.nodes, sizes), sizes, positions) };
  }, [graph, components, sizes, detailPositions, detailPositionKey, locale]);
  const showDetail = expanded && !!detail;
  const portTypes = useStudio((s) => s.portTypes);
  const selectedNodeId = useStudio((s) => s.selectedNodeId);
  const selectedEdgeId = useStudio((s) => s.selectedEdgeId);
  const fitViewSignal = useStudio((s) => s.fitViewSignal);
  const focusNodeId = useStudio((s) => s.focusNodeId);
  const contextMenu = useStudio((s) => s.contextMenu);
  const loading = useStudio((s) => s.loading);
  const validation = useStudio(s => s.validation);
  const {
    connect, deleteEdges, deleteNodes, selectNode, selectEdge, setNodePositionLive,
    beginInteraction, endInteraction, dropComponent, duplicateNode, setContextMenu,
    setDialog, autoLayout, requestFitView, toast, setHovered,
  } = useStudio.getState();

  const flowNodes = useMemo<LegoFlowNode[]>(() => graph.nodes.map((node) => ({
    id: node.id,
    type: 'lego' as const,
    position: node.position,
    measured: sizes[node.id],
    data: { nodeId: node.id, componentId: node.component },
    selected: node.id === selectedNodeId,
    draggable: true,
  })), [graph.nodes, selectedNodeId, sizes]);

  const flowEdges = useMemo<Edge[]>(() => graph.edges.map((edge) => {
    const sourceComponent = components[graph.nodes.find((n) => n.id === edge.source)?.component || ''];
    const outType = sourceComponent?.outputs.find((p) => p.name === edge.sourceHandle)?.type;
    const color = outType
      ? (portTypes.find((p) => p.id === outType)?.color || '#94a3b8')
      : '#94a3b8';
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: 'detail',
      data: { rects: rectangles(graph.nodes, sizes) },
      selected: edge.id === selectedEdgeId,
      style: { stroke: color, strokeWidth: edge.id === selectedEdgeId ? 2.4 : 1.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    };
  }), [graph.edges, graph.nodes, components, portTypes, selectedEdgeId, sizes]);

  const selectedInstanceId = showDetail ? selectedDetailInstanceId(detail!.nodes, selectedNodeId, selectedDetailId) : null;
  const displayNodes = showDetail ? detail!.nodes.map(n => ({ ...n, measured: sizes[n.id], selected: n.id === selectedInstanceId })) : flowNodes;
  const selectedEdgeInstanceId = showDetail ? selectedDetailEdgeInstanceId(detail!.edges, selectedEdgeId, selectedDetailEdgeId) : null;
  const displayEdges = showDetail ? detail!.edges.map(e => ({ ...e, selected: e.id === selectedEdgeInstanceId, style: { ...e.style, strokeWidth: e.id === selectedEdgeInstanceId ? 2.8 : 1.8 }, data: { ...e.data, rects: rectangles(detail!.nodes, sizes) } })) : flowEdges;

  const preparingConfig = !showDetail && graph.nodes.length > 0 && readyKey !== measurementKey;

  useEffect(() => {
    if (preparingConfig) return;
    const timer = window.setTimeout(() => { if (graph.nodes.length) void fitView({ padding: viewPadding, duration: 300 }); }, 100);
    return () => window.clearTimeout(timer);
  }, [showDetail, wide, detail?.nodes.length, JSON.stringify(sizes), fitView, preparingConfig]);

  const sizeSignature = JSON.stringify(sizes);
  const configSignature = graph.nodes.map(n=>n.id).join('|') + graph.edges.map(e=>e.source+e.target).join('|');
  useLayoutEffect(() => {
    if (showDetail || !graph.nodes.length || !graph.nodes.every(n=>sizes[n.id])) return;
    autoLayout(sizes);
  }, [showDetail, graph.graph_id, configSignature, sizeSignature]);

  useLayoutEffect(() => {
    if (!preparingConfig || !graph.nodes.every(node => sizes[node.id])) return;
    const positions = configLayout(graph, sizes);
    if (!graph.nodes.every(node => node.position.x === positions[node.id].x && node.position.y === positions[node.id].y)) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: viewPadding, duration: 0 }).then(fitted => {
        if (!cancelled && fitted) setReadyKey(measurementKey);
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [preparingConfig, graph, sizes, measurementKey, fitView]);

  const configConnection = (connection: Connection): Connection | null => showDetail ? detailConnection(connection, detail!.nodes) : connection;
  const isValidConnection = useCallback<IsValidConnection>((connection) => {
    const mapped = configConnection(connection as Connection);
    if (!mapped) return false;
    connection = mapped;
    const state = useStudio.getState();
    const source = state.graph.nodes.find((n) => n.id === connection.source);
    const target = state.graph.nodes.find((n) => n.id === connection.target);
    if (!source || !target || source.id === target.id) return false;
    const out = state.components[source.component]?.outputs.find((p) => p.name === connection.sourceHandle);
    const inp = state.components[target.component]?.inputs.find((p) => p.name === connection.targetHandle);
    if (!out || !inp) return false;
    const accepted = state.portTypes.find((p) => p.id === inp.type)?.accepts || [inp.type];
    return accepted.includes(out.type);
  }, [showDetail, detail]);

  const onConnect = useCallback((connection: Connection) => {
    const mapped = configConnection(connection);
    if (!mapped) return;
    connection = mapped;
    const result = connect({
      source: connection.source,
      sourceHandle: connection.sourceHandle || '',
      target: connection.target,
      targetHandle: connection.targetHandle || '',
    });
    if (!result.ok) toast('error', tr("ui.connection_rejected_b2fbef"), result.reason);
  }, [connect, toast, showDetail, detail]);

  const onNodesChange = useCallback((changes: NodeChange<LegoFlowNode | DetailFlowNode>[]) => {
    const removed: string[] = [];
    for (const change of changes) {
      if (change.type === 'dimensions' && change.dimensions) {
        const { width, height } = change.dimensions;
        setMeasurements(previous => {
          const old = previous.key === measurementKey ? previous.sizes : {};
          return old[change.id]?.width === width && old[change.id]?.height === height ? previous : {
            key: measurementKey, sizes: { ...old, [change.id]: { width, height } },
          };
        });
      } else if (change.type === 'position' && change.position) {
        if (showDetail) {
          const position = change.position;
          setDetailPositions(previous => ({ key: detailPositionKey, positions: {
            ...(previous.key === detailPositionKey ? previous.positions : {}), [change.id]: position,
          } }));
        } else setNodePositionLive(change.id, change.position);
      } else if (!showDetail && change.type === 'remove') {
        removed.push(change.id);
      }
    }
    if (removed.length) deleteNodes(removed);
  }, [setNodePositionLive, deleteNodes, showDetail, measurementKey, detailPositionKey]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const componentId = event.dataTransfer.getData('application/legommenders-component');
    if (!componentId) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const displayId = (event.target as HTMLElement).closest<HTMLElement>('.react-flow__node')?.dataset.id;
    const targetId = showDetail ? detail?.nodes.find(n => n.id === displayId)?.data.originalId : displayId;
    dropComponent(componentId, position, targetId);
  }, [dropComponent, screenToFlowPosition, showDetail, detail]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleNodeContextMenu = useCallback<NodeMouseHandler<LegoFlowNode | DetailFlowNode>>((event, node) => {
    event.preventDefault();
    const id = node.type === 'detail' ? node.data.originalId : node.id;
    if (!id) return;
    if (node.type === 'detail') setSelectedDetailId(node.id);
    setSelectedDetailEdgeId(null);
    selectNode(id);
    const bounds = wrapper.current?.getBoundingClientRect();
    setContextMenu({ x: event.clientX - (bounds?.left || 0), y: event.clientY - (bounds?.top || 0), nodeId: id });
  }, [selectNode, setContextMenu]);

  const onPaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    const bounds = wrapper.current?.getBoundingClientRect();
    setContextMenu({ x: event.clientX - (bounds?.left || 0), y: event.clientY - (bounds?.top || 0), nodeId: null });
  }, [setContextMenu]);

  useEffect(() => {
    if (fitViewSignal > 0 && !preparingConfig) {
      const timer = window.setTimeout(() => {
        if (useStudio.getState().graph.nodes.length) void fitView({ padding: viewPadding, duration: 400 });
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [fitViewSignal, fitView, preparingConfig]);

  useEffect(() => {
    if (!graph.nodes.length) void setViewport({ x: 0, y: 0, zoom: 1 });
  }, [graph.nodes.length, setViewport]);

  useEffect(() => {
    if (!focusNodeId) return;
    const node = showDetail ? displayNodes.find(n => n.data.originalId === focusNodeId) : graph.nodes.find((n) => n.id === focusNodeId);
    if (node) void setCenter(node.position.x + 114, node.position.y + 90, { zoom: 1.25, duration: 400 });
  }, [focusNodeId, graph.nodes, setCenter]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [setContextMenu]);

  const selectedComponent: ComponentSpec | undefined = selectedNodeId
    ? components[graph.nodes.find((n) => n.id === selectedNodeId)?.component || '']
    : undefined;

  return (
    <div className={wide ? "fixed inset-x-0 top-[50px] bottom-0 z-10 bg-canvas flex" : "relative h-full w-full min-w-0 flex"} onDrop={onDrop} onDragOver={onDragOver}>
      <div ref={wrapper} className="relative h-full min-w-0 flex-1" data-testid="model-canvas-pane">
      {loading && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-canvas/70">
          <div className="w-[320px] space-y-2 rounded-lg border border-line bg-surface p-4">
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-4/5 rounded" />
            <p className="pt-1 text-[11px] text-muted">{tr("ui.loading_component_registry_and_verified_templates__8be464")}</p>
          </div>
        </div>
      )}

      {!loading && graph.nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="text-center">
            <LayoutGrid size={34} className="mx-auto mb-3 text-muted/50" />
            <p className="text-sm font-semibold">{tr("ui.empty_canvas_f3ee11")}</p>
            <p className="mt-1 text-[11px] text-muted">{tr("ui.drag_a_component_from_the_library_or_load_a_model_te_3f7a9c")}</p>
          </div>
        </div>
      )}

      <ReactFlow<LegoFlowNode | DetailFlowNode, Edge>
        key={measurementKey}
        style={{ opacity: preparingConfig ? 0 : 1, pointerEvents: preparingConfig ? 'none' : undefined }}
        nodes={displayNodes}
        edges={displayEdges}
        nodesConnectable={!showDetail}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: viewPadding }}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={(changes) => {
          if (showDetail) return;
          const removed = changes.filter((c) => c.type === 'remove').map((c) => c.id);
          if (removed.length) deleteEdges(removed);
        }}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeDragStart={() => { if (!showDetail) beginInteraction(); }}
        onNodeDragStop={() => { if (!showDetail) endInteraction(); }}
        onNodeClick={(_, node) => { setSelectedDetailEdgeId(null); if (node.type === 'detail') setSelectedDetailId(node.id); if (node.type === 'lego' || node.data.originalId) setWide(false); selectNode(node.type === 'detail' ? (node.data.originalId as string || null) : node.id); setContextMenu(null); }}
        onEdgeClick={(_, edge) => { setSelectedDetailId(null); setSelectedDetailEdgeId(showDetail ? edge.id : null); selectEdge(showDetail ? (edge.data?.originalEdgeId as string || null) : edge.id); setContextMenu(null); }}
        onPaneClick={() => { setSelectedDetailId(null); setSelectedDetailEdgeId(null); selectNode(null); setContextMenu(null); }}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onNodeMouseEnter={(_, node) => setHovered(node.type === 'detail' ? (node.data.originalId as string || null) : node.id)}
        onNodeMouseLeave={() => setHovered(null)}
        deleteKeyCode={null}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        panOnScroll
        zoomOnScroll={false}
        panOnDrag
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--grid)" />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>

      {showDetail && <div className="pointer-events-none absolute bottom-3 right-3 z-10 max-w-[calc(100%-5rem)] rounded border border-line bg-surface px-2 py-1 text-right text-[10px] text-muted">{tr("ui.vectors_and_scores_are_fixed_examples_dimensions_fol_9c42c0")}</div>}

      <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-[10px] text-muted shadow-panel">
          <MousePointer2 size={12} />
          <span>{displayNodes.length} {tr("ui.nodes_004550")}</span>
          <span className="opacity-40">·</span>
          <span>{displayEdges.length} {tr("ui.edges_7283b9")}</span>
          <span className="opacity-40">·</span>
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>{text(graph.task)}</span>
        </div>
        
        {showDetail && validation && !validation.valid && <span className="rounded border border-amber-500 bg-surface px-2 py-1 text-[10px] text-amber-600">{tr("ui.incomplete_invalid_configuration_check_properties_8c7314")}</span>}
        {<button className="tool-btn outline pointer-events-auto !h-7 text-[10px]" onClick={() => setWide(!wide)}>{wide ? tr("ui.exit_focus_64cefd") : tr("ui.focus_canvas_ac1f59")}</button>}
        {detail && <button className="tool-btn outline pointer-events-auto !h-7 text-[10px]" onClick={() => setExpanded(!expanded)}>{showDetail ? tr("ui.data_flow_config_99c3ea") : tr("ui.config_data_flow_6b895f")}</button>}
        <button className="tool-btn outline pointer-events-auto !h-7 text-[10px]" onClick={requestFitView} title={tr("ui.fit_view_4e0331")}>
          <Focus size={12} /> {tr("ui.fit_dab564")} </button>
        <button className="tool-btn outline pointer-events-auto !h-7 text-[10px]" onClick={showDetail ? () => { setDetailPositions({ key: detailPositionKey, positions: {} }); requestFitView(); } : () => autoLayout(sizes)} title={tr("ui.auto_layout_2c9225")}>
          <LayoutGrid size={12} /> {tr("ui.auto_layout_80644f")} </button>
      </div>

      {selectedComponent && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[10px] shadow-panel">
          <span className="text-muted">{tr("ui.selected__2e0844")}</span>{' '}
          <span className="font-semibold">{selectedComponent.name}</span>
          <span className="ml-2 text-muted">{selectedComponent.inputs.length} {tr("ui.in__a7f713")} {selectedComponent.outputs.length} {tr("ui.out_f4800d")}</span>
        </div>
      )}

      {contextMenu && (
        <div
          className="absolute z-30 w-56 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {contextMenu.nodeId ? tr("ui.node_actions_3bd9c9") : tr("ui.canvas_actions_37b367")}
          </div>
          {contextMenu.nodeId ? (
            <>
              <MenuAction icon={<Copy size={13} />} label={tr("ui.duplicate_node_5cfce9")} onClick={() => { duplicateNode(contextMenu.nodeId!); setContextMenu(null); }} />
              <MenuAction icon={<GitBranch size={13} />} label={tr("ui.replace_component__1cf27f")} onClick={() => { setDialog('replace'); setContextMenu(null); }} />
              <MenuAction icon={<ZoomIn size={13} />} label={tr("ui.add_compatible_component__c09f85")} onClick={() => { setDialog('compatible'); setContextMenu(null); }} />
              <MenuAction icon={<Focus size={13} />} label={tr("ui.focus_node_e20a8a")} onClick={() => { useStudio.getState().focusNode(contextMenu.nodeId!); setContextMenu(null); }} />
              <div className="my-1 border-t border-line" />
              <MenuAction icon={<Trash2 size={13} />} label={tr("ui.delete_node_df73a7")} danger
                onClick={() => { deleteNodes([contextMenu.nodeId!]); setContextMenu(null); }} />
            </>
          ) : (
            <>
              <MenuAction icon={<Focus size={13} />} label={tr("ui.fit_view_50bb94")} onClick={() => { requestFitView(); setContextMenu(null); }} />
              <MenuAction icon={<LayoutGrid size={13} />} label={tr("ui.auto_layout_80644f")} onClick={() => { autoLayout(); setContextMenu(null); }} />
              <MenuAction icon={<RefreshCw size={13} />} label={tr("ui.validate_graph_adb92d")} onClick={() => { void useStudio.getState().validateGraph(); setContextMenu(null); }} />
            </>
          )}
        </div>
      )}
      </div>


    </div>
  );
}

function MenuAction({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  useLocale();
  return (
    <button
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-[var(--hover)] ${danger ? 'text-red-600' : ''}`}
      onClick={onClick}
    >
      {icon}{label}
    </button>
  );
}
