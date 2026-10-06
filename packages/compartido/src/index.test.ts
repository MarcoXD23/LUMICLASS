import { describe, expect, it } from 'vitest';
import { CONEXIONES, ESTADOS_LUZ, MODOS_ZONA } from './index';

describe('tipos compartidos', () => {
  it('incluye el estado "desconocido" para luces sin confirmación', () => {
    expect(ESTADOS_LUZ).toContain('desconocido');
  });

  it('define los dos modos de zona', () => {
    expect(MODOS_ZONA).toEqual(['automatico', 'manual']);
  });

  it('define los estados de conexión de sensores y actuadores', () => {
    expect(CONEXIONES).toEqual(['activo', 'inactivo', 'falla']);
  });
});
