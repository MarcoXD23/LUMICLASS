import type { Descripcion } from '../utilidades/estados';
import { CLASES_TONO } from '../utilidades/estados';

interface Props {
  descripcion: Descripcion;
  /** Texto alternativo; por defecto, el de la descripción. */
  texto?: string;
  tamano?: 'normal' | 'grande';
}

/** Etiqueta de estado: ícono + texto + color. */
export function Insignia({ descripcion, texto, tamano = 'normal' }: Props) {
  const { icono: Icono, tono } = descripcion;
  const medidas = tamano === 'grande' ? 'gap-2 px-3 py-1.5 text-base' : 'gap-1 px-2 py-0.5 text-sm';
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${medidas} ${CLASES_TONO[tono]}`}
    >
      <Icono aria-hidden="true" className={tamano === 'grande' ? 'size-5' : 'size-4'} />
      {texto ?? descripcion.texto}
    </span>
  );
}
