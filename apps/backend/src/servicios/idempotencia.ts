import type { BaseDatos } from '../db/cliente';
import { conflicto } from '../dominio/errores';

export interface RespuestaGuardada<T> {
  codigo: number;
  cuerpo: T;
}

interface EnCurso {
  ruta: string;
  promesa: Promise<RespuestaGuardada<unknown>>;
}

/**
 * Evita ejecutar dos veces la misma orden (mismo idSolicitud):
 * - Si llega mientras la primera aún se ejecuta, espera y devuelve el mismo resultado.
 * - Si ya terminó con éxito, devuelve la respuesta guardada en la base.
 * Solo se guardan respuestas exitosas: si una orden falla, el cliente puede reintentar.
 */
export class RegistroSolicitudes {
  private readonly enCurso = new Map<string, EnCurso>();

  constructor(private readonly bd: BaseDatos) {}

  async ejecutarUnaVez<T>(
    idSolicitud: string,
    ruta: string,
    ejecutar: () => Promise<RespuestaGuardada<T>>,
  ): Promise<RespuestaGuardada<T> & { repetida: boolean }> {
    const activa = this.enCurso.get(idSolicitud);
    if (activa) {
      this.verificarRuta(activa.ruta, ruta);
      return { ...((await activa.promesa) as RespuestaGuardada<T>), repetida: true };
    }

    const guardada = await this.bd.solicitudProcesada.findUnique({ where: { idSolicitud } });
    if (guardada) {
      this.verificarRuta(guardada.ruta, ruta);
      return {
        codigo: guardada.codigoEstado,
        cuerpo: JSON.parse(guardada.respuesta) as T,
        repetida: true,
      };
    }

    const promesa = ejecutar();
    this.enCurso.set(idSolicitud, { ruta, promesa });
    try {
      const resultado = await promesa;
      if (resultado.codigo < 300) {
        await this.bd.solicitudProcesada
          .create({
            data: {
              idSolicitud,
              ruta,
              codigoEstado: resultado.codigo,
              respuesta: JSON.stringify(resultado.cuerpo),
            },
          })
          .catch(() => undefined); // Si ya existe, otra petición idéntica la guardó primero.
      }
      return { ...resultado, repetida: false };
    } finally {
      this.enCurso.delete(idSolicitud);
    }
  }

  private verificarRuta(rutaOriginal: string, ruta: string): void {
    if (rutaOriginal !== ruta) {
      throw conflicto(
        'ID_SOLICITUD_REUTILIZADO',
        'Ese idSolicitud ya se usó para otra orden; genera uno nuevo',
      );
    }
  }
}
