import type { EventoDto } from '@lumiclass/compartido';
import type { FastifyInstance } from 'fastify';
import type { ServerResponse } from 'node:http';
import { ErrorDominio } from '../dominio/errores';
import type { Difusor } from '../servicios/difusor';

interface OpcionesTiempoReal {
  maxConexiones: number;
  latidoMs: number;
}

/** Formato de un mensaje SSE: "event: nombre\ndata: json\n\n". */
const mensajeSse = (evento: string, datos: unknown, id?: number) =>
  `${id === undefined ? '' : `id: ${id}\n`}event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;

/**
 * GET /tiempo-real: flujo SSE. Cada evento del historial se envía al momento;
 * el navegador recarga los datos que necesita. Devuelve la función que cierra
 * todas las conexiones (se usa al apagar el servidor).
 */
export function rutasTiempoReal(
  api: FastifyInstance,
  difusor: Difusor<EventoDto>,
  opciones: OpcionesTiempoReal,
): () => void {
  const conexiones = new Set<ServerResponse>();

  api.get('/tiempo-real', (peticion, respuesta) => {
    if (conexiones.size >= opciones.maxConexiones) {
      throw new ErrorDominio(
        503,
        'DEMASIADAS_CONEXIONES',
        'Hay demasiadas pantallas conectadas en tiempo real; intenta más tarde',
      );
    }

    respuesta.hijack();
    const salida = respuesta.raw;
    salida.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    // El navegador reintenta a los 3 s si se corta.
    salida.write('retry: 3000\n\n');
    salida.write(mensajeSse('conectado', { fecha: new Date().toISOString() }));
    conexiones.add(salida);

    const escribir = (texto: string) => {
      if (!salida.writableEnded) salida.write(texto);
    };
    const dejarDeEscuchar = difusor.suscribir((evento) =>
      escribir(mensajeSse('evento', evento, evento.id)),
    );
    // Comentario periódico: mantiene viva la conexión a través de proxies.
    const latido = setInterval(() => escribir(': latido\n\n'), opciones.latidoMs);
    latido.unref();

    peticion.raw.on('close', () => {
      clearInterval(latido);
      dejarDeEscuchar();
      conexiones.delete(salida);
    });
  });

  return () => {
    for (const salida of conexiones) salida.end();
    conexiones.clear();
  };
}
