import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Respuesta falsa de fetch. */
function respuesta(status, cuerpo) {
    return {
        status,
        ok: status >= 200 && status < 300,
        json: async () => {
            if (cuerpo === undefined) throw new SyntaxError('sin JSON');
            return cuerpo;
        },
    };
}

describe('cliente de la API', () => {
    let api;
    let ErrorApi;
    let nuevoIdSolicitud;
    let fetchFalso;

    beforeEach(async () => {
        // api.js guarda estado (token CSRF pedido): cada prueba usa una copia nueva del módulo.
        vi.resetModules();
        fetchFalso = vi.fn();
        vi.stubGlobal('fetch', fetchFalso);
        vi.stubGlobal('navigator', { onLine: true });
        vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=abc%3D%3D; lumiclass_session=x' });
        vi.stubGlobal('window', { location: { href: '/salones/1' }, crypto: globalThis.crypto });
        ({ api, ErrorApi, nuevoIdSolicitud } = await import('../../resources/js/api'));
    });

    afterEach(() => vi.unstubAllGlobals());

    it('GET devuelve el JSON y no pide token CSRF', async () => {
        fetchFalso.mockResolvedValueOnce(respuesta(200, { data: { id: 1 } }));

        await expect(api('GET', '/salones')).resolves.toEqual({ data: { id: 1 } });
        expect(fetchFalso).toHaveBeenCalledTimes(1);
        expect(fetchFalso.mock.calls[0][0]).toBe('/api/v1/salones');
    });

    it('POST pide primero el token CSRF y lo envía decodificado', async () => {
        fetchFalso.mockResolvedValueOnce(respuesta(204)).mockResolvedValueOnce(respuesta(201, { data: {} }));

        await api('POST', '/salones', { nombre: 'Aula' });

        expect(fetchFalso.mock.calls[0][0]).toBe('/sanctum/csrf-cookie');
        const [, opciones] = fetchFalso.mock.calls[1];
        expect(opciones.headers['X-XSRF-TOKEN']).toBe('abc==');
        expect(JSON.parse(opciones.body)).toEqual({ nombre: 'Aula' });
    });

    it('un 400 se convierte en ErrorApi con los errores por campo', async () => {
        fetchFalso.mockResolvedValueOnce(
            respuesta(400, { error: { codigo: 'datos_invalidos', mensaje: 'Los datos enviados no son válidos.', detalles: { email: ['Correo inválido.', 'otro'] } } }),
        );

        const error = await api('GET', '/x').catch((e) => e);

        expect(error).toBeInstanceOf(ErrorApi);
        expect(error.estado).toBe(400);
        expect(error.codigo).toBe('datos_invalidos');
        expect(error.erroresPorCampo()).toEqual({ email: 'Correo inválido.' });
    });

    it('un 401 fuera de /auth lleva a ingresar; en /auth no (es el login fallido)', async () => {
        fetchFalso.mockResolvedValue(respuesta(401, { error: { codigo: 'no_autenticado', mensaje: 'Inicia sesión para continuar.' } }));

        await api('GET', '/salones').catch(() => {});
        expect(window.location.href).toBe('/ingresar');

        window.location.href = '/ingresar?x';
        await api('GET', '/auth/yo').catch(() => {});
        expect(window.location.href).toBe('/ingresar?x');
    });

    it('un 419 (token vencido) pide otro token y reintenta UNA vez', async () => {
        fetchFalso
            .mockResolvedValueOnce(respuesta(204)) // token
            .mockResolvedValueOnce(respuesta(419, { error: { codigo: 'sesion_expirada', mensaje: 'La sesión expiró…' } }))
            .mockResolvedValueOnce(respuesta(204)) // token nuevo
            .mockResolvedValueOnce(respuesta(200, { data: 'ok' }));

        await expect(api('POST', '/luces/1/comando', {})).resolves.toEqual({ data: 'ok' });
        expect(fetchFalso.mock.calls.map((c) => c[0])).toEqual([
            '/sanctum/csrf-cookie',
            '/api/v1/luces/1/comando',
            '/sanctum/csrf-cookie',
            '/api/v1/luces/1/comando',
        ]);
    });

    it('si el 419 se repite, no reintenta en bucle', async () => {
        fetchFalso.mockImplementation(async (url) =>
            url === '/sanctum/csrf-cookie' ? respuesta(204) : respuesta(419, { error: { codigo: 'sesion_expirada', mensaje: 'x' } }),
        );

        await expect(api('POST', '/salones', {})).rejects.toMatchObject({ estado: 419 });
        expect(fetchFalso.mock.calls.filter((c) => c[0] !== '/sanctum/csrf-cookie')).toHaveLength(2);
    });

    it('servidor apagado (fetch falla) → "Sin conexión con el servidor"', async () => {
        fetchFalso.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        await expect(api('GET', '/salones')).rejects.toMatchObject({ codigo: 'sin_conexion', estado: 0 });
    });

    it('sin red ni siquiera intenta la llamada', async () => {
        navigator.onLine = false;

        await expect(api('GET', '/salones')).rejects.toMatchObject({ codigo: 'sin_conexion' });
        expect(fetchFalso).not.toHaveBeenCalled();
    });

    it('respuesta de error sin JSON (servidor roto) da un mensaje genérico en español', async () => {
        fetchFalso.mockResolvedValueOnce(respuesta(502));

        await expect(api('GET', '/salones')).rejects.toThrow('Error inesperado del servidor (HTTP 502).');
    });

    it('nuevoIdSolicitud funciona aunque no exista crypto.randomUUID (celular por IP de la red)', () => {
        window.crypto = { getRandomValues: (a) => globalThis.crypto.getRandomValues(a) };
        const ids = new Set(Array.from({ length: 50 }, () => nuevoIdSolicitud()));

        expect(ids.size).toBe(50);
        for (const id of ids) {
            expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        }
    });
});
