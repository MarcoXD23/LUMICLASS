import type { AlertaDto } from '@lumiclass/compartido';
import { CircleCheck } from 'lucide-react';
import { CLASES_TONO, describirSeveridad } from '../utilidades/estados';

/** Alertas actuales del salón (fallas de sensores, servos o luces sin confirmar). */
export function ListaAlertas({ alertas }: { alertas: AlertaDto[] }) {
  if (alertas.length === 0) {
    return (
      <p className={`flex items-center gap-2 rounded-xl border p-3 ${CLASES_TONO.ok}`}>
        <CircleCheck aria-hidden="true" className="size-5" />
        Sin alertas: todo funciona con normalidad
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {alertas.map((alerta, indice) => {
        const { icono: Icono, texto, tono } = describirSeveridad(alerta.severidad);
        return (
          <li
            key={`${alerta.entidad}-${alerta.entidadId ?? 'general'}-${indice}`}
            className={`flex items-start gap-2 rounded-xl border p-3 ${CLASES_TONO[tono]}`}
          >
            <Icono aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <span>
              <span className="sr-only">{texto}: </span>
              {alerta.mensaje}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
