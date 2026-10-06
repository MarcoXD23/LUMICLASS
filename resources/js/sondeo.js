/**
 * Consulta periódica (polling): cada pantalla vuelve a pedir sus datos cada `intervalo` ms.
 * - Si una consulta falla, espera cada vez más (3 s → 6 → 12 → máx. 30 s) y conserva los últimos datos.
 * - Se pausa con la pestaña oculta o sin red, y consulta apenas vuelven.
 * `cargar` debe lanzar un error si la consulta falló.
 */
export function crearSondeo(cargar, intervalo = 3000, { maximo = 30000, alRecuperar = () => {} } = {}) {
    let temporizador = null;
    let enCurso = false;
    let fallosSeguidos = 0;
    let detenido = true;

    function programar() {
        clearTimeout(temporizador);
        if (detenido) {
            return;
        }
        const espera = fallosSeguidos === 0 ? intervalo : Math.min(intervalo * 2 ** fallosSeguidos, maximo);
        temporizador = setTimeout(ejecutar, espera);
    }

    async function ejecutar() {
        if (enCurso || document.hidden || !navigator.onLine) {
            programar();
            return;
        }

        enCurso = true;
        try {
            await cargar();
            if (fallosSeguidos > 0) {
                alRecuperar();
            }
            fallosSeguidos = 0;
        } catch {
            fallosSeguidos++;
        } finally {
            enCurso = false;
            programar();
        }
    }

    function alVolver() {
        if (!document.hidden && navigator.onLine) {
            ejecutar();
        }
    }

    return {
        iniciar() {
            detenido = false;
            ejecutar();
            document.addEventListener('visibilitychange', alVolver);
            window.addEventListener('online', alVolver);
        },
        detener() {
            detenido = true;
            clearTimeout(temporizador);
            document.removeEventListener('visibilitychange', alVolver);
            window.removeEventListener('online', alVolver);
        },
        /** Consulta ya (p. ej. después de una orden) sin esperar el turno. */
        ahora: ejecutar,
        get fallosSeguidos() {
            return fallosSeguidos;
        },
    };
}
