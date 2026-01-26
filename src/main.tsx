import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TranslationProvider } from './contexts/TranslationContext'
import { AuthProvider } from './contexts/AuthContext'

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  createRoot(rootElement).render(
    <StrictMode>
      <AuthProvider>
        <TranslationProvider>
          <App />
        </TranslationProvider>
      </AuthProvider>
    </StrictMode>,
  );
} catch (e) {
  console.error('CRASH IN MAIN.TSX:', e);
}
