import { api } from '../api';
import { avisar } from '../avisos';

/** "Mis salones": listar, crear, renombrar y borrar. */
export function salones() {
    return {
        lista: [],
        cargando: true,
        errorCarga: null,

        nuevo: { nombre: '', zonas: 2, luces_por_zona: 2 },
        errores: {},
        creando: false,

        editandoId: null,
        nombreEditado: '',

        async init() {
            await this.cargar();
        },

        async cargar() {
            try {
                this.lista = (await api('GET', '/salones')).data;
                this.errorCarga = null;
            } catch (error) {
                this.errorCarga = error.message;
            } finally {
                this.cargando = false;
            }
        },

        async crear() {
            this.creando = true;
            this.errores = {};

            try {
                const r = await api('POST', '/salones', {
                    nombre: this.nuevo.nombre,
                    zonas: Number(this.nuevo.zonas),
                    luces_por_zona: Number(this.nuevo.luces_por_zona),
                });
                avisar('exito', `Salón "${r.data.nombre}" creado.`);
                this.nuevo = { nombre: '', zonas: 2, luces_por_zona: 2 };
                await this.cargar();
            } catch (error) {
                this.errores = error.erroresPorCampo?.() ?? {};
                avisar('error', error.message);
            } finally {
                this.creando = false;
            }
        },

        editar(salon) {
            this.editandoId = salon.id;
            this.nombreEditado = salon.nombre;
        },

        async guardarNombre(salon) {
            try {
                await api('PATCH', `/salones/${salon.id}`, { nombre: this.nombreEditado });
                this.editandoId = null;
                await this.cargar();
            } catch (error) {
                avisar('error', error.erroresPorCampo?.().nombre ?? error.message);
            }
        },

        async borrar(salon) {
            if (!window.confirm(`¿Borrar "${salon.nombre}"? Se borran sus luces, sensores, reglas e historial. No se puede deshacer.`)) {
                return;
            }

            try {
                await api('DELETE', `/salones/${salon.id}`);
                avisar('exito', `Salón "${salon.nombre}" borrado.`);
                await this.cargar();
            } catch (error) {
                avisar('error', error.message);
            }
        },
    };
}
