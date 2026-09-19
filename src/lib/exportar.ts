/**
 * Export para JARVIS (spec §5.1). Función pura: la ruta lee la fila y esto la convierte en
 * `md` (para guardar tal cual en `02_CLIENTS/[SECTOR]/[cliente]/meetings/`) o `json` (lo mismo
 * + `calculo` completo). JARVIS decide la carpeta; aquí solo se sugiere el nombre del archivo.
 *
 * Lleva lo 🔒 (notas privadas, coste por hora, señales): el export es solo para JARVIS, detrás
 * del Bearer `DIAGNOSTICO_ADMIN_TOKEN`. No lleva email ni teléfono del contacto.
 */
import { BLOQUES, CAMPOS_VISITA } from "@/config/consultor/bloques";
import { camposDeSector } from "@/config/consultor/sector";
import { PERIODOS, type TarjetaProceso } from "@/config/consultor/tarjeta";
import type { Respuestas, SectorId } from "@/config/tipos";
import { hoyHorasMes, redondearHoras, type CalculoTarjeta, type CalculoVisita } from "./calculo";
import { indicePreguntas } from "./preguntas";
import { pasosPrevio } from "./previo";
import type { Madurez } from "./madurez";
import { ID_NOTAS, type PrivadoVisita, type RespuestasVisita } from "./visita";

/** Fragmento de la grabación de la visita (tabla `diagnostico_grabaciones`). */
export interface FragmentoTranscripcion {
  orden: number;
  duracion_s: number | null;
  estado: string;
  texto: string | null;
}

export interface FilaExport {
  id: string;
  estado: string;
  sector: SectorId;
  subsector: string | null;
  tipo_negocio: string | null;
  empresa: string;
  contacto_nombre: string | null;
  web: string | null;
  origen: string | null;
  fecha_reunion: string | null;
  hora_reunion: string | null;
  lugar_reunion: string | null;
  config_version: string | null;
  respuestas_previo: Respuestas | null;
  respuestas_visita: RespuestasVisita | null;
  procesos: TarjetaProceso[] | null;
  privado: PrivadoVisita | null;
  interno: {
    hipotesis?: { hipotesis: string; basada_en?: string }[];
    preguntas_visita?: string[];
    alertas?: string[];
  } | null;
  informe: Record<string, unknown> | null;
  calculo: (CalculoVisita & { coste_origen?: string; calculado_at?: string }) | null;
  previo_completado_at: string | null;
  visita_cerrada_at: string | null;
  transcripcion_temas: { lineas?: string[] } | null;
  /** No son columnas de `diagnosticos`: las añade la ruta. */
  transcripcion?: FragmentoTranscripcion[];
  madurez?: Madurez | null;
  temas?: string[] | null;
}

export const COLUMNAS_EXPORT =
  "transcripcion_temas, id, estado, sector, subsector, tipo_negocio, empresa, contacto_nombre, web, origen, fecha_reunion, hora_reunion, lugar_reunion, config_version, respuestas_previo, respuestas_visita, procesos, privado, interno, informe, calculo, previo_completado_at, visita_cerrada_at";

/** `YYYY-MM-DD_diagnostico-app_raw.md` con la fecha de la visita (o la de la reunión, o hoy). */
export function nombreArchivo(
  f: Pick<FilaExport, "visita_cerrada_at" | "fecha_reunion">,
  hoyISO: string,
  ext = "md",
) {
  const fecha = (f.visita_cerrada_at ?? f.fecha_reunion ?? hoyISO).slice(0, 10);
  return `${fecha}_diagnostico-app_raw.${ext}`;
}

// ── Formato ──

const h = (x: number) => `${String(redondearHoras(x)).replace(".", ",")} h`;
const pct = (x: number) => `${Math.round(x * 100)} %`;

