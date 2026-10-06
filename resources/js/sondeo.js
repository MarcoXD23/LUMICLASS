/**
 * Consulta periódica (polling): cada pantalla vuelve a pedir sus datos cada `intervalo` ms.
 * Se pausa con la pestaña oculta. Si una consulta falla, se conservan los últimos datos.
 */
export function crearSondeo(cargar, intervalo = 3000) {
    let temporizador = null;
    let enCurso = false;

    async function ejecutar() {
        if (enCurso || document.hidden) {
            return;
        }

        enCurso = true;
        try {
            await cargar();
        } finally {
            enCurso = false;
        }
    }

    function alCambiarVisibilidad() {
        if (!document.hidden) {
            ejecutar();
        }
    }

    return {
        iniciar() {
            ejecutar();
            temporizador = setInterval(ejecutar, intervalo);
            document.addEventListener('visibilitychange', alCambiarVisibilidad);
        },
        detener() {
            clearInterval(temporizador);
            document.removeEventListener('visibilitychange', alCambiarVisibilidad);
        },
        ahora: ejecutar,
    };
}
