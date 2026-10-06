import type { Reloj } from '../dominio/reloj';

/**
 * Cuenta intentos fallidos por clave (p. ej. correo + IP) dentro de una ventana de tiempo.
 * Vive en memoria: al reiniciar el servidor se reinicia (suficiente contra fuerza bruta simple).
 */
export class LimitadorIntentos {
  private readonly fallos = new Map<string, number[]>();

  constructor(
    private readonly reloj: Reloj,
    private readonly maximo: number,
    private readonly ventanaMs: number,
  ) {}

  bloqueado(clave: string): boolean {
    return this.recientes(clave).length >= this.maximo;
  }

  registrarFallo(clave: string): void {
    this.fallos.set(clave, [...this.recientes(clave), this.reloj.ahora().getTime()]);
  }

  limpiar(clave: string): void {
    this.fallos.delete(clave);
  }

  private recientes(clave: string): number[] {
    const desde = this.reloj.ahora().getTime() - this.ventanaMs;
    return (this.fallos.get(clave) ?? []).filter((t) => t > desde);
  }
}
