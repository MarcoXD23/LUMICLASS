import type { EstadisticasDto, OrigenEvento } from '@lumiclass/compartido';
import { ORIGENES_EVENTO } from '@lumiclass/compartido';
import { CircleCheck, ListOrdered, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/recursos';
import { AvisoConexion } from '../componentes/AvisoConexion';
import { BarraHorizontal } from '../componentes/BarraHorizontal';
import { Cargando, MensajeError, SinElementos } from '../componentes/EstadoCarga';
import { TarjetaEstado } from '../componentes/TarjetaEstado';
import { useDatosEnVivo } from '../hooks/useDatosEnVivo';
import { TEXTO_ORIGEN } from '../utilidades/estados';
import { duracionLegible, fechaYHora } from '../utilidades/formatoFecha';

const RANGOS = [
  { id: '24h', texto: 'Últimas 24 horas', horas: 24 },
  { id: '7d', texto: 'Últimos 7 días', horas: 24 * 7 },
  { id: '30d', texto: 'Últimos 30 días', horas: 24 * 30 },
] as const;
type IdRango = (typeof RANGOS)[number]['id'];

const UNA_HORA_MS = 60 * 60 * 1000;

/** Horas/minutos de luz encendida, ocupación por zona, quién actuó y errores. */
export function Estadisticas() {
  const [rango, setRango] = useState<IdRango>('24h');
  const horas = RANGOS.find((r) => r.id === rango)?.horas ?? 24;
  const consulta = useDatosEnVivo(
    (senal) =>
      api.estadisticas({ desde: new Date(Date.now() - horas * UNA_HORA_MS).toISOString() }, senal),
    { clave: rango },
  );
  const { datos } = consulta;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Período
          <select
            className="rounded-lg border border-borde bg-superficie px-2 py-1.5"
            value={rango}
            onChange={(e) => setRango(e.target.value as IdRango)}
          >
            {RANGOS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.texto}
              </option>
            ))}
          </select>
        </label>
        {datos && (
          <p className="text-sm text-texto-suave">
            Del {fechaYHora(datos.desde)} al {fechaYHora(datos.hasta)}
          </p>
        )}
      </div>

      <AvisoConexion
        error={consulta.error}
        actualizadoEn={consulta.actualizadoEn}
        onReintentar={() => void consulta.recargar()}
      />
      {consulta.cargando && !datos && <Cargando texto="Calculando estadísticas…" />}
      {!consulta.cargando && !datos && (
        <MensajeError mensaje={consulta.error?.message ?? 'No se pudo cargar'} />
      )}
      {datos && <Contenido datos={datos} />}
    </div>
  );
}

function Contenido({ datos }: { datos: EstadisticasDto }) {
  const maxLuz = Math.max(0, ...datos.luces.map((l) => l.segundosEncendida));
  const maxZona = Math.max(0, ...datos.zonas.map((z) => z.segundosOcupada));
  const totalErrores = datos.errores.actuador + datos.errores.sensor;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TarjetaEstado
          titulo="Eventos registrados"
          descripcion={{ texto: '', icono: ListOrdered, tono: 'neutro' }}
          valor={datos.totalEventos}
        />
        <TarjetaEstado
          titulo="Errores de servos"
          descripcion={{
            texto: '',
            icono: datos.errores.actuador > 0 ? TriangleAlert : CircleCheck,
            tono: datos.errores.actuador > 0 ? 'error' : 'ok',
          }}
          valor={datos.errores.actuador}
        />
        <TarjetaEstado
          titulo="Errores de sensores"
          descripcion={{
            texto: '',
            icono: datos.errores.sensor > 0 ? TriangleAlert : CircleCheck,
            tono: datos.errores.sensor > 0 ? 'error' : 'ok',
          }}
          valor={datos.errores.sensor}
        />
      </div>
      {totalErrores > 0 && (
        <p className="text-sm text-texto-suave">
          El detalle de cada error está en la pestaña Eventos (filtra por tipo).
        </p>
      )}

      <Grafico
        titulo="Tiempo con la luz encendida"
        vacio="No hay luces configuradas."
        filas={datos.luces.map((l) => ({
          id: l.luzId,
          etiqueta: l.nombre,
          valor: l.segundosEncendida,
          detalle: `${l.encendidos} encendidos, ${l.apagados} apagados`,
        }))}
        maximo={maxLuz}
      />

      <Grafico
        titulo="Tiempo con presencia por zona"
        vacio="No hay zonas configuradas."
        filas={datos.zonas.map((z) => ({
          id: z.zonaId,
          etiqueta: `Zona ${z.nombre}`,
          valor: z.segundosOcupada,
        }))}
        maximo={maxZona}
      />

      <section aria-labelledby="titulo-origen" className="flex flex-col gap-2">
        <h3 id="titulo-origen" className="text-lg font-semibold">
          ¿Quién encendió y apagó las luces?
        </h3>
        <TablaOrigenes acciones={datos.accionesPorOrigen} />
      </section>

      <p className="text-sm text-texto-suave">
        No se muestra consumo en kWh: falta confirmar la potencia de las luces.
      </p>
    </>
  );
}

