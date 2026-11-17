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
        // IP del ESP32 escrita en cada luz: { 5: '192.168.18.187' }.
        direcciones: {},
        // Clave recién generada por luz (solo en memoria; el servidor guarda únicamente su hash).
        claves: {},

        async init() {
            await this.cargar();
        },

        async cargar() {
            try {
                this.zonas = (await api('GET', `/salones/${this.salonId}/zonas`)).data;
                this.errorCarga = null;
                // El campo muestra la IP guardada (sin "http://"), salvo lo que se esté escribiendo sin guardar.
                for (const luz of this.zonas.flatMap((z) => z.luces)) {
                    if (!(luz.id in this.direcciones)) this.direcciones[luz.id] = this.sinEsquema(luz.actuador?.direccion);
                }
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

        // ---- ESP32 de cada luz ----
        sinEsquema(direccion) {
            return (direccion ?? '').replace(/^https?:\/\//i, '');
        },

        /** Guarda la IP (vacía = quitar el ESP32) y muestra el resultado de la prueba de conexión. */
        async guardarEsp32(luz) {
            const direccion = (this.direcciones[luz.id] ?? '').trim();
            this.trabajando = true;
            try {
                const respuesta = await api('PATCH', `/actuadores/${luz.actuador.id}/esp32`, { direccion: direccion || null });
                this.direcciones[luz.id] = this.sinEsquema(respuesta.data.direccion);
                this.avisarPrueba(luz, respuesta.prueba, direccion ? null : `"${luz.nombre}" ya no usa ESP32.`);
                await this.cargar();
            } catch (error) {
                const detalle = Object.values(error.erroresPorCampo?.() ?? {})[0];
                avisar('error', detalle ?? error.message);
            } finally {
                this.trabajando = false;
            }
        },

        async probarEsp32(luz) {
            this.trabajando = true;
            try {
                const respuesta = await api('POST', `/actuadores/${luz.actuador.id}/esp32/probar`);
                this.avisarPrueba(luz, respuesta.prueba);
                await this.cargar();
            } catch (error) {
                avisar('error', error.message);
            } finally {
                this.trabajando = false;
            }
        },

        /** Genera la clave para conectar el ESP32 por internet. La anterior deja de servir. */
        async generarClave(luz) {
            if (luz.actuador.conexion_esp32 === 'internet'
                && !window.confirm(`¿Generar una clave nueva para "${luz.nombre}"? El ESP32 con la clave anterior dejará de funcionar hasta que cargues la nueva.`)) {
                return;
            }
            this.trabajando = true;
            try {
                const respuesta = await api('POST', `/actuadores/${luz.actuador.id}/esp32/clave`);
                this.claves[luz.id] = respuesta.conexion;
                this.direcciones[luz.id] = '';
                avisar('exito', `Clave creada. Cópiala en el sketch y carga el sketch al ESP32.`);
                await this.cargar();
            } catch (error) {
                avisar('error', error.message);
            } finally {
                this.trabajando = false;
            }
        },

        quitarEsp32(luz) {
            if (window.confirm(`¿Quitar el ESP32 de "${luz.nombre}"? La luz volverá a usar el simulador.`)) {
                delete this.claves[luz.id];
                this.direcciones[luz.id] = '';
                this.hacer(() => api('DELETE', `/actuadores/${luz.actuador.id}/esp32`), `"${luz.nombre}" ya no usa ESP32.`);
            }
        },

        textoEsp32(actuador) {
            if (!actuador?.conexion_esp32) return '';
            const conectado = actuador.conexion === 'activo';
            if (actuador.conexion_esp32 === 'local') {
                return conectado ? `Conectado a ${this.sinEsquema(actuador.direccion)}` : `Sin respuesta de ${this.sinEsquema(actuador.direccion)}`;
            }
            if (conectado) return 'Conectado por internet';

            return actuador.ultima_respuesta ? 'Por internet: sin conexión' : 'Por internet: esperando al ESP32';
        },

        snippetClave(conexion) {
            if (!conexion) return '';

            return `const char* SERVIDOR = "${conexion.servidor}";\nconst char* CLAVE    = "${conexion.clave}";`;
        },

        async copiar(texto) {
            try {
                await navigator.clipboard.writeText(texto);
                avisar('exito', 'Copiado.');
            } catch {
                avisar('error', 'No se pudo copiar: selecciona el texto y cópialo a mano.');
            }
        },

        avisarPrueba(luz, prueba, sinPrueba = null) {
            if (!prueba) return sinPrueba && avisar('exito', sinPrueba);
            avisar(prueba.conectado ? 'exito' : 'error', `"${luz.nombre}": ${prueba.mensaje}`);
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
