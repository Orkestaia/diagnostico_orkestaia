/**
 * Cálculo del diagnóstico — banco §2 y batería §2. Funciones puras, sin IA.
 *
 * Reglas que no se negocian:
 * - `pct_automatizable` nunca supera 0,7 (banco §2.2).
 * - Topes y umbrales sobre el valor SIN redondear. El redondeo es solo para mostrar
 *   (Studio Colino: 1,75 h → "< 2 h, sin euros", aunque redondeado mostraría 2).
 * - Rango ±25 %, sin escenario optimista. Oportunidades nunca en euros.
 */
import { COSTE_PERFIL, QUICK_WINS_COMUNES, VALIDAR_VOLUMEN_REAL } from "@/config/sectores/comunes";
import { quickWinsDeSector } from "@/config/sectores";
import { plantillasDeSector, PCT_DEFECTO_OTRO } from "@/config/consultor/plantillas";
import {
  DIAS_MES,
  DIAS_MES_HOSTELERIA,
  QUIEN,
  SEMANAS_MES,
  type Periodo,
  type TarjetaPrivada,
  type TarjetaProceso,
} from "@/config/consultor/tarjeta";
import type { Entradas, Perfil, QuickWin, Respuestas, SectorId } from "@/config/tipos";
import { leerEntradas } from "./preguntas";

// ── Constantes del banco §2 ──
export const PCT_MAX = 0.7;
export const RANGO = { min: 0.75, max: 1.25 };
export const MINIMO_HORAS_CON_EUROS = 2;
export const TOPE_EQUIPO = { fraccion: 0.25, horasPersonaMes: 140 };
export const RANKING = {
  eurPorOportunidad: 8,
  topeOportunidades: 40,
  valorRiesgo: 50,
  bonusExito: 1.3,
  bonusTarea: 1.2,
  elegidos: 3,
  maxPorCategoria: 2,
};

export type CostesPerfil = Record<Perfil, number>;

export interface Rango {
  min: number;
  central: number;
  max: number;
}
export interface RangoEur {
  min: number;
  max: number;
}

// ── Redondeo (banco §2.2): solo para mostrar ──

/** Horas < 5 → al 0,5 más cercano; si no, a entero. */
export function redondearHoras(h: number): number {
  return h < 5 ? Math.round(h * 2) / 2 : Math.round(h);
}

/** Euros → a la decena. */
export function redondearEuros(e: number): number {
  return Math.round(e / 10) * 10;
}

export function limitarPct(p: number): number {
  return Math.min(Math.max(p, 0), PCT_MAX);
}

/**
 * Horas y euros a partir de la central sin redondear.
 * Devuelve las cifras ya redondeadas para mostrar; `bajoMinimo` se decide con la central bruta.
 */
export function cifras(central: number, coste: number | null) {
  const bajoMinimo = central < MINIMO_HORAS_CON_EUROS;
  const horas: Rango = {
    min: redondearHoras(central * RANGO.min),
    central: redondearHoras(central),
    max: redondearHoras(central * RANGO.max),
  };
  const eur: RangoEur | null =
    bajoMinimo || coste === null
      ? null
      : {
          min: redondearEuros(central * RANGO.min * coste),
          max: redondearEuros(central * RANGO.max * coste),
        };
  return { horas, eur, bajoMinimo };
}

/** Tope de equipo: horas máximas de ahorro al mes para `personas`. */
export function topeEquipo(personas: number): number {
  return TOPE_EQUIPO.fraccion * personas * TOPE_EQUIPO.horasPersonaMes;
}

/** Factor (≤ 1) por el que hay que escalar para no pasar el tope. 1 = no hace falta. */
export function factorTope(sumaCentral: number, personas: number | null | undefined): number {
  if (!personas || sumaCentral <= 0) return 1;
  const tope = topeEquipo(personas);
  return sumaCentral > tope ? tope / sumaCentral : 1;
}

// ── Quick wins (previo y lead magnet) ──

