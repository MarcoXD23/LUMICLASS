import type {
  AccionLuz,
  ModoZona,
  OrigenEvento,
  RespuestaComandoZona,
  ResultadoLuzEnZona,
  ZonaDto,
} from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';
import { ErrorDominio, noEncontrado } from '../dominio/errores';
import type { ServicioEventos } from './eventos';
import { aLuzDto, type ServicioLuces } from './luces';
import { aSensorDto, calcularOcupacion } from './sensores';

const incluirContenido = {
  // Solo lo vigente (borrado lógico).
  luces: {
    where: { inactivoDesde: null },
    include: { actuador: true },
    orderBy: { nombre: 'asc' },
  },
  sensores: { where: { inactivoDesde: null }, orderBy: { nombre: 'asc' } },
} as const;

export class ServicioZonas {
  constructor(
    private readonly bd: BaseDatos,
    private readonly luces: ServicioLuces,
    private readonly eventos: ServicioEventos,
  ) {}

  async listar(): Promise<ZonaDto[]> {
    const zonas = await this.bd.zona.findMany({
      where: { inactivoDesde: null },
      include: incluirContenido,
      orderBy: { orden: 'asc' },
    });
    return zonas.map((zona) => {
      const sensores = zona.sensores.map(aSensorDto);
      return {
        id: zona.id,
        nombre: zona.nombre,
        modo: zona.modo === 'manual' ? 'manual' : 'automatico',
        ocupada: calcularOcupacion(sensores),
        luces: zona.luces.map(aLuzDto),
        sensores,
        actualizadoEn: zona.actualizadoEn.toISOString(),
      };
    });
  }

  async obtener(id: string): Promise<ZonaDto> {
    const zona = (await this.listar()).find((z) => z.id === id);
    if (!zona) throw noEncontrado('una zona', id);
    return zona;
  }

  /** Cambia el modo. Si ya estaba en ese modo, no hace nada ni registra evento. */
  async cambiarModo(id: string, modo: ModoZona, origen: OrigenEvento): Promise<ZonaDto> {
    const zona = await this.bd.zona.findUnique({ where: { id } });
    if (!zona) throw noEncontrado('una zona', id);
    if (zona.modo !== modo) {
      await this.bd.zona.update({ where: { id }, data: { modo } });
      await this.eventos.registrar({
        tipo: 'modo_cambiado',
        origen,
        entidad: 'zona',
        entidadId: id,
        mensaje: `Zona "${zona.nombre}" en modo ${modo}`,
        datos: { modo, anterior: zona.modo },
      });
    }
    return this.obtener(id);
  }

  /**
   * Envía la orden a todas las luces de la zona, una por una (cada servo es independiente).
   * Una falla en una luz no detiene a las demás; el resultado informa cada una.
   */
  async comandar(
    id: string,
    accion: AccionLuz,
    origen: OrigenEvento,
  ): Promise<RespuestaComandoZona> {
    const zona = await this.bd.zona.findUnique({
      where: { id },
      include: { luces: { select: { id: true } } },
    });
    if (!zona) throw noEncontrado('una zona', id);
    if (origen === 'usuario') await this.cambiarModo(id, 'manual', origen);

    const resultados: ResultadoLuzEnZona[] = [];
    for (const { id: luzId } of zona.luces) {
      try {
        const { cambio } = await this.luces.comandar(luzId, accion, origen);
        resultados.push({ luzId, ok: true, cambio });
      } catch (error) {
        if (!(error instanceof ErrorDominio)) throw error;
        resultados.push({
          luzId,
          ok: false,
          cambio: false,
          error: { codigo: error.codigo, mensaje: error.message },
        });
      }
    }
    return { zonaId: id, todasOk: resultados.every((r) => r.ok), resultados };
  }
}
