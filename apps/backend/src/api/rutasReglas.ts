import { esquemaReglaEntrada } from '@lumiclass/compartido';
import type { FastifyInstance } from 'fastify';
import type { Servicios } from '../app';
import { soloAdmin } from './autorizacion';
import { validar } from './manejoErrores';

interface ConId {
  Params: { id: string };
}

export function rutasReglas(api: FastifyInstance, servicios: Servicios): void {
  // Ver es para todos; crear, editar y eliminar es solo del admin.
  api.get<{ Querystring: { incluirEliminadas?: string } }>('/reglas', (peticion) =>
    servicios.reglas.listar(peticion.query.incluirEliminadas === 'true'),
  );

  api.get<ConId>('/reglas/:id', (peticion) => servicios.reglas.obtener(peticion.params.id));

  /** Versiones anteriores de una regla (se guardan cada vez que se edita). */
  api.get<ConId>('/reglas/:id/versiones', { preHandler: soloAdmin }, (peticion) =>
    servicios.versiones.listar('regla', peticion.params.id),
  );

  // peticion.usuario siempre existe aquí: lo garantiza exigirSesion.
  api.post('/reglas', { preHandler: soloAdmin }, async (peticion, respuesta) => {
    const entrada = validar(esquemaReglaEntrada, peticion.body);
    return respuesta.status(201).send(await servicios.reglas.crear(entrada, peticion.usuario!));
  });

  api.put<ConId>('/reglas/:id', { preHandler: soloAdmin }, (peticion) => {
    const entrada = validar(esquemaReglaEntrada, peticion.body);
    return servicios.reglas.actualizar(peticion.params.id, entrada, peticion.usuario!);
  });

  // Borrado lógico: la regla queda guardada como inactiva (no hay DELETE).
  api.post<ConId>('/reglas/:id/eliminar', { preHandler: soloAdmin }, (peticion) =>
    servicios.reglas.eliminar(peticion.params.id, peticion.usuario!),
  );
}
