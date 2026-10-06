import { api } from '../api';
import { avisar } from '../avisos';
import { mezclar } from '../mezclar';
import { estadoSalon } from './estadoSalon';

/** Página "Simulador": fuerza situaciones en el salón para probar y presentar. */
export function simulador(salonId) {
    const base = estadoSalon(salonId);

    return mezclar(base, {

        sim: null,
        conteo: '',
        trabajando: false,

        init() {
            base.init.call(this);
            this.cargarSim();
        },

        async cargarSim() {
            try {
                this.sim = (await api('GET', `/salones/${this.salonId}/sim/estado`)).data;
            } catch (error) {
                avisar('error', error.message);
            }
        },

        respuestaDe(actuadorId) {
            return this.sim?.actuadores.find((a) => a.id === actuadorId)?.respuesta_simulada ?? 'ok';
        },

        async presencia(hay, zona = null) {
            const cuerpo = { presencia: hay };
            if (zona) {
                cuerpo.zona_id = zona.id;
            }
            if (this.conteo !== '' && hay) {
                cuerpo.conteo_personas = Number(this.conteo);
            }

            await this.hacer(async () => {
                const r = await api('POST', `/salones/${this.salonId}/sim/presencia`, cuerpo);
                avisar('exito', `${r.data.sensores_actualizados} sensor(es) actualizados; ${r.data.ordenes_reglas} orden(es) por reglas.`);
            });
        },

        async conexionSensor(sensor, conexion) {
            await this.hacer(() => api('PATCH', `/sim/sensores/${sensor.id}`, { conexion }));
        },

        async respuestaServo(actuador, respuesta) {
            await this.hacer(async () => {
                await api('PATCH', `/sim/actuadores/${actuador.id}`, { respuesta });
                await this.cargarSim();
            });
        },

        async conexionServo(actuador, conexion) {
            await this.hacer(async () => {
                await api('PATCH', `/sim/actuadores/${actuador.id}`, { conexion });
                await this.cargarSim();
            });
        },

        async interruptor(luz, estado) {
            await this.hacer(() => api('POST', `/sim/luces/${luz.id}/interruptor`, { estado }));
        },

        async tick() {
            await this.hacer(async () => {
                const r = await api('POST', `/salones/${this.salonId}/sim/tick`);
                avisar('info', `Tick: ${r.data.pendientes_revisadas} orden(es) pendiente(s) revisada(s), ${r.data.ordenes_reglas} por reglas.`);
            });
        },

        async reiniciar() {
            if (!window.confirm('¿Reiniciar el escenario de este salón? Todo vuelve a activo, sin presencia y con las luces apagadas.')) {
                return;
            }

            await this.hacer(async () => {
                await api('POST', `/salones/${this.salonId}/sim/reiniciar`);
                await this.cargarSim();
                avisar('exito', 'Escenario reiniciado.');
            });
        },

        async hacer(accion) {
            this.trabajando = true;
            try {
                await accion();
            } catch (error) {
                avisar('error', error.message);
            } finally {
                this.trabajando = false;
                await this.recargar();
            }
        },
    });
}
