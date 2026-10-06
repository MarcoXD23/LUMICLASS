import { Lightbulb } from 'lucide-react';
import { Outlet } from 'react-router';
import { api } from '../api/recursos';
import { useConsulta } from '../hooks/useConsulta';
import { CLASES_TONO } from '../utilidades/estados';
import { Navegacion } from './Navegacion';

/** Estructura común: encabezado, navegación y la página actual. */
export function Marco() {
  const salud = useConsulta(api.salud, { intervaloMs: 10_000 });
  const driver = salud.datos?.driver;

  const estadoApi = salud.error
    ? { texto: 'Sin conexión con el servidor', tono: CLASES_TONO.error }
    : salud.datos
      ? {
          texto: `API: conectada · Hardware: ${driver}${salud.datos.hardware === 'desconectado' ? ' (desconectado)' : ''}`,
          tono: salud.datos.estado === 'ok' ? CLASES_TONO.ok : CLASES_TONO.advertencia,
        }
      : { texto: 'Comprobando conexión…', tono: CLASES_TONO.neutro };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-borde bg-superficie px-4 py-3">
        <div className="flex items-center gap-2">
          <Lightbulb aria-hidden="true" className="size-7 text-luz-on" />
          <div>
            <h1 className="text-xl font-bold leading-tight">LUMICLASS</h1>
            <p className="text-xs text-texto-suave">Iluminación inteligente del salón</p>
          </div>
        </div>
        <p
          role="status"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${estadoApi.tono}`}
        >
          {estadoApi.texto}
        </p>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <Navegacion mostrarSimulador={driver !== 'real'} />
        <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-24 md:pb-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
