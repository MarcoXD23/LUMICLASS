import { construirApp } from './app';
import { leerEntorno, type Entorno } from './config/entorno';
import { crearBaseDatos } from './db/cliente';
import type { DriverHardware } from './drivers/driver';
import { DriverSimulado } from './drivers/driverSimulado';

function cargarArchivoEnv(): void {
  try {
    process.loadEnvFile('.env');
  } catch {
    // Sin .env se usan los valores por defecto (ver .env.example).
  }
}

function crearDriver(entorno: Entorno): DriverHardware {
  if (entorno.DRIVER === 'real') {
    throw new Error('El driver "real" se implementa en la Fase 8. Usa DRIVER=simulado.');
  }
  return new DriverSimulado({ demoraLentoMs: entorno.SIM_DEMORA_LENTO_MS });
}

async function iniciar(): Promise<void> {
  cargarArchivoEnv();
  const entorno = leerEntorno();
  const driver = crearDriver(entorno);
  const bd = crearBaseDatos(entorno.DATABASE_URL);
  await driver.iniciar();
  const app = construirApp({ entorno, bd, driver, registrar: true });

  const cerrar = async () => {
    await app.close();
    await driver.detener();
    await bd.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);

  await app.listen({ port: entorno.PUERTO, host: entorno.HOST });
  app.log.info(`LUMICLASS API lista (driver: ${entorno.DRIVER})`);
}

iniciar().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
