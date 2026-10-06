import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import {
  estadoSalonEjemplo,
  instalarApiFalsa,
  saludEjemplo,
  sesionAdmin,
  sesionUsuario,
  sinSesion,
} from '../../pruebas/apiFalsa';

afterEach(() => {
  vi.unstubAllGlobals();
});

const renderizar = (ruta: string) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  );

const dashboard = () => ({
  'GET /salud': { cuerpo: saludEjemplo },
  'GET /salon/estado': { cuerpo: estadoSalonEjemplo() },
});

const escribir = (etiqueta: string | RegExp, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

describe('rutas protegidas', () => {
  it('sin sesión, cualquier pantalla manda al login', async () => {
    instalarApiFalsa({ 'GET /auth/sesion': sinSesion });
    renderizar('/control');
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('con sesión (p. ej. después de Ctrl+F5) entra directo al dashboard', async () => {
    instalarApiFalsa({ 'GET /auth/sesion': { cuerpo: sesionUsuario }, ...dashboard() });
    renderizar('/');
    expect(await screen.findByRole('heading', { name: 'Salón principal' })).toBeInTheDocument();
    expect(screen.getByText('Docente Prueba')).toBeInTheDocument();
    // Un usuario normal no ve la gestión de usuarios.
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
  });

  it('el admin ve la sección Usuarios', async () => {
    instalarApiFalsa({ 'GET /auth/sesion': { cuerpo: sesionAdmin }, ...dashboard() });
    renderizar('/');
    expect(await screen.findByRole('link', { name: 'Usuarios' })).toBeInTheDocument();
  });

  it('si la sesión vence mientras se usa, vuelve al login con un aviso', async () => {
    let vencida = false;
    instalarApiFalsa({
      'GET /auth/sesion': { cuerpo: sesionAdmin },
      'GET /salud': { cuerpo: saludEjemplo },
      'GET /salon/estado': async () => (vencida ? sinSesion : { cuerpo: estadoSalonEjemplo() }),
      'GET /reglas': async () => (vencida ? sinSesion : { cuerpo: [] }),
      'GET /zonas': async () => (vencida ? sinSesion : { cuerpo: [] }),
    });
    renderizar('/');
    await screen.findByRole('heading', { name: 'Salón principal' });
    vencida = true;
    fireEvent.click(screen.getByRole('link', { name: 'Reglas' }));
    expect(await screen.findByText(/Tu sesión venció/)).toBeInTheDocument();
  });
});

describe('login', () => {
  it('inicia sesión y entra al dashboard', async () => {
    const { llamadas } = instalarApiFalsa({
      'GET /auth/sesion': sinSesion,
      'POST /auth/login': (_cuerpo) => ({
        cuerpo: { ...sesionAdmin, activo: true, creadoEn: '', inactivoDesde: null },
      }),
      ...dashboard(),
    });
    renderizar('/login');
    await screen.findByRole('heading', { name: 'Iniciar sesión' });
    escribir('Correo', 'Admin@Lumiclass.local');
    escribir(/^Contraseña/, 'Clave2026');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { name: 'Salón principal' })).toBeInTheDocument();
    expect(llamadas.find((l) => l.ruta === '/auth/login')?.cuerpo).toEqual({
      correo: 'admin@lumiclass.local',
      contrasena: 'Clave2026',
    });
  });

  it('muestra el error de la API si los datos son incorrectos', async () => {
    instalarApiFalsa({
      'GET /auth/sesion': sinSesion,
      'POST /auth/login': (_cuerpo) => ({
        estado: 401,
        cuerpo: {
          error: { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Correo o contraseña incorrectos' },
        },
      }),
    });
    renderizar('/login');
    await screen.findByRole('heading', { name: 'Iniciar sesión' });
    escribir('Correo', 'a@b.co');
    escribir(/^Contraseña/, 'mala');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument();
  });

  it('valida antes de enviar', async () => {
    const { llamadas } = instalarApiFalsa({ 'GET /auth/sesion': sinSesion });
    renderizar('/login');
    await screen.findByRole('heading', { name: 'Iniciar sesión' });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Correo electrónico inválido')).toBeInTheDocument();
    expect(llamadas.some((l) => l.ruta === '/auth/login')).toBe(false);
  });

  it('el botón "Mostrar contraseña" deja ver lo escrito', async () => {
    instalarApiFalsa({ 'GET /auth/sesion': sinSesion });
    renderizar('/login');
    const campo = await screen.findByLabelText(/^Contraseña/);
    expect(campo).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(campo).toHaveAttribute('type', 'text');
  });
});

describe('registro', () => {
  it('pide contraseña segura y que coincidan', async () => {
    const { llamadas } = instalarApiFalsa({ 'GET /auth/sesion': sinSesion });
    renderizar('/registro');
    await screen.findByRole('heading', { name: 'Crear cuenta' });
    escribir('Nombre', 'Marcos');
    escribir('Correo', 'marcos@correo.com');
    escribir(/^Contraseña/, 'sololetras');
    escribir('Repite la contraseña', 'otra');
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText(/al menos un número/)).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(llamadas.some((l) => l.ruta === '/auth/registro')).toBe(false);
  });

  it('crea la cuenta y entra al dashboard', async () => {
    instalarApiFalsa({
      'GET /auth/sesion': sinSesion,
      'POST /auth/registro': (_cuerpo) => ({
        estado: 201,
        cuerpo: { ...sesionUsuario, activo: true, creadoEn: '', inactivoDesde: null },
      }),
      ...dashboard(),
    });
    renderizar('/registro');
    await screen.findByRole('heading', { name: 'Crear cuenta' });
    escribir('Nombre', 'Docente Prueba');
    escribir('Correo', 'docente@lumiclass.local');
    escribir(/^Contraseña/, 'Clave2026');
    escribir('Repite la contraseña', 'Clave2026');
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByRole('heading', { name: 'Salón principal' })).toBeInTheDocument();
  });
});

