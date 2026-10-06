import { describe, expect, it } from 'vitest';
import { hashearContrasena, verificarContrasena } from './contrasenas';

describe('contraseñas con scrypt', () => {
  it('nunca guarda la contraseña en texto plano y la verifica', async () => {
    const hash = await hashearContrasena('Clave2026');
    expect(hash).not.toContain('Clave2026');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verificarContrasena('Clave2026', hash)).toBe(true);
    expect(await verificarContrasena('clave2026', hash)).toBe(false);
  });

  it('usa una sal distinta cada vez', async () => {
    expect(await hashearContrasena('Igual123')).not.toBe(await hashearContrasena('Igual123'));
  });

  it('un hash con formato inválido no coincide (no lanza error)', async () => {
    expect(await verificarContrasena('x', 'texto-cualquiera')).toBe(false);
    expect(await verificarContrasena('x', 'scrypt$1$2$3$abc$def')).toBe(false);
  });
});
