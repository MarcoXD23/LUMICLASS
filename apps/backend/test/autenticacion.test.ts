import type { CorreoSimuladoDto, UsuarioDto } from '@lumiclass/compartido';
import type { LightMyRequestResponse } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearAppDePrueba, type AppDePrueba } from './ayudantes/baseDatosPrueba';

let prueba: AppDePrueba;
beforeEach(async () => {
  prueba = await crearAppDePrueba({ sinSesion: true });
});
afterEach(() => prueba.cerrar());

const DATOS = { nombre: 'Sofía', correo: 'Sofia@Correo.com', contrasena: 'Lumiclass2026' };

const post = (url: string, payload: object, cookie?: string) =>
  prueba.app.inject({
    method: 'POST',
    url: `/api/v1${url}`,
    payload,
    ...(cookie ? { headers: { cookie } } : {}),
  });

/** Extrae "lumiclass_sesion=..." del Set-Cookie de una respuesta. */
const cookieDe = (respuesta: LightMyRequestResponse): string => {
  const encabezado = String(respuesta.headers['set-cookie'] ?? '');
  return encabezado.split(';')[0] ?? '';
};

const pedirSesion = (cookie?: string) =>
  prueba.app.inject({
    method: 'GET',
    url: '/api/v1/auth/sesion',
    ...(cookie ? { headers: { cookie } } : {}),
  });

describe('registro', () => {
  it('crea la cuenta como "usuario", inicia sesión y guarda el hash (no la contraseña)', async () => {
    const respuesta = await post('/auth/registro', DATOS);
    expect(respuesta.statusCode).toBe(201);
    expect(respuesta.json<UsuarioDto>()).toMatchObject({
      nombre: 'Sofía',
      correo: 'sofia@correo.com',
      rol: 'usuario',
      activo: true,
    });
    expect(respuesta.headers['set-cookie']).toMatch(/HttpOnly/);
    expect(respuesta.headers['set-cookie']).toMatch(/SameSite=Lax/);

    const guardado = await prueba.bd.usuario.findUnique({ where: { correo: 'sofia@correo.com' } });
    expect(guardado?.hashContrasena).not.toContain('Lumiclass2026');
    expect((await pedirSesion(cookieDe(respuesta))).statusCode).toBe(200);
  });

  it('rechaza correos repetidos y datos inválidos con mensajes en español', async () => {
    await post('/auth/registro', DATOS);
    const repetido = await post('/auth/registro', { ...DATOS, correo: 'sofia@correo.com' });
    expect(repetido.statusCode).toBe(409);
    expect(repetido.json().error.codigo).toBe('CORREO_REGISTRADO');

    const debil = await post('/auth/registro', {
      ...DATOS,
      correo: 'otra@correo.com',
      contrasena: 'solo-letras',
    });
    expect(debil.statusCode).toBe(400);
    expect(debil.json().error.mensaje).toMatch(/número/);

    const correoMalo = await post('/auth/registro', { ...DATOS, correo: 'no-es-correo' });
    expect(correoMalo.json().error.mensaje).toMatch(/Correo electrónico inválido/);
  });

  it('no permite registrarse como admin', async () => {
    const respuesta = await post('/auth/registro', { ...DATOS, rol: 'admin' });
    expect(respuesta.statusCode).toBe(400);
  });
});

