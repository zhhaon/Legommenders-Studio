import { useEffect } from 'react';
import { useStudio } from '@/store/graphStore';

function inEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const state = useStudio.getState();
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (mod && key === 's') {
        event.preventDefault();
        void state.save();
        return;
      }
      if (mod && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) state.redo(); else state.undo();
        return;
      }
      if (mod && key === 'y') {
        event.preventDefault();
        state.redo();
        return;
      }
      if (inEditable(event.target)) return;
      if (mod && key === 'a') {
        event.preventDefault();
        // Select all nodes: React Flow's own selection is visual; here we place
        // the first node in focus and report the selection in the console.
        if (state.graph.nodes.length) {
          state.selectNode(state.graph.nodes[0].id);
          state.pushConsole(`Selected all ${state.graph.nodes.length} nodes (Shift+drag for visual multi-select).`);
        }
        return;
      }
      if (key === 'delete' || key === 'backspace') {
        if (state.selectedNodeId) {
          event.preventDefault();
          state.deleteNodes([state.selectedNodeId]);
        } else if (state.selectedEdgeId) {
          event.preventDefault();
          state.deleteEdges([state.selectedEdgeId]);
        }
        return;
      }
      if (key === 'escape') {
        state.setDialog(null);
        state.setContextMenu(null);
        state.selectNode(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
