import { z } from 'zod';
import { esquemaAccionLuz } from './comandos';

const esquemaHora = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora HH:MM (00:00–23:59)');

/** Franja horaria opcional en la que la regla está vigente. */
export const esquemaHorario = z.strictObject({
  desde: esquemaHora,
  hasta: esquemaHora,
});

/** Por ahora la única condición es la presencia; el tipo permite agregar otras sin romper datos. */
export const esquemaCondicion = z.discriminatedUnion('tipo', [
  z.strictObject({
    tipo: z.literal('presencia'),
    valor: z.enum(['ocupado', 'vacio']),
    /** Tiempo que debe mantenerse la condición antes de actuar (evita falsas lecturas del PIR). */
    duracionSegundos: z.number().int().min(0).max(86_400).default(0),
    horario: esquemaHorario.optional(),
  }),
]);
export type CondicionRegla = z.infer<typeof esquemaCondicion>;

export const esquemaAccionRegla = z.strictObject({
  tipo: esquemaAccionLuz,
});
export type AccionRegla = z.infer<typeof esquemaAccionRegla>;

export const esquemaReglaEntrada = z.strictObject({
  nombre: z.string().trim().min(3).max(80),
  activa: z.boolean().default(true),
  prioridad: z.number().int().min(0).max(1000).default(100),
  /** null = aplica a todas las zonas. */
  zonaId: z.string().min(1).nullable().default(null),
  condicion: esquemaCondicion,
  accion: esquemaAccionRegla,
});
export type ReglaEntrada = z.infer<typeof esquemaReglaEntrada>;

export interface ReglaDto extends ReglaEntrada {
  id: string;
  creadoEn: string;
  actualizadoEn: string;
  /** Borrado lógico: fecha en que se eliminó, o null si sigue vigente. */
  eliminadaEn: string | null;
}
