import { Clock, Cpu, Lightbulb, LightbulbOff, Radar, TriangleAlert, Users } from 'lucide-react';
import { api } from '../api/recursos';
import { AvisoConexion } from '../componentes/AvisoConexion';
import { Cargando, MensajeError } from '../componentes/EstadoCarga';
import { Insignia } from '../componentes/Insignia';
import { ListaAlertas } from '../componentes/ListaAlertas';
import { TarjetaEstado } from '../componentes/TarjetaEstado';
import { TarjetaZona } from '../componentes/TarjetaZona';
import { useConsulta } from '../hooks/useConsulta';
import { describirConexion, describirLuz, describirOcupacion } from '../utilidades/estados';
import { haceCuanto } from '../utilidades/formatoFecha';

export const INTERVALO_ACTUALIZACION_MS = 5000;

/** Dashboard: estado general del salón de un vistazo. */
export function Inicio() {
  const consulta = useConsulta(api.estadoSalon, { intervaloMs: INTERVALO_ACTUALIZACION_MS });
  const { datos: estado } = consulta;

  if (consulta.cargando && !estado) return <Cargando texto="Cargando estado del salón…" />;
  if (!estado) {
    return <MensajeError mensaje={consulta.error?.message ?? 'No se pudo cargar el estado'} />;
  }

  const { resumen } = estado;
  const hayLucesEncendidas = resumen.lucesEncendidas > 0;
  const sensoresBien = resumen.sensoresActivos === resumen.sensoresTotales;

  return (
    <div className="flex flex-col gap-6">
      <AvisoConexion
        error={consulta.error}
        actualizadoEn={consulta.actualizadoEn}
        onReintentar={() => void consulta.recargar()}
      />

      <section aria-labelledby="titulo-salon" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titulo-salon" className="text-2xl font-bold">
            {estado.salon.nombre}
          </h2>
          <Insignia descripcion={describirOcupacion(estado.ocupado)} tamano="grande" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TarjetaEstado
            titulo="Luces"
            descripcion={{
              ...describirLuz(hayLucesEncendidas ? 'on' : 'off'),
              icono: hayLucesEncendidas ? Lightbulb : LightbulbOff,
            }}
            valor={`${resumen.lucesEncendidas} de ${resumen.lucesTotales} encendidas`}
          />
          <TarjetaEstado
            titulo="Sensores"
            descripcion={{
              ...describirConexion(sensoresBien ? 'activo' : 'falla'),
              icono: sensoresBien ? Radar : TriangleAlert,
            }}
            valor={`${resumen.sensoresActivos} de ${resumen.sensoresTotales} activos`}
          />
          <TarjetaEstado
            titulo="Hardware"
            descripcion={{
              ...describirConexion(estado.hardware === 'conectado' ? 'activo' : 'falla'),
              icono: Cpu,
            }}
            valor={estado.hardware === 'conectado' ? 'Conectado' : 'Desconectado'}
          />
          {estado.personasDetectadas !== null && (
            <TarjetaEstado
              titulo="Personas detectadas"
              descripcion={{ ...describirOcupacion(estado.ocupado), icono: Users }}
              valor={estado.personasDetectadas}
            />
          )}
          <TarjetaEstado
            titulo="Última actualización"
            descripcion={{
              texto: '',
              icono: Clock,
              tono: consulta.desactualizado ? 'error' : 'neutro',
            }}
            valor={haceCuanto(estado.ultimaActualizacion)}
            detalle={
              consulta.actualizadoEn
                ? `Consultado ${haceCuanto(consulta.actualizadoEn)}`
                : undefined
            }
          />
        </div>
      </section>

      <section aria-labelledby="titulo-alertas" className="flex flex-col gap-3">
        <h2 id="titulo-alertas" className="text-lg font-semibold">
          Alertas
        </h2>
        <ListaAlertas alertas={estado.alertas} />
      </section>

      <section aria-labelledby="titulo-zonas" className="flex flex-col gap-3">
        <h2 id="titulo-zonas" className="text-lg font-semibold">
          Zonas
        </h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {estado.zonas.map((zona) => (
            <TarjetaZona key={zona.id} zona={zona}>
              <ul className="flex flex-wrap gap-2">
                {zona.luces.map((luz) => (
                  <li key={luz.id}>
                    <Insignia
                      descripcion={describirLuz(luz.estadoReal)}
                      texto={`${luz.nombre}: ${describirLuz(luz.estadoReal).texto.toLowerCase()}`}
                    />
                  </li>
                ))}
              </ul>
            </TarjetaZona>
          ))}
        </div>
      </section>
    </div>
  );
}
