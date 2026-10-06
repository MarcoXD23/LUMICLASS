import { api } from '../api/recursos';
import { AvisoConexion } from '../componentes/AvisoConexion';
import { Cargando, MensajeError, SinElementos } from '../componentes/EstadoCarga';
import { Insignia } from '../componentes/Insignia';
import { useConsulta } from '../hooks/useConsulta';
import { describirConexion, describirOcupacion } from '../utilidades/estados';
import { fechaYHora, haceCuanto } from '../utilidades/formatoFecha';
import { INTERVALO_ACTUALIZACION_MS } from './Inicio';

const NOMBRE_TIPO: Record<string, string> = {
  pir: 'Movimiento (PIR)',
  radar: 'Radar',
  ultrasonico: 'Ultrasónico',
  otro: 'Otro',
};

/** Estado de cada sensor: conexión, presencia y última lectura. */
export function Sensores() {
  const consulta = useConsulta(api.estadoSalon, { intervaloMs: INTERVALO_ACTUALIZACION_MS });
  const { datos: estado } = consulta;
  if (consulta.cargando && !estado) return <Cargando texto="Cargando sensores…" />;
  if (!estado) return <MensajeError mensaje={consulta.error?.message ?? 'No se pudo cargar'} />;

  const sensores = estado.zonas.flatMap((zona) =>
    zona.sensores.map((sensor) => ({ ...sensor, zona: zona.nombre })),
  );

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">Sensores</h2>
      <AvisoConexion
        error={consulta.error}
        actualizadoEn={consulta.actualizadoEn}
        onReintentar={() => void consulta.recargar()}
      />
      {sensores.length === 0 && <SinElementos texto="No hay sensores configurados." />}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sensores.map((sensor) => {
          const activo = sensor.conexion === 'activo';
          return (
            <li
              key={sensor.id}
              className="flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4 shadow-sm"
            >
              <div>
                <h3 className="text-lg font-semibold">{sensor.nombre}</h3>
                <p className="text-sm text-texto-suave">
                  Zona {sensor.zona} · {NOMBRE_TIPO[sensor.tipo] ?? sensor.tipo}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Insignia descripcion={describirConexion(sensor.conexion)} />
                {/* Un sensor que no funciona no puede informar presencia. */}
                <Insignia
                  descripcion={describirOcupacion(activo ? sensor.presencia : null)}
                  texto={
                    activo
                      ? sensor.presencia
                        ? 'Detecta presencia'
                        : 'Sin presencia'
                      : 'Sin lectura'
                  }
                />
              </div>
              <dl className="grid grid-cols-2 gap-1 text-sm">
                <dt className="text-texto-suave">Última lectura</dt>
                <dd title={sensor.ultimaLectura ? fechaYHora(sensor.ultimaLectura) : undefined}>
                  {haceCuanto(sensor.ultimaLectura)}
                </dd>
                {sensor.conteoPersonas !== null && (
                  <>
                    <dt className="text-texto-suave">Personas</dt>
                    <dd>{sensor.conteoPersonas}</dd>
                  </>
                )}
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
