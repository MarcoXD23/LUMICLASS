import { describe, expect, it } from 'vitest';
import { dentroDeHorario } from './horario';

const a = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return new Date(2026, 9, 5, h, m);
};

describe('dentroDeHorario', () => {
  it('sin horario siempre está vigente', () => {
    expect(dentroDeHorario(undefined, a('03:00'))).toBe(true);
  });

  it('franja normal: incluye "desde" y excluye "hasta"', () => {
    const tarde = { desde: '14:00', hasta: '18:00' };
    expect(dentroDeHorario(tarde, a('13:59'))).toBe(false);
    expect(dentroDeHorario(tarde, a('14:00'))).toBe(true);
    expect(dentroDeHorario(tarde, a('17:59'))).toBe(true);
    expect(dentroDeHorario(tarde, a('18:00'))).toBe(false);
  });

  it('franja que cruza la medianoche', () => {
    const noche = { desde: '22:00', hasta: '06:00' };
    expect(dentroDeHorario(noche, a('23:30'))).toBe(true);
    expect(dentroDeHorario(noche, a('05:59'))).toBe(true);
    expect(dentroDeHorario(noche, a('12:00'))).toBe(false);
  });

  it('desde = hasta cubre todo el día', () => {
    expect(dentroDeHorario({ desde: '08:00', hasta: '08:00' }, a('02:00'))).toBe(true);
  });
});
