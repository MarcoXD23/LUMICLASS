/** "hace 5 s", "hace 3 min", "hace 2 h"; si pasó más de un día, la fecha y hora. */
export function haceCuanto(fecha: string | Date | null, ahora: Date = new Date()): string {
  if (fecha === null) return 'nunca';
  const momento = typeof fecha === 'string' ? new Date(fecha) : fecha;
  if (Number.isNaN(momento.getTime())) return 'fecha inválida';
  const segundos = Math.max(0, Math.round((ahora.getTime() - momento.getTime()) / 1000));
  if (segundos < 60) return `hace ${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return fechaYHora(momento);
}

export function fechaYHora(fecha: string | Date): string {
  const momento = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return momento.toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
}

/** 300 → "5 min"; 90 → "1 min 30 s"; 0 → "al instante". */
export function duracionLegible(segundos: number): string {
  if (segundos <= 0) return 'al instante';
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  if (minutos === 0) return `${resto} s`;
  return resto === 0 ? `${minutos} min` : `${minutos} min ${resto} s`;
}