export interface ResultadoQW {
  id: string;
  tituloBase: string;
  etiquetaTarea: string;
  categoria: QuickWin["categoria"];
  tipo: QuickWin["tipo"];
  perfil: Perfil | null;
  coste: number | null;
  pct: number | null;
  /** Horas al mes automatizables, sin redondear y ya con el tope aplicado. */
  centralBruta: number | null;
  horas: Rango | null;
  eur: RangoEur | null;
  bajoMinimo: boolean;
  oportunidades: number | null;
  unidadOportunidad?: string;
  riesgo: boolean;
  /** Falta un dato ("No lo sé" o sin responder): sale sin cifras. */
  sinCifras: boolean;
  valor: number;
  score: number;
  /** Completa hasta 3 sin ser elegible (banco §2.4). */
  relleno: boolean;
  validar: string[];
}

export interface ResultadoQuickWins {
  elegidos: ResultadoQW[];
  elegibles: ResultadoQW[];
  ajustadoPorTope: boolean;
  personas: number | null;
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function perfilEfectivo(qw: QuickWin, e: Entradas): Perfil | null {
  const p = qw.perfil(e);
  if (p === null) return null;
  // Banco §2.1: "Si el equipo es «Solo yo», todo el trabajo usa el perfil directivo".
  return e.n("negocio.equipo") === 1 ? "directivo" : p;
}

function etiquetaTareaDe(qw: QuickWin, e: Entradas): string {
  if (qw.id === "OT-QW1") return e.t("dia.proceso_repetitivo") ?? qw.etiquetaTarea;
  return qw.etiquetaTarea;
}

/** Evalúa un QW sin tope ni redondeo: lo que hace falta para ordenarlos. */
function evaluar(
  qw: QuickWin,
  e: Entradas,
  costes: CostesPerfil,
  prioridad: { exito: string[]; tarea: string },
  relleno = false,
): ResultadoQW {
  const perfil = perfilEfectivo(qw, e);
  const coste = perfil ? costes[perfil] : null;
  const pct = qw.pct === undefined ? null : limitarPct(typeof qw.pct === "number" ? qw.pct : qw.pct(e));

  let centralBruta: number | null = null;
  let sinCifras = false;
  if (qw.horasBase && !relleno) {
    const base = qw.horasBase(e);
    if (base === null || pct === null) sinCifras = true;
    else centralBruta = base * pct;
  }

  let oportunidades: number | null = null;
  if (qw.oportunidades && !relleno) {
    oportunidades = qw.oportunidades(e);
    if (oportunidades === null && qw.tipo === "oportunidad") sinCifras = true;
  }

  const riesgo = qw.tipo === "riesgo" || (qw.riesgo?.(e) ?? false);
  const sinDatoNull = sinCifras; // "No lo sé" o dato ausente

  let valor: number;
  if (qw.tipo === "riesgo" || (qw.tipo === "oportunidad" && !qw.oportunidades)) {
    // Riesgo (y oportunidad cualitativa, SA-QW4): valor fijo, no desplaza un ahorro medido.
    valor = RANKING.valorRiesgo;
  } else {
    valor =
      (centralBruta ?? 0) * (coste ?? 0) +
      RANKING.eurPorOportunidad * Math.min(oportunidades ?? 0, RANKING.topeOportunidades);
  }

  const exito = new Set(prioridad.exito);
  const tarea = normalizar(prioridad.tarea);
  let score = valor;
  if (qw.etiquetas.some((t) => exito.has(t))) score *= RANKING.bonusExito;
  if (tarea && qw.palabrasClave.some((k) => tarea.includes(normalizar(k)))) score *= RANKING.bonusTarea;

  return {
    id: qw.id,
    tituloBase: qw.tituloBase,
    etiquetaTarea: etiquetaTareaDe(qw, e),
    categoria: qw.categoria,
    tipo: qw.tipo,
    perfil,
    coste,
    pct,
    centralBruta,
    horas: null,
    eur: null,
    bajoMinimo: false,
    oportunidades: oportunidades === null ? null : Math.round(oportunidades),
    unidadOportunidad: qw.unidadOportunidad,
    riesgo,
    sinCifras: sinDatoNull || relleno,
    valor,
    score,
    relleno,
    validar: sinDatoNull ? [VALIDAR_VOLUMEN_REAL] : [],
  };
}

/** Claves de `prioridad.exito` a partir de las etiquetas elegidas. */
function clavesExito(r: Respuestas): string[] {
  const v = r["prioridad.exito"];
  const elegidas = Array.isArray(v) ? v : [];
  const mapa: Record<string, string> = {
    "Más clientes": "clientes",
    "Menos horas de administración": "horas",
    "Menos errores": "errores",
    "Responder más rápido": "rapidez",
    "Crecer sin contratar": "escalar",
    "Datos para decidir": "control",
  };
  return elegidas.map((e) => mapa[e] ?? e);
}

/**
 * Banco §2.4: evalúa todos los QW del sector, ordena por score y elige 3 (máx. 2 por
 * categoría). Aplica el tope de equipo a los elegidos y redondea para mostrar.
 */
export function calcularQuickWins(
  respuestas: Respuestas,
  sector: SectorId,
  costes: CostesPerfil = COSTE_PERFIL,
): ResultadoQuickWins {
  const e = leerEntradas(respuestas, sector);
  const prioridad = { exito: clavesExito(respuestas), tarea: e.t("prioridad.tarea") ?? "" };

  const elegibles = quickWinsDeSector(sector)
    .filter((qw) => qw.elegible(e))
    .map((qw) => evaluar(qw, e, costes, prioridad))
    .sort((a, b) => b.score - a.score);

  const elegidos: ResultadoQW[] = [];
  const porCategoria = new Map<string, number>();
  for (const r of elegibles) {
    if (elegidos.length === RANKING.elegidos) break;
    const n = porCategoria.get(r.categoria) ?? 0;
    if (n >= RANKING.maxPorCategoria) continue;
    elegidos.push(r);
    porCategoria.set(r.categoria, n + 1);
  }
  // "Si hay menos de 3 elegibles, se completa con los comunes de §4."
  for (const qw of QUICK_WINS_COMUNES) {
    if (elegidos.length === RANKING.elegidos) break;
    if (elegidos.some((r) => r.id === qw.id)) continue;
    elegidos.push(evaluar(qw, e, costes, prioridad, true));
  }

  const personas = e.n("negocio.equipo") ?? null;
  const suma = elegidos.reduce((s, r) => s + (r.centralBruta ?? 0), 0);
  const factor = factorTope(suma, personas);

  for (const r of elegidos) {
    if (r.centralBruta === null) continue;
    r.centralBruta *= factor;
    const c = cifras(r.centralBruta, r.coste);
    r.horas = c.horas;
    r.eur = c.eur;
    r.bajoMinimo = c.bajoMinimo;
  }

  return { elegidos, elegibles, ajustadoPorTope: factor < 1, personas };
}

/**
 * Banco §3-V: sugerencias de `prioridad.tarea` = hasta 3 `etiqueta_tarea` de los QW elegibles,
 * por score. Nunca títulos de QW ni cifras. Sin elegibles, sin sugerencias.
 */
export function sugerenciasTarea(respuestas: Respuestas, sector: SectorId): string[] {
  // La propia tarea no debe influir en sus sugerencias.
  const sinTarea = { ...respuestas, "prioridad.tarea": null };
  return calcularQuickWins(sinTarea, sector)
    .elegibles.slice(0, 3)
    .map((r) => r.etiquetaTarea);
}

/**
 * Spec §3: "Lo que revisaremos juntos" = `etiqueta_tarea` de los 3 QW mejor situados, sin
 * cifras. Solo QW elegibles: un relleno hablaría de algo que el cliente no tiene.
 */
export function temasARevisar(respuestas: Respuestas, sector: SectorId): string[] {
  return calcularQuickWins(respuestas, sector)
    .elegidos.filter((r) => !r.relleno)
    .map((r) => r.etiquetaTarea);
}

// ── Tarjetas de proceso (visita) — batería §2 ──

export function volumenMes(
  volumen: number | null,
  periodo: Periodo,
  sector: SectorId,
): number | null {
  if (volumen === null || !Number.isFinite(volumen) || volumen < 0) return null;
  if (periodo === "dia") return volumen * (sector === "hosteleria_eventos" ? DIAS_MES_HOSTELERIA : DIAS_MES);
  if (periodo === "semana") return volumen * SEMANAS_MES;
  return volumen;
}

/** `hoy_horas_mes = volumen_mes × minutos_por_vez / 60`. Tiempo que consume HOY, no ahorro. */
export function hoyHorasMes(t: Pick<TarjetaProceso, "volumen" | "volumenPeriodo" | "minutosPorVez">, sector: SectorId): number | null {
  const v = volumenMes(t.volumen, t.volumenPeriodo, sector);
  if (v === null || t.minutosPorVez === null || t.minutosPorVez < 0) return null;
  return (v * t.minutosPorVez) / 60;
}

/** % automatizable por defecto de una tarjeta: el de su plantilla (o 0,4 en `otro`). */
export function pctPorDefecto(t: Pick<TarjetaProceso, "plantilla">, sector: SectorId): number | null {
  if (sector === "otro") return PCT_DEFECTO_OTRO;
  const p = plantillasDeSector(sector).find((x) => x.nombre === t.plantilla);
  return p && typeof p.pct === "number" ? p.pct : null;
}

export function perfilDeQuien(quien: string | null, soloYo: boolean): Perfil | null {
  const p = QUIEN.find((q) => q.etiqueta === quien)?.perfil ?? null;
  if (p === null) return null;
  return soloYo ? "directivo" : p;
}

export interface ContextoVisita {
  sector: SectorId;
  /** Suma de `a.equipo` si está rellena; si no, `negocio.equipo` (banco §9). */
  personas: number | null;
  costes: CostesPerfil;
}

export interface CalculoTarjeta {
  id: string;
  nombre: string;
  hoyHorasMesBruto: number | null;
  hoyHorasMes: number | null;
  perfil: Perfil | null;
  coste: number | null;
  pct: number | null;
  ahorroCentralBruto: number | null;
  ahorroHoras: Rango | null;
  ahorroEur: RangoEur | null;
  bajoMinimo: boolean;
}

export interface CalculoVisita {
  version: "calculo_v1";
  tarjetas: CalculoTarjeta[];
  totalHoyHorasMes: number;
  totalAhorroCentral: number;
  personas: number | null;
  topeHorasMes: number | null;
  ajustadoPorTope: boolean;
  costes: CostesPerfil;
}

/** Personas del equipo: suma de `a.equipo` (rol + número) o, si no, el valor de `negocio.equipo`. */
export function personasEquipo(
  equipoVisita: { rol: string; numero: number | null }[] | undefined,
  respuestasPrevio: Respuestas,
  sector: SectorId,
): number | null {
  const suma = (equipoVisita ?? []).reduce((s, f) => s + (f.numero && f.numero > 0 ? f.numero : 0), 0);
  if (suma > 0) return suma;
  return leerEntradas(respuestasPrevio, sector).n("negocio.equipo") ?? null;
}

/**
 * Cálculo completo de la visita: horas de hoy por tarjeta y ahorro estimado (solo para el
 * export y el mapa; en la visita se enseñan las horas de hoy). Tope de equipo sobre la suma
 * de todas las tarjetas.
 */
export function calcularVisita(
  tarjetas: TarjetaProceso[],
  privados: Record<string, Partial<TarjetaPrivada> | undefined>,
  ctx: ContextoVisita,
): CalculoVisita {
  const soloYo = ctx.personas === 1;
  const base = tarjetas.map((t) => {
    const hoy = hoyHorasMes(t, ctx.sector);
    const pctPriv = privados[t.id]?.pctAutomatizable;
    const pctBruto = pctPriv ?? pctPorDefecto(t, ctx.sector);
    const pct = pctBruto === null || pctBruto === undefined ? null : limitarPct(pctBruto);
    const perfil = perfilDeQuien(t.quien, soloYo);
    const coste = perfil ? ctx.costes[perfil] : null;
    const ahorro = hoy !== null && pct !== null ? hoy * pct : null;
    return { t, hoy, pct, perfil, coste, ahorro };
  });

  const suma = base.reduce((s, b) => s + (b.ahorro ?? 0), 0);
  const factor = factorTope(suma, ctx.personas);

  const resultado: CalculoTarjeta[] = base.map(({ t, hoy, pct, perfil, coste, ahorro }) => {
    const central = ahorro === null ? null : ahorro * factor;
    const c = central === null ? null : cifras(central, coste);
    return {
      id: t.id,
      nombre: t.nombre,
      hoyHorasMesBruto: hoy,
      hoyHorasMes: hoy === null ? null : redondearHoras(hoy),
      perfil,
      coste,
      pct,
      ahorroCentralBruto: central,
      ahorroHoras: c?.horas ?? null,
      ahorroEur: c?.eur ?? null,
      bajoMinimo: c?.bajoMinimo ?? false,
    };
  });

  return {
    version: "calculo_v1",
    tarjetas: resultado,
    totalHoyHorasMes: base.reduce((s, b) => s + (b.hoy ?? 0), 0),
    totalAhorroCentral: suma * factor,
    personas: ctx.personas,
    topeHorasMes: ctx.personas ? topeEquipo(ctx.personas) : null,
    ajustadoPorTope: factor < 1,
    costes: ctx.costes,
  };
}

/** Costes por perfil: los por defecto del banco, con la corrección 🔒 `c.coste_perfil` si la hay. */
export function costesConCorreccion(correccion?: Partial<CostesPerfil> | null): CostesPerfil {
  const r = { ...COSTE_PERFIL };
  for (const k of Object.keys(r) as Perfil[]) {
    const v = correccion?.[k];
    if (typeof v === "number" && v > 0) r[k] = v;
  }
  return r;
}


// ── Coste de no hacer nada (spec §7, mapa_v1.2) ──

/**
 * Horas al año que se seguirán yendo si no se hace nada: horas de hoy × 12 de los procesos de la
 * hoja de ruta, con el mismo rango ±25 % del resto del cálculo. Sobre el valor sin redondear; el
 * redondeo solo para mostrar. `null` si no hay horas.
 */
export function costeInaccion(horasMesHoy: (number | null)[]): Rango | null {
  const central = horasMesHoy.reduce<number>((s, x) => s + (x ?? 0), 0) * 12;
  if (central <= 0) return null;
  return {
    min: redondearHoras(central * RANGO.min),
    central: redondearHoras(central),
    max: redondearHoras(central * RANGO.max),
  };
}

// ── Euros con el coste que pone el cliente en su mapa (revisión con JARVIS, 21-sep) ──

/** Coste por hora que admite la casilla del mapa. Fuera de rango, no se calcula. */
export const COSTE_CLIENTE = { min: 5, max: 300 };

/**
 * Euros al mes de un ahorro en horas con el coste por hora que escribe el cliente en su mapa. No se
 * guarda en ningún sitio: es su dato y se queda en su navegador. Misma regla que el resto del
 * cálculo: por debajo de `MINIMO_HORAS_CON_EUROS` no hay euros, y se redondea a la decena.
 * El mapa solo trae el rango ±25 % ya redondeado; la central es su punto medio.
 */
export function eurosConCosteCliente(
  ahorro: { min: number; max: number },
  costeHora: number,
): RangoEur | null {
  if (!Number.isFinite(costeHora) || costeHora < COSTE_CLIENTE.min || costeHora > COSTE_CLIENTE.max)
    return null;
  const central = (ahorro.min + ahorro.max) / 2;
  if (central < MINIMO_HORAS_CON_EUROS) return null;
  return {
    min: redondearEuros(ahorro.min * costeHora),
    max: redondearEuros(ahorro.max * costeHora),
  };
}
