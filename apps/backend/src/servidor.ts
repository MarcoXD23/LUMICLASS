import { construirApp } from './app';
import { leerEntorno } from './config/entorno';

function cargarArchivoEnv(): void {
  try {
    process.loadEnvFile('.env');
  } catch {
    // Sin .env se usan los valores por defecto (ver .env.example).
  }
}

async function iniciar(): Promise<void> {
  cargarArchivoEnv();
  const entorno = leerEntorno();
  const app = construirApp(entorno, { registrar: true });

  const cerrar = async () => {
    await app.close();
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
