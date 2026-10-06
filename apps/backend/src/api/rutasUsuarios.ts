import { esquemaCambioUsuario } from '@lumiclass/compartido';
import type { FastifyInstance } from 'fastify';
import type { ServicioUsuarios } from '../servicios/usuarios';
import { soloAdmin } from './autorizacion';
import { validar } from './manejoErrores';

/** Gestión de cuentas: solo el admin. */
export function rutasUsuarios(api: FastifyInstance, usuarios: ServicioUsuarios): void {
  api.get<{ Querystring: { incluirInactivos?: string } }>(
    '/usuarios',
    { preHandler: soloAdmin },
    (peticion) => usuarios.listar(peticion.query.incluirInactivos === 'true'),
  );

  api.patch<{ Params: { id: string } }>('/usuarios/:id', { preHandler: soloAdmin }, (peticion) => {
    const cambios = validar(esquemaCambioUsuario, peticion.body);
    // peticion.usuario siempre existe aquí: lo garantiza exigirSesion.
    return usuarios.cambiar(peticion.params.id, cambios, peticion.usuario!);
  });
}