/** Cualquier valor guardado (texto, lista, objeto de la batería) en una línea legible. */
export function valorLegible(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return String(v).replace(".", ",");
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "string") return v.replace(/\s*\n\s*/g, " / ");
  if (Array.isArray(v)) {
    const xs = v.map(valorLegible).filter((x) => x !== "—");
    return xs.length ? xs.join(v.some((x) => typeof x === "object" && x) ? " | " : ", ") : "—";
  }
  const partes = Object.entries(v as Record<string, unknown>)
    .filter(([, x]) => x !== null && x !== undefined && x !== "")
    .map(([k, x]) => `${k}: ${valorLegible(x)}`);
  return partes.length ? partes.join(" · ") : "—";
}

function previoLegible(sector: SectorId, r: Respuestas, correcciones: Respuestas): string[] {
  const indice = indicePreguntas(sector);
  const lineas: string[] = [];
  // En el orden en que se preguntaron; lo que no esté en el recorrido actual, al final.
  const orden = pasosPrevio(sector, r).map((x) => x.pregunta.id);
  const ids = [
    ...orden.filter((id) => id in r),
    ...Object.keys(r).filter((id) => !orden.includes(id)),
  ];
  for (const id of ids) {
    const v = r[id];
    if (id.includes("::")) continue;
    const p = indice.get(id);
    const cuales = Object.entries(r)
      .filter(([k, x]) => k.startsWith(`${id}::`) && x)
      .map(([k, x]) => `${k.split("::")[1]}: ${valorLegible(x)}`);
    let linea = `- **${p?.texto ?? id}** (\`${id}\`): ${valorLegible(v)}`;
    if (cuales.length) linea += ` (${cuales.join("; ")})`;
    if (id in correcciones)
      linea += ` → **corregido en la visita:** ${valorLegible(correcciones[id])}`;
    lineas.push(linea);
  }
  for (const [id, v] of Object.entries(correcciones)) {
    if (!(id in r))
      lineas.push(
        `- **${indice.get(id)?.texto ?? id}** (\`${id}\`): añadido en la visita: ${valorLegible(v)}`,
      );
  }
  return lineas;
}

