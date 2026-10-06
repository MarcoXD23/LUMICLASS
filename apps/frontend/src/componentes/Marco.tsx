import { Lightbulb } from 'lucide-react';
import { Outlet, useLocation } from 'react-router';
import { api } from '../api/recursos';
import { useConsulta } from '../hooks/useConsulta';
import { useTiempoReal } from '../hooks/useTiempoReal';
import { ErrorBoundary } from './ErrorBoundary';
import { IndicadorConexion } from './IndicadorConexion';
import { Navegacion } from './Navegacion';

/** Estructura común: encabezado, navegación y la página actual. */
export function Marco() {
  const salud = useConsulta(api.salud, { intervaloMs: 10_000 });
  const { estado: tiempoReal } = useTiempoReal();
  const { pathname } = useLocation();
  const driver = salud.datos?.driver;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-borde bg-superficie px-4 py-3">
        <div className="flex items-center gap-2">
          <Lightbulb aria-hidden="true" className="size-7 text-luz-on" />
          <div>
            <h1 className="text-xl font-bold leading-tight">LUMICLASS</h1>
            <p className="text-xs text-texto-suave">
              Iluminación inteligente del salón
              {salud.datos && !salud.error && (
                <>
                  {' · '}Hardware: {driver}
                  {salud.datos.hardware === 'desconectado' && ' (desconectado)'}
                </>
              )}
            </p>
          </div>
        </div>
        <IndicadorConexion tiempoReal={tiempoReal} apiCaida={salud.error !== null} />
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <Navegacion mostrarSimulador={driver !== 'real'} />
        <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-24 md:pb-4">
          {/* key: al cambiar de pantalla, un error anterior no se arrastra. */}
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
