/** Textos y fechas para la interfaz (en español). */

export const etiquetas = {
    luz: { encendida: 'Encendida', apagada: 'Apagada', desconocida: 'Desconocido' },
    ocupacion: { ocupado: 'Ocupado', vacio: 'Vacío', desconocida: 'Sin datos' },
    modo: { automatico: 'Automático', manual: 'Manual' },
    conexion: { activo: 'Activo', inactivo: 'Inactivo', falla: 'Falla' },
    respuestaServo: { ok: 'Responde bien', falla: 'Falla', lento: 'Lento', sin_respuesta: 'No responde' },
    severidad: { info: 'Info', advertencia: 'Advertencia', error: 'Error' },
    origen: { usuario: 'Usuario', regla: 'Regla', sistema: 'Sistema', simulador: 'Simulador' },
    evento: {
        'luz.comando': 'Orden a una luz',
        'luz.confirmada': 'Luz confirmada',
        'luz.interruptor': 'Interruptor manual',
        'comando.rechazado': 'Orden rechazada',
        'actuador.falla': 'Falla de servo',
        'actuador.sin_respuesta': 'Servo sin respuesta',
        'actuador.conexion': 'Conexión de servo',
        'sensor.presencia': 'Presencia',
        'sensor.conexion': 'Conexión de sensor',
        'zona.modo': 'Cambio de modo',
        'regla.creada': 'Regla creada',
        'regla.actualizada': 'Regla editada',
        'regla.eliminada': 'Regla borrada',
        'simulador.reinicio': 'Simulador reiniciado',
        'demo.preparada': 'Datos de ejemplo cargados',
        configuracion: 'Cambio de configuración',
    },
};

export function etiqueta(grupo, valor) {
    return etiquetas[grupo]?.[valor] ?? valor ?? '—';
}

const formatoFechaHora = new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'medium' });

export function fechaHora(iso) {
    return iso ? formatoFechaHora.format(new Date(iso)) : '—';
}

/** "hace 5 s", "hace 3 min", "hace 2 h" o la fecha si es más antiguo. */
export function haceCuanto(iso, ahora = Date.now()) {
    if (!iso) {
        return 'sin datos';
    }

    const segundos = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000));

    if (segundos < 60) {
        return `hace ${segundos} s`;
    }
    if (segundos < 3600) {
        return `hace ${Math.floor(segundos / 60)} min`;
    }
    if (segundos < 86400) {
        return `hace ${Math.floor(segundos / 3600)} h`;
    }

    return fechaHora(iso);
}

/** 9300 → "2 h 35 min"; 2700 → "45 min"; 20 → "menos de 1 min". */
export function duracion(segundos) {
    const minutos = Math.round((segundos ?? 0) / 60);

    if (segundos > 0 && minutos === 0) {
        return 'menos de 1 min';
    }

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    if (!horas) {
        return `${resto} min`;
    }

    return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

/** Texto de una condición de regla: "Ocupado" o "Vacío durante 5 min". */
export function describirCondicion(condicion) {
    const base = etiqueta('ocupacion', condicion?.presencia);
    const segundos = condicion?.duracion_segundos ?? 0;

    if (!segundos) {
        return base;
    }

    return segundos % 60 === 0 ? `${base} durante ${segundos / 60} min` : `${base} durante ${segundos} s`;
}
