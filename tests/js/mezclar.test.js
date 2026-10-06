import { describe, expect, it } from 'vitest';
import { mezclar } from '../../resources/js/mezclar';

describe('mezclar', () => {
    it('conserva los getters vivos (el operador "..." los congelaría)', () => {
        const base = {
            estado: { zonas: [1] },
            get zonas() {
                return this.estado.zonas;
            },
        };

        const combinado = mezclar(base, { extra: true });
        combinado.estado = { zonas: [1, 2, 3] };

        expect(combinado.zonas).toEqual([1, 2, 3]);
        expect({ ...base, extra: true }.zonas).toEqual([1]); // así fallaba con "..."
    });

    it('lo de la derecha reemplaza a lo de la izquierda', () => {
        const combinado = mezclar({ a: 1, init: () => 'base' }, { init: () => 'propio' });

        expect(combinado.a).toBe(1);
        expect(combinado.init()).toBe('propio');
    });
});
