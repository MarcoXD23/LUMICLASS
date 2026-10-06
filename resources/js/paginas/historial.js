import { api } from '../api';
import { etiqueta, etiquetas, fechaHora } from '../formato';
import { crearSondeo } from '../sondeo';

/**
 * Historial del salón con filtros, paginación y descarga CSV.
 * En la primera página se actualiza solo cada 5 s (los eventos nuevos aparecen arriba).
 */
export function historial(salonId) {
    let sondeo = null;

    return {
        salonId,
        eventos: [],
        meta: null,
        cargando: true,
        errorCarga: null,
        filtros: { tipo: '', severidad: '', desde: '', hasta: '' },
        pagina: 1,

        tipos: Object.entries(etiquetas.evento),
        etiqueta,
        fechaHora,

        init() {
            sondeo = crearSondeo(async () => {
                // En otras páginas no se recarga solo: los eventos nuevos correrían la lista mientras se lee.
                if (this.pagina === 1) {
                    await this.cargar();
                }
            }, 5000);
            sondeo.iniciar();
        },

        destroy() {
            sondeo?.detener();
        },

        parametros() {
            const parametros = new URLSearchParams();
            for (const [clave, valor] of Object.entries(this.filtros)) {
                if (valor) {
                    parametros.set(clave, valor);
                }
            }
            // "Desde" y "hasta" son días de la hora local de quien mira, no del servidor (UTC).
            if (this.filtros.desde || this.filtros.hasta) {
                parametros.set('zona_horaria', Intl.DateTimeFormat().resolvedOptions().timeZone);
            }

            return parametros;
        },

        /** Enlace de descarga con los mismos filtros que la lista. */
        get urlCsv() {
            return `/api/v1/salones/${this.salonId}/eventos.csv?${this.parametros()}`;
        },

        async cargar() {
            const parametros = this.parametros();
            parametros.set('page', this.pagina);
            parametros.set('por_pagina', 20);

            try {
                const r = await api('GET', `/salones/${this.salonId}/eventos?${parametros}`);
                this.eventos = r.data;
                this.meta = r.meta;
                this.errorCarga = null;
            } catch (error) {
                this.errorCarga = error.message;
                throw error;
            } finally {
                this.cargando = false;
            }
        },

        async recargarAhora() {
            this.cargando = true;
            try {
                await this.cargar();
            } catch {
                // El mensaje ya quedó en errorCarga.
            }
        },

        filtrar() {
            this.pagina = 1;
            this.recargarAhora();
        },

        limpiar() {
            this.filtros = { tipo: '', severidad: '', desde: '', hasta: '' };
            this.filtrar();
        },

        irA(pagina) {
            this.pagina = pagina;
            this.recargarAhora();
        },
    };
}
