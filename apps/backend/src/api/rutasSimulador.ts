import {
  esquemaSimConexionSensor,
  esquemaSimLuz,
  esquemaSimPresencia,
  esquemaSimRespuestaServo,
} from '@lumiclass/compartido';
import type { FastifyInstance } from 'fastify';
import type { ServicioSimulador } from '../servicios/simulador';
import { validar } from './manejoErrores';

interface ConId {
  Params: { id: string };
}

/** Rutas /sim: solo se registran cuando DRIVER=simulado. */
export function rutasSimulador(api: FastifyInstance, simulador: ServicioSimulador): void {
  api.get('/sim/estado', () => simulador.estado());

  api.post('/sim/presencia', (peticion) =>
    simulador.forzarPresencia(validar(esquemaSimPresencia, peticion.body)),
  );

  api.post<ConId>('/sim/sensores/:id', (peticion) => {
    const { conexion } = validar(esquemaSimConexionSensor, peticion.body);
    return simulador.cambiarConexionSensor(peticion.params.id, conexion);
  });

  api.post<ConId>('/sim/actuadores/:id', (peticion) => {
    const { respuesta } = validar(esquemaSimRespuestaServo, peticion.body);
    return simulador.configurarServo(peticion.params.id, respuesta);
  });

  api.post<ConId>('/sim/luces/:id', (peticion) => {
    const { estado } = validar(esquemaSimLuz, peticion.body);
    return simulador.forzarLuz(peticion.params.id, estado);
  });

  api.post('/sim/reiniciar', () => simulador.reiniciar());
}
