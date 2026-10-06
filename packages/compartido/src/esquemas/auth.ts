import { z } from 'zod';

export const ROLES = ['admin', 'usuario'] as const;
export const esquemaRol = z.enum(ROLES);
export type Rol = z.infer<typeof esquemaRol>;

const esquemaCorreo = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .pipe(z.email('Correo electrónico inválido'));

/** Mínimo 8 caracteres, con al menos una letra y un número. */
export const esquemaContrasena = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede superar 128 caracteres')
  .regex(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/, 'La contraseña debe incluir al menos una letra')
  .regex(/\d/, 'La contraseña debe incluir al menos un número');

export const esquemaRegistro = z.strictObject({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(60),
  correo: esquemaCorreo,
  contrasena: esquemaContrasena,
});
export type DatosRegistro = z.infer<typeof esquemaRegistro>;

export const esquemaLogin = z.strictObject({
  correo: esquemaCorreo,
  contrasena: z.string().min(1, 'Escribe tu contraseña').max(128),
});
export type DatosLogin = z.infer<typeof esquemaLogin>;

export const esquemaRecuperar = z.strictObject({ correo: esquemaCorreo });

export const esquemaRestablecer = z.strictObject({
  token: z.string().trim().min(20, 'Enlace inválido').max(200, 'Enlace inválido'),
  contrasena: esquemaContrasena,
});

/** Cambios que el admin puede hacer sobre una cuenta. */
export const esquemaCambioUsuario = z
  .strictObject({
    activo: z.boolean().optional(),
    rol: esquemaRol.optional(),
  })
  .refine((c) => c.activo !== undefined || c.rol !== undefined, {
    message: 'Indica "activo" o "rol"',
  });
export type CambioUsuario = z.infer<typeof esquemaCambioUsuario>;

export interface UsuarioDto {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
  inactivoDesde: string | null;
}

export interface CorreoSimuladoDto {
  id: number;
  para: string;
  asunto: string;
  cuerpo: string;
  enlace: string | null;
  creadoEn: string;
}
