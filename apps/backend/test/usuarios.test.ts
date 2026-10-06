import type { UsuarioDto } from '@lumiclass/compartido';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { asegurarAdmin } from '../src/servicios/autenticacion';
import { crearAppDePrueba, type AppDePrueba } from './ayudantes/baseDatosPrueba';

let prueba: AppDePrueba;
let cookieDocente: string;
beforeEach(async () => {
  prueba = await crearAppDePrueba();
  cookieDocente = await prueba.iniciarSesionComo('usuario', 'docente@prueba.local');
});
afterEach(() => prueba.cerrar());

const idDe = async (correo: string) =>
  (await prueba.bd.usuario.findUniqueOrThrow({ where: { correo } })).id;

const cambiar = (id: string, payload: object, cookie?: string) =>
  prueba.app.inject({
    method: 'PATCH',
    url: `/api/v1/usuarios/${id}`,
    payload,
    ...(cookie ? { headers: { cookie } } : {}),
  });

describe('gestión de usuarios (admin)', () => {
  it('lista las cuentas activas', async () => {
    const respuesta = await prueba.app.inject({ method: 'GET', url: '/api/v1/usuarios' });
    const correos = respuesta.json<UsuarioDto[]>().map((u) => u.correo);
    expect(correos).toEqual(expect.arrayContaining(['admin@prueba.local', 'docente@prueba.local']));
  });

  it('desactivar = marcar inactiva: la cuenta sigue en la base y pierde la sesión', async () => {
    const id = await idDe('docente@prueba.local');
    const respuesta = await cambiar(id, { activo: false });
    expect(respuesta.json<UsuarioDto>()).toMatchObject({ activo: false });
    const enBase = await prueba.bd.usuario.findUnique({ where: { id } });
    expect(enBase?.inactivoDesde).not.toBeNull();
    expect(enBase?.inactivadoPorId).toBe(await idDe('admin@prueba.local'));

    const conSesionVieja = await prueba.app.inject({
      method: 'GET',
      url: '/api/v1/salon/estado',
      headers: { cookie: cookieDocente },
    });
    expect(conSesionVieja.statusCode).toBe(401);

    // Las inactivas solo aparecen si se piden.
    const activas = await prueba.app.inject({ method: 'GET', url: '/api/v1/usuarios' });
    expect(activas.json<UsuarioDto[]>().some((u) => u.id === id)).toBe(false);
    const todas = await prueba.app.inject({
      method: 'GET',
      url: '/api/v1/usuarios?incluirInactivos=true',
    });
    expect(todas.json<UsuarioDto[]>().some((u) => u.id === id)).toBe(true);
  });

  it('la cuenta admin no se puede desactivar ni bajar de rol', async () => {
    const id = await idDe('admin@prueba.local');
    expect((await cambiar(id, { activo: false })).json().error.codigo).toBe('ADMIN_PROTEGIDO');
    expect((await cambiar(id, { rol: 'usuario' })).statusCode).toBe(409);
  });

  it('un usuario normal no puede gestionar cuentas', async () => {
    const id = await idDe('docente@prueba.local');
    expect((await cambiar(id, { rol: 'admin' }, cookieDocente)).statusCode).toBe(403);
    const lista = await prueba.app.inject({
      method: 'GET',
      url: '/api/v1/usuarios',
      headers: { cookie: cookieDocente },
    });
    expect(lista.statusCode).toBe(403);
  });

  it('valida los cambios', async () => {
    const id = await idDe('docente@prueba.local');
    expect((await cambiar(id, {})).statusCode).toBe(400);
    expect((await cambiar(id, { rol: 'superadmin' })).statusCode).toBe(400);
    expect((await cambiar('no-existe', { activo: false })).statusCode).toBe(404);
  });
});

describe('asegurarAdmin (datos iniciales)', () => {
  it('no crea otro admin si ya hay uno activo', async () => {
    const creado = await asegurarAdmin(prueba.bd, {
      correo: 'otro@admin.local',
      nombre: 'Otro',
      contrasena: 'Clave12345',
    });
    expect(creado).toBe(false);
    expect(await prueba.bd.usuario.count({ where: { rol: 'admin' } })).toBe(1);
  });
});
