import { esquemaFiltroEventos } from '@lumiclass/compartido';
import type { FastifyInstance } from 'fastify';
import type { Servicios } from '../app';
import { validar } from './manejoErrores';

export function rutasEventos(api: FastifyInstance, servicios: Servicios): void {
  api.get('/eventos', (peticion) => {
    const filtro = validar(esquemaFiltroEventos, peticion.query);
    return servicios.eventos.listar(filtro);
  });
}