function tarjetaMd(
  t: TarjetaProceso,
  priv: PrivadoVisita["procesos"],
  calc: CalculoTarjeta | undefined,
  sector: SectorId,
): string[] {
  const periodo = PERIODOS.find((p) => p.id === t.volumenPeriodo)?.etiqueta ?? t.volumenPeriodo;
  const hoy = t.hoyRegistro?.horasMes ?? hoyHorasMes(t, sector);
  const p = priv?.[t.id] ?? {};
  const l: string[] = [`### ${t.nombre || "Proceso sin nombre"}`, ""];
  const fila = (k: string, v: unknown) => {
    const s = valorLegible(v);
    if (s !== "—") l.push(`- **${k}:** ${s}`);
  };
  fila("Id", t.id);
  fila("Área", t.area);
  fila("Plantilla", t.plantilla);
  if (t.rapida) fila("Tipo", "tarjeta rápida (solo nombre, volumen y minutos)");
  fila(
    "Datos de volumen y minutos",
    t.origenDatos === "previo" ? "precargados del previo" : "acordados en la visita",
  );
  if (t.volumen !== null)
    fila(
      "Volumen",
      `${valorLegible(t.volumen)}${t.volumenUnidad ? ` ${t.volumenUnidad}` : ""} al ${periodo}`,
    );
  fila("Minutos cada vez", t.minutosPorVez);
  if (t.hoyRegistro) {
    fila(
      "Horas al mes hoy (registro fijo)",
      `${h(t.hoyRegistro.horasMes)} (${t.hoyRegistro.horasMes} sin redondear) · ${t.hoyRegistro.fecha} · origen ${t.hoyRegistro.origen}`,
    );
  } else if (hoy !== null) {
    fila("Horas al mes hoy (calculado, visita sin cerrar)", h(hoy));
  }
  fila("Qué lo pone en marcha", t.disparador);
  fila(
    "Quién",
    t.quien ? `${t.quien}${t.quienPersonas ? ` (${t.quienPersonas} personas)` : ""}` : null,
  );
  fila("Herramientas", t.herramientas);
  fila("Dónde se atasca", t.atasco);
  fila(
    "Errores",
    t.errores ? `${t.errores}${t.erroresEjemplo ? `: ${t.erroresEjemplo}` : ""}` : null,
  );
  fila("Frase literal del cliente", t.cita ? `"${t.cita}"` : null);
  fila("Lo enseñó (visto)", t.visto);
  fila("Prioridad del cliente", t.prioridadCliente);
  if (t.pasos.length) {
    l.push("- **Así es hoy:**");
    t.pasos.forEach((s, i) => l.push(`  ${i + 1}. ${s.texto || "(sin texto)"} — ${s.quien}`));
  }
  const privado = [
    p.pctAutomatizable != null ? `% automatizable estimado: ${pct(p.pctAutomatizable)}` : null,
    p.ideaSolucion ? `Idea: ${p.ideaSolucion}` : null,
    p.dependencias ? `Dependencias: ${p.dependencias}` : null,
    p.nota ? `Nota: ${p.nota}` : null,
  ].filter(Boolean);
  if (privado.length) {
    l.push("- **Privado (Aitor):**");
    for (const x of privado) l.push(`  - ${x}`);
  }
  if (calc?.ahorroHoras) {
    l.push(
      `- **Cálculo:** ahorro ${h(calc.ahorroHoras.min)}-${h(calc.ahorroHoras.max)} al mes (central ${h(calc.ahorroHoras.central)}, pct ${pct(calc.pct ?? 0)}, perfil ${calc.perfil ?? "—"})` +
        (calc.ahorroEur ? ` · ${calc.ahorroEur.min}-${calc.ahorroEur.max} €/mes` : "") +
        (calc.bajoMinimo ? " · bajo el mínimo: sin euros" : ""),
    );
  }
  l.push("");
  return l;
}

