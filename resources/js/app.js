import Alpine from 'alpinejs';
import { avisar, registrarAvisos } from './avisos';
import { control } from './paginas/control';
import { ingreso, olvide, registro, restablecer, sesion } from './paginas/cuenta';
import { estadisticas } from './paginas/estadisticas';
import { estadoSalon } from './paginas/estadoSalon';
import { historial } from './paginas/historial';
import { reglas } from './paginas/reglas';
import { salones } from './paginas/salones';
import { simulador } from './paginas/simulador';

registrarAvisos();

// Errores que nadie atrapó: se muestran en español en vez de fallar en silencio.
window.addEventListener('unhandledrejection', (evento) => {
    avisar('error', evento.reason?.message ?? 'Ocurrió un error inesperado en la página.');
});
window.addEventListener('error', () => {
    avisar('error', 'Ocurrió un error inesperado en la página. Si se repite, recárgala.');
});
window.addEventListener('offline', () => avisar('error', 'Este equipo perdió la conexión a la red. Los datos se pausan.'));
window.addEventListener('online', () => avisar('info', 'Conexión a la red recuperada.'));

Alpine.data('ingreso', ingreso);
Alpine.data('registro', registro);
Alpine.data('olvide', olvide);
Alpine.data('restablecer', restablecer);
Alpine.data('sesion', sesion);
Alpine.data('salones', salones);
// Inicio y Sensores solo muestran el estado del salón.
Alpine.data('estadoSalon', estadoSalon);
Alpine.data('control', control);
Alpine.data('reglas', reglas);
Alpine.data('historial', historial);
Alpine.data('estadisticas', estadisticas);
Alpine.data('simulador', simulador);

window.Alpine = Alpine;
Alpine.start();
