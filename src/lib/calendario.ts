/**
 * Cita del diagnóstico: texto "Nos vemos el …" y botón "Añadir a mi calendario" (.ics y
 * Google Calendar). Hora local de España; la visita dura 3 h (spec §0).
 */
import { fechaLarga } from "./invitacion";

export const DURACION_VISITA_H = 3;
export const ZONA = "Europe/Madrid";

/** "10:00:00" o "10:00" → "10:00". null si no es una hora válida. */
export function horaCorta(hora: string | null | undefined): string | null {
  const m = hora?.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** "Nos vemos el lunes 21 de septiembre a las 10:00 en vuestra oficina." (o null sin fecha) */
export function lineaCita(fecha: string | null, hora: string | null, lugar: string | null): string | null {
  if (!fecha) return null;
  const h = horaCorta(hora);
  const l = lugar?.trim();
  return `Nos vemos el ${fechaLarga(fecha)}${h ? ` a las ${h}` : ""}${l ? ` en ${l}` : ""}.`;
}

function sello(fecha: string, hora: string, sumarHoras = 0): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  // Aritmética en UTC solo para sumar horas sin que el huso cambie el día.
  const t = new Date(Date.UTC(a, m - 1, d, hh + sumarHoras, mm));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}T${p(t.getUTCHours())}${p(t.getUTCMinutes())}00`;
}

const escaparIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

export interface Cita {
  fecha: string;
  hora: string;
  lugar: string | null;
  empresa: string;
}

const titulo = (c: Cita) => `Diagnóstico Orkesta · ${c.empresa}`;
const descripcion = "Visita de diagnóstico con Aitor Colino, de ORKESTA Automatización & IA (unas 3 horas).";

/** Contenido .ics (hora local de Madrid). */
export function ics(c: Cita, uid: string): string {
  const h = horaCorta(c.hora)!;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Orkesta//Diagnostico//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}@diagnostico.orkestaia.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=${ZONA}:${sello(c.fecha, h)}`,
    `DTEND;TZID=${ZONA}:${sello(c.fecha, h, DURACION_VISITA_H)}`,
    `SUMMARY:${escaparIcs(titulo(c))}`,
    `DESCRIPTION:${escaparIcs(descripcion)}`,
    ...(c.lugar ? [`LOCATION:${escaparIcs(c.lugar)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Enlace para añadir la cita en Google Calendar. */
export function enlaceGoogle(c: Cita): string {
  const h = horaCorta(c.hora)!;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo(c),
    dates: `${sello(c.fecha, h)}/${sello(c.fecha, h, DURACION_VISITA_H)}`,
    ctz: ZONA,
    details: descripcion,
    ...(c.lugar ? { location: c.lugar } : {}),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