export function exportMarkdown(f: FilaExport, hoyISO: string): string {
  const rv = f.respuestas_visita ?? {};
  const pr = f.privado ?? {};
  const procesos = f.procesos ?? [];
  const calcPorId = new Map((f.calculo?.tarjetas ?? []).map((c) => [c.id, c]));
  const l: string[] = [];

  l.push(`# Diagnóstico ${f.empresa} — datos en bruto de la app`, "");
  l.push(
    `> Generado por la app de diagnóstico el ${hoyISO}. Archivo sugerido: \`${nombreArchivo(f, hoyISO)}\`.`,
  );
  l.push(
    "> Documento interno: incluye notas privadas. Las cifras salen de `calculo` (banco v1); no se recalculan a mano.",
    "",
  );
  l.push("## Ficha", "");
  const ficha: [string, unknown][] = [
    ["Empresa", f.empresa],
    ["Contacto", f.contacto_nombre],
    ["Tipo de negocio", f.tipo_negocio],
    ["Sector", f.subsector ? `${f.sector} (${f.subsector})` : f.sector],
    ["Web", f.web],
    ["Origen", f.origen],
    [
      "Reunión",
      [f.fecha_reunion, f.hora_reunion?.slice(0, 5), f.lugar_reunion].filter(Boolean).join(" · "),
    ],
    ["Estado", f.estado],
    ["Previo completado", f.previo_completado_at],
    ["Visita iniciada", rv.inicio_at],
    ["Visita cerrada", f.visita_cerrada_at],
    ["Versión de configuración", f.config_version],
    ["Id", f.id],
  ];
  for (const [k, v] of ficha) if (valorLegible(v) !== "—") l.push(`- **${k}:** ${valorLegible(v)}`);
  l.push("");

  l.push("## 1. Previo del cliente", "");
  const previo = previoLegible(f.sector, f.respuestas_previo ?? {}, rv.correcciones_previo ?? {});
  l.push(...(previo.length ? previo : ["Sin respuestas."]), "");
  const inf = f.informe as { resumen_entendido?: string[]; temas_reunion?: string[] } | null;
  if (inf?.resumen_entendido?.length) {
    l.push('**Lo que le enseñamos al terminar ("lo que he entendido"):**', "");
    for (const x of inf.resumen_entendido) l.push(`- ${x}`);
    l.push("");
  }
  if (inf?.temas_reunion?.length) {
    l.push("**Temas que le dijimos que revisaríamos:**", "");
    for (const x of inf.temas_reunion) l.push(`- ${x}`);
    l.push("");
  }
  if (f.interno) {
    l.push("**Preparación del motor (interno):**", "");
    for (const x of f.interno.hipotesis ?? [])
      l.push(`- Hipótesis: ${x.hipotesis}${x.basada_en ? ` (basada en: ${x.basada_en})` : ""}`);
    for (const x of f.interno.preguntas_visita ?? []) l.push(`- Pregunta para la visita: ${x}`);
    for (const x of f.interno.alertas ?? []) l.push(`- Alerta: ${x}`);
    l.push("");
  }

  l.push("## 2. Visita", "");
  const campos = camposDeSector(CAMPOS_VISITA, f.sector);
  for (const bloque of BLOQUES.filter((b) => b.id !== "B")) {
    l.push(`### Bloque ${bloque.id} · ${bloque.nombre}`, "");
    const con = campos
      .filter((c) => c.bloque === bloque.id)
      .map((c) => ({
        texto: c.texto,
        privado: c.privado,
        nivel: c.nivel,
        valor:
          c.id === "e.prioridades"
            ? idsANombres(rv.campos?.[c.id], procesos)
            : (c.privado ? pr.campos : rv.campos)?.[c.id],
      }))
      .filter((c) => valorLegible(c.valor) !== "—");
    if (!con.length) l.push("Sin datos.");
    for (const c of con) {
      l.push(
        `- **${c.texto}**${c.privado ? " _(privado)_" : ""}${c.nivel === "P" ? " _(profundizar)_" : ""}: ${valorLegible(c.valor)}`,
      );
    }
    l.push("");
  }

  const iaPersonas = rv.campos?.["cumpl.ia_personas"];
  if (Array.isArray(iaPersonas) && iaPersonas.some((x) => x !== "Ninguna")) {
    l.push(
      "> **Alerta (batería v2 §4-G):** posible uso de IA de alto riesgo según la ley europea: derivar a su asesor.",
      "> Ninguna iniciativa sobre ese proceso se clasifica como quick win.",
      "",
    );
  }

  l.push(`## 3. Procesos (${procesos.length})`, "");
  if (!procesos.length) l.push("Sin tarjetas.", "");
  const orden = [...procesos].sort(
    (a, b) =>
      (b.hoyRegistro?.horasMes ?? hoyHorasMes(b, f.sector) ?? -1) -
      (a.hoyRegistro?.horasMes ?? hoyHorasMes(a, f.sector) ?? -1),
  );
  for (const t of orden) l.push(...tarjetaMd(t, pr.procesos, calcPorId.get(t.id), f.sector));

  const notas = pr.campos?.[ID_NOTAS];
  if (typeof notas === "string" && notas.trim()) {
    l.push("## Notas de Aitor durante la visita (privado)", "", notas.trim(), "");
  }

  l.push("## 4. Cálculo", "");
  if (!f.calculo) {
    l.push("La visita no está cerrada: todavía no hay cálculo.", "");
  } else {
    const c = f.calculo;
    l.push(`- **Horas al mes hoy (total):** ${h(c.totalHoyHorasMes)}`);
    l.push(`- **Ahorro central (total, tras tope):** ${h(c.totalAhorroCentral)}`);
    l.push(
      `- **Coste por hora:** operativo ${c.costes.operativo} € · mando intermedio ${c.costes.tactico} € · dirección ${c.costes.directivo} € (${c.coste_origen === "cliente" ? "dato del cliente" : "orientativo del banco"})`,
    );
    if (c.personas !== null)
      l.push(
        `- **Personas:** ${c.personas}${c.topeHorasMes !== null ? ` · tope ${h(c.topeHorasMes)} al mes${c.ajustadoPorTope ? " (aplicado)" : ""}` : ""}`,
      );
    if (c.calculado_at) l.push(`- **Calculado:** ${c.calculado_at} (${c.version})`);
    l.push("");
  }
  l.push(...madurezMd(f.madurez ?? null));
  l.push(...resumenTranscripcionMd(f, hoyISO));
  return l.join("\n");
}

