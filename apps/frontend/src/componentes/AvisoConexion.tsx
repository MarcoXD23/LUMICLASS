import { RotateCcw, WifiOff } from 'lucide-react';
import type { ErrorApi } from '../api/cliente';
import { CLASES_TONO } from '../utilidades/estados';
import { haceCuanto } from '../utilidades/formatoFecha';

interface Props {
  error: ErrorApi | null;
  actualizadoEn: Date | null;
  onReintentar?: () => void;
}

/**
 * Aviso visible cuando la API no responde. Si hay datos anteriores, aclara
 * que están desactualizados en lugar de esconderlos.
 */
export function AvisoConexion({ error, actualizadoEn, onReintentar }: Props) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${CLASES_TONO.error}`}
    >
      <WifiOff aria-hidden="true" className="size-5 shrink-0" />
      <span className="flex-1">
        <strong>{error.message}.</strong>{' '}
        {actualizadoEn
          ? `Los datos mostrados están desactualizados (última actualización ${haceCuanto(actualizadoEn)}).`
          : 'Todavía no se pudieron cargar los datos.'}
      </span>
      {onReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          className="flex items-center gap-1 rounded-lg border border-current px-2 py-1 text-sm"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Reintentar
        </button>
      )}
    </div>
  );
}
