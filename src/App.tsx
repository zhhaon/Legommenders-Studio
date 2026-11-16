import { tr, useLocale } from '@/i18n';
import { BenchmarkPanel } from '@/components/panels/BenchmarkPanel';
import { LanguageSelect } from '@/components/LanguageSelect';
import { ResizeHandle } from '@/components/ResizeHandle';
import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { TrainingCredentialsProvider } from '@/components/TrainingCredentials';
import { Toolbar } from '@/components/Toolbar';
import { ComponentLibrary } from '@/components/ComponentLibrary';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { BottomPanel } from '@/components/BottomPanel';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { Dialogs } from '@/components/Dialogs';
import { Toasts } from '@/components/Toasts';
import { ModelCanvas } from '@/canvas/ModelCanvas';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useStudio } from '@/store/graphStore';

export default function App() {
  useLocale();
  const [benchmarkPage, setBenchmarkPage] = useState(() => window.location.hash === '#/benchmark');
  useEffect(() => {
    const sync = () => setBenchmarkPage(window.location.hash === '#/benchmark');
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const [canvasFocused, setCanvasFocused] = useState(false);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [sizes, setSizes] = useState(() => {
    const defaults = { left: window.innerWidth <= 1280 ? 224 : 264, right: window.innerWidth <= 1280 ? 268 : 300, bottom: 264 };
    try {
      const saved = JSON.parse(localStorage.getItem('studio-panel-sizes') || '{}');
      for (const key of ['left', 'right', 'bottom'] as const) if (Number.isFinite(saved[key])) defaults[key] = saved[key];
    } catch { /* Use defaults if storage is unavailable. */ }
    return defaults;
  });
  const sideBudget = Math.max(360, viewport.width - 332);
  const left = Math.max(160, Math.min(sizes.left, sideBudget - 200));
  const right = Math.max(200, Math.min(sizes.right, sideBudget - left));
  const bottomMax = Math.max(120, viewport.height - 224);
  const bottom = Math.max(120, Math.min(sizes.bottom, bottomMax));
  const bottomOpen = useStudio(s => s.bottomOpen);
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => { try { localStorage.setItem('studio-panel-sizes', JSON.stringify(sizes)); } catch { /* Storage is optional. */ } }, [sizes]);
  const theme = useStudio((s) => s.theme);
  const init = useStudio((s) => s.init);
  useKeyboardShortcuts(!benchmarkPage);

  useEffect(() => { void init(); }, [init]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <TrainingCredentialsProvider>
      <div className="app-shell">
        {benchmarkPage ? <header className="flex items-center gap-4 border-b border-line bg-surface px-5">
          <a href="#/studio" className="font-bold text-sm">Legoizer</a>
          <a href="#/studio" className="tool-btn outline">{tr('benchmark.backToStudio')}</a>
          <span className="text-sm font-semibold text-blue-500" aria-current="page">Benchmark · {tr('demo.title')}</span>
          <div className="flex-1" /><LanguageSelect />
        </header> : <Toolbar />}
        {benchmarkPage && <main className="min-h-0 overflow-hidden bg-surface" aria-label="Benchmark page"><BenchmarkPanel /></main>}
        <div className="workspace" style={{ display: benchmarkPage ? 'none' : undefined, gridTemplateColumns: `${left}px 6px minmax(0, 1fr) 6px ${right}px` }}>
          <ComponentLibrary />
          <ResizeHandle disabled={canvasFocused} label={tr("ui.resize_left_panel_78c65b")} value={left} min={160} max={sideBudget - right} onChange={left => setSizes(previous => ({ ...previous, left }))} />
          <main className="flex min-h-0 min-w-0 flex-col">
            <div className="min-h-0 flex-1">
              <ReactFlowProvider>
                <ModelCanvas focused={canvasFocused} onFocusChange={setCanvasFocused} />
              </ReactFlowProvider>
            </div>
            {bottomOpen && <ResizeHandle disabled={canvasFocused} label={tr("ui.resize_bottom_panel_4c51a9")} horizontal value={bottom} min={120} max={bottomMax} onChange={bottom => setSizes(previous => ({ ...previous, bottom }))} />}
            <BottomPanel height={bottom} />
          </main>
          <ResizeHandle disabled={canvasFocused} label={tr("ui.resize_right_panel_1a60c2")} value={right} min={200} max={sideBudget - left} onChange={right => setSizes(previous => ({ ...previous, right }))} />
          <PropertiesPanel />
        </div>
        {!benchmarkPage && <WelcomeScreen />}
        <Dialogs />
        <Toasts />
      </div>
    </TrainingCredentialsProvider>
  );
}
