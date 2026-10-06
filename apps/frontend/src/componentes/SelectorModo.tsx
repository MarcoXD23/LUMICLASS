import type { ModoZona } from '@lumiclass/compartido';
import { MODOS_ZONA } from '@lumiclass/compartido';
import { CLASES_TONO, describirModo } from '../utilidades/estados';

interface Props {
  modo: ModoZona;
  deshabilitado?: boolean;
  /** Nombre de la zona para lectores de pantalla. */
  etiqueta: string;
  onCambiar: (modo: ModoZona) => void;
}

/** Interruptor de dos posiciones: Automático / Manual. */
export function SelectorModo({ modo, deshabilitado = false, etiqueta, onCambiar }: Props) {
  return (
    <div
      role="group"
      aria-label={`Modo de ${etiqueta}`}
      className="inline-flex rounded-xl border border-borde p-1"
    >
      {MODOS_ZONA.map((opcion) => {
        const { icono: Icono, texto, tono } = describirModo(opcion);
        const activo = opcion === modo;
        return (
          <button
            key={opcion}
            type="button"
            aria-pressed={activo}
            disabled={deshabilitado || activo}
            onClick={() => onCambiar(opcion)}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
              activo ? `border ${CLASES_TONO[tono]}` : 'text-texto-suave hover:bg-slate-100'
            } disabled:cursor-default`}
          >
            <Icono aria-hidden="true" className="size-4" />
            {texto}
          </button>
        );
      })}
    </div>
  );
}
