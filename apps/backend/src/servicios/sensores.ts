import type { SensorDto, TipoSensor } from '@lumiclass/compartido';
import { TIPOS_SENSOR } from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';
import { noEncontrado } from '../dominio/errores';
import { normalizarConexion } from '../dominio/maquinaLuz';
import type { Sensor } from '../generated/prisma/client';

const normalizarTipo = (valor: string): TipoSensor =>
  (TIPOS_SENSOR as readonly string[]).includes(valor) ? (valor as TipoSensor) : 'otro';

export function aSensorDto(sensor: Sensor): SensorDto {
  const conteo = sensor.conteoPersonas;
  return {
    id: sensor.id,
    zonaId: sensor.zonaId,
    nombre: sensor.nombre,
    tipo: normalizarTipo(sensor.tipo),
    conexion: normalizarConexion(sensor.conexion),
    presencia: sensor.presencia,
    conteoPersonas: conteo !== null && conteo >= 0 ? conteo : null,
    ultimaLectura: sensor.ultimaLectura?.toISOString() ?? null,
    actualizadoEn: sensor.actualizadoEn.toISOString(),
  };
}

/**
 * Ocupación a partir de los sensores ACTIVOS:
 * alguno detecta presencia → true; todos sin presencia → false; ninguno activo → null (desconocido).
 */
export function calcularOcupacion(sensores: SensorDto[]): boolean | null {
  const activos = sensores.filter((s) => s.conexion === 'activo');
  if (activos.length === 0) return null;
  return activos.some((s) => s.presencia);
}

/** Suma de personas solo si algún sensor activo las cuenta; si no, null. */
export function calcularPersonas(sensores: SensorDto[]): number | null {
  const conConteo = sensores.filter((s) => s.conexion === 'activo' && s.conteoPersonas !== null);
  if (conConteo.length === 0) return null;
  return conConteo.reduce((total, s) => total + (s.conteoPersonas ?? 0), 0);
}

export class ServicioSensores {
  constructor(private readonly bd: BaseDatos) {}

  async listar(): Promise<SensorDto[]> {
    const sensores = await this.bd.sensor.findMany({
      orderBy: [{ zona: { orden: 'asc' } }, { nombre: 'asc' }],
    });
    return sensores.map(aSensorDto);
  }

  async obtener(id: string): Promise<SensorDto> {
    const sensor = await this.bd.sensor.findUnique({ where: { id } });
    if (!sensor) throw noEncontrado('un sensor', id);
    return aSensorDto(sensor);
  }
}
