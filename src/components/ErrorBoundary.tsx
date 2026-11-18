import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Evita que un error de render deje la pantalla en blanco.
 * En desarrollo muestra el mensaje; en produccion solo el aviso.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de interfaz:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold">Algo salió mal</h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            Ocurrió un error inesperado al mostrar esta pantalla. Puedes recargar la página para
            continuar.
          </p>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            Recargar la página
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
