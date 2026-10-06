import type { ReglaDto } from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';
import { ErrorDominio } from '../dominio/errores';
import { dentroDeHorario } from '../dominio/horario';
import type { Reloj } from '../dominio/reloj';
import type { ServicioLuces } from './luces';
import type { ServicioReglas } from './reglas';
import { aSensorDto, calcularOcupacion } from './sensores';

/** Margen para que un temporizador que se dispara unos ms antes no vuelva a esperar. */
const TOLERANCIA_MS = 20;

interface EstadoZona {
  ocupada: boolean | null;
  /** Desde cuándo la zona está en este estado de ocupación. */
  desde: Date;
}

interface Espera {
  reglaId: string;
  cancelar: () => void;
}

/**
 * Aplica las reglas de automatización por zona:
 * - Solo en zonas en modo automático y con ocupación conocida (sensores en falla → no hace nada).
 * - Usa la regla activa de mayor prioridad (número menor) cuya condición y horario se cumplen.
 * - Si la regla pide una duración (p. ej. 300 s vacía), espera; si la ocupación cambia, cancela.
 */
export class MotorReglas {
  private readonly estados = new Map<string, EstadoZona>();
  private readonly esperas = new Map<string, Espera>();
  private readonly colas = new Map<string, Promise<void>>();
  private cancelarRevision: (() => void) | null = null;
  private revisionEnCurso: Promise<void> = Promise.resolve();

  constructor(
    private readonly bd: BaseDatos,
    private readonly luces: ServicioLuces,
    private readonly reglas: ServicioReglas,
    private readonly reloj: Reloj,
    private readonly intervaloRevisionMs: number,
  ) {}

  /** Evalúa todas las zonas y programa una revisión periódica (para reglas con horario). */
  async iniciar(): Promise<void> {
    this.programarRevision();
    await this.evaluarTodas();
  }

  detener(): void {
    this.cancelarRevision?.();
    this.cancelarRevision = null;
    for (const espera of this.esperas.values()) espera.cancelar();
    this.esperas.clear();
  }

  /** Olvida los tiempos acumulados (p. ej. al reiniciar la simulación). */
  reiniciar(): void {
    for (const espera of this.esperas.values()) espera.cancelar();
    this.esperas.clear();
    this.estados.clear();
  }

  async evaluarTodas(): Promise<void> {
    const zonas = await this.bd.zona.findMany({ select: { id: true } });
    await Promise.all(zonas.map((zona) => this.evaluarZona(zona.id)));
  }

  /** Encola la evaluación: una zona se evalúa de a una vez. */
  evaluarZona(zonaId: string): Promise<void> {
    const anterior = this.colas.get(zonaId) ?? Promise.resolve();
    const tarea = anterior.then(() => this.evaluarAhora(zonaId)).catch(() => undefined);
    this.colas.set(zonaId, tarea);
    return tarea;
  }

  /** Espera a que terminen las evaluaciones en curso (útil en pruebas). */
  async esperarInactivo(): Promise<void> {
    await this.revisionEnCurso;
    await Promise.all(this.colas.values());
  }

  /** Para mostrar en la interfaz qué zona tiene una acción programada. */
  esperasActivas(): { zonaId: string; reglaId: string }[] {
    return [...this.esperas].map(([zonaId, espera]) => ({ zonaId, reglaId: espera.reglaId }));
  }

  private async evaluarAhora(zonaId: string): Promise<void> {
    const zona = await this.bd.zona.findUnique({
      where: { id: zonaId },
      include: { sensores: true, luces: { select: { id: true } } },
    });
    if (!zona) {
      this.cancelarEspera(zonaId);
      this.estados.delete(zonaId);
      return;
    }

    const ahora = this.reloj.ahora();
    const ocupada = calcularOcupacion(zona.sensores.map(aSensorDto));
    const previo = this.estados.get(zonaId);
    if (!previo || previo.ocupada !== ocupada) {
      this.estados.set(zonaId, { ocupada, desde: ahora });
      this.cancelarEspera(zonaId);
    }
    const desde = this.estados.get(zonaId)?.desde ?? ahora;

    if (zona.modo !== 'automatico' || ocupada === null) {
      this.cancelarEspera(zonaId);
      return;
    }

    const regla = await this.elegirRegla(zonaId, ocupada ? 'ocupado' : 'vacio', ahora);
    if (!regla) {
      this.cancelarEspera(zonaId);
      return;
    }

    const faltanMs = regla.condicion.duracionSegundos * 1000 - (ahora.getTime() - desde.getTime());
    if (faltanMs > TOLERANCIA_MS) {
      if (this.esperas.get(zonaId)?.reglaId !== regla.id) {
        this.cancelarEspera(zonaId);
        const cancelar = this.reloj.programar(faltanMs, () => {
          this.esperas.delete(zonaId);
          void this.evaluarZona(zonaId);
        });
        this.esperas.set(zonaId, { reglaId: regla.id, cancelar });
      }
      return;
    }

    this.cancelarEspera(zonaId);
    for (const luz of zona.luces) {
      try {
        await this.luces.comandar(luz.id, regla.accion.tipo, 'regla', {
          reglaId: regla.id,
          regla: regla.nombre,
        });
      } catch (error) {
        // Las fallas del servo ya quedan en el historial; una luz no detiene a las demás.
        if (!(error instanceof ErrorDominio)) throw error;
      }
    }
  }

  private async elegirRegla(
    zonaId: string,
    valor: 'ocupado' | 'vacio',
    ahora: Date,
  ): Promise<ReglaDto | undefined> {
    const reglas = await this.reglas.listarValidas();
    return reglas.find(
      (regla) =>
        regla.activa &&
        (regla.zonaId === null || regla.zonaId === zonaId) &&
        regla.condicion.tipo === 'presencia' &&
        regla.condicion.valor === valor &&
        dentroDeHorario(regla.condicion.horario, ahora),
    );
  }

  private cancelarEspera(zonaId: string): void {
    this.esperas.get(zonaId)?.cancelar();
    this.esperas.delete(zonaId);
  }

  private programarRevision(): void {
    this.cancelarRevision = this.reloj.programar(this.intervaloRevisionMs, () => {
      this.revisionEnCurso = this.evaluarTodas()
        .catch(() => undefined)
        .finally(() => {
          if (this.cancelarRevision) this.programarRevision();
        });
    });
  }
}
