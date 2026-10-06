import { z } from 'zod';
import type { OrigenEvento } from './eventos';

const UN_ANIO_MS = 366 * 24 * 60 * 60 * 1000;

/** Rango de GET /estadisticas. Sin fechas: últimas 24 horas. */
export const esquemaFiltroEstadisticas = z
  .strictObject({
    desde: z.iso.datetime({ offset: true }).optional(),
    hasta: z.iso.datetime({ offset: true }).optional(),
  })
  .refine((f) => !f.desde || !f.hasta || new Date(f.desde) < new Date(f.hasta), {
    message: '"desde" debe ser anterior a "hasta"',
    path: ['desde'],
  })
  .refine(
    (f) =>
      !f.desde ||
      !f.hasta ||
      new Date(f.hasta).getTime() - new Date(f.desde).getTime() <= UN_ANIO_MS,
    { message: 'El rango no puede superar un año', path: ['hasta'] },
  );
export type FiltroEstadisticas = z.infer<typeof esquemaFiltroEstadisticas>;

export interface EstadisticasDto {
  desde: string;
  hasta: string;
  /** Tiempo encendida y cantidad de encendidos/apagados de cada luz en el rango. */
  luces: {
    luzId: string;
    nombre: string;
    zonaId: string;
    segundosEncendida: number;
    encendidos: number;
    apagados: number;
  }[];
  /** Tiempo con presencia detectada en cada zona. */
  zonas: { zonaId: string; nombre: string; segundosOcupada: number }[];
  /** Quién encendió y apagó las luces. */
  accionesPorOrigen: Record<OrigenEvento, { encendidos: number; apagados: number }>;
  errores: { actuador: number; sensor: number };
  totalEventos: number;
}
