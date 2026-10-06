import { LoaderCircle, Radio, RefreshCw, WifiOff, type LucideIcon } from 'lucide-react';
import type { EstadoTiempoReal } from '../api/tiempoReal';
import { CLASES_TONO, type Tono } from '../utilidades/estados';

interface Props {
  tiempoReal: EstadoTiempoReal;
  /** true si la API no responde (prioridad sobre el estado del tiempo real). */
  apiCaida: boolean;
}

const DESCRIPCIONES: Record<EstadoTiempoReal, { texto: string; icono: LucideIcon; tono: Tono }> = {
  'en-vivo': { texto: 'En vivo', icono: Radio, tono: 'ok' },
  conectando: { texto: 'Conectando…', icono: LoaderCircle, tono: 'neutro' },
  reconectando: {
    texto: 'Reconectando… (actualiza cada 5 s)',
    icono: RefreshCw,
    tono: 'advertencia',
  },
  'no-disponible': { texto: 'Actualiza cada 5 s', icono: RefreshCw, tono: 'neutro' },
};

/** Muestra si los datos llegan en vivo, si se está reconectando o si no hay servidor. */
export function IndicadorConexion({ tiempoReal, apiCaida }: Props) {
  const {
    texto,
    icono: Icono,
    tono,
  } = apiCaida
    ? { texto: 'Sin conexión con el servidor', icono: WifiOff, tono: 'error' as const }
    : DESCRIPCIONES[tiempoReal];
  return (
    <p
      role="status"
      className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${CLASES_TONO[tono]}`}
    >
      <Icono
        aria-hidden="true"
        className={`size-3.5 ${tiempoReal === 'conectando' && !apiCaida ? 'animate-spin' : ''}`}
      />
      {texto}
    </p>
  );
}
