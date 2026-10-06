<?php

namespace App\Enums;

enum TipoEvento: string
{
    case LuzComando = 'luz.comando';
    case LuzConfirmada = 'luz.confirmada';
    case LuzInterruptor = 'luz.interruptor';
    case ComandoRechazado = 'comando.rechazado';
    case ActuadorFalla = 'actuador.falla';
    case ActuadorSinRespuesta = 'actuador.sin_respuesta';
    case ActuadorConexion = 'actuador.conexion';
    case SensorPresencia = 'sensor.presencia';
    case SensorConexion = 'sensor.conexion';
    case ZonaModo = 'zona.modo';
    case ReglaCreada = 'regla.creada';
    case ReglaActualizada = 'regla.actualizada';
    case ReglaEliminada = 'regla.eliminada';
    case SimuladorReinicio = 'simulador.reinicio';
    case DemoPreparada = 'demo.preparada';
    case Configuracion = 'configuracion';
}
