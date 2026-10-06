import { api } from '../api';
import { duracion } from '../formato';

const formatoDia = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric' });
const formatoFecha = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });

/** "2026-10-06" como fecha local (sin que la zona horaria la corra un día). */
function fechaLocal(texto) {
    const [a, m, d] = texto.split('-').map(Number);

    return new Date(a, m - 1, d);
}

/** "sábado, 3 de octubre" → "Sábado, 3 de octubre" (CSS capitalize pondría "De Octubre"). */
function mayusculaInicial(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Máximo "redondo" del eje en horas: 1, 2, 5, 10, 20, 50… */
function maximoRedondo(horas) {
    if (horas <= 0) {
        return 1;
    }
    const potencia = 10 ** Math.floor(Math.log10(horas));

    return [1, 2, 5, 10].map((p) => p * potencia).find((v) => v >= horas);
}

/** Estadísticas del salón: tarjetas de totales, horas por día y horas por luz. */
export function estadisticas(salonId) {
    return {
        salonId,
        rango: '7d',
        datos: null,
        cargando: true,
        errorCarga: null,
        seleccionado: null,
        verTabla: false,

        duracion,

        async init() {
            await this.cargar();
        },

        async cargar() {
            this.cargando = true;
            const zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone;

            try {
                const parametros = new URLSearchParams({ rango: this.rango, zona_horaria: zonaHoraria });
                this.datos = (await api('GET', `/salones/${this.salonId}/estadisticas?${parametros}`)).data;
                this.errorCarga = null;
                this.seleccionado = null;
            } catch (error) {
                this.errorCarga = error.message;
            } finally {
                this.cargando = false;
            }
        },

        cambiarRango(rango) {
            this.rango = rango;
            this.cargar();
        },

        get totales() {
            return this.datos?.totales;
        },

        /** % de las horas encendidas que fueron con la zona vacía. */
        get porcentajeDesperdicio() {
            const t = this.totales;

            return t?.segundos_encendidas ? Math.round((t.segundos_desperdicio / t.segundos_encendidas) * 100) : 0;
        },

        get dias() {
            return (this.datos?.por_dia ?? []).map((dia) => ({
                ...dia,
                etiqueta: formatoDia.format(fechaLocal(dia.fecha)),
                // En celular solo cabe el número del día bajo cada barra.
                numero: fechaLocal(dia.fecha).getDate(),
                etiquetaLarga: mayusculaInicial(formatoFecha.format(fechaLocal(dia.fecha))),
                segundos_utiles: dia.segundos_encendidas - dia.segundos_desperdicio,
            }));
        },

        get maximoHorasDia() {
            return maximoRedondo(Math.max(0, ...this.dias.map((d) => d.segundos_encendidas)) / 3600);
        },

        /** Alto (%) de un valor en segundos sobre el eje de horas por día. */
        alto(segundos) {
            return `${(segundos / 3600 / this.maximoHorasDia) * 100}%`;
        },

        /** En 30 días se rotula uno de cada 5 para que no se encimen. */
        rotular(indice) {
            return this.dias.length <= 7 || indice % 5 === 0 || indice === this.dias.length - 1;
        },

        get luces() {
            return this.datos?.luces ?? [];
        },

        get maximoSegundosLuz() {
            return Math.max(1, ...this.luces.map((l) => l.segundos_encendida));
        },

        ancho(segundos) {
            return `${(segundos / this.maximoSegundosLuz) * 100}%`;
        },
    };
}
