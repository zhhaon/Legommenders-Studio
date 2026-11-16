import { useLocale } from '@/i18n';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { useStudio } from '@/store/graphStore';

const TrainingCredentials = createContext<{
  token: string;
  setToken: (value: string) => void;
  startTraining: () => void;
  acceptsToken: boolean;
} | null>(null);

export function TrainingCredentialsProvider({ children }: { children: ReactNode }) {
  useLocale();
  const [token, setToken] = useState('');
  const train = useStudio((state) => state.train);
  const { protocol, hostname } = window.location;
  const acceptsToken = protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(hostname);

  function startTraining() {
    void train(false, acceptsToken ? token.trim() || undefined : undefined);
    setToken('');
  }

  return (
    <TrainingCredentials.Provider value={{ token, setToken, startTraining, acceptsToken }}>
      {children}
    </TrainingCredentials.Provider>
  );
}

export function useTrainingCredentials() {
  const credentials = useContext(TrainingCredentials);
  if (!credentials) throw new Error('Training credentials provider is missing.');
  return credentials;
}
