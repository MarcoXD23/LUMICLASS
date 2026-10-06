import type { Conexion, RespuestaServo } from '@lumiclass/compartido';
import { CONEXIONES, RESPUESTAS_SERVO } from '@lumiclass/compartido';
import { FlaskConical, RotateCcw, User, UserX } from 'lucide-react';
import { api } from '../api/recursos';
import { AvisoConexion } from '../componentes/AvisoConexion';
import { Cargando, MensajeError } from '../componentes/EstadoCarga';
import { Insignia } from '../componentes/Insignia';
import { TarjetaZona } from '../componentes/TarjetaZona';
import { useAccion } from '../hooks/useAccion';
import { useConsulta } from '../hooks/useConsulta';
import { describirConexion, describirLuz, TEXTO_RESPUESTA_SERVO } from '../utilidades/estados';

const INTERVALO_MS = 3000;

type Orden =
  | { tipo: 'presencia'; zonaId: string | null; presencia: boolean }
  | { tipo: 'sensor'; id: string; conexion: Conexion }
  | { tipo: 'servo'; id: string; respuesta: RespuestaServo }
  | { tipo: 'interruptor'; id: string; estado: 'on' | 'off' }
  | { tipo: 'reiniciar' };

function enviar(orden: Orden) {
  switch (orden.tipo) {
    case 'presencia':
      return api.simulador.presencia({ zonaId: orden.zonaId, presencia: orden.presencia });
    case 'sensor':
      return api.simulador.conexionSensor(orden.id, orden.conexion);
    case 'servo':
      return api.simulador.respuestaServo(orden.id, orden.respuesta);
    case 'interruptor':
      return api.simulador.interruptor(orden.id, orden.estado);
    case 'reiniciar':
      return api.simulador.reiniciar();
  }
}

/** Panel para probar el sistema sin hardware: presencia, fallas y respuesta de los servos. */
export function Simulador() {
  const salon = useConsulta(api.estadoSalon, { intervaloMs: INTERVALO_MS });
  const simulador = useConsulta(api.simulador.estado, { intervaloMs: INTERVALO_MS });
  const recargarTodo = async () => {
    await Promise.all([salon.recargar(), simulador.recargar()]);
  };
  const accion = useAccion(enviar, { alTerminar: recargarTodo });

  if (simulador.error?.estadoHttp === 404) {
    return (
      <MensajeError mensaje="El simulador solo está disponible cuando el backend usa DRIVER=simulado." />
    );
  }
  if ((salon.cargando && !salon.datos) || (simulador.cargando && !simulador.datos)) {
    return <Cargando texto="Cargando simulador…" />;
  }
  if (!salon.datos || !simulador.datos) {
    return (
      <MensajeError mensaje={(salon.error ?? simulador.error)?.message ?? 'No se pudo cargar'} />
    );
  }

  const ocupado = accion.enCurso !== null;
  const respuestaServo = (id: string): RespuestaServo =>
    simulador.datos?.actuadores.find((a) => a.id === id)?.respuesta ?? 'ok';

  const reiniciar = () => {
    if (
      window.confirm('¿Reiniciar la simulación? Las luces se apagan y todo vuelve a la normalidad.')
    ) {
      void accion.ejecutar({ tipo: 'reiniciar' });
    }
  };

  const claseBoton =
    'flex items-center gap-1 rounded-lg border border-borde bg-superficie px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50';
  const claseSelect = 'rounded-lg border border-borde bg-superficie px-2 py-1 text-sm';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <FlaskConical aria-hidden="true" className="size-6" />
          Simulador
        </h2>
        <button type="button" onClick={reiniciar} disabled={ocupado} className={claseBoton}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Reiniciar simulación
        </button>
      </div>
      <p className="text-sm text-texto-suave">
        Simula lo que harían los sensores y servos reales. Las reglas automáticas reaccionan igual
        que con hardware.
      </p>
      <AvisoConexion
        error={salon.error}
        actualizadoEn={salon.actualizadoEn}
        onReintentar={() => void recargarTodo()}
      />
      <MensajeError mensaje={accion.error} onCerrar={accion.limpiarError} />

      <section aria-label="Todo el salón" className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={ocupado}
          className={claseBoton}
          onClick={() => void accion.ejecutar({ tipo: 'presencia', zonaId: null, presencia: true })}
        >
          <User aria-hidden="true" className="size-4" />
          Todo el salón ocupado
        </button>
        <button
          type="button"
          disabled={ocupado}
          className={claseBoton}
          onClick={() =>
            void accion.ejecutar({ tipo: 'presencia', zonaId: null, presencia: false })
          }
        >
          <UserX aria-hidden="true" className="size-4" />
          Todo el salón vacío
        </button>
      </section>

      {salon.datos.zonas.map((zona) => (
        <TarjetaZona key={zona.id} zona={zona}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={ocupado}
                className={claseBoton}
                onClick={() =>
                  void accion.ejecutar({ tipo: 'presencia', zonaId: zona.id, presencia: true })
                }
              >
                <User aria-hidden="true" className="size-4" />
                Entra gente
              </button>
              <button
                type="button"
                disabled={ocupado}
                className={claseBoton}
                onClick={() =>
                  void accion.ejecutar({ tipo: 'presencia', zonaId: zona.id, presencia: false })
                }
              >
                <UserX aria-hidden="true" className="size-4" />
                Sale todo el mundo
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold text-texto-suave">Sensores</h4>
              {zona.sensores.map((sensor) => (
                <div key={sensor.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {sensor.nombre}
                    <Insignia descripcion={describirConexion(sensor.conexion)} />
                  </span>
                  <label className="flex items-center gap-2 text-sm">
                    Estado
                    <select
                      className={claseSelect}
                      value={sensor.conexion}
                      disabled={ocupado}
                      aria-label={`Estado del sensor ${sensor.nombre}`}
                      onChange={(e) =>
                        void accion.ejecutar({
                          tipo: 'sensor',
                          id: sensor.id,
                          conexion: e.target.value as Conexion,
                        })
                      }
                    >
                      {CONEXIONES.map((conexion) => (
                        <option key={conexion} value={conexion}>
                          {describirConexion(conexion).texto}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold text-texto-suave">Luces y servos</h4>
              {zona.luces.map((luz) => (
                <div
                  key={luz.id}
                  className="flex flex-col gap-2 rounded-xl border border-borde p-3"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    {luz.nombre}
                    <Insignia descripcion={describirLuz(luz.estadoReal)} />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      El servo
                      <select
                        className={claseSelect}
                        value={respuestaServo(luz.actuador.id)}
                        disabled={ocupado}
                        aria-label={`Respuesta del servo de ${luz.nombre}`}
                        onChange={(e) =>
                          void accion.ejecutar({
                            tipo: 'servo',
                            id: luz.actuador.id,
                            respuesta: e.target.value as RespuestaServo,
                          })
                        }
                      >
                        {RESPUESTAS_SERVO.map((respuesta) => (
                          <option key={respuesta} value={respuesta}>
                            {TEXTO_RESPUESTA_SERVO[respuesta]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={ocupado}
                      className={claseBoton}
                      aria-label={`Interruptor a mano: ${luz.estadoReal === 'on' ? 'apagar' : 'encender'} ${luz.nombre}`}
                      onClick={() =>
                        void accion.ejecutar({
                          tipo: 'interruptor',
                          id: luz.id,
                          estado: luz.estadoReal === 'on' ? 'off' : 'on',
                        })
                      }
                    >
                      Interruptor a mano: {luz.estadoReal === 'on' ? 'apagar' : 'encender'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TarjetaZona>
      ))}
    </div>
  );
}
