import { describe, expect, it } from 'vitest';
import { decidirComando, normalizarConexion, normalizarEstadoLuz } from './maquinaLuz';
import { ErrorDominio } from './errores';

const actuadorOk = { conexion: 'activo' as const, ocupado: false };

function codigoDeError(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof ErrorDominio ? `${error.estadoHttp}:${error.codigo}` : 'otro';
  }
  return undefined;
}

describe('decidirComando', () => {
  it('acciona el servo si la luz está en otro estado', () => {
    expect(decidirComando({ estadoReal: 'off', actuador: actuadorOk }, 'encender')).toEqual({
      tipo: 'accionar',
      objetivo: 'on',
    });
  });

  it('no mueve el servo si la luz ya está como se pide', () => {
    expect(decidirComando({ estadoReal: 'on', actuador: actuadorOk }, 'encender').tipo).toBe(
      'sin_cambio',
    );
  });

  it('acciona cuando el estado real es desconocido', () => {
    expect(decidirComando({ estadoReal: 'desconocido', actuador: actuadorOk }, 'apagar').tipo).toBe(
      'accionar',
    );
  });

  it('rechaza con 409 si el servo está ocupado', () => {
    const situacion = { estadoReal: 'off' as const, actuador: { ...actuadorOk, ocupado: true } };
    expect(codigoDeError(() => decidirComando(situacion, 'encender'))).toBe('409:ACTUADOR_OCUPADO');
  });

  it('rechaza con 503 si el servo está en falla o desconectado', () => {
    const enFalla = {
      estadoReal: 'off' as const,
      actuador: { conexion: 'falla' as const, ocupado: false },
    };
    const inactivo = {
      estadoReal: 'off' as const,
      actuador: { conexion: 'inactivo' as const, ocupado: false },
    };
    expect(codigoDeError(() => decidirComando(enFalla, 'encender'))).toBe('503:ACTUADOR_EN_FALLA');
    expect(codigoDeError(() => decidirComando(inactivo, 'encender'))).toBe(
      '503:ACTUADOR_DESCONECTADO',
    );
  });
});

describe('normalización de estados imposibles', () => {
  it('convierte valores desconocidos de la base en estados seguros', () => {
    expect(normalizarEstadoLuz('encendidisimo')).toBe('desconocido');
    expect(normalizarEstadoLuz('on')).toBe('on');
    expect(normalizarConexion('???')).toBe('falla');
    expect(normalizarConexion('inactivo')).toBe('inactivo');
  });
});
