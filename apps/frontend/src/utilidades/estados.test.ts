import { describe, expect, it } from 'vitest';
import { describirConexion, describirLuz, describirModo, describirOcupacion } from './estados';
import { duracionLegible, haceCuanto } from './formatoFecha';

describe('describir estados', () => {
  it('cada estado de luz tiene texto e ícono distintos', () => {
    const textos = (['on', 'off', 'desconocido'] as const).map((e) => describirLuz(e).texto);
    expect(new Set(textos).size).toBe(3);
    expect(describirLuz('on').icono).not.toBe(describirLuz('off').icono);
  });

  it('distingue ocupado, vacío y sin datos', () => {
    expect(describirOcupacion(true).texto).toBe('Ocupado');
    expect(describirOcupacion(false).texto).toBe('Vacío');
    expect(describirOcupacion(null).tono).toBe('advertencia');
  });

  it('distingue automático y manual', () => {
    expect(describirModo('automatico').texto).toBe('Automático');
    expect(describirModo('manual').tono).toBe('manual');
  });

  it('marca las fallas de conexión como error', () => {
    expect(describirConexion('falla').tono).toBe('error');
    expect(describirConexion('inactivo').texto).toBe('Desconectado');
  });
});

describe('formato de fechas', () => {
  const ahora = new Date('2026-10-05T12:00:00Z');

  it('muestra tiempos relativos', () => {
    expect(haceCuanto('2026-10-05T11:59:55Z', ahora)).toBe('hace 5 s');
    expect(haceCuanto('2026-10-05T11:57:00Z', ahora)).toBe('hace 3 min');
    expect(haceCuanto('2026-10-05T09:00:00Z', ahora)).toBe('hace 3 h');
  });

  it('no se rompe con fechas nulas o inválidas', () => {
    expect(haceCuanto(null, ahora)).toBe('nunca');
    expect(haceCuanto('no-es-fecha', ahora)).toBe('fecha inválida');
  });

  it('escribe duraciones legibles', () => {
    expect(duracionLegible(0)).toBe('al instante');
    expect(duracionLegible(300)).toBe('5 min');
    expect(duracionLegible(90)).toBe('1 min 30 s');
    expect(duracionLegible(45)).toBe('45 s');
  });
});
