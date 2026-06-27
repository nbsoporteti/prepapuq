import React from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Error boundary: atrapa errores de render de sus hijos y muestra un fallback
 * en vez de dejar la app en pantalla en blanco. React exige que sea class.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log para diagnóstico; acá se podría enganchar un servicio de errores.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Si cambió la ruta (resetKey) y estábamos en error, nos recuperamos solos.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  handleRetry = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold">Algo salió mal</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Ocurrió un error inesperado en esta sección. Probá reintentar o recargar la página; si
            vuelve a pasar, avisanos.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Recargar página
            </Button>
            <Button onClick={this.handleRetry}>Reintentar</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Variante que se resetea sola al cambiar de ruta (sin remontar los hijos):
// pasa la ruta como resetKey, así un error en una página no "pega" la siguiente.
export const RouteErrorBoundary = ({ children }) => {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
};

export default ErrorBoundary;
