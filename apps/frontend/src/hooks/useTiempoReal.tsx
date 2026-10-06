/* eslint-disable react-refresh/only-export-components -- el proveedor y su hook van juntos a propósito */
import type { EventoDto } from '@lumiclass/compartido';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { conectarTiempoReal, type EstadoTiempoReal, type FuenteEventos } from '../api/tiempoReal';

interface ContextoTiempoReal {
  estado: EstadoTiempoReal;
  /** Recibe cada evento nuevo del historial. Devuelve la función para dejar de escuchar. */
  suscribir: (oyente: (evento: EventoDto) => void) => () => void;
}

// Sin proveedor (p. ej. en pruebas de una sola página) se comporta como "sin tiempo real".
const Contexto = createContext<ContextoTiempoReal>({
  estado: 'no-disponible',
  suscribir: () => () => undefined,
});

/** Abre una única conexión SSE para toda la app y reparte los eventos. */
export function ProveedorTiempoReal({
  children,
  crearFuente,
}: {
  children: ReactNode;
  crearFuente?: (url: string) => FuenteEventos;
}) {
  const [estado, setEstado] = useState<EstadoTiempoReal>('conectando');
  const oyentes = useRef(new Set<(evento: EventoDto) => void>());

  useEffect(
    () =>
      conectarTiempoReal({
        onEstado: setEstado,
        onEvento: (evento) => oyentes.current.forEach((oyente) => oyente(evento)),
        crearFuente,
      }),
    [crearFuente],
  );

  const valor = useMemo<ContextoTiempoReal>(
    () => ({
      estado,
      suscribir: (oyente) => {
        oyentes.current.add(oyente);
        return () => {
          oyentes.current.delete(oyente);
        };
      },
    }),
    [estado],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTiempoReal(): ContextoTiempoReal {
  return useContext(Contexto);
}
