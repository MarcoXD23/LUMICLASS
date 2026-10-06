import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorApi } from '../api/cliente';

export interface EstadoConsulta<T> {
  datos: T | undefined;
  /** Error de la última consulta. Si hay error, `datos` conserva lo último que llegó bien. */
  error: ErrorApi | null;
  cargando: boolean;
  /** true si los datos mostrados no vienen de la última consulta (la API falló después). */
  desactualizado: boolean;
  /** Fecha de la última respuesta correcta. */
  actualizadoEn: Date | null;
  recargar: () => Promise<void>;
}

/**
 * Lee datos de la API y, si se indica `intervaloMs`, los vuelve a pedir periódicamente.
 * Nunca descarta los últimos datos buenos: si la API cae, se marcan como desactualizados.
 * (En la Fase 7 la actualización periódica pasa a ser el respaldo de SSE.)
 */
export function useConsulta<T>(
  consultar: (senal: AbortSignal) => Promise<T>,
  opciones: { intervaloMs?: number } = {},
): EstadoConsulta<T> {
  const [datos, setDatos] = useState<T>();
  const [error, setError] = useState<ErrorApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);

  // Guardamos la función en una ref para no reiniciar el ciclo si cambia en cada render.
  const consultarRef = useRef(consultar);
  useEffect(() => {
    consultarRef.current = consultar;
  });
  const controladorRef = useRef<AbortController | null>(null);

  const recargar = useCallback(async () => {
    controladorRef.current?.abort();
    const controlador = new AbortController();
    controladorRef.current = controlador;
    try {
      const resultado = await consultarRef.current(controlador.signal);
      if (controlador.signal.aborted) return;
      setDatos(resultado);
      setError(null);
      setActualizadoEn(new Date());
    } catch (causa) {
      if (controlador.signal.aborted) return;
      setError(
        causa instanceof ErrorApi
          ? causa
          : new ErrorApi('ERROR_DESCONOCIDO', 'Ocurrió un error inesperado', 0),
      );
    } finally {
      if (!controlador.signal.aborted) setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
    const intervalo = opciones.intervaloMs;
    const id = intervalo ? setInterval(() => void recargar(), intervalo) : undefined;
    return () => {
      clearInterval(id);
      controladorRef.current?.abort();
    };
  }, [recargar, opciones.intervaloMs]);

  return {
    datos,
    error,
    cargando,
    desactualizado: datos !== undefined && error !== null,
    actualizadoEn,
    recargar,
  };
}
