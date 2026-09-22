/**
 * Visita (spec §4, batería, ajustes de JARVIS del 19-sep). Funciones puras compartidas por la
 * pantalla, la API y el export.
 *
 * Dónde vive cada cosa:
 * - `respuestas_visita` (visible): campos no privados, correcciones al previo, marca de inicio.
 * - `procesos` (visible): tarjetas de proceso SIN campos 🔒.
 * - `privado` (solo servidor y vista privada): campos 🔒 y la parte 🔒 de cada tarjeta.
 * El servidor rechaza cualquier campo privado que llegue por la parte visible (y al revés).
 */
import { CAMPOS_VISITA, DIAS_HABILES_ENTREGA, type CampoVisita } from "@/config/consultor/bloques";
import { plantillasDeSector } from "@/config/consultor/plantillas";
import { camposDeSector } from "@/config/consultor/sector";
import {
  AREAS,
  ERRORES,
  LIMITES_TARJETA,
  PERIODOS,
  QUIEN,
  tarjetaNueva,
  type Periodo,
  type TarjetaPrivada,
  type TarjetaProceso,
} from "@/config/consultor/tarjeta";
import { PRECARGAS } from "@/config/previo";
import type { Respuestas, SectorId } from "@/config/tipos";
import { hoyHorasMes } from "./calculo";
import { leerEntradas } from "./preguntas";

// ── Formas de los datos ──

export interface RespuestasVisita {
  /** Cuándo empezó la visita (ISO): base del temporizador de 150 min. */
  inicio_at?: string;
  /** Campos visibles de la batería (a.*, c.*, d.*, e.*) y extras visibles del bloque A. */
  campos?: Record<string, unknown>;
  /** Correcciones a lo que contestó en el previo ("Lo que nos contaste"). El previo original no se toca. */
  correcciones_previo?: Respuestas;
}

export interface CosteHora {
  operativo: number;
  tactico: number;
  directivo: number;
  /** JARVIS: se pregunta siempre y se guarda si es el coste real del cliente o el orientativo. */
  origen: "cliente" | "orientativo";
}

export interface PrivadoVisita {
  campos?: Record<string, unknown>;
  procesos?: Record<string, Partial<TarjetaPrivada>>;
}

/** Lo que manda la pantalla (y la cola sin conexión) al servidor. */
export interface ParcheVisita {
  inicio_at?: string;
  campos?: Record<string, unknown>;
  correcciones_previo?: Respuestas;
  procesos?: TarjetaProceso[];
  privado_campos?: Record<string, unknown>;
  privado_procesos?: Record<string, Partial<TarjetaPrivada>>;
}

// ── Privado o visible ──

/**
 * Clave de un extra del bloque A de la batería v1 (`extra:<texto>`). En la v2 los extras son
 * preguntas con id propio (§5): esto solo sirve para leer diagnósticos antiguos.
 */
export const claveExtra = (texto: string) => `extra:${texto}`;

/** Notas libres de Aitor durante la visita (🔒). No son de la batería. */
export const ID_NOTAS = "x.notas";

export function idsCampos(sector: SectorId): { visibles: Set<string>; privados: Set<string> } {
  const visibles = new Set<string>();
  const privados = new Set<string>();
  for (const c of camposDeSector(CAMPOS_VISITA, sector))
    (c.privado ? privados : visibles).add(c.id);
  privados.add(ID_NOTAS);
  return { visibles, privados };
}

// ── Saneado (lo que llega del navegador no es de fiar) ──

const MAX: number = LIMITES_TARJETA.textoVisita;
const texto = (v: unknown, max = MAX) => (typeof v === "string" ? v.slice(0, max) : "");
const numero = (v: unknown, min = 0, max = 1e7) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(v, min), max) : null;

