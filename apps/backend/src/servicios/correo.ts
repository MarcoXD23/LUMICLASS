import type { CorreoSimuladoDto } from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';

export interface Correo {
  para: string;
  asunto: string;
  cuerpo: string;
  enlace?: string;
}

/**
 * Envío de correos. Por ahora solo existe el modo "simulado": el correo se guarda
 * en la base (bandeja de prueba) y se muestra en la consola del servidor.
 * Para correo real (SMTP) hay que confirmarlo con el equipo antes.
 */
export class ServicioCorreo {
  constructor(
    private readonly bd: BaseDatos,
    private readonly registrar: (mensaje: string) => void = (mensaje) => console.log(mensaje),
  ) {}

  async enviar(correo: Correo): Promise<void> {
    await this.bd.correoSimulado.create({
      data: {
        para: correo.para,
        asunto: correo.asunto,
        cuerpo: correo.cuerpo,
        enlace: correo.enlace ?? null,
      },
    });
    this.registrar(
      [
        '──────── CORREO SIMULADO ────────',
        `Para: ${correo.para}`,
        `Asunto: ${correo.asunto}`,
        correo.cuerpo,
        ...(correo.enlace ? [`Enlace: ${correo.enlace}`] : []),
        '────────────────────────────────',
      ].join('\n'),
    );
  }

  async recientes(cantidad = 20): Promise<CorreoSimuladoDto[]> {
    const correos = await this.bd.correoSimulado.findMany({
      orderBy: { id: 'desc' },
      take: cantidad,
    });
    return correos.map((c) => ({ ...c, creadoEn: c.creadoEn.toISOString() }));
  }
}
