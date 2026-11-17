import { api } from '../api';
import { avisar } from '../avisos';
import { fechaHora } from '../formato';

/** "Seguridad de mi cuenta": agregar, verificar, cambiar o quitar el correo alternativo. */
export function seguridad() {
    return {
        datos: null,
        errorCarga: null,
        trabajando: false,
        errores: {},
        // null | 'cambiar' | 'quitar'
        formulario: null,
        nuevo: { correo: '', password: '' },
        quitarPassword: '',
        codigo: '',

        fechaHora,

        async init() {
            try {
                this.datos = (await api('GET', '/cuenta/seguridad')).data;
            } catch (error) {
                this.errorCarga = error.message;
            }
        },

        abrir(cual) {
            this.formulario = cual;
            this.errores = {};
        },

        cerrar() {
            this.formulario = null;
            this.errores = {};
            this.nuevo = { correo: '', password: '' };
            this.quitarPassword = '';
        },

        /** Llama a la API, muestra el mensaje y actualiza el estado. Devuelve true si salió bien. */
        async hacer(metodo, ruta, cuerpo) {
            this.trabajando = true;
            this.errores = {};
            try {
                const r = await api(metodo, ruta, cuerpo);
                this.datos = r.data;
                avisar('exito', r.mensaje);
                return true;
            } catch (error) {
                this.errores = error.erroresPorCampo?.() ?? {};
                if (!Object.keys(this.errores).length) {
                    avisar('error', error.message);
                }
                return false;
            } finally {
                this.trabajando = false;
            }
        },

        async guardar() {
            const cuerpo = { correo_alternativo: this.nuevo.correo, password_actual: this.nuevo.password };
            if (await this.hacer('POST', '/cuenta/alternativo', cuerpo)) {
                this.cerrar();
                this.codigo = '';
            }
        },

        async verificar() {
            if (await this.hacer('POST', '/cuenta/alternativo/verificar', { codigo: this.codigo })) {
                this.codigo = '';
            } else if (!this.errores.codigo) {
                this.codigo = '';
            }
        },

        reenviar() {
            this.codigo = '';
            return this.hacer('POST', '/cuenta/alternativo/reenviar');
        },

        async quitar() {
            if (await this.hacer('DELETE', '/cuenta/alternativo', { password_actual: this.quitarPassword })) {
                this.cerrar();
            }
        },
    };
}
