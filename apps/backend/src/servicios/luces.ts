import type { AccionLuz, LuzDto, OrigenEvento, RespuestaComandoLuz } from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';
import type { DriverHardware, ResultadoAccion } from '../drivers/driver';
import { conflicto, hardwareNoDisponible, noEncontrado } from '../dominio/errores';
import { decidirComando, normalizarConexion, normalizarEstadoLuz } from '../dominio/maquinaLuz';
import type { Actuador, Luz } from '../generated/prisma/client';
import type { ServicioEventos } from './eventos';

export function aLuzDto(luz: Luz & { actuador: Actuador }): LuzDto {
  return {
    id: luz.id,
    zonaId: luz.zonaId,
    nombre: luz.nombre,
    estadoDeseado: luz.estadoDeseado === 'on' ? 'on' : 'off',
    estadoReal: normalizarEstadoLuz(luz.estadoReal),
    actuador: {
      id: luz.actuador.id,
      nombre: luz.actuador.nombre,
      conexion: normalizarConexion(luz.actuador.conexion),
      ocupado: luz.actuador.ocupado,
      ultimoResultado: luz.actuador.ultimoResultado,
      actualizadoEn: luz.actuador.actualizadoEn.toISOString(),
    },
    actualizadoEn: luz.actualizadoEn.toISOString(),
  };
}

const incluirActuador = { actuador: true } as const;

export class ServicioLuces {
  constructor(
    private readonly bd: BaseDatos,
    private readonly driver: DriverHardware,
    private readonly eventos: ServicioEventos,
    private readonly tiempoMaxActuadorMs: number,
  ) {}

  async listar(): Promise<LuzDto[]> {
    const luces = await this.bd.luz.findMany({
      where: { inactivoDesde: null },
      include: incluirActuador,
      orderBy: [{ zona: { orden: 'asc' } }, { nombre: 'asc' }],
    });
    return luces.map(aLuzDto);
  }

  async obtener(id: string): Promise<LuzDto> {
    const luz = await this.bd.luz.findUnique({ where: { id }, include: incluirActuador });
    if (!luz) throw noEncontrado('una luz', id);
    return aLuzDto(luz);
  }

  /**
   * Ejecuta una orden sobre una luz. Si la da un usuario y la zona está en automático,
   * la zona pasa a manual (para que una regla no deshaga la orden).
   * `contexto` se agrega a los datos del evento (p. ej. qué regla dio la orden).
   */
  async comandar(
    luzId: string,
    accion: AccionLuz,
    origen: OrigenEvento,
    contexto: Record<string, unknown> = {},
  ): Promise<RespuestaComandoLuz> {
    const luz = await this.bd.luz.findUnique({
      where: { id: luzId },
      include: { actuador: true, zona: true },
    });
    if (!luz) throw noEncontrado('una luz', luzId);

    const decision = decidirComando(
      {
        estadoReal: normalizarEstadoLuz(luz.estadoReal),
        actuador: {
          conexion: normalizarConexion(luz.actuador.conexion),
          ocupado: luz.actuador.ocupado,
        },
      },
      accion,
    );

    if (origen === 'usuario' && luz.zona.modo === 'automatico') {
      await this.bd.zona.update({ where: { id: luz.zonaId }, data: { modo: 'manual' } });
      await this.eventos.registrar({
        tipo: 'modo_cambiado',
        origen,
        entidad: 'zona',
        entidadId: luz.zonaId,
        mensaje: `Zona "${luz.zona.nombre}" pasó a manual por una orden del usuario`,
        datos: { modo: 'manual', anterior: 'automatico' },
      });
    }

    if (decision.tipo === 'sin_cambio') {
      const actualizada = await this.bd.luz.update({
        where: { id: luzId },
        data: { estadoDeseado: decision.objetivo },
        include: incluirActuador,
      });
      return { luz: aLuzDto(actualizada), cambio: false };
    }

    await this.reservarActuador(luz.actuadorId);
    try {
      await this.bd.luz.update({
        where: { id: luzId },
        data: { estadoDeseado: decision.objetivo },
      });
      const resultado = await this.accionarConLimite(luz.actuadorId, accion);

      if (!resultado.ok) {
        await this.bd.luz.update({ where: { id: luzId }, data: { estadoReal: 'desconocido' } });
        await this.bd.actuador.update({
          where: { id: luz.actuadorId },
          data: { ultimoResultado: `falla: ${resultado.error}` },
        });
        await this.eventos.registrar({
          tipo: 'error_actuador',
          origen,
          severidad: 'error',
          entidad: 'luz',
          entidadId: luzId,
          mensaje: `No se pudo ${accion} "${luz.nombre}": ${resultado.error}`,
          datos: { ...contexto, accion, actuadorId: luz.actuadorId },
        });
        throw hardwareNoDisponible(
          'ACTUADOR_SIN_RESPUESTA',
          `El servo no confirmó la orden: ${resultado.error}`,
        );
      }

      await this.bd.luz.update({
        where: { id: luzId },
        data: { estadoReal: resultado.estadoReal },
      });
      await this.bd.actuador.update({
        where: { id: luz.actuadorId },
        data: { ultimoResultado: 'ok' },
      });
      await this.eventos.registrar({
        tipo: resultado.estadoReal === 'on' ? 'luz_encendida' : 'luz_apagada',
        origen,
        entidad: 'luz',
        entidadId: luzId,
        mensaje: `Luz "${luz.nombre}" ${resultado.estadoReal === 'on' ? 'encendida' : 'apagada'}`,
        datos: { ...contexto, accion, zonaId: luz.zonaId },
      });
    } finally {
      await this.bd.actuador
        .update({ where: { id: luz.actuadorId }, data: { ocupado: false } })
        .catch(() => undefined);
    }

    return { luz: await this.obtener(luzId), cambio: true };
  }

  /** Al arrancar, ningún servo puede estar ejecutando una orden (quedaría bloqueado tras un cierre brusco). */
  async liberarActuadoresBloqueados(): Promise<number> {
    const { count } = await this.bd.actuador.updateMany({
      where: { ocupado: true },
      data: { ocupado: false },
    });
    return count;
  }

  /** Marca el servo como ocupado de forma atómica; si ya lo estaba, responde 409. */
  private async reservarActuador(actuadorId: string): Promise<void> {
    const { count } = await this.bd.actuador.updateMany({
      where: { id: actuadorId, ocupado: false },
      data: { ocupado: true },
    });
    if (count === 0) {
      throw conflicto('ACTUADOR_OCUPADO', 'El servo está ejecutando otra orden; intenta de nuevo');
    }
  }

  /** Llama al driver sin dejar que un error o una demora tumben la API. */
  private async accionarConLimite(actuadorId: string, accion: AccionLuz): Promise<ResultadoAccion> {
    let temporizador: NodeJS.Timeout | undefined;
    const limite = new Promise<ResultadoAccion>((resolver) => {
      temporizador = setTimeout(
        () => resolver({ ok: false, error: `sin respuesta en ${this.tiempoMaxActuadorMs} ms` }),
        this.tiempoMaxActuadorMs,
      );
    });
    try {
      return await Promise.race([this.driver.accionar(actuadorId, accion), limite]);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'error desconocido del driver',
      };
    } finally {
      clearTimeout(temporizador);
    }
  }
}
