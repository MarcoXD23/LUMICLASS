import type { EstadisticasDto, FiltroEstadisticas, OrigenEvento } from '@lumiclass/compartido';
import { ORIGENES_EVENTO } from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';
import type { Reloj } from '../dominio/reloj';

const UN_DIA_MS = 24 * 60 * 60 * 1000;

export interface Cambio {
  fecha: Date;
  activo: boolean;
}

/**
 * Segundos en que algo estuvo "activo" (luz encendida, zona ocupada) dentro de [desde, hasta].
 * `cambios` debe venir ordenado por fecha e incluir los anteriores a `desde`
 * (el último anterior define el estado al inicio del rango).
 */
export function segundosActivo(cambios: Cambio[], desde: Date, hasta: Date): number {
  let activo = false;
  let inicioTramo = desde.getTime();
  let total = 0;
  for (const cambio of cambios) {
    const t = cambio.fecha.getTime();
    if (t <= desde.getTime()) {
      activo = cambio.activo;
      continue;
    }
    if (t > hasta.getTime()) break;
    if (activo && !cambio.activo) total += t - inicioTramo;
    if (!activo && cambio.activo) inicioTramo = t;
    activo = cambio.activo;
  }
  if (activo) total += hasta.getTime() - inicioTramo;
  return Math.round(total / 1000);
}

const accionesVacias = (): EstadisticasDto['accionesPorOrigen'] =>
  Object.fromEntries(ORIGENES_EVENTO.map((o) => [o, { encendidos: 0, apagados: 0 }])) as Record<
    OrigenEvento,
    { encendidos: number; apagados: number }
  >;

/** Estadísticas calculadas solo a partir del historial de eventos (no se inventan datos). */
export class ServicioEstadisticas {
  constructor(
    private readonly bd: BaseDatos,
    private readonly reloj: Reloj,
  ) {}

  async calcular(filtro: FiltroEstadisticas): Promise<EstadisticasDto> {
    const ahora = this.reloj.ahora();
    const hastaPedido = filtro.hasta ? new Date(filtro.hasta) : ahora;
    // No se cuenta tiempo futuro.
    const hasta = hastaPedido > ahora ? ahora : hastaPedido;
    const desde = filtro.desde ? new Date(filtro.desde) : new Date(hasta.getTime() - UN_DIA_MS);
    const inicio = desde > hasta ? hasta : desde;

    const [luces, zonas, cambios, enRango] = await Promise.all([
      this.bd.luz.findMany({
        where: { inactivoDesde: null },
        orderBy: [{ zona: { orden: 'asc' } }, { nombre: 'asc' }],
      }),
      this.bd.zona.findMany({ where: { inactivoDesde: null }, orderBy: { orden: 'asc' } }),
      // Cambios de luz y presencia hasta el final del rango (los anteriores dan el estado inicial).
      this.bd.evento.findMany({
        where: {
          tipo: { in: ['luz_encendida', 'luz_apagada', 'presencia_detectada', 'salon_vacio'] },
          fecha: { lte: hasta },
          entidadId: { not: null },
        },
        orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
        select: { tipo: true, fecha: true, entidadId: true, origen: true },
      }),
      this.bd.evento.groupBy({
        by: ['tipo'],
        where: { fecha: { gte: inicio, lte: hasta } },
        _count: { _all: true },
      }),
    ]);

    const porEntidad = new Map<string, typeof cambios>();
    for (const cambio of cambios) {
      const id = cambio.entidadId as string;
      porEntidad.set(id, [...(porEntidad.get(id) ?? []), cambio]);
    }
    const aCambios = (lista: typeof cambios, tipoActivo: string): Cambio[] =>
      lista.map((c) => ({ fecha: c.fecha, activo: c.tipo === tipoActivo }));
    const dentro = (fecha: Date) => fecha >= inicio && fecha <= hasta;

    const accionesPorOrigen = accionesVacias();
    for (const cambio of cambios) {
      if (!dentro(cambio.fecha)) continue;
      const origen = accionesPorOrigen[cambio.origen as OrigenEvento];
      if (!origen) continue;
      if (cambio.tipo === 'luz_encendida') origen.encendidos++;
      if (cambio.tipo === 'luz_apagada') origen.apagados++;
    }

    const contar = (tipo: string) => enRango.find((g) => g.tipo === tipo)?._count._all ?? 0;

    return {
      desde: inicio.toISOString(),
      hasta: hasta.toISOString(),
      luces: luces.map((luz) => {
        const lista = (porEntidad.get(luz.id) ?? []).filter((c) => c.tipo.startsWith('luz_'));
        return {
          luzId: luz.id,
          nombre: luz.nombre,
          zonaId: luz.zonaId,
          segundosEncendida: segundosActivo(aCambios(lista, 'luz_encendida'), inicio, hasta),
          encendidos: lista.filter((c) => c.tipo === 'luz_encendida' && dentro(c.fecha)).length,
          apagados: lista.filter((c) => c.tipo === 'luz_apagada' && dentro(c.fecha)).length,
        };
      }),
      zonas: zonas.map((zona) => {
        const lista = (porEntidad.get(zona.id) ?? []).filter(
          (c) => c.tipo === 'presencia_detectada' || c.tipo === 'salon_vacio',
        );
        return {
          zonaId: zona.id,
          nombre: zona.nombre,
          segundosOcupada: segundosActivo(aCambios(lista, 'presencia_detectada'), inicio, hasta),
        };
      }),
      accionesPorOrigen,
      errores: { actuador: contar('error_actuador'), sensor: contar('error_sensor') },
      totalEventos: enRango.reduce((total, g) => total + g._count._all, 0),
    };
  }
}
