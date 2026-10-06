import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearSondeo } from '../../resources/js/sondeo';

/** Avanza el reloj falso y deja terminar las promesas pendientes. */
async function avanzar(ms) {
    await vi.advanceTimersByTimeAsync(ms);
}

describe('crearSondeo', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('document', { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
        vi.stubGlobal('navigator', { onLine: true });
        vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('consulta al iniciar y luego cada 3 s', async () => {
        const cargar = vi.fn().mockResolvedValue();
        const sondeo = crearSondeo(cargar, 3000);

        sondeo.iniciar();
        await avanzar(0);
        expect(cargar).toHaveBeenCalledTimes(1);

        await avanzar(3000);
        await avanzar(3000);
        expect(cargar).toHaveBeenCalledTimes(3);
        sondeo.detener();
    });

    it('si falla espera cada vez más (6, 12, 24 s y máximo 30 s) y avisa al recuperarse', async () => {
        const alRecuperar = vi.fn();
        let falla = true;
        const cargar = vi.fn(async () => {
            if (falla) throw new Error('servidor caído');
        });
        const sondeo = crearSondeo(cargar, 3000, { alRecuperar });

        sondeo.iniciar();
        await avanzar(0); // falla 1 → espera 6 s
        expect(sondeo.fallosSeguidos).toBe(1);

        await avanzar(5999);
        expect(cargar).toHaveBeenCalledTimes(1);
        await avanzar(1); // falla 2 → espera 12 s
        await avanzar(12000); // falla 3 → espera 24 s
        await avanzar(24000); // falla 4 → 48 s, recortado a 30 s
        expect(cargar).toHaveBeenCalledTimes(4);

        falla = false;
        await avanzar(29999);
        expect(cargar).toHaveBeenCalledTimes(4);
        await avanzar(1);
        expect(cargar).toHaveBeenCalledTimes(5);
        expect(alRecuperar).toHaveBeenCalledTimes(1);
        expect(sondeo.fallosSeguidos).toBe(0);

        await avanzar(3000); // de vuelta al ritmo normal
        expect(cargar).toHaveBeenCalledTimes(6);
        sondeo.detener();
    });

    it('no consulta con la pestaña oculta ni sin red', async () => {
        const cargar = vi.fn().mockResolvedValue();
        const sondeo = crearSondeo(cargar, 3000);

        document.hidden = true;
        sondeo.iniciar();
        await avanzar(9000);
        expect(cargar).not.toHaveBeenCalled();

        document.hidden = false;
        navigator.onLine = false;
        await avanzar(9000);
        expect(cargar).not.toHaveBeenCalled();

        navigator.onLine = true;
        await avanzar(3000);
        expect(cargar).toHaveBeenCalledTimes(1);
        sondeo.detener();
    });

    it('no lanza dos consultas a la vez aunque se pida "ahora" durante una lenta', async () => {
        let terminar;
        const cargar = vi.fn(() => new Promise((resolver) => (terminar = resolver)));
        const sondeo = crearSondeo(cargar, 3000);

        sondeo.iniciar();
        sondeo.ahora();
        sondeo.ahora();
        expect(cargar).toHaveBeenCalledTimes(1);

        terminar();
        sondeo.detener();
    });

    it('detener() corta las consultas pendientes', async () => {
        const cargar = vi.fn().mockResolvedValue();
        const sondeo = crearSondeo(cargar, 3000);

        sondeo.iniciar();
        await avanzar(0);
        sondeo.detener();
        await avanzar(30000);

        expect(cargar).toHaveBeenCalledTimes(1);
    });
});
