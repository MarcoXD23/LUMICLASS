import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { construirApp } from '../../src/app';
import { leerEntorno } from '../../src/config/entorno';
import { crearBaseDatos } from '../../src/db/cliente';
import { DriverEnMemoria } from '../../src/drivers/driverEnMemoria';
import { sembrar } from '../../prisma/seed';

const CARPETA_MIGRACIONES = join(import.meta.dirname, '..', '..', 'prisma', 'migrations');

/** Lee las migraciones en orden y las separa en sentencias SQL. */
function sentenciasDeMigracion(): string[] {
  return readdirSync(CARPETA_MIGRACIONES, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort()
    .flatMap((nombre) =>
      readFileSync(join(CARPETA_MIGRACIONES, nombre, 'migration.sql'), 'utf8').split(';'),
    )
    .map((sentencia) => sentencia.trim())
    .filter((sentencia) => sentencia.replace(/^--.*$/gm, '').trim().length > 0);
}

/**
 * Crea una app de prueba con su propia base SQLite temporal (migrada y con datos iniciales).
 * `driver` permite simular respuestas del servo.
 */
export async function crearAppDePrueba(
  opciones: { driver?: DriverEnMemoria; sinDatos?: boolean } = {},
) {
  const carpeta = mkdtempSync(join(tmpdir(), 'lumiclass-prueba-'));
  const url = `file:${join(carpeta, 'prueba.db')}`;
  const bd = crearBaseDatos(url);
  for (const sentencia of sentenciasDeMigracion()) {
    await bd.$executeRawUnsafe(sentencia);
  }
  if (!opciones.sinDatos) await sembrar(bd);

  const driver = opciones.driver ?? new DriverEnMemoria();
  await driver.iniciar();
  const entorno = leerEntorno({ DATABASE_URL: url, TIEMPO_MAX_ACTUADOR_MS: '200' });
  const app = construirApp({ entorno, bd, driver });
  await app.ready();

  return {
    app,
    bd,
    driver,
    async cerrar() {
      await app.close();
      await driver.detener();
      await bd.$disconnect();
      rmSync(carpeta, { recursive: true, force: true, maxRetries: 3 });
    },
  };
}

export type AppDePrueba = Awaited<ReturnType<typeof crearAppDePrueba>>;

let contador = 0;
/** idSolicitud único y válido para cada orden de prueba. */
export const nuevoId = () => `prueba-${Date.now()}-${++contador}`;
