import { api } from '../api';
import { avisar } from '../avisos';
import { describirCondicion, etiqueta } from '../formato';

const FORMULARIO_VACIO = { nombre: '', zona_id: '', presencia: 'ocupado', minutos: 0, accion: 'encender', prioridad: 100, activa: true };

/** Reglas de automatización del salón: listar, crear, editar, activar/desactivar y borrar. */
export function reglas(salonId) {
    return {
        salonId,
        lista: [],
        zonas: [],
        cargando: true,
        errorCarga: null,

        formularioAbierto: false,
        editandoId: null,
        formulario: { ...FORMULARIO_VACIO },
        errores: {},
        guardando: false,

        async init() {
            await this.cargar();
        },

        async cargar() {
            try {
                const [reglasR, zonasR] = await Promise.all([
                    api('GET', `/salones/${this.salonId}/reglas`),
                    api('GET', `/salones/${this.salonId}/zonas`),
                ]);
                this.lista = reglasR.data;
                this.zonas = zonasR.data;
                this.errorCarga = null;
            } catch (error) {
                this.errorCarga = error.message;
            } finally {
                this.cargando = false;
            }
        },

        nombreZona(zonaId) {
            return zonaId ? (this.zonas.find((z) => z.id === zonaId)?.nombre ?? '—') : 'Todas las zonas';
        },

        describirCondicion,
        etiqueta,

        abrirNueva() {
            this.editandoId = null;
            this.formulario = { ...FORMULARIO_VACIO };
            this.errores = {};
            this.formularioAbierto = true;
        },

        abrirEdicion(regla) {
            this.editandoId = regla.id;
            this.formulario = {
                nombre: regla.nombre,
                zona_id: regla.zona_id ?? '',
                presencia: regla.condicion.presencia,
                minutos: Math.round((regla.condicion.duracion_segundos ?? 0) / 60),
                accion: regla.accion.accion,
                prioridad: regla.prioridad,
                activa: regla.activa,
            };
            this.errores = {};
            this.formularioAbierto = true;
        },

        cuerpo(f) {
            const condicion = { presencia: f.presencia };
            if (Number(f.minutos) > 0) {
                condicion.duracion_segundos = Number(f.minutos) * 60;
            }

            return {
                nombre: f.nombre,
                activa: Boolean(f.activa),
                prioridad: Number(f.prioridad),
                zona_id: f.zona_id === '' ? null : Number(f.zona_id),
                condicion,
                accion: { accion: f.accion },
            };
        },

        async guardar() {
            this.guardando = true;
            this.errores = {};

            try {
                if (this.editandoId) {
                    await api('PUT', `/reglas/${this.editandoId}`, this.cuerpo(this.formulario));
                } else {
                    await api('POST', `/salones/${this.salonId}/reglas`, this.cuerpo(this.formulario));
                }
                avisar('exito', 'Regla guardada.');
                this.formularioAbierto = false;
                await this.cargar();
            } catch (error) {
                this.errores = error.erroresPorCampo?.() ?? {};
                avisar('error', error.message);
            } finally {
                this.guardando = false;
            }
        },

        async alternar(regla) {
            const f = {
                nombre: regla.nombre,
                zona_id: regla.zona_id ?? '',
                presencia: regla.condicion.presencia,
                minutos: (regla.condicion.duracion_segundos ?? 0) / 60,
                accion: regla.accion.accion,
                prioridad: regla.prioridad,
                activa: !regla.activa,
            };
            const cuerpo = this.cuerpo(f);
            // Conserva la duración exacta en segundos (no redondear a minutos).
            if (regla.condicion.duracion_segundos) {
                cuerpo.condicion.duracion_segundos = regla.condicion.duracion_segundos;
            }

            try {
                await api('PUT', `/reglas/${regla.id}`, cuerpo);
                await this.cargar();
            } catch (error) {
                avisar('error', error.message);
            }
        },

        async borrar(regla) {
            if (!window.confirm(`¿Borrar la regla "${regla.nombre}"?`)) {
                return;
            }

            try {
                await api('DELETE', `/reglas/${regla.id}`);
                avisar('exito', 'Regla borrada.');
                await this.cargar();
            } catch (error) {
                avisar('error', error.message);
            }
        },
    };
}
