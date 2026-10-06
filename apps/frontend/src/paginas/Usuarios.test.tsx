import type { UsuarioDto } from '@lumiclass/compartido';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProveedorSesion } from '../hooks/useSesion';
import { instalarApiFalsa, sesionAdmin } from '../pruebas/apiFalsa';
import { Usuarios } from './Usuarios';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const usuario = (cambios: Partial<UsuarioDto>): UsuarioDto => ({
  id: 'u1',
  nombre: 'Persona',
  correo: 'persona@correo.com',
  rol: 'usuario',
  activo: true,
  creadoEn: new Date().toISOString(),
  inactivoDesde: null,
  ...cambios,
});

describe('Usuarios (admin)', () => {
  it('el admin no tiene botones; un usuario se puede desactivar con confirmación', async () => {
    const { llamadas } = instalarApiFalsa({
      'GET /auth/sesion': { cuerpo: sesionAdmin },
      'GET /usuarios': {
        cuerpo: [
          usuario({ id: 'u-admin', nombre: 'Admin Prueba', rol: 'admin' }),
          usuario({ id: 'u-sofia', nombre: 'Sofía' }),
        ],
      },
      'PATCH /usuarios/u-sofia': (cuerpo) => ({
        cuerpo: usuario({ id: 'u-sofia', ...(cuerpo as object) }),
      }),
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <ProveedorSesion>
        <Usuarios />
      </ProveedorSesion>,
    );
    expect(await screen.findByText('Sofía')).toBeInTheDocument();
    // Solo hay un botón "Desactivar": el de Sofía (el admin está protegido).
    const botones = screen.getAllByRole('button', { name: 'Desactivar' });
    expect(botones).toHaveLength(1);
    fireEvent.click(botones[0]!);
    await waitFor(() =>
      expect(llamadas.find((l) => l.metodo === 'PATCH')?.cuerpo).toEqual({ activo: false }),
    );
  });
});
