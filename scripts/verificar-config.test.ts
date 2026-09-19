/**
 * Comprueba que `src/config/**` es copia fiel del banco y de la batería de JARVIS:
 * textos de preguntas, opciones y valores, quick wins, antes/después, etiqueta_tarea,
 * plantillas de procesos y frases del Orkestador.
 *
 * Lee los .md de ORKESTA - JARVIS en disco. Si no están (Vercel, otra máquina), se salta.
 * Ruta configurable con DIAGNOSTICO_SPECS_DIR.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FRASES, PREGUNTAS_I, PREGUNTAS_II, PREGUNTAS_IV, PREGUNTAS_V, QUICK_WINS_COMUNES } from "@/config/sectores/comunes";
import { SECTORES } from "@/config/sectores";
import { PLANTILLAS_COMUNES, PLANTILLAS_SECTOR } from "@/config/consultor/plantillas";
import { BLOQUES, CAMPOS_VISITA } from "@/config/consultor/bloques";
import { PREGUNTAS_ENCUESTA } from "@/config/consultor/encuesta";
import { PREGUNTAS_SECTOR } from "@/config/consultor/sector";
import type { Pregunta, QuickWin, SectorId } from "@/config/tipos";

const DIR =
  process.env.DIAGNOSTICO_SPECS_DIR ??
  join(__dirname, "../../../../ORKESTA - JARVIS/01_ORKESTA_CORE/sales-system/diagnostico-app");
const BANCO = join(DIR, "diagnostico-app_banco-sectores_v1_2026-09-18.md");
const BATERIA = join(DIR, "diagnostico-app_bateria-consultor_v1_2026-09-18.md");
const BATERIA_V2 = join(DIR, "diagnostico-app_bateria-consultor_v2_2026-09-19.md");
const hayDocs = existsSync(BANCO) && existsSync(BATERIA);
const hayV2 = hayDocs && existsSync(BATERIA_V2);

const celdas = (fila: string) =>
  fila
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
const sinTicks = (s: string) => s.replace(/`/g, "");
const sinComillas = (s: string) => s.replace(/^"|"$/g, "");
const sinNegrita = (s: string) => s.replace(/\*\*/g, "");