const marca = (s: number) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), Math.floor(s % 60)]
    .map((x) => String(x).padStart(2, "0"))
    .join(":");

/**
 * Transcripción de la grabación, fragmento a fragmento con la hora desde el inicio. Los que
 * aún no tienen texto se marcan: JARVIS sabe que falta un trozo en vez de creer que no se habló.
 */
export function transcripcionMd(fragmentos: FragmentoTranscripcion[]): string[] {
  if (!fragmentos.length) return [];
  const orden = [...fragmentos].sort((a, b) => a.orden - b.orden);
  const inicio = orden[0].orden;
  const l = ["## 5. Transcripción de la reunión", ""];
  l.push(
    "> Transcripción automática (OpenAI). Puede tener errores en nombres y cifras: manda lo anotado en las tarjetas.",
    "",
  );
  for (const f of orden) {
    const desde = marca((f.orden - inicio) / 1000);
    if (f.estado === "transcrito" && f.texto) l.push(`**[${desde}]** ${f.texto}`, "");
    else if (f.estado === "transcrito") l.push(`**[${desde}]** _(sin voz en este fragmento)_`, "");
    else
      l.push(
        `**[${desde}]** _(fragmento de ${Math.round((f.duracion_s ?? 0) / 60)} min todavía sin transcribir: ${f.estado})_`,
        "",
      );
  }
  return l;
}

/** §6: resultados de la encuesta del equipo, con el anonimato ya aplicado por `calcularMadurez`. */
export function madurezMd(m: Madurez | null): string[] {
  if (!m || !m.respuestas) return [];
  const l = ["## 5. Madurez en IA del equipo (encuesta anónima)", ""];
  l.push(`- **Respuestas:** ${m.respuestas}`);
  if (!m.publicable || !m.empresa) {
    l.push("- Sin respuestas suficientes para enseñar resultados (mínimo 3, §6).", "");
    return l;
  }
  const d = m.empresa.dimensiones;
  const uno = (x: number | null) =>
    x === null ? "—" : String(Math.round(x * 10) / 10).replace(".", ",");
  l.push(
    `- **Índice de la empresa:** ${Math.round(m.empresa.indice)}/100 · nivel ${m.empresa.nivel} (${m.empresa.nombreNivel})`,
  );
  l.push(
    `- **Dimensiones (0-4):** uso ${uno(d.uso)} · competencia ${uno(d.competencia)} · seguridad ${uno(d.seguridad)} · actitud ${uno(d.actitud)}`,
  );
  l.push(`- **Reparto por nivel (1-5):** ${m.empresa.distribucion.join(" · ")}`);
  if (m.areas.length) {
    l.push("- **Por área (solo las de 3 o más respuestas):**");
    for (const a of m.areas)
      l.push(`  - ${a.nombre} (${a.respuestas}): ${Math.round(a.indice)} · ${a.nombreNivel}`);
  }
  if (m.formacion.length) {
    l.push("- **Formación que piden:**");
    for (const f of m.formacion) l.push(`  - ${f.etiqueta}: ${f.votos}`);
  }
  if (m.alertas.length) {
    l.push("- **Alertas:**");
    for (const a of m.alertas) l.push(`  - ${a.texto}`);
  }
  if (m.tareas.length) {
    l.push(
      "- **Tareas que se quitarían de encima** (literales, para agrupar en temas; NO enseñar tal cual al cliente, §6):",
    );
    for (const t of m.tareas) l.push(`  - ${t}`);
  }
  l.push("");
  return l;
}

