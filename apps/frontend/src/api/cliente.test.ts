import { afterEach, describe, expect, it, vi } from 'vitest';
import { instalarApiFalsa, redCaida } from '../pruebas/apiFalsa';
import { ErrorApi, mensajeDeError, pedir } from './cliente';
import { api } from './recursos';

afterEach(() => {
  vi.unstubAllGlobals();
});

async function capturar(promesa: Promise<unknown>): Promise<ErrorApi> {
  try {
    await promesa;
  } catch (error) {
    if (error instanceof ErrorApi) return error;
    throw error;
  }
  throw new Error('Se esperaba un error');
}

describe('pedir', () => {
  it('devuelve el JSON de una respuesta correcta', async () => {
    instalarApiFalsa({ 'GET /salud': { cuerpo: { estado: 'ok' } } });
    await expect(pedir('/salud')).resolves.toEqual({ estado: 'ok' });
  });

  it('convierte el error de la API en ErrorApi con su mensaje', async () => {
    instalarApiFalsa({
      'GET /salud': {
        estado: 503,
        cuerpo: { error: { codigo: 'ACTUADOR_EN_FALLA', mensaje: 'El servo está en falla' } },
      },
    });
    const error = await capturar(pedir('/salud'));
    expect(error).toMatchObject({ codigo: 'ACTUADOR_EN_FALLA', estadoHttp: 503 });
    expect(mensajeDeError(error)).toBe('El servo está en falla');
  });

  it('informa "Sin conexión" si la red falla', async () => {
    instalarApiFalsa({ 'GET /salud': redCaida });
    const error = await capturar(pedir('/salud'));
    expect(error.codigo).toBe('SIN_CONEXION');
    expect(error.sinConexion).toBe(true);
  });

  it('trata un 502 del proxy (backend apagado) como sin conexión', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 })),
    );
    expect((await capturar(pedir('/salud'))).codigo).toBe('SIN_CONEXION');
  });

  it('rechaza una respuesta correcta que no es JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('hola', { status: 200 })));
    expect((await capturar(pedir('/salud'))).codigo).toBe('RESPUESTA_INVALIDA');
  });

  it('acepta 204 sin cuerpo', async () => {
    instalarApiFalsa({ 'DELETE /reglas/r1': { estado: 204 } });
    await expect(api.eliminarRegla('r1')).resolves.toBeUndefined();
  });
});

describe('órdenes', () => {
  it('cada orden lleva un idSolicitud distinto', async () => {
    const { llamadas } = instalarApiFalsa({
      'POST /luces/luz-frente/comando': { cuerpo: { cambio: true } },
    });
    await api.comandarLuz('luz-frente', 'encender');
    await api.comandarLuz('luz-frente', 'encender');
    const ids = llamadas.map((l) => (l.cuerpo as { idSolicitud: string }).idSolicitud);
    expect(ids[0]).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(ids[0]).not.toBe(ids[1]);
  });
});
