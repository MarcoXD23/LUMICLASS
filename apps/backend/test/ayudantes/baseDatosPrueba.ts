import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { construirApp } from '../../src/app';
import { leerEntorno } from '../../src/config/entorno';
import { crearBaseDatos } from '../../src/db/cliente';
import type { DriverHardware } from '../../src/drivers/driver';
import { DriverEnMemoria } from '../../src/drivers/driverEnMemoria';
import { sembrar } from '../../prisma/seed';
import { RelojManual } from './relojManual';

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
 * - `driver`: hardware a usar (por defecto DriverEnMemoria, que siempre obedece).
 * - El reloj es manual: el tiempo solo avanza con `avanzar(ms)`.
 */
export async function crearAppDePrueba<D extends DriverHardware = DriverEnMemoria>(
  opciones: { driver?: D; sinDatos?: boolean } = {},
) {
  const carpeta = mkdtempSync(join(tmpdir(), 'lumiclass-prueba-'));
  const url = `file:${join(carpeta, 'prueba.db')}`;
  const bd = crearBaseDatos(url);
  for (const sentencia of sentenciasDeMigracion()) {
    await bd.$executeRawUnsafe(sentencia);
  }
  if (!opciones.sinDatos) await sembrar(bd);

  const driver = (opciones.driver ?? new DriverEnMemoria()) as D;
  await driver.iniciar();
  const reloj = new RelojManual();
  const entorno = leerEntorno({ DATABASE_URL: url, TIEMPO_MAX_ACTUADOR_MS: '200' });
  const app = construirApp({ entorno, bd, driver, reloj });
  await app.ready();
  const { servicios } = app;

  /** Espera a que presencia y motor terminen de reaccionar. */
  const esperarEfectos = async () => {
    await servicios.presencia.esperar();
    await servicios.motor.esperarInactivo();
  };

  return {
    app,
    bd,
    driver,
    reloj,
    servicios,
    esperarEfectos,
    avanzar: (ms: number) => reloj.avanzar(ms, esperarEfectos),
    async cerrar() {
      await app.close();
      await driver.detener();
      await bd.$disconnect();
      rmSync(carpeta, { recursive: true, force: true, maxRetries: 3 });
    },
  };
}

export type AppDePrueba<D extends DriverHardware = DriverEnMemoria> = Awaited<
  ReturnType<typeof crearAppDePrueba<D>>
>;

let contador = 0;
/** idSolicitud único y válido para cada orden de prueba. */
export const nuevoId = () => `prueba-${Date.now()}-${++contador}`;
