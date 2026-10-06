import { api } from '../api';
import { avisar } from '../avisos';

/** "Configurar salón": agregar, renombrar, mover y quitar zonas, luces (con su servo) y sensores. */
export function configuracion(salonId) {
    return {
        salonId,
        zonas: [],
        cargando: true,
        errorCarga: null,
        trabajando: false,

        nuevaZona: { nombre: '', luces: 2, sensores: 1 },
        erroresZona: {},
        // Texto escrito en "Agregar luz/sensor" de cada zona: { 3: 'Luz de la ventana' }.
        nuevaLuz: {},
        nuevoSensor: {},

        async init() {
            await this.cargar();
        },

        async cargar() {
            try {
                this.zonas = (await api('GET', `/salones/${this.salonId}/zonas`)).data;
                this.errorCarga = null;
            } catch (error) {
                this.errorCarga = error.message;
            } finally {
                this.cargando = false;
            }
        },

        /** Ejecuta un cambio, avisa el resultado y recarga la lista. Devuelve false si falló. */
        async hacer(accion, exito) {
            this.trabajando = true;
            try {
                await accion();
                if (exito) avisar('exito', exito);
                await this.cargar();
                return true;
            } catch (error) {
                const detalle = Object.values(error.erroresPorCampo?.() ?? {})[0];
                avisar('error', detalle ?? error.message);
                return false;
            } finally {
                this.trabajando = false;
            }
        },

        /** Pide un nombre nuevo con el cuadro del navegador (cómodo también en celular). */
        pedirNombre(titulo, actual) {
            const nombre = window.prompt(titulo, actual)?.trim();

            return nombre && nombre !== actual ? nombre : null;
        },

        // ---- Zonas ----
        async crearZona() {
            this.erroresZona = {};
            this.trabajando = true;
            try {
                await api('POST', `/salones/${this.salonId}/zonas`, {
                    nombre: this.nuevaZona.nombre,
                    luces: Number(this.nuevaZona.luces),
                    sensores: Number(this.nuevaZona.sensores),
                });
                avisar('exito', `Zona "${this.nuevaZona.nombre}" creada.`);
                this.nuevaZona = { nombre: '', luces: 2, sensores: 1 };
                await this.cargar();
            } catch (error) {
                this.erroresZona = error.erroresPorCampo?.() ?? {};
                avisar('error', error.message);
            } finally {
                this.trabajando = false;
            }
        },

        renombrarZona(zona) {
            const nombre = this.pedirNombre('Nuevo nombre de la zona', zona.nombre);
            if (nombre) this.hacer(() => api('PATCH', `/zonas/${zona.id}`, { nombre }), 'Zona renombrada.');
        },

        quitarZona(zona) {
            const texto = `¿Quitar la zona "${zona.nombre}"? Se borran sus ${zona.luces.length} luz(ces) con sus servos, sus sensores y las reglas propias de la zona.`;
            if (window.confirm(texto)) this.hacer(() => api('DELETE', `/zonas/${zona.id}`), 'Zona quitada.');
        },

        // ---- Luces ----
        async agregarLuz(zona) {
            const nombre = (this.nuevaLuz[zona.id] ?? '').trim();
            if (!nombre) return avisar('error', 'Escribe el nombre de la luz.');
            if (await this.hacer(() => api('POST', `/zonas/${zona.id}/luces`, { nombre }), `Luz "${nombre}" agregada con su servo.`)) {
                this.nuevaLuz[zona.id] = '';
            }
        },

        renombrarLuz(luz) {
            const nombre = this.pedirNombre('Nuevo nombre de la luz', luz.nombre);
            if (nombre) this.hacer(() => api('PATCH', `/luces/${luz.id}`, { nombre }), 'Luz renombrada.');
        },

        moverLuz(luz, zonaId) {
            const destino = this.zonas.find((z) => z.id === Number(zonaId));
            if (destino && destino.id !== luz.zona_id) {
                this.hacer(() => api('PATCH', `/luces/${luz.id}`, { zona_id: destino.id }), `"${luz.nombre}" ahora está en "${destino.nombre}".`);
            }
        },

        quitarLuz(luz) {
            if (window.confirm(`¿Quitar "${luz.nombre}" y su servo? También se borran sus horas en Estadísticas.`)) {
                this.hacer(() => api('DELETE', `/luces/${luz.id}`), 'Luz quitada.');
            }
        },

        // ---- Sensores ----
        async agregarSensor(zona) {
            const nombre = (this.nuevoSensor[zona.id] ?? '').trim();
            if (!nombre) return avisar('error', 'Escribe el nombre del sensor.');
            if (await this.hacer(() => api('POST', `/zonas/${zona.id}/sensores`, { nombre }), `Sensor "${nombre}" agregado.`)) {
                this.nuevoSensor[zona.id] = '';
            }
        },

        renombrarSensor(sensor) {
            const nombre = this.pedirNombre('Nuevo nombre del sensor', sensor.nombre);
            if (nombre) this.hacer(() => api('PATCH', `/sensores/${sensor.id}`, { nombre }), 'Sensor renombrado.');
        },

        async quitarSensor(sensor) {
            if (!window.confirm(`¿Quitar el sensor "${sensor.nombre}"?`)) return;

            this.trabajando = true;
            try {
                await api('DELETE', `/sensores/${sensor.id}`);
                avisar('exito', 'Sensor quitado.');
            } catch (error) {
                // Es el último sensor de una zona automática: el servidor pide confirmar de nuevo.
                if (error.codigo === 'ultimo_sensor' && window.confirm(error.message)) {
                    try {
                        await api('DELETE', `/sensores/${sensor.id}?confirmar=1`);
                        avisar('exito', 'Sensor quitado. Esa zona ya no tiene sensores: sus reglas no actuarán.');
                    } catch (otro) {
                        avisar('error', otro.message);
                    }
                } else if (error.codigo !== 'ultimo_sensor') {
                    avisar('error', error.message);
                }
            } finally {
                this.trabajando = false;
                await this.cargar();
            }
        },
    };
}
