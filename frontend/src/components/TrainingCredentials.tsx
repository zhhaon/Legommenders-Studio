import type { ReactNode } from 'react';
import { useStudio } from '@/store/graphStore';

// The static demo never asks for tokens and never sends training requests.
export function TrainingCredentialsProvider({ children }: { children: ReactNode }) { return <>{children}</>; }
export function useTrainingCredentials() {
  return { startTraining: () => useStudio.getState().toast('info', 'Training disabled', 'This static demo has no backend.') };
}
