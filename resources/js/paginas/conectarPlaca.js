import { api } from '../api';
import { avisar } from '../avisos';
import { haceCuanto } from '../formato';
import { codigoConexion, imagenQr } from '../qrPlaca';

/** Sección "Conectar placa" de Configurar salón. */
export function conectarPlaca(salonId) {
    return {
        salonId,
        datos: null,
        error: null,
        trabajando: false,
        // La clave solo existe en esta página hasta que se recarga: el servidor guarda únicamente su hash.
        clave: null,
        servidor: '',
        ahora: Date.now(),

        async init() {
            await this.cargar();
            this._reloj = setInterval(() => {
                this.ahora = Date.now();
                // El estado "en línea" se refresca cada 10 s sin molestar.
                if (Math.round(this.ahora / 1000) % 10 === 0) this.cargar();
            }, 1000);
        },

        destroy() {
            clearInterval(this._reloj);
        },

        async cargar() {
            try {
                this.usar((await api('GET', `/salones/${this.salonId}/placa`)).data);
                this.error = null;
            } catch (error) {
                this.error = error.message;
            }
        },

        usar(datos) {
            this.datos = datos;
            const elegida = datos.direcciones.find((d) => d.servidor === this.servidor);
            if (!elegida) this.servidor = datos.direcciones.find((d) => d.recomendada)?.servidor ?? '';
        },

        async generar() {
            const configurada = this.datos?.placa.configurada;
            if (configurada && !window.confirm('¿Generar una clave nueva? La placa dejará de conectarse hasta que le escribas la clave nueva.')) {
                return;
            }

            this.trabajando = true;
            try {
                const respuesta = (await api('POST', `/salones/${this.salonId}/placa/clave`)).data;
                this.clave = respuesta.clave;
                this.usar(respuesta);
                avisar('exito', 'Clave generada. Cópiala o escanea el QR ahora: no se volverá a mostrar.');
            } catch (error) {
                avisar('error', error.message);
            } finally {
                this.trabajando = false;
            }
        },

        get codigo() {
            return this.clave && this.servidor ? codigoConexion(this.servidor, this.clave) : '';
        },

        get qr() {
            return this.codigo ? imagenQr(this.codigo) : '';
        },

        hace(iso) {
            return haceCuanto(iso, this.ahora);
        },

        async copiar(texto) {
            try {
                await navigator.clipboard.writeText(texto);
                avisar('exito', 'Copiado.');
            } catch {
                avisar('error', 'No se pudo copiar: selecciona el texto y cópialo a mano.');
            }
        },
    };
}
