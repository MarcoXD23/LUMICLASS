import { TriangleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { CLASES_TONO } from '../utilidades/estados';

interface Props {
  children: ReactNode;
}

interface Estado {
  error: Error | null;
}

/**
 * Si una pantalla falla al dibujarse, muestra un aviso en lugar de dejar la página
 * en blanco. El resto de la app (menú, encabezado) sigue funcionando.
 * React solo permite capturar estos errores con un componente de clase.
 */
export class ErrorBoundary extends Component<Props, Estado> {
  override state: Estado = { error: null };

  static getDerivedStateFromError(error: Error): Estado {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error al mostrar la pantalla:', error, info.componentStack);
  }

  private reintentar = () => this.setState({ error: null });

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        className={`flex flex-col gap-3 rounded-2xl border p-4 ${CLASES_TONO.error}`}
      >
        <p className="flex items-center gap-2 text-lg font-semibold">
          <TriangleAlert aria-hidden="true" className="size-6" />
          Algo salió mal al mostrar esta pantalla
        </p>
        <p>Las luces y el sistema siguen funcionando. Puedes intentarlo de nuevo.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={this.reintentar}
            className="rounded-lg border border-current px-3 py-1.5 font-medium"
          >
            Volver a intentar
          </button>
          <a href="/" className="rounded-lg border border-current px-3 py-1.5 font-medium">
            Ir al inicio
          </a>
        </div>
      </div>
    );
  }
}
