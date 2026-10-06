import type {
  EventoDto,
  FiltroEventos,
  OrigenEvento,
  PaginaEventos,
  SeveridadEvento,
  TipoEvento,
} from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';
import type { Evento } from '../generated/prisma/client';
import type { Difusor } from './difusor';

export interface NuevoEvento {
  tipo: TipoEvento;
  origen: OrigenEvento;
  mensaje: string;
  severidad?: SeveridadEvento;
  entidad?: string;
  entidadId?: string;
  datos?: Record<string, unknown>;
}

function leerDatos(texto: string): Record<string, unknown> {
  try {
    const valor: unknown = JSON.parse(texto);
    return valor && typeof valor === 'object' && !Array.isArray(valor)
      ? (valor as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function aEventoDto(evento: Evento): EventoDto {
  return {
    id: evento.id,
    fecha: evento.fecha.toISOString(),
    tipo: evento.tipo as TipoEvento,
    origen: evento.origen as OrigenEvento,
    severidad: evento.severidad as SeveridadEvento,
    entidad: evento.entidad,
    entidadId: evento.entidadId,
    mensaje: evento.mensaje,
    datos: leerDatos(evento.datos),
  };
}

/** Registro único del historial: todo cambio relevante pasa por aquí. */
export class ServicioEventos {
  constructor(
    private readonly bd: BaseDatos,
    /** Si existe, cada evento nuevo se publica (lo usa el tiempo real). */
    private readonly difusor?: Difusor<EventoDto>,
  ) {}

  async registrar(evento: NuevoEvento): Promise<EventoDto> {
    const creado = await this.bd.evento.create({
      data: {
        tipo: evento.tipo,
        origen: evento.origen,
        mensaje: evento.mensaje,
        severidad: evento.severidad ?? 'info',
        entidad: evento.entidad ?? null,
        entidadId: evento.entidadId ?? null,
        datos: JSON.stringify(evento.datos ?? {}),
      },
    });
    const dto = aEventoDto(creado);
    this.difusor?.publicar(dto);
    return dto;
  }

  async listar(filtro: FiltroEventos): Promise<PaginaEventos> {
    const where = {
      ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
      ...(filtro.origen ? { origen: filtro.origen } : {}),
      ...(filtro.desde || filtro.hasta
        ? {
            fecha: {
              ...(filtro.desde ? { gte: new Date(filtro.desde) } : {}),
              ...(filtro.hasta ? { lte: new Date(filtro.hasta) } : {}),
            },
          }
        : {}),
    };
    const [total, eventos] = await Promise.all([
      this.bd.evento.count({ where }),
      this.bd.evento.findMany({
        where,
        orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
        skip: (filtro.pagina - 1) * filtro.porPagina,
        take: filtro.porPagina,
      }),
    ]);
    return {
      datos: eventos.map(aEventoDto),
      pagina: filtro.pagina,
      porPagina: filtro.porPagina,
      total,
    };
  }
}
