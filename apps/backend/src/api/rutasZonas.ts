import { esquemaCambioModo, esquemaComandoLuz } from '@lumiclass/compartido';
import type { FastifyInstance } from 'fastify';
import type { Servicios } from '../app';
import { validar } from './manejoErrores';

interface ConId {
  Params: { id: string };
}

export function rutasZonas(api: FastifyInstance, servicios: Servicios): void {
  api.get('/zonas', () => servicios.zonas.listar());

  api.get<ConId>('/zonas/:id', (peticion) => servicios.zonas.obtener(peticion.params.id));

  api.patch<ConId>('/zonas/:id/modo', (peticion) => {
    const { modo } = validar(esquemaCambioModo, peticion.body);
    return servicios.zonas.cambiarModo(peticion.params.id, modo, 'usuario');
  });

  api.post<ConId>('/zonas/:id/comando', async (peticion, respuesta) => {
    const { accion, idSolicitud } = validar(esquemaComandoLuz, peticion.body);
    const ruta = `zona:${peticion.params.id}:${accion}`;
    const resultado = await servicios.solicitudes.ejecutarUnaVez(idSolicitud, ruta, async () => ({
      codigo: 200,
      cuerpo: await servicios.zonas.comandar(peticion.params.id, accion, 'usuario'),
    }));
    return respuesta
      .status(resultado.codigo)
      .header('x-solicitud-repetida', String(resultado.repetida))
      .send(resultado.cuerpo);
  });
}
