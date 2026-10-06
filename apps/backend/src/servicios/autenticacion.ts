import type { DatosLogin, DatosRegistro, UsuarioDto } from '@lumiclass/compartido';
import type { BaseDatos } from '../db/cliente';
import { hashearContrasena, verificarContrasena } from '../dominio/contrasenas';
import { conflicto, datosInvalidos, ErrorDominio } from '../dominio/errores';
import type { Reloj } from '../dominio/reloj';
import { generarToken, hashDeToken } from '../dominio/tokens';
import type { ServicioCorreo } from './correo';
import type { ServicioEventos } from './eventos';
import { LimitadorIntentos } from './limitadorIntentos';
import { aUsuarioDto, normalizarRol, type UsuarioSesion } from './usuarios';

const MINUTO_MS = 60 * 1000;
const VIGENCIA_RECUPERACION_MS = 30 * MINUTO_MS;
const MAX_INTENTOS_LOGIN = 5;
const VENTANA_INTENTOS_MS = 15 * MINUTO_MS;

export interface ResultadoAcceso {
  usuario: UsuarioDto;
  /** Token para la cookie de sesión (en la base solo queda su hash). */
  token: string;
}

/** Registro, inicio y cierre de sesión, y recuperación de contraseña. */
export class ServicioAutenticacion {
  private readonly limitador: LimitadorIntentos;
  /** Hash de referencia para que un correo inexistente tarde lo mismo que uno real. */
  private hashFicticio: Promise<string> | null = null;

  constructor(
    private readonly bd: BaseDatos,
    private readonly eventos: ServicioEventos,
    private readonly correo: ServicioCorreo,
    private readonly reloj: Reloj,
    private readonly duracionSesionMs: number,
  ) {
    this.limitador = new LimitadorIntentos(reloj, MAX_INTENTOS_LOGIN, VENTANA_INTENTOS_MS);
  }

  get duracionSesionSegundos(): number {
    return Math.floor(this.duracionSesionMs / 1000);
  }

  /** Registro abierto: la cuenta nueva siempre tiene rol "usuario". */
  async registrar(datos: DatosRegistro, ip: string): Promise<ResultadoAcceso> {
    const existente = await this.bd.usuario.findUnique({ where: { correo: datos.correo } });
    if (existente) {
      throw conflicto('CORREO_REGISTRADO', 'Ya existe una cuenta con ese correo. Inicia sesión.');
    }
    const usuario = await this.bd.usuario.create({
      data: {
        nombre: datos.nombre,
        correo: datos.correo,
        hashContrasena: await hashearContrasena(datos.contrasena),
        rol: 'usuario',
      },
    });
    await this.eventos.registrar({
      tipo: 'usuario_registrado',
      origen: 'usuario',
      entidad: 'usuario',
      entidadId: usuario.id,
      mensaje: `${usuario.nombre} creó su cuenta`,
    });
    return { usuario: aUsuarioDto(usuario), token: await this.crearSesion(usuario.id, ip) };
  }