/** Recorta textos largos en cualquier valor anidado (listas del inventario, señales…). */
function sanearValor(v: unknown, prof = 0): unknown {
  if (prof > 4) return null;
  if (typeof v === "string") return v.slice(0, MAX);
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean" || v === null) return v;
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => sanearValor(x, prof + 1));
  if (typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(0, 30))
      o[k.slice(0, 60)] = sanearValor(x, prof + 1);
    return o;
  }
  return null;
}

export function sanearTarjeta(t: Partial<TarjetaProceso>): TarjetaProceso | null {
  if (!t || typeof t.id !== "string" || !/^[\w-]{1,40}$/.test(t.id)) return null;
  const periodos = PERIODOS.map((p) => p.id) as readonly string[];
  const pasos = Array.isArray(t.pasos) ? t.pasos : [];
  const reg = t.hoyRegistro;
  return tarjetaNueva({
    id: t.id,
    nombre: texto(t.nombre, LIMITES_TARJETA.nombre),
    area: (AREAS as readonly string[]).includes(t.area as string)
      ? (t.area as TarjetaProceso["area"])
      : null,
    plantilla: typeof t.plantilla === "string" ? t.plantilla.slice(0, 120) : null,
    disparador: texto(t.disparador),
    pasos: pasos
      .filter((p) => p && typeof p.id === "string")
      .slice(0, LIMITES_TARJETA.pasosMax)
      .map((p) => ({
        id: String(p.id).slice(0, 40),
        texto: texto(p.texto, LIMITES_TARJETA.paso),
        quien: p.quien === "sistema" ? "sistema" : "persona",
      })),
    quien: QUIEN.some((q) => q.etiqueta === t.quien) ? (t.quien as string) : null,
    quienPersonas: numero(t.quienPersonas, 0, 10000),
    volumen: numero(t.volumen),
    volumenUnidad: texto(t.volumenUnidad, 40),
    volumenPeriodo: periodos.includes(t.volumenPeriodo as string)
      ? (t.volumenPeriodo as Periodo)
      : "mes",
    minutosPorVez: numero(t.minutosPorVez, 0, 100000),
    herramientas: Array.isArray(t.herramientas)
      ? t.herramientas.slice(0, 20).map((h) => texto(h, 80))
      : [],
    atasco: texto(t.atasco),
    errores: (ERRORES as readonly string[]).includes(t.errores as string)
      ? (t.errores as TarjetaProceso["errores"])
      : null,
    erroresEjemplo: texto(t.erroresEjemplo),
    cita: texto(t.cita, LIMITES_TARJETA.cita),
    visto: t.visto === true,
    prioridadCliente: [1, 2, 3].includes(t.prioridadCliente as number)
      ? (t.prioridadCliente as 1 | 2 | 3)
      : null,
    rapida: t.rapida === true,
    origenDatos: t.origenDatos === "previo" ? "previo" : "visita",
    hoyRegistro:
      reg && typeof reg.horasMes === "number" && typeof reg.fecha === "string"
        ? {
            horasMes: reg.horasMes,
            fecha: reg.fecha.slice(0, 30),
            origen: reg.origen === "previo" ? "previo" : "visita",
          }
        : null,
  });
}

export function sanearPrivadoTarjeta(p: Partial<TarjetaPrivada>): Partial<TarjetaPrivada> {
  const r: Partial<TarjetaPrivada> = {};
  if ("pctAutomatizable" in p) r.pctAutomatizable = numero(p.pctAutomatizable, 0, 0.7);
  if ("ideaSolucion" in p) r.ideaSolucion = texto(p.ideaSolucion);
  if ("dependencias" in p) r.dependencias = texto(p.dependencias);
  if ("nota" in p) r.nota = texto(p.nota);
  return r;
}

/**
 * Valida un parche. Los campos visibles no pueden traer ids privados ni al revés: así ningún
 * dato 🔒 puede acabar en una columna que se enseñe al cliente, aunque la pantalla se equivoque.
 */
