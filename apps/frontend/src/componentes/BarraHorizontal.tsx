interface Props {
  etiqueta: string;
  valor: number;
  /** Valor que ocupa el 100 % del ancho (el mayor de la serie). */
  maximo: number;
  /** Texto del valor, p. ej. "1 h 30 min". */
  textoValor: string;
}

/**
 * Una barra de un gráfico de barras horizontales (una sola serie).
 * Color neutro a propósito: los colores de la app significan estados (encendida, vacío…).
 * Barra de máx. 20 px de alto, extremo redondeado y base recta; el valor va en la punta.
 */
export function BarraHorizontal({ etiqueta, valor, maximo, textoValor }: Props) {
  const porcentaje = maximo > 0 ? Math.max(0, Math.min(100, (valor / maximo) * 100)) : 0;
  return (
    <div
      className="grid grid-cols-[minmax(6rem,10rem)_1fr] items-center gap-3"
      title={`${etiqueta}: ${textoValor}`}
    >
      <span className="truncate text-sm text-texto-suave">{etiqueta}</span>
      <div className="flex items-center gap-2" aria-hidden="true">
        {porcentaje > 0 && (
          <span className="h-5 rounded-r bg-slate-500" style={{ width: `${porcentaje}%` }} />
        )}
        <span className="shrink-0 text-sm font-medium text-texto tabular-nums">{textoValor}</span>
      </div>
      <span className="sr-only">
        {etiqueta}: {textoValor}
      </span>
    </div>
  );
}
