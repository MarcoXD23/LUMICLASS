import { api } from '../api';

/** Formulario de ingreso. */
export function ingreso() {
    return {
        email: '',
        password: '',
        errores: {},
        mensaje: '',
        enviando: false,

        async enviar() {
            this.enviando = true;
            this.errores = {};
            this.mensaje = '';

            try {
                await api('POST', '/auth/login', { email: this.email, password: this.password });
                window.location.href = '/salones';
            } catch (error) {
                this.errores = error.erroresPorCampo?.() ?? {};
                this.mensaje = error.message;
                this.enviando = false;
            }
        },
    };
}

/** Formulario de registro: al terminar entra directo al salón de ejemplo. */
export function registro() {
    return {
        nombre: '',
        email: '',
        password: '',
        password_confirmation: '',
        correo_alternativo: '',
        errores: {},
        mensaje: '',
        enviando: false,

        async enviar() {
            this.enviando = true;
            this.errores = {};
            this.mensaje = '';

            try {
                const r = await api('POST', '/auth/registro', {
                    correo_alternativo: this.correo_alternativo || null,
                    nombre: this.nombre,
                    email: this.email,
                    password: this.password,
                    password_confirmation: this.password_confirmation,
                });
                // Si dio un correo alternativo, va directo a verificarlo con el código que le llegó.
                window.location.href = r.verificar_alternativo ? '/cuenta/seguridad' : `/salones/${r.salon_id}`;
            } catch (error) {
                this.errores = error.erroresPorCampo?.() ?? {};
                this.mensaje = error.message;
                this.enviando = false;
            }
        },
    };
}

/** "¿Olvidaste tu contraseña?": pide el enlace por correo. La respuesta es igual exista o no la cuenta. */
export function olvide() {
    return {
        email: '',
        errores: {},
        mensaje: '',
        enviado: '',
        enviando: false,

        async enviar() {
            this.enviando = true;
            this.errores = {};
            this.mensaje = '';

            try {
                this.enviado = (await api('POST', '/auth/olvide', { email: this.email })).mensaje;
            } catch (error) {
                this.errores = error.erroresPorCampo?.() ?? {};
                this.mensaje = error.message;
            } finally {
                this.enviando = false;
            }
        },
    };
}

/** Pantalla del enlace del correo: crea la contraseña nueva y entra a "Mis salones". */
export function restablecer(token, email) {
    return {
        token,
        email,
        password: '',
        password_confirmation: '',
        errores: {},
        mensaje: '',
        enlaceVencido: false,
        enviando: false,

        async enviar() {
            this.enviando = true;
            this.errores = {};
            this.mensaje = '';

            try {
                await api('POST', '/auth/restablecer', {
                    token: this.token,
                    email: this.email,
                    password: this.password,
                    password_confirmation: this.password_confirmation,
                });
                window.location.href = '/salones';
            } catch (error) {
                this.errores = error.erroresPorCampo?.() ?? {};
                this.mensaje = error.message;
                this.enlaceVencido = error.codigo === 'enlace_invalido';
                this.enviando = false;
            }
        },
    };
}

/** Botón "Salir" del menú. */
export function sesion() {
    return {
        saliendo: false,

        async salir() {
            this.saliendo = true;
            try {
                await api('POST', '/auth/logout');
            } finally {
                window.location.href = '/ingresar';
            }
        },
    };
}

/**
 * Formas 2 y 3 de recuperar la contraseña: código de 6 dígitos al correo principal (via "correo")
 * o al correo alternativo verificado (via "alternativo").
 */
export function recuperarCodigo(via) {
    return {
        via,
        paso: 'correo',
        email: '',
        codigo: '',
        password: '',
        password_confirmation: '',
        aviso: '',
        errores: {},
        mensaje: '',
        enviando: false,

        async pedir() {
            await this.llamar(async () => {
                this.aviso = (await api('POST', '/auth/codigo', { email: this.email, via: this.via })).mensaje;
                this.codigo = '';
                this.paso = 'codigo';
            });
        },

        reenviar() {
            return this.pedir();
        },

        async cambiar() {
            const ok = await this.llamar(() =>
                api('POST', '/auth/codigo/restablecer', {
                    email: this.email,
                    via: this.via,
                    codigo: this.codigo,
                    password: this.password,
                    password_confirmation: this.password_confirmation,
                }),
            );

            if (ok) {
                window.location.href = '/salones';
            } else if (this.errores.codigo === undefined && this.mensaje) {
                // Código incorrecto o vencido: se limpian las casillas para escribirlo de nuevo.
                this.codigo = '';
            }
        },

        async llamar(accion) {
            this.enviando = true;
            this.errores = {};
            this.mensaje = '';
            try {
                await accion();
                return true;
            } catch (error) {
                this.errores = error.erroresPorCampo?.() ?? {};
                this.mensaje = error.message;
                return false;
            } finally {
                this.enviando = false;
            }
        },
    };
}

/** Aviso "agrega un correo alternativo": discreto, no bloquea y se puede cerrar (hasta la próxima sesión del navegador). */
export function avisoSeguridad() {
    const CLAVE = 'lumiclass.aviso-seguridad';

    return {
        visible: true,

        init() {
            try {
                this.visible = sessionStorage.getItem(CLAVE) !== 'cerrado';
            } catch {
                this.visible = true;
            }
        },

        cerrar() {
            this.visible = false;
            try {
                sessionStorage.setItem(CLAVE, 'cerrado');
            } catch {
                // Sin almacenamiento (modo privado estricto): solo se oculta en esta página.
            }
        },
    };
}