describe('inicio y cierre de sesión', () => {
  beforeEach(async () => {
    await post('/auth/registro', DATOS);
  });

  it('inicia sesión con el correo en cualquier mayúscula y queda en el historial', async () => {
    const respuesta = await post('/auth/login', {
      correo: 'SOFIA@correo.com',
      contrasena: 'Lumiclass2026',
    });
    expect(respuesta.statusCode).toBe(200);
    expect((await pedirSesion(cookieDe(respuesta))).json()).toMatchObject({ rol: 'usuario' });
    expect(await prueba.bd.evento.count({ where: { tipo: 'sesion_iniciada' } })).toBe(1);
  });

  it('con datos incorrectos responde 401 sin decir cuál falló', async () => {
    const malaClave = await post('/auth/login', {
      correo: 'sofia@correo.com',
      contrasena: 'otra-clave-1',
    });
    const malCorreo = await post('/auth/login', {
      correo: 'nadie@correo.com',
      contrasena: 'Lumiclass2026',
    });
    expect(malaClave.statusCode).toBe(401);
    expect(malCorreo.json().error.mensaje).toBe(malaClave.json().error.mensaje);
    expect(await prueba.bd.evento.count({ where: { tipo: 'login_fallido' } })).toBe(2);
  });

  it('bloquea con 429 después de 5 intentos fallidos', async () => {
    for (let i = 0; i < 5; i++) {
      await post('/auth/login', { correo: 'sofia@correo.com', contrasena: 'mala-clave-1' });
    }
    const bloqueado = await post('/auth/login', {
      correo: 'sofia@correo.com',
      contrasena: 'Lumiclass2026',
    });
    expect(bloqueado.statusCode).toBe(429);
    // Pasados 15 minutos vuelve a dejar intentar.
    prueba.servicios.motor.detener();
    await prueba.avanzar(15 * 60 * 1000 + 1);
    expect(
      (await post('/auth/login', { correo: 'sofia@correo.com', contrasena: 'Lumiclass2026' }))
        .statusCode,
    ).toBe(200);
  });

  it('cerrar sesión deja la sesión inactiva en la base (no la borra)', async () => {
    const cookie = cookieDe(
      await post('/auth/login', { correo: 'sofia@correo.com', contrasena: 'Lumiclass2026' }),
    );
    expect((await post('/auth/logout', {}, cookie)).statusCode).toBe(204);
    expect((await pedirSesion(cookie)).statusCode).toBe(401);
    const sesiones = await prueba.bd.sesion.findMany({
      where: { usuario: { correo: 'sofia@correo.com' } },
    });
    expect(sesiones.some((s) => !s.activa && s.cerradaEn !== null)).toBe(true);
  });

  it('la sesión vence a las 8 horas', async () => {
    const cookie = cookieDe(
      await post('/auth/login', { correo: 'sofia@correo.com', contrasena: 'Lumiclass2026' }),
    );
    prueba.servicios.motor.detener();
    await prueba.avanzar(8 * 60 * 60 * 1000);
    expect((await pedirSesion(cookie)).statusCode).toBe(401);
  });

  it('una cuenta desactivada no puede entrar', async () => {
    await prueba.bd.usuario.update({
      where: { correo: 'sofia@correo.com' },
      data: { inactivoDesde: new Date() },
    });
    const respuesta = await post('/auth/login', {
      correo: 'sofia@correo.com',
      contrasena: 'Lumiclass2026',
    });
    expect(respuesta.statusCode).toBe(403);
    expect(respuesta.json().error.codigo).toBe('CUENTA_DESACTIVADA');
  });
});

describe('rutas protegidas', () => {
  it('sin sesión: 401 en la API, pero /salud sigue abierta', async () => {
    const estado = await prueba.app.inject({ method: 'GET', url: '/api/v1/salon/estado' });
    expect(estado.statusCode).toBe(401);
    expect(estado.json().error.codigo).toBe('NO_AUTENTICADO');
    expect((await prueba.app.inject({ method: 'GET', url: '/api/v1/salud' })).statusCode).toBe(200);
  });

  it('una cookie inventada no sirve', async () => {
    const respuesta = await prueba.app.inject({
      method: 'GET',
      url: '/api/v1/salon/estado',
      headers: { cookie: 'lumiclass_sesion=inventada' },
    });
    expect(respuesta.statusCode).toBe(401);
  });

  it('un usuario normal ve las reglas pero no puede crearlas (403)', async () => {
    const cookie = await prueba.iniciarSesionComo('usuario', 'docente@prueba.local');
    const headers = { cookie };
    expect(
      (await prueba.app.inject({ method: 'GET', url: '/api/v1/reglas', headers })).statusCode,
    ).toBe(200);
    const crear = await prueba.app.inject({
      method: 'POST',
      url: '/api/v1/reglas',
      headers,
      payload: {
        nombre: 'No debería',
        condicion: { tipo: 'presencia', valor: 'ocupado' },
        accion: { tipo: 'encender' },
      },
    });
    expect(crear.statusCode).toBe(403);
    expect(crear.json().error.codigo).toBe('SOLO_ADMIN');
  });
});