export function validarParche(
  sector: SectorId,
  p: ParcheVisita,
): { ok: ParcheVisita; rechazados: string[] } {
  const { visibles, privados } = idsCampos(sector);
  const ok: ParcheVisita = {};
  const rechazados: string[] = [];

  if (typeof p.inicio_at === "string" && !Number.isNaN(Date.parse(p.inicio_at)))
    ok.inicio_at = p.inicio_at;

  if (p.campos && typeof p.campos === "object") {
    ok.campos = {};
    for (const [k, v] of Object.entries(p.campos)) {
      if (visibles.has(k)) ok.campos[k] = sanearValor(v);
      else rechazados.push(k);
    }
  }
  if (p.privado_campos && typeof p.privado_campos === "object") {
    ok.privado_campos = {};
    for (const [k, v] of Object.entries(p.privado_campos)) {
      if (privados.has(k)) ok.privado_campos[k] = sanearValor(v);
      else rechazados.push(`privado:${k}`);
    }
  }
  if (p.correcciones_previo && typeof p.correcciones_previo === "object") {
    ok.correcciones_previo = sanearValor(p.correcciones_previo) as Respuestas;
  }
  if (Array.isArray(p.procesos)) {
    ok.procesos = p.procesos
      .slice(0, 20)
      .map(sanearTarjeta)
      .filter((t): t is TarjetaProceso => t !== null);
  }
  if (p.privado_procesos && typeof p.privado_procesos === "object") {
    ok.privado_procesos = {};
    for (const [id, v] of Object.entries(p.privado_procesos).slice(0, 20)) {
      if (/^[\w-]{1,40}$/.test(id) && v && typeof v === "object")
        ok.privado_procesos[id] = sanearPrivadoTarjeta(v);
    }
  }
  return { ok, rechazados };
}

/** Une dos parches (el más nuevo gana, campo a campo). Lo usa la cola sin conexión. */
export function unirParches(a: ParcheVisita, b: ParcheVisita): ParcheVisita {
  const privado_procesos = { ...(a.privado_procesos ?? {}) };
  for (const [id, v] of Object.entries(b.privado_procesos ?? {}))
    privado_procesos[id] = { ...(privado_procesos[id] ?? {}), ...v };
  return {
    inicio_at: a.inicio_at ?? b.inicio_at,
    campos: a.campos || b.campos ? { ...a.campos, ...b.campos } : undefined,
    correcciones_previo:
      a.correcciones_previo || b.correcciones_previo
        ? { ...a.correcciones_previo, ...b.correcciones_previo }
        : undefined,
    procesos: b.procesos ?? a.procesos,
    privado_campos:
      a.privado_campos || b.privado_campos
        ? { ...a.privado_campos, ...b.privado_campos }
        : undefined,
    privado_procesos: Object.keys(privado_procesos).length ? privado_procesos : undefined,
  };
}

// ── Valores guardados con otro tipo (solo hacia adelante) ──

/**
 * Un campo que pasó de una opción a varias (`d.info_clientes`, `e.exito`, 22-sep) puede tener
 * guardado un texto: se lee como lista de un elemento. Nada se reescribe en la base de datos.
 */
export function valorCampo(c: Pick<CampoVisita, "tipo">, v: unknown): unknown {
  if (c.tipo === "multi") {
    if (typeof v === "string") return v ? [v] : [];
    if (v === null || v === undefined) return [];
  }
  return v;
}

// ── Tarjetas sugeridas con datos del previo (banco §9) ──

let contador = 0;
export const nuevoIdTarjeta = () => `t${Date.now().toString(36)}${(contador++).toString(36)}`;

/**
 * Tarjetas que el previo ya permite rellenar. No se crean solas: salen arriba como sugeridas
 * ("con datos del previo") y Aitor las añade. Los minutos solo si los dio el cliente.
 */