/** §9: el raw remite al archivo de transcripción y resume la conversación en 5 líneas. */
export function resumenTranscripcionMd(f: FilaExport, hoyISO: string): string[] {
  const fragmentos = f.transcripcion ?? [];
  if (!fragmentos.length) return [];
  const temas = f.temas ?? f.transcripcion_temas?.lineas ?? [];
  const l = ["## 6. La reunión, grabada", ""];
  const minutos = Math.round(fragmentos.reduce((s, x) => s + (x.duracion_s ?? 0), 0) / 60);
  const pendientes = fragmentos.filter((x) => x.estado !== "transcrito").length;
  l.push(
    `- **Transcripción completa:** \`${nombreArchivo(f, hoyISO, "md").replace("_raw.md", "_transcripcion.md")}\` (mismo directorio)`,
  );
  l.push(
    `- **Duración grabada:** unos ${minutos} min en ${fragmentos.length} fragmentos${pendientes ? ` (${pendientes} sin transcribir)` : ""}`,
  );
  if (temas.length) {
    l.push("", "**Temas de la conversación:**", "");
    for (const t of temas) l.push(`- ${t}`);
  }
  l.push("");
  return l;
}

/** Archivo aparte con la transcripción completa (§9). */
export function exportTranscripcion(f: FilaExport, hoyISO: string): string {
  const l = [`# Transcripción · ${f.empresa}`, ""];
  l.push(
    `> Reunión de diagnóstico${f.fecha_reunion ? ` del ${f.fecha_reunion}` : ""}. Acompaña a \`${nombreArchivo(f, hoyISO)}\`.`,
  );
  l.push(
    "> Documento interno. Transcripción automática: puede tener errores en nombres y cifras.",
    "",
  );
  const temas = f.temas ?? f.transcripcion_temas?.lineas ?? [];
  if (temas.length) {
    l.push("**Temas de la conversación:**", "");
    for (const t of temas) l.push(`- ${t}`);
    l.push("");
  }
  l.push(...transcripcionMd(f.transcripcion ?? []));
  return l.join("\n");
}

function idsANombres(v: unknown, procesos: TarjetaProceso[]): unknown {
  if (!Array.isArray(v)) return v;
  return v.map((id, i) => `${i + 1}. ${procesos.find((t) => t.id === id)?.nombre ?? id}`);
}

export function exportJson(f: FilaExport, hoyISO: string) {
  return {
    version: "export_v1",
    generado: hoyISO,
    archivo_sugerido: nombreArchivo(f, hoyISO),
    diagnostico: {
      id: f.id,
      estado: f.estado,
      empresa: f.empresa,
      contacto_nombre: f.contacto_nombre,
      tipo_negocio: f.tipo_negocio,
      sector: f.sector,
      subsector: f.subsector,
      web: f.web,
      origen: f.origen,
      fecha_reunion: f.fecha_reunion,
      hora_reunion: f.hora_reunion,
      lugar_reunion: f.lugar_reunion,
      config_version: f.config_version,
      previo_completado_at: f.previo_completado_at,
      visita_cerrada_at: f.visita_cerrada_at,
    },
    respuestas_previo: f.respuestas_previo ?? {},
    informe_previo: f.informe ?? null,
    interno: f.interno ?? null,
    respuestas_visita: f.respuestas_visita ?? {},
    procesos: f.procesos ?? [],
    privado: f.privado ?? {},
    calculo: f.calculo ?? null,
    madurez_equipo: f.madurez ?? null,
    transcripcion: f.transcripcion ?? [],
    transcripcion_temas: f.temas ?? f.transcripcion_temas?.lineas ?? [],
  };
}
