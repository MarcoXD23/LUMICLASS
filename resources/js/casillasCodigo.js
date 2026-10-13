/**
 * 6 casillas para un código numérico. Se usa con x-modelable: el componente padre recibe el código
 * completo en su variable (p. ej. x-model="codigo") y, si la vacía, las casillas se limpian.
 */
export function casillasCodigo() {
    return {
        digitos: ['', '', '', '', '', ''],
        valor: '',

        init() {
            this.$watch('valor', (nuevo) => {
                if (nuevo === '' && this.digitos.some((d) => d !== '')) {
                    this.digitos = ['', '', '', '', '', ''];
                }
            });
        },

        casilla(i) {
            return this.$root.querySelectorAll('input')[i];
        },

        sincronizar() {
            this.valor = this.digitos.join('');
        },

        escribir(i, evento) {
            const numeros = evento.target.value.replace(/\D/g, '');

            // Autocompletado del teléfono o varios dígitos escritos de golpe en una casilla.
            if (numeros.length > 1) {
                this.repartir(numeros, i);
                return;
            }

            this.digitos[i] = numeros;
            evento.target.value = numeros;
            this.sincronizar();
            if (numeros && i < 5) {
                this.casilla(i + 1)?.focus();
            }
        },

        borrar(i, evento) {
            if (!this.digitos[i] && i > 0) {
                evento.preventDefault();
                this.digitos[i - 1] = '';
                this.sincronizar();
                this.casilla(i - 1)?.focus();
            }
        },

        /** Pega "123456", "123 456" o "123-456" repartiéndolo desde la casilla `desde`. */
        repartir(texto, desde = 0) {
            const numeros = String(texto).replace(/\D/g, '').slice(0, 6 - desde).split('');

            numeros.forEach((n, j) => (this.digitos[desde + j] = n));
            this.sincronizar();
            this.casilla(Math.min(desde + numeros.length, 5))?.focus();
        },
    };
}
