import type { FiltroEventos } from '@lumiclass/compartido';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/recursos';
import { AvisoConexion } from '../componentes/AvisoConexion';
import { Cargando, MensajeError, SinElementos } from '../componentes/EstadoCarga';
import { FiltrosHistorial, type ValoresFiltro } from '../componentes/FiltrosHistorial';
import { useDatosEnVivo } from '../hooks/useDatosEnVivo';
import { CLASES_TONO, describirEvento, TEXTO_ORIGEN } from '../utilidades/estados';
import { fechaYHora, haceCuanto } from '../utilidades/formatoFecha';

const EVENTOS_POR_PAGINA = 20;
const FILTRO_VACIO: ValoresFiltro = { tipo: '', origen: '', desde: '', hasta: '' };

/** "AAAA-MM-DD" (hora local) → ISO del inicio o del final de ese día. */
function limiteDelDia(fecha: string, fin: boolean): string | undefined {
  if (!fecha) return undefined;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) return undefined;
  const momento = fin
    ? new Date(anio, mes - 1, dia, 23, 59, 59, 999)
    : new Date(anio, mes - 1, dia, 0, 0, 0, 0);
  return momento.toISOString();
}

function aFiltroApi(valores: ValoresFiltro, pagina: number): Partial<FiltroEventos> {
  return {
    tipo: valores.tipo || undefined,
    origen: valores.origen || undefined,
    desde: limiteDelDia(valores.desde, false),
    hasta: limiteDelDia(valores.hasta, true),
    pagina,
    porPagina: EVENTOS_POR_PAGINA,
  };
}

/** Lista de eventos con filtros y paginación; los nuevos aparecen solos. */
export function ListaEventos() {
  const [valores, setValores] = useState<ValoresFiltro>(FILTRO_VACIO);
  const [pagina, setPagina] = useState(1);
  const filtro = aFiltroApi(valores, pagina);
  const consulta = useDatosEnVivo((senal) => api.eventos(filtro, senal), {
    clave: JSON.stringify(filtro),
  });

  const cambiarFiltros = (nuevos: ValoresFiltro) => {
    setValores(nuevos);
    setPagina(1);
  };

  const { datos } = consulta;
  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.porPagina)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <FiltrosHistorial valores={valores} onCambiar={cambiarFiltros} vacio={FILTRO_VACIO} />
      <AvisoConexion
        error={consulta.error}
        actualizadoEn={consulta.actualizadoEn}
        onReintentar={() => void consulta.recargar()}
      />

      {consulta.cargando && !datos && <Cargando texto="Cargando historial…" />}
      {!consulta.cargando && !datos && (
        <MensajeError mensaje={consulta.error?.message ?? 'No se pudo cargar'} />
      )}

      {datos && (
        <>
          <p className="text-sm text-texto-suave" aria-live="polite">
            {datos.total === 1 ? '1 evento' : `${datos.total} eventos`}
          </p>
          {datos.datos.length === 0 ? (
            <SinElementos texto="No hay eventos con estos filtros." />
          ) : (
            <ol aria-label="Eventos" className="flex flex-col gap-2">
              {datos.datos.map((evento) => {
                const { icono: Icono, texto, tono } = describirEvento(evento);
                return (
                  <li
                    key={evento.id}
                    className="flex items-start gap-3 rounded-xl border border-borde bg-superficie p-3"
                  >
                    <span className={`rounded-lg border p-1.5 ${CLASES_TONO[tono]}`}>
                      <Icono aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{evento.mensaje}</p>
                      <p className="text-sm text-texto-suave">
                        <span className="sr-only">{texto}. </span>
                        <time dateTime={evento.fecha} title={fechaYHora(evento.fecha)}>
                          {haceCuanto(evento.fecha)}
                        </time>
                        {' · '}
                        {TEXTO_ORIGEN[evento.origen] ?? evento.origen}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {totalPaginas > 1 && (
            <nav
              aria-label="Páginas del historial"
              className="flex items-center justify-between gap-2"
            >
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-lg border border-borde px-3 py-1.5 text-sm disabled:opacity-50"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Más recientes
              </button>
              <span className="text-sm text-texto-suave">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
                className="flex items-center gap-1 rounded-lg border border-borde px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Más antiguos
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
