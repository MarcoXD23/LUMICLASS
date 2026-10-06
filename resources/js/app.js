import Alpine from 'alpinejs';
import { registrarAvisos } from './avisos';
import { control } from './paginas/control';
import { ingreso, registro, sesion } from './paginas/cuenta';
import { estadoSalon } from './paginas/estadoSalon';
import { historial } from './paginas/historial';
import { reglas } from './paginas/reglas';
import { salones } from './paginas/salones';
import { simulador } from './paginas/simulador';

registrarAvisos();

Alpine.data('ingreso', ingreso);
Alpine.data('registro', registro);
Alpine.data('sesion', sesion);
Alpine.data('salones', salones);
// Inicio y Sensores solo muestran el estado del salón.
Alpine.data('estadoSalon', estadoSalon);
Alpine.data('control', control);
Alpine.data('reglas', reglas);
Alpine.data('historial', historial);
Alpine.data('simulador', simulador);

window.Alpine = Alpine;
Alpine.start();
