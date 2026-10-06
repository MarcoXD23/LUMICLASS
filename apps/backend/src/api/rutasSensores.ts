import type { FastifyInstance } from 'fastify';
import type { Servicios } from '../app';

export function rutasSensores(api: FastifyInstance, servicios: Servicios): void {
  api.get('/sensores', () => servicios.sensores.listar());

  api.get<{ Params: { id: string } }>('/sensores/:id', (peticion) =>
    servicios.sensores.obtener(peticion.params.id),
  );
}
