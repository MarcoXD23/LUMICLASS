/**
 * Error esperado del sistema. La API lo convierte en { error: { codigo, mensaje } }
 * con el código HTTP indicado.
 */
export class ErrorDominio extends Error {
  constructor(
    readonly estadoHttp: number,
    readonly codigo: string,
    mensaje: string,
    readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = 'ErrorDominio';
  }
}

export const datosInvalidos = (mensaje: string, detalles?: unknown) =>
  new ErrorDominio(400, 'DATOS_INVALIDOS', mensaje, detalles);

export const noEncontrado = (entidad: string, id: string) =>
  new ErrorDominio(404, 'NO_ENCONTRADO', `No existe ${entidad} con id "${id}"`);

export const conflicto = (codigo: string, mensaje: string) =>
  new ErrorDominio(409, codigo, mensaje);

export const hardwareNoDisponible = (codigo: string, mensaje: string) =>
  new ErrorDominio(503, codigo, mensaje);
