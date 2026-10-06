import { z } from 'zod';

export const TIPOS_EVENTO = [
  'luz_encendida',
  'luz_apagada',
  'presencia_detectada',
  'salon_vacio',
  'modo_cambiado',
  'regla_cambiada',
  'error_actuador',
  'error_sensor',
  'sesion_iniciada',
  'sesion_cerrada',
  'login_fallido',
  'usuario_registrado',
  'usuario_cambiado',
  'contrasena_cambiada',
  'sistema',
] as const;
export const esquemaTipoEvento = z.enum(TIPOS_EVENTO);
export type TipoEvento = z.infer<typeof esquemaTipoEvento>;

export const ORIGENES_EVENTO = ['usuario', 'regla', 'sistema', 'simulador'] as const;
export const esquemaOrigenEvento = z.enum(ORIGENES_EVENTO);
export type OrigenEvento = z.infer<typeof esquemaOrigenEvento>;

export const SEVERIDADES_EVENTO = ['info', 'advertencia', 'error'] as const;
export type SeveridadEvento = (typeof SEVERIDADES_EVENTO)[number];

export interface EventoDto {
  id: number;
  fecha: string;
  tipo: TipoEvento;
  origen: OrigenEvento;
  severidad: SeveridadEvento;
  entidad: string | null;
  entidadId: string | null;
  mensaje: string;
  datos: Record<string, unknown>;
}

/** Filtros de GET /eventos (llegan como texto en la URL). */
export const esquemaFiltroEventos = z
  .strictObject({
    tipo: esquemaTipoEvento.optional(),
    origen: esquemaOrigenEvento.optional(),
    desde: z.iso.datetime({ offset: true }).optional(),
    hasta: z.iso.datetime({ offset: true }).optional(),
    pagina: z.coerce.number().int().min(1).max(100_000).default(1),
    porPagina: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((f) => !f.desde || !f.hasta || new Date(f.desde) <= new Date(f.hasta), {
    message: '"desde" debe ser anterior o igual a "hasta"',
    path: ['desde'],
  });
export type FiltroEventos = z.infer<typeof esquemaFiltroEventos>;

export interface PaginaEventos {
  datos: EventoDto[];
  pagina: number;
  porPagina: number;
  total: number;
}
