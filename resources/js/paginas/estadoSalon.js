import { api } from '../api';
import { avisar } from '../avisos';
import { etiqueta, haceCuanto } from '../formato';
import { crearSondeo } from '../sondeo';

/**
 * Base de Inicio, Control, Sensores y Simulador: trae /salones/{id}/estado cada 3 s.
 * Si falla, conserva los últimos datos, los marca como desactualizados y reintenta cada vez más espaciado.
 */
export function estadoSalon(salonId) {
    let sondeo = null;

    return {
        salonId,
        estado: null,
        cargando: true,
        errorConexion: null,
        ultimaCarga: null,
        ahora: Date.now(),

        init() {
            sondeo = crearSondeo(() => this.cargar(), 3000, {
                alRecuperar: () => avisar('exito', 'Conexión recuperada. Los datos están al día.'),
            });
            sondeo.iniciar();
            // Refresca los "hace X s" aunque los datos no cambien.
            this._reloj = setInterval(() => (this.ahora = Date.now()), 1000);
        },

        destroy() {
            sondeo?.detener();
            clearInterval(this._reloj);
        },

        async cargar() {
            try {
                const respuesta = await api('GET', `/salones/${this.salonId}/estado`);
                this.estado = respuesta.data;
                this.errorConexion = null;
                this.ultimaCarga = Date.now();
            } catch (error) {
                this.errorConexion = error.message;
                throw error;
            } finally {
                this.cargando = false;
            }
        },

        recargar() {
            return sondeo.ahora();
        },

        /** Texto "hace X s" de la última carga correcta (para la marca de datos desactualizados). */
        get desactualizadoDesde() {
            return this.ultimaCarga ? haceCuanto(new Date(this.ultimaCarga).toISOString(), this.ahora) : null;
        },

        get zonas() {
            return this.estado?.zonas ?? [];
        },

        get luces() {
            return this.zonas.flatMap((zona) => zona.luces.map((luz) => ({ ...luz, zonaNombre: zona.nombre })));
        },

        get sensores() {
            return this.zonas.flatMap((zona) => zona.sensores.map((sensor) => ({ ...sensor, zonaNombre: zona.nombre })));
        },

        etiqueta,

        hace(iso) {
            return haceCuanto(iso, this.ahora);
        },
    };
}
