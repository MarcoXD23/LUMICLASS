import { esquemaReglaEntrada } from '@lumiclass/compartido';
import type { FastifyInstance } from 'fastify';
import type { Servicios } from '../app';
import { soloAdmin } from './autorizacion';
import { validar } from './manejoErrores';

interface ConId {
  Params: { id: string };
}

export function rutasReglas(api: FastifyInstance, servicios: Servicios): void {
  api.get('/reglas', () => servicios.reglas.listar());

  api.get<ConId>('/reglas/:id', (peticion) => servicios.reglas.obtener(peticion.params.id));

  // Ver es para todos; crear, editar y eliminar es solo del admin.
  api.post('/reglas', { preHandler: soloAdmin }, async (peticion, respuesta) => {
    const entrada = validar(esquemaReglaEntrada, peticion.body);
    return respuesta.status(201).send(await servicios.reglas.crear(entrada));
  });

  api.put<ConId>('/reglas/:id', { preHandler: soloAdmin }, (peticion) => {
    const entrada = validar(esquemaReglaEntrada, peticion.body);
    return servicios.reglas.actualizar(peticion.params.id, entrada);
  });

  api.delete<ConId>('/reglas/:id', { preHandler: soloAdmin }, async (peticion, respuesta) => {
    await servicios.reglas.eliminar(peticion.params.id);
    return respuesta.status(204).send();
  });
}
