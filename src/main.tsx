import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { TicketsProvider } from '@/context/TicketsContext';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontró el elemento #root');
}

createRoot(container).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <AccessibilityProvider>
          <TicketsProvider>
            <App />
          </TicketsProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
);
