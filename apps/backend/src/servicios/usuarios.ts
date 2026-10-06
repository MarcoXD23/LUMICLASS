import type { CambioUsuario, Rol, UsuarioDto } from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';
import { conflicto, noEncontrado } from '../dominio/errores';
import type { Reloj } from '../dominio/reloj';
import type { Usuario } from '../generated/prisma/client';
import type { ServicioEventos } from './eventos';

/** Datos del usuario conectado que necesitan las rutas. */
export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
}

export const normalizarRol = (rol: string): Rol => (rol === 'admin' ? 'admin' : 'usuario');

export function aUsuarioDto(usuario: Usuario): UsuarioDto {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: normalizarRol(usuario.rol),
    activo: usuario.inactivoDesde === null,
    creadoEn: usuario.creadoEn.toISOString(),
    inactivoDesde: usuario.inactivoDesde?.toISOString() ?? null,
  };
}

/** Gestión de cuentas (solo admin). Nada se borra: desactivar = marcar inactivoDesde. */
export class ServicioUsuarios {
  constructor(
    private readonly bd: BaseDatos,
    private readonly eventos: ServicioEventos,
    private readonly reloj: Reloj,
  ) {}

  async listar(incluirInactivos: boolean): Promise<UsuarioDto[]> {
    const usuarios = await this.bd.usuario.findMany({
      where: incluirInactivos ? {} : { inactivoDesde: null },
      orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
    });
    return usuarios.map(aUsuarioDto);
  }

  async cambiar(id: string, cambios: CambioUsuario, actor: UsuarioSesion): Promise<UsuarioDto> {
    const usuario = await this.bd.usuario.findUnique({ where: { id } });
    if (!usuario) throw noEncontrado('un usuario', id);

    // Regla del equipo: la cuenta de administrador "se queda quieta".
    if (usuario.rol === 'admin' && (cambios.activo === false || cambios.rol === 'usuario')) {
      throw conflicto(
        'ADMIN_PROTEGIDO',
        'La cuenta de administrador no se puede desactivar ni cambiar de rol',
      );
    }

    const ahora = this.reloj.ahora();
    const actualizado = await this.bd.usuario.update({
      where: { id },
      data: {
        ...(cambios.rol ? { rol: cambios.rol } : {}),
        ...(cambios.activo === false && usuario.inactivoDesde === null
          ? { inactivoDesde: ahora, inactivadoPorId: actor.id }
          : {}),
        ...(cambios.activo === true ? { inactivoDesde: null, inactivadoPorId: null } : {}),
      },
    });
    if (cambios.activo === false) {
      // Una cuenta desactivada pierde sus sesiones abiertas (quedan inactivas, no se borran).
      await this.bd.sesion.updateMany({
        where: { usuarioId: id, activa: true },
        data: { activa: false, cerradaEn: ahora },
      });
    }

    await this.eventos.registrar({
      tipo: 'usuario_cambiado',
      origen: 'usuario',
      entidad: 'usuario',
      entidadId: id,
      mensaje: `${actor.nombre} ${describirCambio(cambios)} a ${usuario.nombre}`,
      datos: { ...cambios, actorId: actor.id },
    });
    return aUsuarioDto(actualizado);
  }
}

function describirCambio(cambios: CambioUsuario): string {
  const partes: string[] = [];
  if (cambios.activo === false) partes.push('desactivó la cuenta');
  if (cambios.activo === true) partes.push('reactivó la cuenta');
  if (cambios.rol) partes.push(`cambió el rol (${cambios.rol})`);
  return partes.join(' y ');
}
