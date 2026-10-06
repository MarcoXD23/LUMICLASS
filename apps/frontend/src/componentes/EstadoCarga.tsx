import { LoaderCircle, TriangleAlert, X } from 'lucide-react';
import { CLASES_TONO } from '../utilidades/estados';

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 p-4 text-texto-suave">
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
      {texto}
    </p>
  );
}

export function SinElementos({ texto }: { texto: string }) {
  return (
    <p className="rounded-xl border border-dashed border-borde p-4 text-texto-suave">{texto}</p>
  );
}

/** Mensaje de error de una acción (p. ej. "El servo no confirmó la orden"). */
export function MensajeError({
  mensaje,
  onCerrar,
}: {
  mensaje: string | null;
  onCerrar?: () => void;
}) {
  if (!mensaje) return null;
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-xl border p-3 ${CLASES_TONO.error}`}
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <span className="flex-1">{mensaje}</span>
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar mensaje"
          className="rounded p-0.5"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
