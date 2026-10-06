/**
 * Cliente de la API de LUMICLASS para el navegador.
 * Usa la cookie de sesión (lumiclass_session) + token CSRF; los errores llegan como ErrorApi en español.
 */

const BASE = '/api/v1';
let csrfListo = false;

export class ErrorApi extends Error {
    constructor(estado, codigo, mensaje, detalles = null) {
        super(mensaje);
        this.estado = estado;
        this.codigo = codigo;
        this.detalles = detalles;
    }

    /** Primer mensaje de cada campo inválido: { email: '...', password: '...' }. */
    erroresPorCampo() {
        return Object.fromEntries(Object.entries(this.detalles ?? {}).map(([campo, mensajes]) => [campo, mensajes[0]]));
    }
}

function leerCookie(nombre) {
    const par = document.cookie.split('; ').find((c) => c.startsWith(`${nombre}=`));

    return par ? decodeURIComponent(par.split('=')[1]) : '';
}

async function asegurarCsrf() {
    if (!csrfListo) {
        await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' });
        csrfListo = true;
    }
}

/**
 * Llama a la API y devuelve el JSON. Lanza ErrorApi (en español) si algo falla.
 *
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} metodo
 * @param {string} ruta  por ejemplo '/salones/1/estado'
 * @param {object} [cuerpo]
 */
export async function api(metodo, ruta, cuerpo) {
    try {
        return await enviar(metodo, ruta, cuerpo);
    } catch (error) {
        // 419: el token CSRF venció (p. ej. la pestaña quedó abierta mucho tiempo). Se pide otro y se reintenta una vez.
        if (error instanceof ErrorApi && error.estado === 419) {
            return enviar(metodo, ruta, cuerpo);
        }
        throw error;
    }
}

async function enviar(metodo, ruta, cuerpo) {
    if (!navigator.onLine) {
        throw new ErrorApi(0, 'sin_conexion', 'Este equipo no tiene conexión a la red.');
    }

    if (metodo !== 'GET') {
        await asegurarCsrf();
    }

    let respuesta;
    try {
        respuesta = await fetch(BASE + ruta, {
            method: metodo,
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': leerCookie('XSRF-TOKEN'),
            },
            body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        });
    } catch {
        throw new ErrorApi(0, 'sin_conexion', 'Sin conexión con el servidor. Revisa que esté encendido.');
    }

    if (respuesta.status === 204) {
        return null;
    }

    let datos = null;
    try {
        datos = await respuesta.json();
    } catch {
        // Respuesta sin JSON (p. ej. el servidor se cayó a mitad de camino).
    }

    if (!respuesta.ok) {
        if (respuesta.status === 401 && !ruta.startsWith('/auth/')) {
            window.location.href = '/ingresar';
        }

        if (respuesta.status === 419) {
            csrfListo = false;
        }

        throw new ErrorApi(
            respuesta.status,
            datos?.error?.codigo ?? 'error',
            datos?.error?.mensaje ?? `Error inesperado del servidor (HTTP ${respuesta.status}).`,
            datos?.error?.detalles ?? null,
        );
    }

    return datos;
}

/**
 * Id único de cada orden (evita ejecutarla dos veces si se repite).
 * crypto.randomUUID solo existe en https o localhost; desde un celular por la IP de la red se usa el respaldo.
 */
export function nuevoIdSolicitud() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }

    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
