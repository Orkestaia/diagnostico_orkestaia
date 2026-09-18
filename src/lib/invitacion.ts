/**
 * Mensaje de invitación por WhatsApp (spec §3). Textos literales de la spec; `[día]` en
 * formato "lunes 21" (la plantilla ya pone "del" / "el" delante).
 */

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-09-21" → "lunes 21". Se calcula en UTC para que la zona horaria no cambie el día. */
export function diaReunion(fechaISO: string): string {
  const [a, m, d] = fechaISO.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return `${DIAS[f.getUTCDay()]} ${d}`;
}

/** "2026-09-21" → "lunes 21 de septiembre" (listado del panel y pantallas del cliente). */
export function fechaLarga(fechaISO: string): string {
  const [a, m, d] = fechaISO.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return `${DIAS[f.getUTCDay()]} ${d} de ${MESES[m - 1]}`;
}

export function mensajeInvitacion(p: {
  nombre: string;
  empresa: string;
  enlace: string;
  fechaReunion: string | null;
}): string {
  if (p.fechaReunion) {
    const dia = diaReunion(p.fechaReunion);
    return [
      `Hola ${p.nombre}, soy Aitor, de Orkesta. Para aprovechar al máximo el diagnóstico del ${dia} en ${p.empresa}, te dejo unas preguntas rápidas: son 5 minutos y se hacen desde el móvil. Así ese día empezamos directamente por lo importante.`,
      "",
      p.enlace,
      "",
      `Si te quedas a medias, el enlace guarda lo que lleves. Nos vemos el ${dia}.`,
    ].join("\n");
  }
  return [
    `Hola ${p.nombre}, soy Aitor, de Orkesta. Antes de vernos, te dejo unas preguntas rápidas sobre cómo trabajáis en ${p.empresa}: son 5 minutos y se hacen desde el móvil.`,
    "",
    p.enlace,
    "",
    "Si te quedas a medias, el enlace guarda lo que lleves.",
  ].join("\n");
}

/**
 * Teléfono para wa.me: solo dígitos y con prefijo. Los números españoles de 9 cifras reciben
 * el 34 (sin él wa.me no abre; mismo arreglo que el CRM de Mission Control).
 * Devuelve null si no parece un teléfono.
 */
export function telefonoWhatsApp(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  let t = telefono.replace(/[^\d+]/g, "");
  if (t.startsWith("+")) t = t.slice(1);
  else if (t.startsWith("00")) t = t.slice(2);
  t = t.replace(/\D/g, "");
  if (/^[6789]\d{8}$/.test(t)) t = `34${t}`;
  return t.length >= 10 && t.length <= 15 ? t : null;
}

export function enlaceWhatsApp(telefono: string | null | undefined, mensaje: string): string | null {
  const t = telefonoWhatsApp(telefono);
  return t ? `https://wa.me/${t}?text=${encodeURIComponent(mensaje)}` : null;
}