/** Trozo del documento entre un encabezado y el siguiente del mismo nivel o superior. */
function seccion(md: string, titulo: RegExp): string {
  const lineas = md.split("\n");
  const i = lineas.findIndex((l) => titulo.test(l));
  if (i < 0) throw new Error(`No encuentro la sección ${titulo}`);
  const nivel = lineas[i].match(/^#+/)![0].length;
  const fin = lineas.findIndex((l, j) => j > i && /^#+ /.test(l) && l.match(/^#+/)![0].length <= nivel);
  return lineas.slice(i, fin < 0 ? undefined : fin).join("\n");
}

function filas(md: string): string[][] {
  return md
    .split("\n")
    .filter((l) => l.trim().startsWith("|") && !/^\|\s*-/.test(l.trim()))
    .map(celdas);
}

/** "Menos de 10 [5] · 10-30 [20] · No lo sé [null]" → [{etiqueta, valor}] */
function opcionesDe(celda: string): { etiqueta: string; valor?: number | null }[] {
  let c = celda.replace(/\s*\((se salta si viene rellena|valor = minutos por cita)\)\s*$/, "");
  if (c === "—" || c === "") return [];
  // dia.docs_repetitivos: "Abogados: a · b. Asesoría: c …" → sin prefijos de grupo
  c = c.replace(/(^|\.\s)[A-ZÁÉÍÓÚ][a-záéíóú]+:\s/g, (m, p) => (p ? " · " : ""));
  return c.split(" · ").map((o) => {
    const t = o.trim().replace(/\.$/, "");
    const m = t.match(/^(.*?)\s*\[(.+)\]$/);
    if (!m) return { etiqueta: t.replace(/\s*\(`?\w+`?\)$/, "").replace(/\s*→\s*\w+$/, "") };
    const v = m[2] === "null" ? null : Number(m[2].replace(",", "."));
    return { etiqueta: m[1], valor: v };
  });
}

function compararPreguntas(tabla: string[][], preguntas: Pregunta[]) {
  const porId = new Map(preguntas.map((p) => [p.id, p]));
  let vistas = 0;
  for (const f of tabla) {
    const id = sinTicks(f[0]);
    if (!/^(negocio|captacion|herramientas|prioridad|dia)\./.test(id)) continue;
    const p = porId.get(id);
    expect(p, `falta la pregunta ${id}`).toBeDefined();
    expect(p!.texto, id).toBe(f[1]);
    const ops = opcionesDe(f[3]);
    if (ops.length && p!.opciones && id !== "negocio.subsector") {
      expect(p!.opciones.map((o) => o.etiqueta), `${id} opciones`).toEqual(ops.map((o) => o.etiqueta));
      if (f[2] === "rango")
        expect(p!.opciones.map((o) => o.valor), `${id} valores`).toEqual(ops.map((o) => o.valor));
    }
    vistas++;
  }
  expect(vistas, "preguntas de la tabla").toBe(preguntas.length);
}

function compararQuickWins(md: string, qws: QuickWin[]) {
  const porId = new Map(qws.map((q) => [q.id, q]));
  for (const f of filas(md)) {
    const id = sinTicks(f[0]);
    const q = porId.get(id);
    if (!q) continue;
    if (f[0].startsWith("`")) {
      expect(q.tituloBase, `${id} título`).toBe(f[1]);
      expect(q.categoria, `${id} categoría`).toBe(f[2]);
      expect(q.tipo, `${id} tipo`).toBe(f[3]);
    } else if (f.length === 3) {
      expect(q.antes, `${id} antes`).toBe(f[1]);
      expect(q.despues, `${id} después`).toBe(f[2]);
    }
  }
}

describe.skipIf(!hayDocs)("Configuración = banco de sectores v1", () => {
  const banco = hayDocs ? readFileSync(BANCO, "utf8") : "";

  it("frases del Orkestador (comunes)", () => {
    const f = Object.fromEntries(filas(seccion(banco, /^### Frases del Orkestador/)).map((x) => [x[0], sinComillas(x[1])]));
    expect(FRASES.bienvenidaLeadMagnet).toBe(f["Bienvenida (`lead_magnet`)"]);
    expect(FRASES.bienvenidaPreReunion).toBe(f["Bienvenida (`pre_reunion`)"]);
    expect(FRASES.movimientoI).toBe(f["I · Tu negocio"]);
    expect(FRASES.movimientoII).toBe(f["II · Cómo llegan tus clientes"]);
    expect(FRASES.movimientoIV).toBe(f["IV · Tus herramientas"]);
    expect(FRASES.movimientoV).toBe(f["V · Tu prioridad"]);
    expect(FRASES.componiendo).toBe(f["Componiendo"]);
    expect(FRASES.finalPreReunion).toBe(f["Final `pre_reunion`"]);
  });

  it("movimientos I, II, IV y V", () => {
    compararPreguntas(filas(seccion(banco, /^### I · Tu negocio/)), PREGUNTAS_I);
    compararPreguntas(filas(seccion(banco, /^### II · Cómo llegan/)), PREGUNTAS_II);
    compararPreguntas(filas(seccion(banco, /^### IV · Tus herramientas/)), PREGUNTAS_IV);
    compararPreguntas(filas(seccion(banco, /^### V · Tu prioridad/)), PREGUNTAS_V);
  });

  it("quick wins comunes", () => compararQuickWins(seccion(banco, /^## 4\. Quick wins comunes/), QUICK_WINS_COMUNES));

  const titulos: Record<SectorId, RegExp> = {
    servicios_profesionales: /^### 5\.1 /,
    hosteleria_eventos: /^### 5\.2 /,
    industria_distribucion: /^### 5\.3 /,
    salud: /^### 5\.4 /,
    otro: /^### 5\.5 /,
  };

  for (const [sector, titulo] of Object.entries(titulos) as [SectorId, RegExp][]) {
    it(`sector ${sector}: preguntas, frase, subsectores, aviso, quick wins`, () => {
      const md = seccion(banco, titulo);
      const s = SECTORES[sector];
      compararPreguntas(filas(md), s.preguntas);
      compararQuickWins(md, s.quickWins);
      expect(md).toContain(`**Orkestador (III):** "${s.fraseIII}"`);
      if (s.avisoFijo) expect(md).toContain(`**Aviso fijo:** "${s.avisoFijo}"`);
      const sub = md.match(/\*\*Subsectores:\*\* (.*)/);
      expect(s.subsectores).toEqual(sub ? sub[1].split(" · ") : []);
      const plano = sinNegrita(md).replace(/\s+/g, " ");
      for (const x of [...s.noAutomatizar, ...s.validar]) expect(plano, x).toContain(x);
    });
  }

  it("§9: preguntas del movimiento III en el previo", () => {
    const md = seccion(banco, /^## 9\. Previo/);
    for (const s of Object.values(SECTORES)) {
      const f = filas(md).find((x) => x[0] === `\`${s.id}\``);
      expect(f, s.id).toBeDefined();
      expect(f![1].split(" · ").map(sinTicks), s.id).toEqual([...s.previoIII]);
    }
  });

  it("§10: etiqueta_tarea de cada quick win", () => {
    const md = seccion(banco, /^## 10\. Etiquetas de tarea/);
    const etiquetas = new Map<string, string>();
    for (const f of filas(md)) {
      for (let i = 0; i + 1 < f.length; i += 2) if (/^[A-Z]{1,2}-QW\d$/.test(f[i])) etiquetas.set(f[i], f[i + 1]);
    }
    const todos = [...QUICK_WINS_COMUNES, ...Object.values(SECTORES).flatMap((s) => s.quickWins)];
    for (const q of todos) expect(q.etiquetaTarea, q.id).toBe(etiquetas.get(q.id));
  });
});

describe.skipIf(!hayV2)("Configuración = batería del consultor v2", () => {
  const v2 = hayV2 ? readFileSync(BATERIA_V2, "utf8") : "";

  it("§1 bloques, tiempos y frases", () => {
    const t = filas(seccion(v2, /^## 1\. Bloques y tiempos/)).filter((f) => /^[A-H] · /.test(f[0]));
    expect(t.map((f) => f[0])).toEqual(BLOQUES.map((b) => `${b.id} · ${b.nombre}`));
    expect(t.map((f) => Number(f[1]))).toEqual(BLOQUES.map((b) => b.minutos));
    expect(t.map((f) => f[2])).toEqual(BLOQUES.map((b) => b.area));
    expect(t.map((f) => sinComillas(f[3]))).toEqual(BLOQUES.map((b) => b.frase));
  });

  /** Filas de las tablas de §4: `id` · pregunta · tipo · nivel · 🔒 · opcional. */
  const preguntasDe = (titulo: RegExp) =>
    filas(seccion(v2, titulo))
      .filter((f) => f[0].replace("🔒 ", "").startsWith("`") && f.length >= 6)
      .map((f) => ({
        id: sinTicks(f[0].replace("🔒 ", "")),
        texto: sinNegrita(f[1]),
        nivel: f[3],
        privado: f[4].includes("🔒") || f[0].includes("🔒"),
        opcional: f[5].trim() === "sí",
      }));

  const bloquesV2: [string, RegExp][] = [
    ["A", /^### A · Contexto/],
    ["C", /^### C · Números/],
    ["D", /^### D · Datos/],
    ["E", /^### E · Herramientas/],
    ["F", /^### F · Equipo/],
    ["G", /^### G · Cumplimiento/],
    ["H", /^### H · Cierre/],
  ];

  for (const [bloque, titulo] of bloquesV2) {
    it(`§4 bloque ${bloque}: ids, textos, nivel, 🔒 y opcionales`, () => {
      const doc = preguntasDe(titulo);
      const mios = CAMPOS_VISITA.filter((c) => c.bloque === bloque);
      expect(mios.map((c) => c.id)).toEqual(doc.map((d) => d.id));
      for (const d of doc) {
        const c = mios.find((x) => x.id === d.id)!;
        // El texto del documento puede llevar una aclaración entre paréntesis al final.
        expect(d.texto.startsWith(c.texto) || c.texto === d.texto, `${d.id} texto`).toBe(true);
        expect(c.nivel, `${d.id} nivel`).toBe(d.nivel);
        expect(c.privado, `${d.id} privado`).toBe(d.privado);
        expect(!!c.opcional, `${d.id} opcional`).toBe(d.opcional);
      }
    });
  }

  it("§5 preguntas por sector: ids y bloques", () => {
    const md = seccion(v2, /^## 5\. Profundización por sector/);
    const doc = filas(md)
      .filter((f) => f[0].startsWith("`"))
      .map((f) => ({ id: sinTicks(f[0]), bloque: f[1], texto: f[2] }));
    const mias = Object.values(PREGUNTAS_SECTOR).flat();
    expect(mias.map((c) => c.id).sort()).toEqual(doc.map((d) => d.id).sort());
    for (const d of doc) {
      const c = mias.find((x) => x.id === d.id)!;
      expect(c.bloque, `${d.id} bloque`).toBe(d.bloque);
      expect(c.texto, `${d.id} texto`).toBe(d.texto);
      expect(c.nivel, `${d.id} nivel`).toBe("P");
    }
  });

  it("§6 preguntas de la encuesta: ids, textos y puntos", () => {
    const doc = filas(seccion(v2, /^### Preguntas \(15\)/))
      .filter((f) => f[0].startsWith("`"))
      .map((f) => ({ id: sinTicks(f[0]), texto: f[1], opciones: f[2] }));
    expect(PREGUNTAS_ENCUESTA.map((p) => p.id)).toEqual(doc.map((d) => d.id));
    for (const d of doc) {
      const p = PREGUNTAS_ENCUESTA.find((x) => x.id === d.id)!;
      expect(p.texto, `${d.id} texto`).toBe(d.texto.replace(/ \(varias\)$| \(máx\. 3\)$| \(opcional\)$/, ""));
      // Puntos: "Nunca [0] · Cada semana [2] …"
      for (const trozo of d.opciones.split(" · ")) {
        const m = trozo.match(/^(.*?)\s*\[(.+)\]$/);
        if (!m) continue;
        const o = p.opciones?.find((x) => x.etiqueta === m[1]);
        if (!o) continue;
        expect(String(o.puntos), `${d.id} · ${m[1]}`).toBe(m[2]);
      }
    }
  });
});

describe.skipIf(!hayDocs)("Plantillas de procesos = batería v1 §3 (sin cambios en la v2)", () => {
  const bateria = hayDocs ? readFileSync(BATERIA, "utf8") : "";

  const secciones: [string, RegExp][] = [
    ["comunes", /^### Comunes/],
    ["servicios_profesionales", /^### `servicios_profesionales`/],
    ["hosteleria_eventos", /^### `hosteleria_eventos`/],
    ["industria_distribucion", /^### `industria_distribucion`/],
    ["salud", /^### `salud`/],
  ];

  for (const [clave, titulo] of secciones) {
    it(`plantillas ${clave}`, () => {
      const t = filas(seccion(bateria, titulo)).filter((f) => f[0] !== "Proceso");
      const pl = clave === "comunes" ? PLANTILLAS_COMUNES : PLANTILLAS_SECTOR[clave as SectorId];
      expect(pl.map((p) => p.nombre)).toEqual(t.map((f) => f[0]));
      expect(pl.map((p) => p.area)).toEqual(t.map((f) => f[1]));
      expect(pl.map((p) => p.pregunta)).toEqual(t.map((f) => sinComillas(f[2])));
      expect(pl.map((p) => `${p.qw ?? "genérico"} / ${typeof p.pct === "number" ? String(p.pct).replace(".", ",") : p.pct}`)).toEqual(
        t.map((f) => f[3]),
      );
    });
  }
});
