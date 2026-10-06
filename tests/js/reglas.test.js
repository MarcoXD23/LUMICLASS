import { describe, expect, it, vi } from 'vitest';

// reglas.js importa Alpine (a través de avisos.js); aquí solo se prueban sus funciones puras.
vi.mock('../../resources/js/avisos', () => ({ avisar: vi.fn() }));
const { cuerpoRegla, formularioDesdeRegla } = await import('../../resources/js/paginas/reglas');

const regla = (segundos, cambios = {}) => ({
    id: 1,
    nombre: 'Apagar',
    zona_id: null,
    activa: true,
    prioridad: 20,
    condicion: segundos === null ? { presencia: 'vacio' } : { presencia: 'vacio', duracion_segundos: segundos },
    accion: { accion: 'apagar' },
    ...cambios,
});

describe('formulario de reglas', () => {
    it.each([20, 90, 300, 3599])('editar solo el nombre conserva %i s exactos', (segundos) => {
        const f = { ...formularioDesdeRegla(regla(segundos)), nombre: 'Otro nombre' };

        expect(cuerpoRegla(f).condicion.duracion_segundos).toBe(segundos);
    });

    it('si se cambian los minutos, se usan los minutos nuevos', () => {
        const f = { ...formularioDesdeRegla(regla(90)), minutos: 10 };

        expect(cuerpoRegla(f).condicion.duracion_segundos).toBe(600);
    });

    it('0 minutos en una regla nueva = de inmediato (sin duración)', () => {
        expect(cuerpoRegla({ nombre: 'x', zona_id: '', presencia: 'ocupado', minutos: 0, accion: 'encender', prioridad: 1, activa: true }).condicion).toEqual({
            presencia: 'ocupado',
        });
    });

    it('convierte tipos del formulario (textos de los inputs) a los de la API', () => {
        const cuerpo = cuerpoRegla({ ...formularioDesdeRegla(regla(null)), zona_id: '7', prioridad: '5', minutos: '2' });

        expect(cuerpo).toMatchObject({ zona_id: 7, prioridad: 5, condicion: { duracion_segundos: 120 } });
    });
});