  async iniciarSesion(datos: DatosLogin, ip: string): Promise<ResultadoAcceso> {
    const clave = `${datos.correo}|${ip}`;
    if (this.limitador.bloqueado(clave)) {
      throw new ErrorDominio(
        429,
        'DEMASIADOS_INTENTOS',
        'Demasiados intentos fallidos. Espera 15 minutos o recupera tu contraseña.',
      );
    }

    const usuario = await this.bd.usuario.findUnique({ where: { correo: datos.correo } });
    const valida = usuario
      ? await verificarContrasena(datos.contrasena, usuario.hashContrasena)
      : await verificarContrasena(datos.contrasena, await this.obtenerHashFicticio()).then(
          () => false,
        );

    if (!usuario || !valida) {
      this.limitador.registrarFallo(clave);
      await this.eventos.registrar({
        tipo: 'login_fallido',
        origen: 'sistema',
        severidad: 'advertencia',
        entidad: 'usuario',
        entidadId: usuario?.id,
        mensaje: `Intento de inicio de sesión fallido (${datos.correo})`,
        datos: { ip },
      });
      throw new ErrorDominio(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos');
    }
    if (usuario.inactivoDesde) {
      throw new ErrorDominio(
        403,
        'CUENTA_DESACTIVADA',
        'Tu cuenta está desactivada. Habla con el administrador.',
      );
    }

    this.limitador.limpiar(clave);
    await this.eventos.registrar({
      tipo: 'sesion_iniciada',
      origen: 'usuario',
      entidad: 'usuario',
      entidadId: usuario.id,
      mensaje: `${usuario.nombre} inició sesión`,
      datos: { ip },
    });
    return { usuario: aUsuarioDto(usuario), token: await this.crearSesion(usuario.id, ip) };
  }

  /** Usuario de un token de sesión, o null si no existe, se cerró, venció o la cuenta está inactiva. */
  async usuarioDeToken(token: string): Promise<UsuarioSesion | null> {
    const sesion = await this.bd.sesion.findUnique({
      where: { tokenHash: hashDeToken(token) },
      include: { usuario: true },
    });
    if (!sesion?.activa) return null;
    const ahora = this.reloj.ahora();
    if (sesion.expiraEn <= ahora) {
      // Vencida: se marca inactiva (no se borra).
      await this.bd.sesion.update({
        where: { id: sesion.id },
        data: { activa: false, cerradaEn: ahora },
      });
      return null;
    }
    if (sesion.usuario.inactivoDesde) return null;
    const { id, nombre, correo, rol } = sesion.usuario;
    return { id, nombre, correo, rol: normalizarRol(rol) };
  }

  async cerrarSesion(token: string): Promise<void> {
    const sesion = await this.bd.sesion.findUnique({
      where: { tokenHash: hashDeToken(token) },
      include: { usuario: true },
    });
    if (!sesion?.activa) return;
    await this.bd.sesion.update({
      where: { id: sesion.id },
      data: { activa: false, cerradaEn: this.reloj.ahora() },
    });
    await this.eventos.registrar({
      tipo: 'sesion_cerrada',
      origen: 'usuario',
      entidad: 'usuario',
      entidadId: sesion.usuarioId,
      mensaje: `${sesion.usuario.nombre} cerró sesión`,
    });
  }

  /**
   * Envía el enlace de recuperación si el correo pertenece a una cuenta activa.
   * Siempre termina igual, para no revelar qué correos están registrados.
   */
  async solicitarRecuperacion(correo: string, urlBase: string): Promise<void> {
    const usuario = await this.bd.usuario.findUnique({ where: { correo } });
    if (!usuario || usuario.inactivoDesde) return;

    // Los enlaces anteriores sin usar dejan de servir (quedan como "vencido").
    await this.bd.tokenRecuperacion.updateMany({
      where: { usuarioId: usuario.id, estado: 'pendiente' },
      data: { estado: 'vencido' },
    });
    const token = generarToken();
    await this.bd.tokenRecuperacion.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: hashDeToken(token),
        expiraEn: new Date(this.reloj.ahora().getTime() + VIGENCIA_RECUPERACION_MS),
      },
    });
    const enlace = `${urlBase.replace(/\/$/, '')}/restablecer?token=${token}`;
    await this.correo.enviar({
      para: usuario.correo,
      asunto: 'LUMICLASS: restablecer tu contraseña',
      cuerpo: `Hola ${usuario.nombre}: para crear una contraseña nueva abre el enlace. Vence en 30 minutos y solo sirve una vez. Si no lo pediste, ignora este correo.`,
      enlace,
    });
  }

  /** Cambia la contraseña con un token válido y cierra todas las sesiones de esa cuenta. */
  async restablecer(token: string, contrasena: string): Promise<void> {
    const registro = await this.bd.tokenRecuperacion.findUnique({
      where: { tokenHash: hashDeToken(token) },
      include: { usuario: true },
    });
    if (!registro || registro.estado !== 'pendiente' || registro.usuario.inactivoDesde) {
      throw datosInvalidos('El enlace no es válido o ya se usó. Pide uno nuevo.');
    }
    const ahora = this.reloj.ahora();
    if (registro.expiraEn <= ahora) {
      await this.bd.tokenRecuperacion.update({
        where: { id: registro.id },
        data: { estado: 'vencido' },
      });
      throw new ErrorDominio(
        400,
        'ENLACE_VENCIDO',
        'El enlace venció (dura 30 minutos). Pide uno nuevo.',
      );
    }

    await this.bd.$transaction([
      this.bd.usuario.update({
        where: { id: registro.usuarioId },
        data: { hashContrasena: await hashearContrasena(contrasena) },
      }),
      this.bd.tokenRecuperacion.update({
        where: { id: registro.id },
        data: { estado: 'usado', usadoEn: ahora },
      }),
      this.bd.sesion.updateMany({
        where: { usuarioId: registro.usuarioId, activa: true },
        data: { activa: false, cerradaEn: ahora },
      }),
    ]);
    await this.eventos.registrar({
      tipo: 'contrasena_cambiada',
      origen: 'usuario',
      entidad: 'usuario',
      entidadId: registro.usuarioId,
      mensaje: `${registro.usuario.nombre} restableció su contraseña`,
    });
  }

  private async crearSesion(usuarioId: string, ip: string): Promise<string> {
    const token = generarToken();
    await this.bd.sesion.create({
      data: {
        usuarioId,
        tokenHash: hashDeToken(token),
        expiraEn: new Date(this.reloj.ahora().getTime() + this.duracionSesionMs),
        ip,
      },
    });
    return token;
  }

  private obtenerHashFicticio(): Promise<string> {
    this.hashFicticio ??= hashearContrasena(generarToken());
    return this.hashFicticio;
  }
}

/**
 * Garantiza que exista al menos un admin activo (lo usan los datos iniciales).
 * Devuelve true si lo creó o reactivó.
 */
export async function asegurarAdmin(
  bd: BaseDatos,
  datos: { correo: string; nombre: string; contrasena: string },
): Promise<boolean> {
  const adminActivo = await bd.usuario.findFirst({ where: { rol: 'admin', inactivoDesde: null } });
  if (adminActivo) return false;
  const correo = datos.correo.trim().toLowerCase();
  const hashContrasena = await hashearContrasena(datos.contrasena);
  await bd.usuario.upsert({
    where: { correo },
    create: { correo, nombre: datos.nombre, hashContrasena, rol: 'admin' },
    update: { rol: 'admin', inactivoDesde: null, inactivadoPorId: null, hashContrasena },
  });
  return true;
}
