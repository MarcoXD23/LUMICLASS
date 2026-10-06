import { api, nuevoIdSolicitud } from '../api';
import { avisar } from '../avisos';
import { mezclar } from '../mezclar';
import { estadoSalon } from './estadoSalon';

/** Control de luces: individual, por zona y cambio de modo. */
export function control(salonId) {
    return mezclar(estadoSalon(salonId), {

        // Claves "luz-3" / "zona-1" con una orden en curso (deshabilita el botón: evita dobles clics).
        enviando: {},

        ocupado(clave) {
            return Boolean(this.enviando[clave]);
        },

        async ordenarLuz(luz, accion) {
            await this.enviar(`luz-${luz.id}`, async () => {
                const r = await api('POST', `/luces/${luz.id}/comando`, { accion, id_solicitud: nuevoIdSolicitud() });

                if (r.resultado === 'completada') {
                    avisar('exito', `"${luz.nombre}" ${accion === 'encender' ? 'encendida' : 'apagada'}.`);
                } else if (r.resultado === 'fallida') {
                    avisar('error', `"${luz.nombre}": ${r.mensaje}`);
                } else {
                    avisar('info', r.mensaje);
                }
            });
        },

        async ordenarZona(zona, accion) {
            await this.enviar(`zona-${zona.id}`, async () => {
                const r = await api('POST', `/zonas/${zona.id}/comando`, { accion, id_solicitud: nuevoIdSolicitud() });
                const problemas = r.resultados.filter((x) => ['rechazada', 'fallida'].includes(x.resultado));

                if (problemas.length) {
                    avisar('error', `${problemas.length} luz(es) de "${zona.nombre}" no respondieron: ${problemas[0].mensaje}`);
                } else {
                    avisar('exito', `Orden "${accion}" enviada a "${zona.nombre}".`);
                }
            });
        },

        async cambiarModo(zona, modo) {
            await this.enviar(`modo-${zona.id}`, async () => {
                const r = await api('PATCH', `/zonas/${zona.id}/modo`, { modo });
                avisar('info', r.mensaje);
            });
        },

        async enviar(clave, accion) {
            if (this.enviando[clave]) {
                return;
            }

            this.enviando[clave] = true;
            try {
                await accion();
            } catch (error) {
                avisar('error', error.message);
            } finally {
                delete this.enviando[clave];
                await this.recargar();
            }
        },
    });
}
