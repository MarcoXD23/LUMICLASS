import { useEffect, useState } from 'react';
import type { RespuestaSalud } from '@lumiclass/compartido';

type EstadoApi = 'comprobando' | 'conectada' | 'sin-conexion';

const TEXTO_ESTADO: Record<EstadoApi, string> = {
  comprobando: 'Comprobando conexión…',
  conectada: 'API: conectada',
  'sin-conexion': 'Sin conexión con el servidor',
};

/** Pantalla provisional de la Fase 3: solo comprueba que el frontend llega a la API. */
export function App() {
  const [estado, setEstado] = useState<EstadoApi>('comprobando');
  const [driver, setDriver] = useState<RespuestaSalud['driver'] | null>(null);

  useEffect(() => {
    const controlador = new AbortController();
    fetch('/api/v1/salud', { signal: controlador.signal })
      .then(async (respuesta) => {
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        const datos = (await respuesta.json()) as RespuestaSalud;
        setDriver(datos.driver);
        setEstado('conectada');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setEstado('sin-conexion');
      });
    return () => controlador.abort();
  }, []);

  const colorEstado =
    estado === 'conectada'
      ? 'text-ocupado'
      : estado === 'sin-conexion'
        ? 'text-error'
        : 'text-luz-off';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-3xl font-bold">LUMICLASS</h1>
      <p className="text-luz-off">Control y monitoreo de iluminación del salón</p>
      <p role="status" className={`font-semibold ${colorEstado}`}>
        {TEXTO_ESTADO[estado]}
      </p>
      {driver && <p className="text-sm text-luz-off">Hardware: {driver}</p>}
    </main>
  );
}
