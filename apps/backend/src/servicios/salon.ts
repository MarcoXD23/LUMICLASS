import type { AlertaDto, EstadoSalonDto, ZonaDto } from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';
import type { DriverHardware } from '../drivers/driver';
import { ErrorDominio } from '../dominio/errores';
import { calcularOcupacion, calcularPersonas } from './sensores';
import type { ServicioZonas } from './zonas';

/** Alertas que se derivan del estado actual (las históricas están en /eventos). */
function construirAlertas(zonas: ZonaDto[], hardware: 'conectado' | 'desconectado'): AlertaDto[] {
  const alertas: AlertaDto[] = [];
  if (hardware === 'desconectado') {
    alertas.push({
      severidad: 'error',
      entidad: 'hardware',
      entidadId: null,
      mensaje: 'Hardware desconectado',
    });
  }
  for (const zona of zonas) {
    for (const sensor of zona.sensores) {
      if (sensor.conexion === 'falla') {
        alertas.push({
          severidad: 'error',
          entidad: 'sensor',
          entidadId: sensor.id,
          mensaje: `Sensor "${sensor.nombre}" en falla`,
        });
      } else if (sensor.conexion === 'inactivo') {
        alertas.push({
          severidad: 'advertencia',
          entidad: 'sensor',
          entidadId: sensor.id,
          mensaje: `Sensor "${sensor.nombre}" desconectado`,
        });
      }
    }
    for (const luz of zona.luces) {
      const { actuador } = luz;
      if (actuador.conexion === 'falla') {
        alertas.push({
          severidad: 'error',
          entidad: 'actuador',
          entidadId: actuador.id,
          mensaje: `Servo "${actuador.nombre}" en falla`,
        });
      } else if (actuador.conexion === 'inactivo') {
        alertas.push({
          severidad: 'advertencia',
          entidad: 'actuador',
          entidadId: actuador.id,
          mensaje: `Servo "${actuador.nombre}" desconectado`,
        });
      }
      if (luz.estadoReal === 'desconocido') {
        alertas.push({
          severidad: 'advertencia',
          entidad: 'luz',
          entidadId: luz.id,
          mensaje: `No se sabe si "${luz.nombre}" está encendida`,
        });
      }
    }
  }
  return alertas;
}

function ultimaFecha(zonas: ZonaDto[]): string {
  const fechas = zonas.flatMap((z) => [
    z.actualizadoEn,
    ...z.sensores.flatMap((s) => [s.actualizadoEn, s.ultimaLectura ?? s.actualizadoEn]),
    ...z.luces.flatMap((l) => [l.actualizadoEn, l.actuador.actualizadoEn]),
  ]);
  return fechas.reduce((max, f) => (f > max ? f : max), new Date(0).toISOString());
}

export class ServicioSalon {
  constructor(
    private readonly bd: BaseDatos,
    private readonly zonas: ServicioZonas,
    private readonly driver: DriverHardware,
  ) {}

  /** Todo lo que necesita el dashboard en una sola respuesta. */
  async estado(): Promise<EstadoSalonDto> {
    const salon = await this.bd.salon.findFirst({ orderBy: { creadoEn: 'asc' } });
    if (!salon) {
      throw new ErrorDominio(
        404,
        'SALON_NO_CONFIGURADO',
        'No hay salón configurado; ejecuta "npm run db:reiniciar"',
      );
    }
    const zonas = await this.zonas.listar();
    const sensores = zonas.flatMap((z) => z.sensores);
    const luces = zonas.flatMap((z) => z.luces);
    const hardware = this.driver.estadoConexion();

    return {
      salon: { id: salon.id, nombre: salon.nombre },
      ocupado: calcularOcupacion(sensores),
      personasDetectadas: calcularPersonas(sensores),
      resumen: {
        lucesEncendidas: luces.filter((l) => l.estadoReal === 'on').length,
        lucesTotales: luces.length,
        sensoresActivos: sensores.filter((s) => s.conexion === 'activo').length,
        sensoresTotales: sensores.length,
      },
      zonas,
      alertas: construirAlertas(zonas, hardware),
      hardware,
      ultimaActualizacion: ultimaFecha(zonas),
    };
  }
}
