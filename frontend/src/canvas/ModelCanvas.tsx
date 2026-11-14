import { detailLayout, rectangles, type Sizes } from './layout';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { ComponentSpec } from '@/types/catalog';
import { LegoNode, type LegoFlowNode } from '@/nodes/LegoNode';

import { DetailEdge } from './DetailEdge';
import { DetailNode } from './DetailNode';
import { detailedGraph, type DetailNode as DetailFlowNode } from './detailedGraph';

const viewPadding = { top: '90px', bottom: '35px', left: '40px', right: '40px' } as const;
const edgeTypes = { detail: DetailEdge };
const nodeTypes = { lego: LegoNode, detail: DetailNode };

export function ModelCanvas() {
  const wrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView, setCenter, setViewport } = useReactFlow();
  const graph = useStudio((s) => s.graph);
  const components = useStudio((s) => s.components);
  const [sizes, setSizes] = useState<Sizes>({});
  const [expanded, setExpanded] = useState(true);
  const [wide, setWide] = useState(false);
  const detail = useMemo(() => { const d = detailedGraph(graph, components); return d ? { ...d, nodes: detailLayout(d.nodes, sizes) } : null; }, [graph, components, sizes]);
  const showDetail = expanded && !!detail;
  const portTypes = useStudio((s) => s.portTypes);
  const selectedNodeId = useStudio((s) => s.selectedNodeId);
  const selectedEdgeId = useStudio((s) => s.selectedEdgeId);
  const fitViewSignal = useStudio((s) => s.fitViewSignal);
  const focusNodeId = useStudio((s) => s.focusNodeId);
  const contextMenu = useStudio((s) => s.contextMenu);
  const loading = useStudio((s) => s.loading);
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

  const displayNodes = showDetail ? detail!.nodes.map(n => ({ ...n, measured: sizes[n.id], selected: n.data.originalId === selectedNodeId })) : flowNodes;
  const displayEdges = showDetail ? detail!.edges.map(e => ({ ...e, data: { ...e.data, rects: rectangles(detail!.nodes, sizes) } })) : flowEdges;

  useEffect(() => {
    const timer = window.setTimeout(() => { if (graph.nodes.length) void fitView({ padding: viewPadding, duration: 300 }); }, 100);
    return () => window.clearTimeout(timer);
  }, [showDetail, wide, detail?.nodes.length, JSON.stringify(sizes), fitView]);

  const sizeSignature = JSON.stringify(sizes);
  const configSignature = graph.nodes.map(n=>n.id).join('|') + graph.edges.map(e=>e.source+e.target).join('|');
  useEffect(() => {
    if (showDetail || !graph.nodes.length || !graph.nodes.every(n=>sizes[n.id])) return;
    const timer = window.setTimeout(() => autoLayout(sizes), 80);
    return () => window.clearTimeout(timer);
  }, [showDetail, graph.graph_id, configSignature, sizeSignature]);

  const isValidConnection = useCallback<IsValidConnection>((connection) => {
    const state = useStudio.getState();
    const source = state.graph.nodes.find((n) => n.id === connection.source);
    const target = state.graph.nodes.find((n) => n.id === connection.target);
    if (!source || !target || source.id === target.id) return false;
    const out = state.components[source.component]?.outputs.find((p) => p.name === connection.sourceHandle);
    const inp = state.components[target.component]?.inputs.find((p) => p.name === connection.targetHandle);
    if (!out || !inp) return false;
    const accepted = state.portTypes.find((p) => p.id === inp.type)?.accepts || [inp.type];
    return accepted.includes(out.type);
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    const result = connect({
      source: connection.source,
      sourceHandle: connection.sourceHandle || '',
      target: connection.target,
      targetHandle: connection.targetHandle || '',
    });
    if (!result.ok) toast('error', 'Connection rejected', result.reason);
  }, [connect, toast]);

  const onNodesChange = useCallback((changes: NodeChange<LegoFlowNode | DetailFlowNode>[]) => {
    const removed: string[] = [];
    for (const change of changes) {
      if (change.type === 'dimensions' && change.dimensions) {
        const { width, height } = change.dimensions;
        setSizes(old => old[change.id]?.width === width && old[change.id]?.height === height ? old : { ...old, [change.id]: { width, height } });
      } else if (!showDetail && change.type === 'position' && change.position) {
        setNodePositionLive(change.id, change.position);
      } else if (!showDetail && change.type === 'remove') {
        removed.push(change.id);
      }
    }
    if (removed.length) deleteNodes(removed);
  }, [setNodePositionLive, deleteNodes, showDetail]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const componentId = event.dataTransfer.getData('application/legommenders-component');
    if (!componentId) return;
    if (showDetail) setExpanded(false);
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    dropComponent(componentId, position, (event.target as HTMLElement).closest<HTMLElement>('.react-flow__node')?.dataset.id);
  }, [dropComponent, screenToFlowPosition, showDetail]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleNodeContextMenu = useCallback<NodeMouseHandler<LegoFlowNode | DetailFlowNode>>((event, node) => {
    event.preventDefault();
    selectNode(node.id);
    const bounds = wrapper.current?.getBoundingClientRect();
    setContextMenu({ x: event.clientX - (bounds?.left || 0), y: event.clientY - (bounds?.top || 0), nodeId: node.id });
  }, [selectNode, setContextMenu]);

  const onPaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    const bounds = wrapper.current?.getBoundingClientRect();
    setContextMenu({ x: event.clientX - (bounds?.left || 0), y: event.clientY - (bounds?.top || 0), nodeId: null });
  }, [setContextMenu]);

  useEffect(() => {
    if (fitViewSignal > 0) {
      const timer = window.setTimeout(() => {
        if (useStudio.getState().graph.nodes.length) void fitView({ padding: viewPadding, duration: 400 });
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [fitViewSignal, fitView]);

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
            <p className="pt-1 text-[11px] text-muted">Loading component registry and verified templates…</p>
          </div>
        </div>
      )}

      {!loading && graph.nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="text-center">
            <LayoutGrid size={34} className="mx-auto mb-3 text-muted/50" />
            <p className="text-sm font-semibold">Empty canvas</p>
            <p className="mt-1 text-[11px] text-muted">Drag a component from the library, or load a model template.</p>
          </div>
        </div>
      )}

      <ReactFlow<LegoFlowNode | DetailFlowNode, Edge>
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: viewPadding }}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={(changes) => {
          if (showDetail) return;
          const removed = changes.filter((c) => c.type === 'remove').map((c) => c.id);
          if (removed.length) deleteEdges(removed);
        }}
        onConnect={showDetail ? undefined : onConnect}
        isValidConnection={isValidConnection}
        onNodeDragStart={beginInteraction}
        onNodeDragStop={endInteraction}
        onNodeClick={(_, node) => { if (node.type === 'lego' || node.data.originalId) setWide(false); selectNode(node.type === 'detail' ? (node.data.originalId as string || null) : node.id); setContextMenu(null); }}
        onEdgeClick={(_, edge) => { if (showDetail) return; selectEdge(edge.id); setContextMenu(null); }}
        onPaneClick={() => { selectNode(null); setContextMenu(null); }}
        onNodeContextMenu={showDetail ? undefined : handleNodeContextMenu}
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

      <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-[10px] text-muted shadow-panel">
          <MousePointer2 size={12} />
          <span>{displayNodes.length} nodes</span>
          <span className="opacity-40">·</span>
          <span>{displayEdges.length} edges</span>
          <span className="opacity-40">·</span>
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>{graph.task}</span>
        </div>
        {<button className="tool-btn outline pointer-events-auto !h-7 text-[10px]" onClick={() => setWide(!wide)}>{wide ? 'Exit focus' : 'Focus canvas'}</button>}
        {detail && <button className="tool-btn outline pointer-events-auto !h-7 text-[10px]" onClick={() => setExpanded(!expanded)}>{showDetail ? 'Data Flow → Config' : 'Config → Data Flow'}</button>}
        <button className="tool-btn outline pointer-events-auto !h-7 text-[10px]" onClick={requestFitView} title="Fit view">
          <Focus size={12} /> Fit
        </button>
        <button className="tool-btn outline pointer-events-auto !h-7 text-[10px]" onClick={showDetail ? requestFitView : () => autoLayout(sizes)} title="Auto layout">
          <LayoutGrid size={12} /> Auto Layout
        </button>
      </div>

      {selectedComponent && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[10px] shadow-panel">
          <span className="text-muted">Selected:</span>{' '}
          <span className="font-semibold">{selectedComponent.name}</span>
          <span className="ml-2 text-muted">{selectedComponent.inputs.length} in / {selectedComponent.outputs.length} out</span>
        </div>
      )}

      {contextMenu && (
        <div
          className="absolute z-30 w-56 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {contextMenu.nodeId ? 'Node actions' : 'Canvas actions'}
          </div>
          {contextMenu.nodeId ? (
            <>
              <MenuAction icon={<Copy size={13} />} label="Duplicate node" onClick={() => { duplicateNode(contextMenu.nodeId!); setContextMenu(null); }} />
              <MenuAction icon={<GitBranch size={13} />} label="Replace Component…" onClick={() => { setDialog('replace'); setContextMenu(null); }} />
              <MenuAction icon={<ZoomIn size={13} />} label="Add Compatible Component…" onClick={() => { setDialog('compatible'); setContextMenu(null); }} />
              <MenuAction icon={<Focus size={13} />} label="Focus node" onClick={() => { useStudio.getState().focusNode(contextMenu.nodeId!); setContextMenu(null); }} />
              <div className="my-1 border-t border-line" />
              <MenuAction icon={<Trash2 size={13} />} label="Delete node" danger
                onClick={() => { deleteNodes([contextMenu.nodeId!]); setContextMenu(null); }} />
            </>
          ) : (
            <>
              <MenuAction icon={<Focus size={13} />} label="Fit View" onClick={() => { requestFitView(); setContextMenu(null); }} />
              <MenuAction icon={<LayoutGrid size={13} />} label="Auto Layout" onClick={() => { autoLayout(); setContextMenu(null); }} />
              <MenuAction icon={<RefreshCw size={13} />} label="Validate graph" onClick={() => { void useStudio.getState().validateGraph(); setContextMenu(null); }} />
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
  return (
    <button
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-[var(--hover)] ${danger ? 'text-red-600' : ''}`}
      onClick={onClick}
    >
      {icon}{label}
    </button>
  );
}
