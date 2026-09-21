/**
 * Lo que hace el cliente en su mapa (spec §7, mapa_v1.2): elegir sus 3 prioridades y, detrás de
 * un interruptor, el aviso de que ha abierto el mapa. Funciones puras: las rutas guardan y avisan.
 */
import type { Mapa } from "./mapa";

// ── Prioridades ──

export const MAX_PRIORIDADES = 3;

export interface Prioridades {
  /** Títulos de las mejoras de la hoja de ruta elegidas, en el orden en que las marcó. */
  seleccion: string[];
  fecha: string;
  /** Cuántas veces las ha cambiado (son editables). */
  cambios: number;
}

/** Títulos que el cliente puede elegir: los de la hoja de ruta, sin repetir. */
export function mejorasElegibles(mapa: Mapa): string[] {
  return [...new Set(mapa.hoja_de_ruta.flatMap((f) => f.items.map((it) => it.titulo)))];
}

/** Valida una selección contra el mapa: hasta 3, sin repetir y que existan. */
export function validarPrioridades(
  mapa: Mapa,
  seleccion: unknown,
): { ok: true; seleccion: string[] } | { ok: false; error: string } {
  if (!Array.isArray(seleccion) || !seleccion.every((x) => typeof x === "string"))
    return { ok: false, error: "Selección no válida" };
  const unicos = [...new Set(seleccion as string[])];
  if (unicos.length > MAX_PRIORIDADES)
    return { ok: false, error: `Como mucho ${MAX_PRIORIDADES} prioridades` };
  const validas = new Set(mejorasElegibles(mapa));
  if (!unicos.every((x) => validas.has(x)))
    return { ok: false, error: "Alguna mejora no está en el mapa" };
  return { ok: true, seleccion: unicos };
}

export function nuevasPrioridades(
  anterior: Prioridades | null,
  seleccion: string[],
  ahora: Date,
): Prioridades {
  return {
    seleccion,
    fecha: ahora.toISOString(),
    cambios: anterior ? anterior.cambios + 1 : 0,
  };
}

// ── Aperturas ──

export type Dispositivo = "movil" | "tableta" | "escritorio";
export type TipoAviso = "primera" | "otro_dispositivo" | "reapertura";

export interface Aperturas {
  total: number;
  primera_at: string;
  ultima_at: string;
  ultimo_aviso_at: string | null;
  /** Identificadores aleatorios de navegador (no son IP ni huella): para «otro dispositivo». */
  dispositivos: { id: string; tipo: Dispositivo; primera_at: string }[];
}

const UN_DIA = 24 * 60 * 60 * 1000;
export const MAX_DISPOSITIVOS = 20;

export function dispositivoDe(userAgent: string | null): Dispositivo {
  const ua = userAgent ?? "";
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return "tableta";
  if (/Mobi|iPhone|Android/i.test(ua)) return "movil";
  return "escritorio";
}

/**
 * Registra una apertura y decide si se avisa: la primera, al momento; un dispositivo nuevo, al
 * momento; las reaperturas, como mucho un aviso al día.
 */
export function registrarApertura(
  anterior: Aperturas | null,
  visita: { id: string; tipo: Dispositivo },
  ahora: Date,
): { aperturas: Aperturas; aviso: TipoAviso | null } {
  const t = ahora.toISOString();
  if (!anterior) {
    return {
      aperturas: {
        total: 1,
        primera_at: t,
        ultima_at: t,
        ultimo_aviso_at: t,
        dispositivos: [{ id: visita.id, tipo: visita.tipo, primera_at: t }],
      },
      aviso: "primera",
    };
  }
  const nuevo = !anterior.dispositivos.some((d) => d.id === visita.id);
  const dispositivos = nuevo
    ? [...anterior.dispositivos, { id: visita.id, tipo: visita.tipo, primera_at: t }].slice(
        -MAX_DISPOSITIVOS,
      )
    : anterior.dispositivos;
  const haceUnDia =
    !anterior.ultimo_aviso_at || ahora.getTime() - new Date(anterior.ultimo_aviso_at).getTime() >= UN_DIA;
  const aviso: TipoAviso | null = nuevo ? "otro_dispositivo" : haceUnDia ? "reapertura" : null;
  return {
    aperturas: {
      ...anterior,
      total: anterior.total + 1,
      ultima_at: t,
      ultimo_aviso_at: aviso ? t : anterior.ultimo_aviso_at,
      dispositivos,
    },
    aviso,
  };
}
