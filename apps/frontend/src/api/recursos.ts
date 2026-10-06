import type {
  AccionLuz,
  EstadoSalonDto,
  EstadoSimuladorDto,
  LuzDto,
  ModoZona,
  RespuestaComandoLuz,
  RespuestaComandoZona,
  RespuestaSalud,
  ReglaDto,
  ReglaEntrada,
  RespuestaServo,
  SensorDto,
  SimPresencia,
  ZonaDto,
} from '@lumiclass/compartido';
import { pedir } from './cliente';

/** Identificador único por orden: si llega dos veces, la API la ejecuta una sola vez. */
const nuevoIdSolicitud = () => crypto.randomUUID();

export const api = {
  salud: (senal?: AbortSignal) => pedir<RespuestaSalud>('/salud', { senal }),
  estadoSalon: (senal?: AbortSignal) => pedir<EstadoSalonDto>('/salon/estado', { senal }),
  zonas: (senal?: AbortSignal) => pedir<ZonaDto[]>('/zonas', { senal }),
  luces: (senal?: AbortSignal) => pedir<LuzDto[]>('/luces', { senal }),
  sensores: (senal?: AbortSignal) => pedir<SensorDto[]>('/sensores', { senal }),
  reglas: (senal?: AbortSignal) => pedir<ReglaDto[]>('/reglas', { senal }),

  comandarLuz: (luzId: string, accion: AccionLuz) =>
    pedir<RespuestaComandoLuz>(`/luces/${encodeURIComponent(luzId)}/comando`, {
      metodo: 'POST',
      cuerpo: { accion, idSolicitud: nuevoIdSolicitud() },
    }),
  comandarZona: (zonaId: string, accion: AccionLuz) =>
    pedir<RespuestaComandoZona>(`/zonas/${encodeURIComponent(zonaId)}/comando`, {
      metodo: 'POST',
      cuerpo: { accion, idSolicitud: nuevoIdSolicitud() },
    }),
  cambiarModo: (zonaId: string, modo: ModoZona) =>
    pedir<ZonaDto>(`/zonas/${encodeURIComponent(zonaId)}/modo`, {
      metodo: 'PATCH',
      cuerpo: { modo },
    }),

  crearRegla: (regla: ReglaEntrada) =>
    pedir<ReglaDto>('/reglas', { metodo: 'POST', cuerpo: regla }),
  actualizarRegla: (id: string, regla: ReglaEntrada) =>
    pedir<ReglaDto>(`/reglas/${encodeURIComponent(id)}`, { metodo: 'PUT', cuerpo: regla }),
  eliminarRegla: (id: string) =>
    pedir<void>(`/reglas/${encodeURIComponent(id)}`, { metodo: 'DELETE' }),

  simulador: {
    estado: (senal?: AbortSignal) => pedir<EstadoSimuladorDto>('/sim/estado', { senal }),
    presencia: (entrada: SimPresencia) =>
      pedir<EstadoSimuladorDto>('/sim/presencia', { metodo: 'POST', cuerpo: entrada }),
    conexionSensor: (sensorId: string, conexion: SensorDto['conexion']) =>
      pedir<EstadoSimuladorDto>(`/sim/sensores/${encodeURIComponent(sensorId)}`, {
        metodo: 'POST',
        cuerpo: { conexion },
      }),
    respuestaServo: (actuadorId: string, respuesta: RespuestaServo) =>
      pedir<EstadoSimuladorDto>(`/sim/actuadores/${encodeURIComponent(actuadorId)}`, {
        metodo: 'POST',
        cuerpo: { respuesta },
      }),
    interruptor: (luzId: string, estado: 'on' | 'off') =>
      pedir<EstadoSimuladorDto>(`/sim/luces/${encodeURIComponent(luzId)}`, {
        metodo: 'POST',
        cuerpo: { estado },
      }),
    reiniciar: () => pedir<EstadoSimuladorDto>('/sim/reiniciar', { metodo: 'POST' }),
  },
};
