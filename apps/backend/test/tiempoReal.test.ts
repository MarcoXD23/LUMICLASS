import type { EventoDto } from '@lumiclass/compartido';
import { request, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { crearAppDePrueba, nuevoId, type AppDePrueba } from './ayudantes/baseDatosPrueba';

let prueba: AppDePrueba;
afterEach(() => prueba.cerrar());

interface MensajeSse {
  evento: string;
  datos: unknown;
}

/** Abre una conexión SSE real y va acumulando los mensajes recibidos. */
async function conectar(puerto: number, cookie: string | null = prueba.cookieAdmin) {
  const mensajes: MensajeSse[] = [];
  let texto = '';
  const respuesta = await new Promise<IncomingMessage>((resolver, rechazar) => {
    const pedido = request(
      {
        host: '127.0.0.1',
        port: puerto,
        path: '/api/v1/tiempo-real',
        headers: cookie ? { cookie } : {},
      },
      resolver,
    );
    pedido.on('error', rechazar);
    pedido.end();
  });
  respuesta.setEncoding('utf8');
  respuesta.on('data', (trozo: string) => {
    texto += trozo;
    const bloques = texto.split('\n\n');
    texto = bloques.pop() ?? '';
    for (const bloque of bloques) {
      const evento = /^event: (.+)$/m.exec(bloque)?.[1];
      const datos = /^data: (.+)$/m.exec(bloque)?.[1];
      if (evento && datos) mensajes.push({ evento, datos: JSON.parse(datos) });
      else if (bloque.startsWith(':')) mensajes.push({ evento: 'latido', datos: null });
    }
  });
  respuesta.on('error', () => undefined);
  return { respuesta, mensajes };
}

async function esperarQue(condicion: () => boolean, ms = 2000): Promise<void> {
  const limite = Date.now() + ms;
  while (!condicion()) {
    if (Date.now() > limite) throw new Error('Tiempo agotado esperando la condición');
    await new Promise((r) => setTimeout(r, 10));
  }
}

async function iniciarServidor(entorno: Record<string, string> = {}) {
  prueba = await crearAppDePrueba({ entorno });
  await prueba.app.listen({ port: 0, host: '127.0.0.1' });
  return (prueba.app.server.address() as AddressInfo).port;
}

describe('GET /api/v1/tiempo-real (SSE)', () => {
  it('responde como flujo de eventos y saluda al conectar', async () => {
    const puerto = await iniciarServidor();
    const { respuesta, mensajes } = await conectar(puerto);
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.headers['content-type']).toMatch(/text\/event-stream/);
    await esperarQue(() => mensajes.some((m) => m.evento === 'conectado'));
    respuesta.destroy();
  });

  it('envía al momento cada evento nuevo del historial', async () => {
    const puerto = await iniciarServidor();
    const { respuesta, mensajes } = await conectar(puerto);
    await esperarQue(() => mensajes.length > 0);

    await prueba.app.inject({
      method: 'POST',
      url: '/api/v1/luces/luz-frente/comando',
      payload: { accion: 'encender', idSolicitud: nuevoId() },
    });
    await esperarQue(() =>
      mensajes.some(
        (m) => m.evento === 'evento' && (m.datos as EventoDto).tipo === 'luz_encendida',
      ),
    );
    const evento = mensajes.find((m) => (m.datos as EventoDto | null)?.tipo === 'luz_encendida')
      ?.datos as EventoDto;
    expect(evento).toMatchObject({ entidadId: 'luz-frente', origen: 'usuario' });
    respuesta.destroy();
  });

  it('envía latidos para mantener viva la conexión', async () => {
    const puerto = await iniciarServidor({ LATIDO_SSE_MS: '1000' });
    const { respuesta, mensajes } = await conectar(puerto);
    await esperarQue(() => mensajes.some((m) => m.evento === 'latido'), 2500);
    respuesta.destroy();
  });

  it('rechaza con 503 si se supera el máximo de conexiones', async () => {
    const puerto = await iniciarServidor({ MAX_CONEXIONES_SSE: '1' });
    const primera = await conectar(puerto);
    const segunda = await conectar(puerto);
    expect(primera.respuesta.statusCode).toBe(200);
    expect(segunda.respuesta.statusCode).toBe(503);
    primera.respuesta.destroy();
  });

  it('libera el cupo cuando un cliente se desconecta', async () => {
    const puerto = await iniciarServidor({ MAX_CONEXIONES_SSE: '1' });
    const primera = await conectar(puerto);
    await esperarQue(() => primera.mensajes.length > 0);
    primera.respuesta.destroy();
    await esperarQue(() => prueba.servicios.difusor.cantidad === 0);
    const segunda = await conectar(puerto);
    expect(segunda.respuesta.statusCode).toBe(200);
    segunda.respuesta.destroy();
  });

  it('rechaza con 401 a quien no inició sesión', async () => {
    const puerto = await iniciarServidor();
    const { respuesta } = await conectar(puerto, null);
    expect(respuesta.statusCode).toBe(401);
    respuesta.destroy();
  });

  it('el servidor se apaga aunque haya conexiones abiertas', async () => {
    const puerto = await iniciarServidor();
    const { respuesta, mensajes } = await conectar(puerto);
    await esperarQue(() => mensajes.length > 0);
    const cerrado = new Promise((resolver) => respuesta.on('end', resolver));
    await prueba.app.close();
    await cerrado;
  });
});