describe('recuperación de contraseña', () => {
  beforeEach(async () => {
    await post('/auth/registro', DATOS);
  });

  const ultimoCorreo = async () => {
    const respuesta = await prueba.app.inject({
      method: 'GET',
      url: '/api/v1/auth/correos-simulados',
    });
    return respuesta.json<CorreoSimuladoDto[]>()[0];
  };
  const tokenDe = (correo?: CorreoSimuladoDto) =>
    new URL(correo?.enlace ?? 'http://x').searchParams.get('token') ?? '';

  it('responde igual exista o no el correo (no revela cuentas)', async () => {
    const existe = await post('/auth/recuperar', { correo: 'sofia@correo.com' });
    const noExiste = await post('/auth/recuperar', { correo: 'nadie@correo.com' });
    expect(existe.json()).toEqual(noExiste.json());
    expect(await prueba.bd.correoSimulado.count()).toBe(1);
  });

  it('el enlace usa el origen del navegador (sirve desde el celular)', async () => {
    await prueba.app.inject({
      method: 'POST',
      url: '/api/v1/auth/recuperar',
      headers: { origin: 'http://192.168.1.20:5173' },
      payload: { correo: 'sofia@correo.com' },
    });
    expect((await ultimoCorreo())?.enlace).toMatch(
      /^http:\/\/192\.168\.1\.20:5173\/restablecer\?token=/,
    );
  });

  it('cambia la contraseña con el enlace, cierra las sesiones y el enlace no se reutiliza', async () => {
    const cookieVieja = cookieDe(
      await post('/auth/login', { correo: 'sofia@correo.com', contrasena: 'Lumiclass2026' }),
    );
    await post('/auth/recuperar', { correo: 'sofia@correo.com' });
    const token = tokenDe(await ultimoCorreo());

    const cambio = await post('/auth/restablecer', { token, contrasena: 'NuevaClave99' });
    expect(cambio.statusCode).toBe(200);
    expect((await pedirSesion(cookieVieja)).statusCode).toBe(401);
    expect(
      (await post('/auth/login', { correo: 'sofia@correo.com', contrasena: 'NuevaClave99' }))
        .statusCode,
    ).toBe(200);
    expect(
      (await post('/auth/login', { correo: 'sofia@correo.com', contrasena: 'Lumiclass2026' }))
        .statusCode,
    ).toBe(401);

    const reuso = await post('/auth/restablecer', { token, contrasena: 'OtraClave77' });
    expect(reuso.statusCode).toBe(400);
  });

  it('el enlace vence a los 30 minutos', async () => {
    await post('/auth/recuperar', { correo: 'sofia@correo.com' });
    const token = tokenDe(await ultimoCorreo());
    prueba.servicios.motor.detener();
    await prueba.avanzar(30 * 60 * 1000);
    const respuesta = await post('/auth/restablecer', { token, contrasena: 'NuevaClave99' });
    expect(respuesta.json().error.codigo).toBe('ENLACE_VENCIDO');
    const registro = await prueba.bd.tokenRecuperacion.findFirst();
    expect(registro?.estado).toBe('vencido'); // se marca, no se borra
  });

  it('pedir otro enlace invalida el anterior', async () => {
    await post('/auth/recuperar', { correo: 'sofia@correo.com' });
    const primero = tokenDe(await ultimoCorreo());
    await post('/auth/recuperar', { correo: 'sofia@correo.com' });
    expect(
      (await post('/auth/restablecer', { token: primero, contrasena: 'NuevaClave99' })).statusCode,
    ).toBe(400);
  });
});
