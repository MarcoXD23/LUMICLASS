// Datos iniciales (PROPUESTA): 1 salón, 2 zonas, 1 luz + 1 servo + 1 sensor PIR por zona y 2 reglas.
// Ajustar cuando se confirme la cantidad real de luces, zonas y sensores.
import { pathToFileURL } from 'node:url';
import { leerEntorno } from '../src/config/entorno';
import { crearBaseDatos, type BaseDatos } from '../src/db/cliente';

const ZONAS = [
  { id: 'zona-frente', nombre: 'Frente', orden: 1 },
  { id: 'zona-fondo', nombre: 'Fondo', orden: 2 },
] as const;

const REGLAS = [
  {
    id: 'regla-encender-ocupado',
    nombre: 'Encender al detectar presencia',
    prioridad: 10,
    condicion: { tipo: 'presencia', valor: 'ocupado', duracionSegundos: 0 },
    accion: { tipo: 'encender' },
  },
  {
    id: 'regla-apagar-vacio',
    nombre: 'Apagar cuando el salón queda vacío',
    prioridad: 20,
    condicion: { tipo: 'presencia', valor: 'vacio', duracionSegundos: 300 },
    accion: { tipo: 'apagar' },
  },
] as const;

/** Carga los datos solo si la base está vacía; ejecutarlo varias veces no duplica nada. */
export async function sembrar(bd: BaseDatos): Promise<boolean> {
  if ((await bd.salon.count()) > 0) return false;

  await bd.$transaction(async (tx) => {
    await tx.salon.create({ data: { id: 'salon-principal', nombre: 'Salón principal' } });
    for (const zona of ZONAS) {
      const sufijo = zona.id.replace('zona-', '');
      await tx.zona.create({ data: { ...zona, salonId: 'salon-principal', modo: 'automatico' } });
      await tx.actuador.create({
        data: { id: `servo-${sufijo}`, nombre: `Servo ${zona.nombre.toLowerCase()}` },
      });
      await tx.luz.create({
        data: {
          id: `luz-${sufijo}`,
          zonaId: zona.id,
          nombre: `Luces ${zona.nombre.toLowerCase()}`,
          estadoDeseado: 'off',
          estadoReal: 'off',
          actuadorId: `servo-${sufijo}`,
        },
      });
      await tx.sensor.create({
        data: {
          id: `sensor-${sufijo}`,
          zonaId: zona.id,
          nombre: `PIR ${zona.nombre.toLowerCase()}`,
          tipo: 'pir',
        },
      });
    }
    for (const regla of REGLAS) {
      await tx.regla.create({
        data: {
          ...regla,
          condicion: JSON.stringify(regla.condicion),
          accion: JSON.stringify(regla.accion),
        },
      });
    }
    await tx.evento.create({
      data: { tipo: 'sistema', origen: 'sistema', mensaje: 'Datos iniciales cargados' },
    });
  });
  return true;
}

async function principal(): Promise<void> {
  try {
    process.loadEnvFile('.env');
  } catch {
    // Sin .env se usa la base por defecto.
  }
  const bd = crearBaseDatos(leerEntorno().DATABASE_URL);
  try {
    const creado = await sembrar(bd);
    console.log(creado ? 'Datos iniciales cargados.' : 'La base ya tenía datos; no se modificó.');
  } finally {
    await bd.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
