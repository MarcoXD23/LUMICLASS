import type { BaseDatos } from '../db/cliente';
import type { Reloj } from '../dominio/reloj';
import type { ServicioEventos } from './eventos';

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Limpieza periódica para que la base no crezca sin límite:
 * - eventos más antiguos que `diasRetencion`
 * - registros de órdenes duplicadas (idSolicitud) de más de 24 h
 */
export class ServicioMantenimiento {
  private cancelar: (() => void) | null = null;

  constructor(
    private readonly bd: BaseDatos,
    private readonly eventos: ServicioEventos,
    private readonly reloj: Reloj,
    private readonly diasRetencion: number,
  ) {}

  async limpiar(): Promise<{ eventos: number; solicitudes: number }> {
    const ahora = this.reloj.ahora().getTime();
    const [eventos, solicitudes] = await Promise.all([
      this.bd.evento.deleteMany({
        where: { fecha: { lt: new Date(ahora - this.diasRetencion * UN_DIA_MS) } },
      }),
      this.bd.solicitudProcesada.deleteMany({
        where: { fecha: { lt: new Date(ahora - UN_DIA_MS) } },
      }),
    ]);
    if (eventos.count > 0) {
      await this.eventos.registrar({
        tipo: 'sistema',
        origen: 'sistema',
        mensaje: `Se borraron ${eventos.count} eventos de más de ${this.diasRetencion} días`,
        datos: { eventos: eventos.count, solicitudes: solicitudes.count },
      });
    }
    return { eventos: eventos.count, solicitudes: solicitudes.count };
  }

  /** Limpia ahora y luego una vez al día. Un error no detiene el servidor. */
  async iniciar(): Promise<void> {
    await this.limpiar().catch(() => undefined);
    this.programar();
  }

  detener(): void {
    this.cancelar?.();
    this.cancelar = null;
  }

  private programar(): void {
    this.cancelar = this.reloj.programar(UN_DIA_MS, () => {
      void this.limpiar()
        .catch(() => undefined)
        .finally(() => {
          if (this.cancelar) this.programar();
        });
    });
  }
}