interface Fila {
  id: string;
  etiqueta: string;
  valor: number;
  detalle?: string;
}

/** Barras horizontales de una serie, con su tabla equivalente para lectores de pantalla. */
function Grafico(props: { titulo: string; vacio: string; filas: Fila[]; maximo: number }) {
  const id = `grafico-${props.titulo.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4"
    >
      <h3 id={id} className="text-lg font-semibold">
        {props.titulo}
      </h3>
      {props.filas.length === 0 ? (
        <SinElementos texto={props.vacio} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {props.filas.map((fila) => (
              <BarraHorizontal
                key={fila.id}
                etiqueta={fila.etiqueta}
                valor={fila.valor}
                maximo={props.maximo}
                textoValor={
                  duracionLegible(fila.valor) === 'al instante'
                    ? '0 min'
                    : duracionLegible(fila.valor)
                }
              />
            ))}
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-texto-suave">Ver como tabla</summary>
            <table className="mt-2 w-full text-left">
              <thead>
                <tr className="border-b border-borde">
                  <th scope="col" className="py-1 font-medium">
                    Nombre
                  </th>
                  <th scope="col" className="py-1 font-medium">
                    Tiempo
                  </th>
                  {props.filas.some((f) => f.detalle) && (
                    <th scope="col" className="py-1 font-medium">
                      Detalle
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {props.filas.map((fila) => (
                  <tr key={fila.id} className="border-b border-borde/60">
                    <td className="py-1">{fila.etiqueta}</td>
                    <td className="py-1 tabular-nums">{duracionLegible(fila.valor)}</td>
                    {fila.detalle && <td className="py-1">{fila.detalle}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}

function TablaOrigenes({ acciones }: { acciones: EstadisticasDto['accionesPorOrigen'] }) {
  const filas = ORIGENES_EVENTO.filter(
    (origen: OrigenEvento) => acciones[origen].encendidos + acciones[origen].apagados > 0,
  );
  if (filas.length === 0)
    return <SinElementos texto="No hubo encendidos ni apagados en este período." />;
  return (
    <table className="w-full rounded-2xl border border-borde bg-superficie text-left text-sm">
      <thead>
        <tr className="border-b border-borde">
          <th scope="col" className="p-2 font-medium">
            Origen
          </th>
          <th scope="col" className="p-2 text-right font-medium">
            Encendidos
          </th>
          <th scope="col" className="p-2 text-right font-medium">
            Apagados
          </th>
        </tr>
      </thead>
      <tbody>
        {filas.map((origen) => (
          <tr key={origen} className="border-b border-borde/60 last:border-0">
            <td className="p-2">{TEXTO_ORIGEN[origen]}</td>
            <td className="p-2 text-right tabular-nums">{acciones[origen].encendidos}</td>
            <td className="p-2 text-right tabular-nums">{acciones[origen].apagados}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
