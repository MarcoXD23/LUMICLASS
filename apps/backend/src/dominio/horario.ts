export interface Horario {
  desde: string;
  hasta: string;
}

const aMinutos = (hora: string): number => {
  const [h = '0', m = '0'] = hora.split(':');
  return Number(h) * 60 + Number(m);
};

/**
 * true si `fecha` (hora local del servidor) está dentro de la franja.
 * Incluye "desde" y excluye "hasta". Si desde > hasta, la franja cruza la medianoche (22:00–06:00).
 * Si desde = hasta, la franja cubre todo el día. Sin horario, siempre está vigente.
 */
export function dentroDeHorario(horario: Horario | undefined, fecha: Date): boolean {
  if (!horario) return true;
  const actual = fecha.getHours() * 60 + fecha.getMinutes();
  const desde = aMinutos(horario.desde);
  const hasta = aMinutos(horario.hasta);
  if (desde === hasta) return true;
  if (desde < hasta) return actual >= desde && actual < hasta;
  return actual >= desde || actual < hasta;
}
