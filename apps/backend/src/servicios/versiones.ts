import type { BaseDatos } from '../db/cliente';

/**
 * Guarda la versión anterior de un dato antes de reemplazarlo (regla del equipo:
 * nada se sobrescribe sin dejar copia, con fecha y autor).
 */
export class ServicioVersiones {
  constructor(private readonly bd: BaseDatos) {}

  async guardar(
    entidad: string,
    entidadId: string,
    datosAnteriores: Record<string, unknown>,
    autorId: string | null,
  ): Promise<void> {
    await this.bd.versionRegistro.create({
      data: {
        entidad,
        entidadId,
        datos: JSON.stringify(datosAnteriores),
        reemplazadoPorId: autorId,
      },
    });
  }

  async listar(entidad: string, entidadId: string) {
    const versiones = await this.bd.versionRegistro.findMany({
      where: { entidad, entidadId },
      orderBy: { id: 'desc' },
    });
    return versiones.map((v) => ({
      id: v.id,
      reemplazadoEn: v.reemplazadoEn.toISOString(),
      reemplazadoPorId: v.reemplazadoPorId,
      datos: JSON.parse(v.datos) as Record<string, unknown>,
    }));
  }
}
