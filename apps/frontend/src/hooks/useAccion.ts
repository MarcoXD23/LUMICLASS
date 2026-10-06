import { useCallback, useEffect, useRef, useState } from 'react';
import { mensajeDeError } from '../api/cliente';

export interface EstadoAccion<A extends unknown[]> {
  ejecutar: (...argumentos: A) => Promise<boolean>;
  /** Clave de la acción en curso (p. ej. el id de la luz), o null. */
  enCurso: string | null;
  error: string | null;
  limpiarError: () => void;
}

/**
 * Envía una orden a la API evitando dobles clics: mientras hay una orden en curso,
 * las siguientes se ignoran. Al terminar bien, llama a `alTerminar` (p. ej. recargar datos).
 * `clave` identifica qué elemento está ocupado para deshabilitar solo ese botón.
 */
export function useAccion<A extends unknown[]>(
  accion: (...argumentos: A) => Promise<unknown>,
  opciones: { clave?: (...argumentos: A) => string; alTerminar?: () => unknown } = {},
): EstadoAccion<A> {
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ocupadoRef = useRef(false);
  const opcionesRef = useRef(opciones);
  const accionRef = useRef(accion);
  useEffect(() => {
    opcionesRef.current = opciones;
    accionRef.current = accion;
  });

  const ejecutar = useCallback(async (...argumentos: A) => {
    if (ocupadoRef.current) return false;
    ocupadoRef.current = true;
    setEnCurso(opcionesRef.current.clave?.(...argumentos) ?? 'accion');
    setError(null);
    try {
      await accionRef.current(...argumentos);
      return true;
    } catch (causa) {
      setError(mensajeDeError(causa));
      return false;
    } finally {
      ocupadoRef.current = false;
      setEnCurso(null);
      await opcionesRef.current.alTerminar?.();
    }
  }, []);

  const limpiarError = useCallback(() => setError(null), []);
  return { ejecutar, enCurso, error, limpiarError };
}
