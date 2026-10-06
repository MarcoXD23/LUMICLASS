import {
  esquemaAccionRegla,
  esquemaCondicion,
  type ReglaDto,
  type ReglaEntrada,
} from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';
import { conflicto, datosInvalidos, ErrorDominio, noEncontrado } from '../dominio/errores';
import type { Reloj } from '../dominio/reloj';
import type { Regla } from '../generated/prisma/client';
import type { ServicioEventos } from './eventos';
import type { UsuarioSesion } from './usuarios';
import type { ServicioVersiones } from './versiones';

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
    eliminadaEn: regla.inactivoDesde?.toISOString() ?? null,
  };
}

/** Solo las reglas no eliminadas (borrado lógico). */
const vigentes = { inactivoDesde: null };
const ORDEN = [{ prioridad: 'asc' as const }, { nombre: 'asc' as const }];

export class ServicioReglas {
  constructor(
    private readonly bd: BaseDatos,
    private readonly eventos: ServicioEventos,
    private readonly versiones: ServicioVersiones,
    private readonly reloj: Reloj,
  ) {}

  /** Por defecto solo las vigentes; el historial puede pedir también las eliminadas. */
  async listar(incluirEliminadas = false): Promise<ReglaDto[]> {
    const reglas = await this.bd.regla.findMany({
      where: incluirEliminadas ? {} : vigentes,
      orderBy: ORDEN,
    });
    return reglas.map(aReglaDto);
  }

  /** Igual que listar(), pero salta las reglas corruptas en vez de fallar (lo usa el motor). */
  async listarValidas(): Promise<ReglaDto[]> {
    const reglas = await this.bd.regla.findMany({ where: vigentes, orderBy: ORDEN });
    return reglas.flatMap((regla) => {
      try {
        return [aReglaDto(regla)];
      } catch {
        return [];
      }
    });
  }

  async obtener(id: string): Promise<ReglaDto> {
    return aReglaDto(await this.buscarVigente(id));
  }

  async crear(entrada: ReglaEntrada, autor: UsuarioSesion): Promise<ReglaDto> {
    await this.verificarZona(entrada.zonaId);
    await this.verificarNombreLibre(entrada.nombre);
    const regla = await this.bd.regla.create({ data: this.aDatos(entrada) });
    await this.registrar(regla, 'creada', autor);
    return aReglaDto(regla);
  }

  /** Reemplaza la regla guardando antes la versión anterior. */
  async actualizar(id: string, entrada: ReglaEntrada, autor: UsuarioSesion): Promise<ReglaDto> {
    const anterior = await this.buscarVigente(id);
    await this.verificarZona(entrada.zonaId);
    await this.verificarNombreLibre(entrada.nombre, id);
    await this.versiones.guardar('regla', id, { ...anterior }, autor.id);
    const regla = await this.bd.regla.update({ where: { id }, data: this.aDatos(entrada) });
    await this.registrar(regla, 'actualizada', autor);
    return aReglaDto(regla);
  }

  /** "Eliminar" = marcar como inactiva. La regla queda guardada y deja de aplicarse. */
  async eliminar(id: string, autor: UsuarioSesion): Promise<ReglaDto> {
    await this.buscarVigente(id);
    const regla = await this.bd.regla.update({
      where: { id },
      data: { inactivoDesde: this.reloj.ahora(), inactivadoPorId: autor.id },
    });
    await this.registrar(regla, 'eliminada', autor);
    return aReglaDto(regla);
  }

  private async buscarVigente(id: string): Promise<Regla> {
    const regla = await this.bd.regla.findUnique({ where: { id } });
    if (!regla || regla.inactivoDesde) throw noEncontrado('una regla', id);
    return regla;
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
    if (!zona || zona.inactivoDesde) throw datosInvalidos(`La zona "${zonaId}" no existe`);
  }

  /** El nombre debe ser único entre las reglas vigentes (una eliminada no lo bloquea). */
  private async verificarNombreLibre(nombre: string, exceptoId?: string): Promise<void> {
    const otra = await this.bd.regla.findFirst({
      where: { nombre, ...vigentes, ...(exceptoId ? { id: { not: exceptoId } } : {}) },
    });
    if (otra) throw conflicto('REGLA_DUPLICADA', `Ya existe una regla llamada "${nombre}"`);
  }

  private async registrar(
    regla: Regla,
    accion: 'creada' | 'actualizada' | 'eliminada',
    autor: UsuarioSesion,
  ) {
    await this.eventos.registrar({
      tipo: 'regla_cambiada',
      origen: 'usuario',
      entidad: 'regla',
      entidadId: regla.id,
      mensaje: `${autor.nombre}: regla "${regla.nombre}" ${accion}`,
      datos: { accion, autorId: autor.id },
    });
  }
}
