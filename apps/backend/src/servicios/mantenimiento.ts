import type { BaseDatos } from '../db/cliente';
import type { Reloj } from '../dominio/reloj';

const UN_DIA_MS = 24 * 60 * 60 * 1000;

export interface ResultadoMantenimiento {
  solicitudes: number;
  tokens: number;
  sesiones: number;
}

/**
 * Tareas diarias. Con borrado lógico NADA se borra: solo se marca lo que ya no sirve.
 * - Órdenes de más de 24 h: vencidas (ya no protegen contra duplicados).
 * - Enlaces de recuperación sin usar y vencidos: "vencido".
 * - Sesiones abiertas pero vencidas: inactivas.
 * Los eventos del historial se guardan para siempre.
 */
export class ServicioMantenimiento {
  private cancelar: (() => void) | null = null;

  constructor(
    private readonly bd: BaseDatos,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(): Promise<ResultadoMantenimiento> {
    const ahora = this.reloj.ahora();
    const [solicitudes, tokens, sesiones] = await Promise.all([
      this.bd.solicitudProcesada.updateMany({
        where: { vencidaEn: null, fecha: { lt: new Date(ahora.getTime() - UN_DIA_MS) } },
        data: { vencidaEn: ahora },
      }),
      this.bd.tokenRecuperacion.updateMany({
        where: { estado: 'pendiente', expiraEn: { lte: ahora } },
        data: { estado: 'vencido' },
      }),
      this.bd.sesion.updateMany({
        where: { activa: true, expiraEn: { lte: ahora } },
        data: { activa: false, cerradaEn: ahora },
      }),
    ]);
    return { solicitudes: solicitudes.count, tokens: tokens.count, sesiones: sesiones.count };
  }

  /** Ejecuta ahora y luego una vez al día. Un error no detiene el servidor. */
  async iniciar(): Promise<void> {
    await this.ejecutar().catch(() => undefined);
    this.programar();
  }

  detener(): void {
    this.cancelar?.();
    this.cancelar = null;
  }

  private programar(): void {
    this.cancelar = this.reloj.programar(UN_DIA_MS, () => {
      void this.ejecutar()
        .catch(() => undefined)
        .finally(() => {
          if (this.cancelar) this.programar();
        });
    });
  }
}
