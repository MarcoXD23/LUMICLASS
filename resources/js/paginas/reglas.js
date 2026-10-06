import { api } from '../api';
import { avisar } from '../avisos';
import { describirCondicion, etiqueta } from '../formato';

/** Formulario de una regla a partir de la regla guardada. Recuerda los segundos exactos de la duración. */
export function formularioDesdeRegla(regla) {
    const segundos = regla.condicion.duracion_segundos ?? 0;

    return {
        nombre: regla.nombre,
        zona_id: regla.zona_id ?? '',
        presencia: regla.condicion.presencia,
        minutos: Math.round(segundos / 60),
        segundosOriginales: segundos,
        accion: regla.accion.accion,
        prioridad: regla.prioridad,
        activa: regla.activa,
    };
}

/**
 * Cuerpo para la API. Si no se tocó la duración, se envían los segundos originales:
 * así editar el nombre de una regla de 90 s no la convierte en una de 120 s (ni una de 20 s en 0 s).
 */
export function cuerpoRegla(f) {
    const minutos = Number(f.minutos);
    const sinTocar = f.segundosOriginales !== undefined && minutos === Math.round(f.segundosOriginales / 60);
    const segundos = sinTocar ? f.segundosOriginales : minutos * 60;

    const condicion = { presencia: f.presencia };
    if (segundos > 0) {
        condicion.duracion_segundos = segundos;
    }

    return {
        nombre: f.nombre,
        activa: Boolean(f.activa),
        prioridad: Number(f.prioridad),
        zona_id: f.zona_id === '' ? null : Number(f.zona_id),
        condicion,
        accion: { accion: f.accion },
    };
}

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
            this.formulario = formularioDesdeRegla(regla);
            this.errores = {};
            this.formularioAbierto = true;
        },

        cuerpo: cuerpoRegla,

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
            const cuerpo = cuerpoRegla({ ...formularioDesdeRegla(regla), activa: !regla.activa });

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
