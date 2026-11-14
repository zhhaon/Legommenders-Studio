import { useEffect } from 'react';
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
  const theme = useStudio((s) => s.theme);
  const init = useStudio((s) => s.init);
  useKeyboardShortcuts();

  useEffect(() => { void init(); }, [init]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <TrainingCredentialsProvider>
      <div className="app-shell">
        <Toolbar />
        <div className="workspace">
          <ComponentLibrary />
          <main className="flex min-h-0 min-w-0 flex-col">
            <div className="min-h-0 flex-1">
              <ReactFlowProvider>
                <ModelCanvas />
              </ReactFlowProvider>
            </div>
            <BottomPanel />
          </main>
          <PropertiesPanel />
        </div>
        <WelcomeScreen />
        <Dialogs />
        <Toasts />
      </div>
    </TrainingCredentialsProvider>
  );
}
