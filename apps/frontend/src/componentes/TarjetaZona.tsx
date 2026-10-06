import type { ZonaDto } from '@lumiclass/compartido';
import type { ReactNode } from 'react';
import { describirModo, describirOcupacion } from '../utilidades/estados';
import { Insignia } from './Insignia';

interface Props {
  zona: ZonaDto;
  children?: ReactNode;
}

/** Encabezado común de una zona (nombre, ocupación y modo) con contenido libre debajo. */
export function TarjetaZona({ zona, children }: Props) {
  return (
    <section
      aria-labelledby={`zona-${zona.id}`}
      className="rounded-2xl border border-borde bg-superficie p-4 shadow-sm"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id={`zona-${zona.id}`} className="text-lg font-semibold">
          Zona {zona.nombre}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Insignia descripcion={describirOcupacion(zona.ocupada)} />
          <Insignia descripcion={describirModo(zona.modo)} />
        </div>
      </header>
      {children}
    </section>
  );
}
