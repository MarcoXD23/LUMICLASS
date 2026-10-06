import { esquemaFiltroEstadisticas } from '@lumiclass/compartido';
import type { FastifyInstance } from 'fastify';
import type { ServicioEstadisticas } from '../servicios/estadisticas';
import { validar } from './manejoErrores';

export function rutasEstadisticas(api: FastifyInstance, estadisticas: ServicioEstadisticas): void {
  api.get('/estadisticas', (peticion) =>
    estadisticas.calcular(validar(esquemaFiltroEstadisticas, peticion.query)),
  );
}
