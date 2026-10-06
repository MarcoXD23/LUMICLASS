import type { OrigenEvento, TipoEvento } from '@lumiclass/compartido';
import { ORIGENES_EVENTO, TIPOS_EVENTO } from '@lumiclass/compartido';
import { TEXTO_ORIGEN, TEXTO_TIPO_EVENTO } from '../utilidades/estados';

export interface ValoresFiltro {
  tipo: TipoEvento | '';
  origen: OrigenEvento | '';
  /** Fechas "AAAA-MM-DD" del campo de fecha (hora local). */
  desde: string;
  hasta: string;
}

interface Props {
  valores: ValoresFiltro;
  onCambiar: (valores: ValoresFiltro) => void;
  /** Valores para "Quitar filtros". */
  vacio: ValoresFiltro;
}

/** Filtros del historial en una fila (se acomodan en varias en el celular). */
export function FiltrosHistorial({ valores, onCambiar, vacio }: Props) {
  const cambiar = <K extends keyof ValoresFiltro>(clave: K, valor: ValoresFiltro[K]) =>
    onCambiar({ ...valores, [clave]: valor });
  const hayFiltros = Object.values(valores).some((v) => v !== '');
  const claseCampo = 'rounded-lg border border-borde bg-superficie px-2 py-1.5 text-sm';

  return (
    <div
      className="flex flex-wrap items-end gap-3"
      role="search"
      aria-label="Filtros del historial"
    >
      <label className="flex flex-col gap-1 text-sm">
        Tipo
        <select
          className={claseCampo}
          value={valores.tipo}
          onChange={(e) => cambiar('tipo', e.target.value as ValoresFiltro['tipo'])}
        >
          <option value="">Todos</option>
          {TIPOS_EVENTO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {TEXTO_TIPO_EVENTO[tipo]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Origen
        <select
          className={claseCampo}
          value={valores.origen}
          onChange={(e) => cambiar('origen', e.target.value as ValoresFiltro['origen'])}
        >
          <option value="">Todos</option>
          {ORIGENES_EVENTO.map((origen) => (
            <option key={origen} value={origen}>
              {TEXTO_ORIGEN[origen]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Desde
        <input
          type="date"
          className={claseCampo}
          value={valores.desde}
          max={valores.hasta || undefined}
          onChange={(e) => cambiar('desde', e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Hasta
        <input
          type="date"
          className={claseCampo}
          value={valores.hasta}
          min={valores.desde || undefined}
          onChange={(e) => cambiar('hasta', e.target.value)}
        />
      </label>
      {hayFiltros && (
        <button
          type="button"
          onClick={() => onCambiar(vacio)}
          className="rounded-lg border border-borde px-3 py-1.5 text-sm"
        >
          Quitar filtros
        </button>
      )}
    </div>
  );
}
