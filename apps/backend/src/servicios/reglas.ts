import {
  esquemaAccionRegla,
  esquemaCondicion,
  type ReglaDto,
  type ReglaEntrada,
} from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';
import { conflicto, datosInvalidos, ErrorDominio, noEncontrado } from '../dominio/errores';
import { Prisma, type Regla } from '../generated/prisma/client';
import type { ServicioEventos } from './eventos';

function leerJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

/** Convierte la fila guardada en ReglaDto. Si el JSON guardado es inválido, es un estado imposible. */
export function aReglaDto(regla: Regla): ReglaDto {
  const condicion = esquemaCondicion.safeParse(leerJson(regla.condicion));
  const accion = esquemaAccionRegla.safeParse(leerJson(regla.accion));
  if (!condicion.success || !accion.success) {
    throw new ErrorDominio(
      500,
      'REGLA_CORRUPTA',
      `La regla "${regla.nombre}" tiene datos inválidos en la base`,
    );
  }
  return {
    id: regla.id,
    nombre: regla.nombre,
    activa: regla.activa,
    prioridad: regla.prioridad,
    zonaId: regla.zonaId,
    condicion: condicion.data,
    accion: accion.data,
    creadoEn: regla.creadoEn.toISOString(),
    actualizadoEn: regla.actualizadoEn.toISOString(),
  };
}

const esNombreDuplicado = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export class ServicioReglas {
  constructor(
    private readonly bd: BaseDatos,
    private readonly eventos: ServicioEventos,
  ) {}

  async listar(): Promise<ReglaDto[]> {
    const reglas = await this.bd.regla.findMany({
      orderBy: [{ prioridad: 'asc' }, { nombre: 'asc' }],
    });
    return reglas.map(aReglaDto);
  }

  async obtener(id: string): Promise<ReglaDto> {
    const regla = await this.bd.regla.findUnique({ where: { id } });
    if (!regla) throw noEncontrado('una regla', id);
    return aReglaDto(regla);
  }

  async crear(entrada: ReglaEntrada): Promise<ReglaDto> {
    await this.verificarZona(entrada.zonaId);
    try {
      const regla = await this.bd.regla.create({ data: this.aDatos(entrada) });
      await this.registrar(regla, 'creada');
      return aReglaDto(regla);
    } catch (error) {
      if (esNombreDuplicado(error)) throw this.errorDuplicada(entrada.nombre);
      throw error;
    }
  }

  async actualizar(id: string, entrada: ReglaEntrada): Promise<ReglaDto> {
    await this.obtener(id);
    await this.verificarZona(entrada.zonaId);
    try {
      const regla = await this.bd.regla.update({ where: { id }, data: this.aDatos(entrada) });
      await this.registrar(regla, 'actualizada');
      return aReglaDto(regla);
    } catch (error) {
      if (esNombreDuplicado(error)) throw this.errorDuplicada(entrada.nombre);
      throw error;
    }
  }

  async eliminar(id: string): Promise<void> {
    const regla = await this.bd.regla.findUnique({ where: { id } });
    if (!regla) throw noEncontrado('una regla', id);
    await this.bd.regla.delete({ where: { id } });
    await this.registrar(regla, 'eliminada');
  }

  private aDatos(entrada: ReglaEntrada) {
    return {
      nombre: entrada.nombre,
      activa: entrada.activa,
      prioridad: entrada.prioridad,
      zonaId: entrada.zonaId,
      condicion: JSON.stringify(entrada.condicion),
      accion: JSON.stringify(entrada.accion),
    };
  }

  private async verificarZona(zonaId: string | null): Promise<void> {
    if (zonaId === null) return;
    const zona = await this.bd.zona.findUnique({ where: { id: zonaId } });
    if (!zona) throw datosInvalidos(`La zona "${zonaId}" no existe`);
  }

  private errorDuplicada(nombre: string) {
    return conflicto('REGLA_DUPLICADA', `Ya existe una regla llamada "${nombre}"`);
  }

  private async registrar(regla: Regla, accion: 'creada' | 'actualizada' | 'eliminada') {
    await this.eventos.registrar({
      tipo: 'regla_cambiada',
      origen: 'usuario',
      entidad: 'regla',
      entidadId: regla.id,
      mensaje: `Regla "${regla.nombre}" ${accion}`,
      datos: { accion },
    });
  }
}