describe('recuperación de contraseña', () => {
  it('muestra el mensaje neutro y el acceso a la bandeja de prueba', async () => {
    instalarApiFalsa({
      'GET /auth/sesion': sinSesion,
      'POST /auth/recuperar': (_cuerpo) => ({
        cuerpo: { mensaje: 'Si el correo está registrado, te enviamos un enlace.' },
      }),
    });
    renderizar('/recuperar');
    await screen.findByRole('heading', { name: 'Recuperar contraseña' });
    escribir('Correo de tu cuenta', 'sofia@correo.com');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    expect(await screen.findByText(/te enviamos un enlace/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'bandeja de correos de prueba' })).toBeInTheDocument();
  });

  it('restablece con el token del enlace', async () => {
    const { llamadas } = instalarApiFalsa({
      'GET /auth/sesion': sinSesion,
      'POST /auth/restablecer': (_cuerpo) => ({ cuerpo: { mensaje: 'ok' } }),
    });
    renderizar('/restablecer?token=abcdefghijklmnopqrstuvwxyz');
    await screen.findByRole('heading', { name: 'Crear contraseña nueva' });
    escribir(/^Contraseña nueva/, 'NuevaClave1');
    escribir('Repite la contraseña', 'NuevaClave1');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    expect(await screen.findByText(/Contraseña actualizada/)).toBeInTheDocument();
    await waitFor(() =>
      expect(llamadas.find((l) => l.ruta === '/auth/restablecer')?.cuerpo).toEqual({
        token: 'abcdefghijklmnopqrstuvwxyz',
        contrasena: 'NuevaClave1',
      }),
    );
  });

  it('sin token explica que el enlace está incompleto', async () => {
    instalarApiFalsa({ 'GET /auth/sesion': sinSesion });
    renderizar('/restablecer');
    expect(await screen.findByRole('heading', { name: 'Enlace incompleto' })).toBeInTheDocument();
  });
});

describe('cerrar sesión', () => {
  it('vuelve al login', async () => {
    const { llamadas } = instalarApiFalsa({
      'GET /auth/sesion': { cuerpo: sesionAdmin },
      'POST /auth/logout': (_cuerpo) => ({ estado: 204 }),
      ...dashboard(),
    });
    renderizar('/');
    fireEvent.click(await screen.findByRole('button', { name: /Cerrar sesión/ }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(llamadas.some((l) => l.ruta === '/auth/logout')).toBe(true);
  });
});
