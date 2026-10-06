import Fastify from 'fastify';
import type { RespuestaSalud } from '@lumiclass/compartido';
import type { Entorno } from './config/entorno';

/** Construye la app sin abrir el puerto, para poder probarla con inject(). */
export function construirApp(entorno: Entorno, opciones: { registrar?: boolean } = {}) {
  const app = Fastify({ logger: opciones.registrar ?? false });

  app.get('/api/v1/salud', async (): Promise<RespuestaSalud> => ({
    estado: 'ok',
    driver: entorno.DRIVER,
    fecha: new Date().toISOString(),
  }));

  return app;
}
