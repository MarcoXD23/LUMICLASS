import type { RespuestaSalud } from '@lumiclass/compartido';
import type { FastifyInstance } from 'fastify';
import type { Servicios } from '../app';
import { baseDatosDisponible } from '../db/cliente';

/** Pública: permite saber si el servidor está vivo sin iniciar sesión. */
export function rutasSalud(api: FastifyInstance, servicios: Servicios): void {
  api.get('/salud', async (): Promise<RespuestaSalud> => {
    const bdOk = await baseDatosDisponible(servicios.bd);
    const hardware = servicios.driver.estadoConexion();
    return {
      estado: bdOk && hardware === 'conectado' ? 'ok' : 'degradado',
      driver: servicios.entorno.DRIVER,
      baseDatos: bdOk ? 'ok' : 'error',
      hardware,
      fecha: new Date().toISOString(),
    };
  });
}

export function rutasSalon(api: FastifyInstance, servicios: Servicios): void {
  api.get('/salon/estado', () => servicios.salon.estado());
}
