import { describe, expect, it } from 'vitest';
import { describirCondicion, duracion, etiqueta, haceCuanto } from '../../resources/js/formato';

describe('duracion', () => {
    it.each([
        [0, '0 min'],
        [20, 'menos de 1 min'],
        [2700, '45 min'],
        [3600, '1 h'],
        [9300, '2 h 35 min'],
        [36000, '10 h'],
    ])('%i s → "%s"', (segundos, texto) => {
        expect(duracion(segundos)).toBe(texto);
    });

    it('tolera null o undefined (dato que aún no llega)', () => {
        expect(duracion(null)).toBe('0 min');
        expect(duracion(undefined)).toBe('0 min');
    });
});

describe('haceCuanto', () => {
    const ahora = new Date('2026-10-06T12:00:00Z').getTime();

    it.each([
        ['2026-10-06T11:59:55Z', 'hace 5 s'],
        ['2026-10-06T11:57:00Z', 'hace 3 min'],
        ['2026-10-06T09:00:00Z', 'hace 3 h'],
    ])('%s → "%s"', (iso, texto) => {
        expect(haceCuanto(iso, ahora)).toBe(texto);
    });

    it('sin fecha dice "sin datos"', () => {
        expect(haceCuanto(null, ahora)).toBe('sin datos');
    });

    it('una fecha futura (reloj del PC adelantado) no da negativos', () => {
        expect(haceCuanto('2026-10-06T12:00:30Z', ahora)).toBe('hace 0 s');
    });
});

describe('describirCondicion y etiqueta', () => {
    it('describe condiciones de reglas en español', () => {
        expect(describirCondicion({ presencia: 'ocupado' })).toBe('Ocupado');
        expect(describirCondicion({ presencia: 'vacio', duracion_segundos: 300 })).toBe('Vacío durante 5 min');
        expect(describirCondicion({ presencia: 'vacio', duracion_segundos: 90 })).toBe('Vacío durante 90 s');
    });

    it('traduce valores conocidos y devuelve el original si no lo conoce', () => {
        expect(etiqueta('luz', 'desconocida')).toBe('Desconocido');
        expect(etiqueta('evento', 'actuador.sin_respuesta')).toBe('Servo sin respuesta');
        expect(etiqueta('luz', 'parpadeando')).toBe('parpadeando');
        expect(etiqueta('luz', null)).toBe('—');
    });
});
