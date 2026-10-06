import type { EventoDto } from '@lumiclass/compartido';
import { useEffect, useRef } from 'react';
import { useConsulta, type EstadoConsulta } from './useConsulta';
import { useTiempoReal } from './useTiempoReal';

/** Con tiempo real activo, la consulta periódica es solo un respaldo. */
export const INTERVALO_EN_VIVO_MS = 30_000;
/** Sin tiempo real (SSE caído o no disponible), se consulta seguido. */
export const INTERVALO_SIN_VIVO_MS = 5000;
/** Varios eventos seguidos producen una sola recarga. */
const AGRUPAR_EVENTOS_MS = 300;

interface Opciones {
  /** Solo recarga con los eventos que cumplan esta condición (por defecto, todos). */
  filtrarEvento?: (evento: EventoDto) => boolean;
  /** Si cambia (p. ej. los filtros de una búsqueda), se vuelve a consultar. */
  clave?: string;
}

/**
 * Como useConsulta, pero se actualiza al instante cuando llega un evento por SSE.
 * Si el tiempo real no funciona, vuelve a consultar cada 5 s.
 */
export function useDatosEnVivo<T>(
  consultar: (senal: AbortSignal) => Promise<T>,
  opciones: Opciones = {},
): EstadoConsulta<T> {
  const { estado, suscribir } = useTiempoReal();
  const enVivo = estado === 'en-vivo';
  const consulta = useConsulta(consultar, {
    intervaloMs: enVivo ? INTERVALO_EN_VIVO_MS : INTERVALO_SIN_VIVO_MS,
  });
  const { recargar } = consulta;

  const filtroRef = useRef(opciones.filtrarEvento);
  useEffect(() => {
    filtroRef.current = opciones.filtrarEvento;
  });

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const dejar = suscribir((evento) => {
      if (filtroRef.current && !filtroRef.current(evento)) return;
      clearTimeout(temporizador);
      temporizador = setTimeout(() => void recargar(), AGRUPAR_EVENTOS_MS);
    });
    return () => {
      dejar();
      clearTimeout(temporizador);
    };
  }, [suscribir, recargar]);

  // Al cambiar los filtros, consultar de nuevo (la primera carga ya la hace useConsulta).
  const primeraClave = useRef(true);
  useEffect(() => {
    if (primeraClave.current) {
      primeraClave.current = false;
      return;
    }
    void recargar();
  }, [opciones.clave, recargar]);

  return consulta;
}
