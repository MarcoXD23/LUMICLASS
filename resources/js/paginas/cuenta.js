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
        errores: {},
        mensaje: '',
        enviando: false,

        async enviar() {
            this.enviando = true;
            this.errores = {};
            this.mensaje = '';

            try {
                const r = await api('POST', '/auth/registro', {
                    nombre: this.nombre,
                    email: this.email,
                    password: this.password,
                    password_confirmation: this.password_confirmation,
                });
                window.location.href = `/salones/${r.salon_id}`;
            } catch (error) {
                this.errores = error.erroresPorCampo?.() ?? {};
                this.mensaje = error.message;
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
