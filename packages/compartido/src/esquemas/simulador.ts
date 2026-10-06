import { z } from 'zod';
import { esquemaConexion, type Conexion } from './entidades';

export const RESPUESTAS_SERVO = ['ok', 'falla', 'lento', 'sin_respuesta'] as const;
export const esquemaRespuestaServo = z.enum(RESPUESTAS_SERVO);
export type RespuestaServo = z.infer<typeof esquemaRespuestaServo>;

/** Forzar presencia en una zona (o en todo el salón si no se indica zonaId). */
export const esquemaSimPresencia = z.strictObject({
  zonaId: z.string().min(1).nullable().optional(),
  presencia: z.boolean(),
  /** Solo para probar sensores que cuentan personas. */
  conteoPersonas: z.number().int().min(0).max(500).nullable().optional(),
});
export type SimPresencia = z.infer<typeof esquemaSimPresencia>;

export const esquemaSimConexionSensor = z.strictObject({
  conexion: esquemaConexion,
});

export const esquemaSimRespuestaServo = z.strictObject({
  respuesta: esquemaRespuestaServo,
});

/** Simula que alguien usó el interruptor a mano. */
export const esquemaSimLuz = z.strictObject({
  estado: z.enum(['on', 'off']),
});

export interface EstadoSimuladorDto {
  sensores: { id: string; presencia: boolean; conexion: Conexion; conteoPersonas: number | null }[];
  actuadores: { id: string; respuesta: RespuestaServo; estadoFisico: 'on' | 'off' }[];
  demoraLentoMs: number;
}
