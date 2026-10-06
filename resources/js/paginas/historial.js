import { api } from '../api';
import { etiqueta, etiquetas, fechaHora } from '../formato';

/** Historial del salón con filtros y paginación. */
export function historial(salonId) {
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

        async init() {
            await this.cargar();
        },

        async cargar() {
            this.cargando = true;
            const parametros = new URLSearchParams({ page: this.pagina, por_pagina: 20 });

            for (const [clave, valor] of Object.entries(this.filtros)) {
                if (valor) {
                    parametros.set(clave, valor);
                }
            }

            try {
                const r = await api('GET', `/salones/${this.salonId}/eventos?${parametros}`);
                this.eventos = r.data;
                this.meta = r.meta;
                this.errorCarga = null;
            } catch (error) {
                this.errorCarga = error.message;
            } finally {
                this.cargando = false;
            }
        },

        filtrar() {
            this.pagina = 1;
            this.cargar();
        },

        limpiar() {
            this.filtros = { tipo: '', severidad: '', desde: '', hasta: '' };
            this.filtrar();
        },

        irA(pagina) {
            this.pagina = pagina;
            this.cargar();
        },
    };
}
