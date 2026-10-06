import type { ReactNode } from 'react';
import type { Descripcion } from '../utilidades/estados';
import { CLASES_TONO } from '../utilidades/estados';

interface Props {
  titulo: string;
  descripcion: Descripcion;
  /** Valor principal; por defecto, el texto de la descripción. */
  valor?: ReactNode;
  detalle?: ReactNode;
}

/** Tarjeta del dashboard con un dato principal y su estado. */
export function TarjetaEstado({ titulo, descripcion, valor, detalle }: Props) {
  const { icono: Icono, tono } = descripcion;
  return (
    <article className="flex items-start gap-3 rounded-2xl border border-borde bg-superficie p-4 shadow-sm">
      <span className={`rounded-xl border p-2 ${CLASES_TONO[tono]}`}>
        <Icono aria-hidden="true" className="size-6" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm text-texto-suave">{titulo}</h3>
        <p className="text-lg font-semibold">{valor ?? descripcion.texto}</p>
        {detalle && <p className="text-sm text-texto-suave">{detalle}</p>}
      </div>
    </article>
  );
}
