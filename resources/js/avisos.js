import Alpine from 'alpinejs';

/** Avisos flotantes ("toasts"): éxito, info o error. Desaparecen solos. */
export function registrarAvisos() {
    Alpine.store('avisos', {
        lista: [],
        siguienteId: 1,

        agregar(tipo, texto) {
            const id = this.siguienteId++;
            this.lista.push({ id, tipo, texto });
            setTimeout(() => this.quitar(id), tipo === 'error' ? 7000 : 4000);
        },

        quitar(id) {
            this.lista = this.lista.filter((aviso) => aviso.id !== id);
        },
    });
}

export function avisar(tipo, texto) {
    Alpine.store('avisos').agregar(tipo, texto);
}
