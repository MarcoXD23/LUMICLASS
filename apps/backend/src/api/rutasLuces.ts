import { esquemaComandoLuz } from '@lumiclass/compartido';
import type { FastifyInstance } from 'fastify';
import type { Servicios } from '../app';
import { validar } from './manejoErrores';

interface ConId {
  Params: { id: string };
}

export function rutasLuces(api: FastifyInstance, servicios: Servicios): void {
  api.get('/luces', () => servicios.luces.listar());

  api.get<ConId>('/luces/:id', (peticion) => servicios.luces.obtener(peticion.params.id));

  api.post<ConId>('/luces/:id/comando', async (peticion, respuesta) => {
    const { accion, idSolicitud } = validar(esquemaComandoLuz, peticion.body);
    const ruta = `luz:${peticion.params.id}:${accion}`;
    const resultado = await servicios.solicitudes.ejecutarUnaVez(idSolicitud, ruta, async () => ({
      codigo: 200,
      cuerpo: await servicios.luces.comandar(peticion.params.id, accion, 'usuario'),
    }));
    return respuesta
      .status(resultado.codigo)
      .header('x-solicitud-repetida', String(resultado.repetida))
      .send(resultado.cuerpo);
  });
}