export function sugeridasDelPrevio(
  sector: SectorId,
  previo: Respuestas,
  /**
   * Respuestas por confirmar (contestadas a otra redacción, `redacciones.ts`): la tarjeta se
   * sugiere igual, pero sin volumen; se pregunta en la visita.
   */
  porConfirmar: Iterable<string> = [],
): TarjetaProceso[] {
  const e = leerEntradas(previo, sector);
  const plantillas = plantillasDeSector(sector);
  const pendientes = new Set(porConfirmar);
  const r: TarjetaProceso[] = [];
  for (const pc of PRECARGAS) {
    if (pc.sector !== "todos" && pc.sector !== sector) continue;
    const sinVolumen = pendientes.has(pc.volumen.desde);
    const volumen = sinVolumen ? null : e.n(pc.volumen.desde);
    if (!sinVolumen && (volumen === undefined || volumen === null || volumen === 0)) continue;
    const minutos = pc.minutosDesde ? e.n(pc.minutosDesde) : null;
    let nombre: string;
    let plantilla: string | null = null;
    if (typeof pc.tarjeta === "string") {
      nombre = pc.tarjeta;
      plantilla = pc.tarjeta;
    } else {
      nombre = e.t(pc.tarjeta.nombreDesde) ?? "";
      if (!nombre) continue;
    }
    const pl = plantillas.find((x) => x.nombre === plantilla);
    r.push(
      tarjetaNueva({
        id: `previo-${pc.volumen.desde.replace(/\W+/g, "-")}`,
        nombre,
        plantilla,
        area: pl?.area ?? null,
        volumen: volumen ?? null,
        volumenPeriodo: pc.volumen.periodo,
        minutosPorVez: typeof minutos === "number" ? minutos : null,
        origenDatos: sinVolumen ? "visita" : "previo",
      }),
    );
  }
  return r;
}

// ── Fechas ──

/** Suma días hábiles (sin sábados ni domingos; sin festivos). Devuelve YYYY-MM-DD. */
export function sumarDiasHabiles(desdeISO: string, n = DIAS_HABILES_ENTREGA): string {
  const [a, m, d] = desdeISO.slice(0, 10).split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  let quedan = n;
  while (quedan > 0) {
    f.setUTCDate(f.getUTCDate() + 1);
    const dia = f.getUTCDay();
    if (dia !== 0 && dia !== 6) quedan--;
  }
  return f.toISOString().slice(0, 10);
}

// ── Cierre ──

/**
 * Registro fijo de las horas de hoy de cada tarjeta (JARVIS, 19-sep). Se escribe una vez, al
 * cerrar la visita; si una tarjeta ya lo tenía, no se toca.
 */
export function conRegistroHoy(
  tarjetas: TarjetaProceso[],
  sector: SectorId,
  fechaISO: string,
): TarjetaProceso[] {
  return tarjetas.map((t) => {
    if (t.hoyRegistro) return t;
    const h = hoyHorasMes(t, sector);
    if (h === null) return t;
    return {
      ...t,
      hoyRegistro: { horasMes: Math.round(h * 100) / 100, fecha: fechaISO, origen: t.origenDatos },
    };
  });
}

/** Costes por hora (banco §2.1) y si son del cliente o los orientativos. */
export function costeHora(privadoCampos: Record<string, unknown> | undefined): CosteHora | null {
  const v = privadoCampos?.["c.coste_perfil"] as Partial<CosteHora> | undefined;
  if (!v || (v.origen !== "cliente" && v.origen !== "orientativo")) return null;
  const n = (x: unknown) => (typeof x === "number" && x > 0 ? x : null);
  const [o, t, d] = [n(v.operativo), n(v.tactico), n(v.directivo)];
  if (!o || !t || !d) return null;
  return { operativo: o, tactico: t, directivo: d, origen: v.origen };
}

/** El orientativo es el del banco §2.1 (14 / 25 / 40 €). */
export { COSTE_PERFIL as COSTE_ORIENTATIVO } from "@/config/sectores/comunes";
