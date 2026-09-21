import { describe, expect, it } from "vitest";
import { tarjetaNueva } from "@/config/consultor/tarjeta";
import { calcularVisita, costesConCorreccion } from "./calculo";
import colino from "./__fixtures__/mapa-colino.json";
import { mapaSchema, validarMapa, type Mapa } from "./mapa";

const procesos = [
  tarjetaNueva({
    id: "p1",
    nombre: "Recordatorios de cita",
    volumen: 20,
    volumenPeriodo: "semana",
    minutosPorVez: 10,
    pasos: [
      { id: "s1", texto: "Mirar la agenda de mañana", quien: "persona" },
      { id: "s2", texto: "Llamar uno a uno", quien: "persona" },
    ],
  }),
];
const calculo = calcularVisita(
  procesos,
  { p1: { pctAutomatizable: 0.7 } },
  {
    sector: "salud",
    personas: 3,
    costes: costesConCorreccion(null),
  },
);
const c = calculo.tarjetas[0];

const diagrama = {
  titulo: "Recordatorios con el sistema",
  nodos: [
    { id: "a", texto: "Cita en la agenda", col: 0, fila: 0, humano: false },
    { id: "b", texto: "Aviso automático", col: 1, fila: 0, humano: false },
    { id: "c", texto: "Recepción revisa respuestas", col: 2, fila: 0, humano: true },
  ],
  aristas: [
    { de: "a", a: "b" },
    { de: "b", a: "c" },
  ],
  pie: "Tres pasos. Una sola acción humana.",
};

const base = (): Mapa => ({
  version: "mapa_v1",
  empresa: "Clínica Prueba",
  sector: "salud",
  fecha_diagnostico: "2026-09-22",
  frase_apertura: "Esto es lo que hemos visto.",
  resumen: "Resumen.",
  fugas: [
    {
      proceso_id: "p1",
      titulo: "Recordatorios de cita",
      horas_mes_hoy: c.hoyHorasMes!,
      ahorro_horas_mes: { min: c.ahorroHoras!.min, max: c.ahorroHoras!.max },
      supuestos: [],
    },
  ],
  hoja_de_ruta: [
    {
      fase: 1,
      nombre: "Lo primero",
      plazo: "3-4 semanas",
      items: [
        {
          titulo: "Recordatorios automáticos",
          antes: "Se llama uno a uno.",
          despues: "Sale solo y recepción ve las respuestas.",
          esfuerzo: "Bajo",
          proceso_id: "p1",
          depende_de: [],
          diagrama,
        },
      ],
    },
  ],
  no_automatizar: [],
  validar: [],
  siguiente_paso: { texto: "Hablemos.", cta_url: "https://cal.com/x/30min" },
});

const ctx = { procesos, calculo };

describe("validación del mapa (spec §7)", () => {
  it("un mapa correcto pasa", () => {
    expect(validarMapa(base(), ctx)).toMatchObject({ ok: true });
  });

  it("las cifras tienen que coincidir con el cálculo", () => {
    const m = base();
    m.fugas[0].ahorro_horas_mes = { min: 1, max: 99 };
    const r = validarMapa(m, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores[0].ruta).toBe("fugas[0].ahorro_horas_mes");
  });

  it("un diagrama sin ningún paso humano se rechaza", () => {
    const m = base();
    m.hoja_de_ruta[0].items[0].diagrama = {
      ...diagrama,
      nodos: diagrama.nodos.map((n) => ({ ...n, humano: false })),
    };
    const r = validarMapa(m, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errores.map((e) => e.mensaje).join()).toMatch(/al menos un paso de una persona/);
  });

  it("los puntos de la fase 1 llevan diagrama y los procesos tienen que existir", () => {
    const m = base();
    m.hoja_de_ruta[0].items[0].diagrama = null;
    m.hoja_de_ruta[0].items[0].proceso_id = "no-existe";
    const r = validarMapa(m, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const rutas = r.errores.map((e) => e.ruta);
      expect(rutas).toContain("hoja_de_ruta[0].items[0].diagrama");
      expect(rutas).toContain("hoja_de_ruta[0].items[0].proceso_id");
    }
  });

  it("flechas a nodos que no existen y columnas de más", () => {
    const m = base();
    m.hoja_de_ruta[0].items[0].diagrama = { ...diagrama, aristas: [{ de: "a", a: "z" }] };
    expect(validarMapa(m, ctx).ok).toBe(false);
    const m2 = base();
    m2.hoja_de_ruta[0].items[0].diagrama = {
      ...diagrama,
      nodos: [...diagrama.nodos, { id: "d", texto: "x", col: 9, fila: 0, humano: false }],
    };
    expect(validarMapa(m2, ctx).ok).toBe(false);
  });

  it("sin cálculo (visita sin cerrar) no se acepta", () => {
    expect(validarMapa(base(), { procesos, calculo: null }).ok).toBe(false);
  });

  it("no hay «Con el sistema» sin el «Así es hoy» de la visita", () => {
    const sinPasos = [{ ...procesos[0], pasos: [] }];
    const r = validarMapa(base(), { procesos: sinPasos, calculo });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.map((e) => e.mensaje).join()).toMatch(/Así es hoy/);
    const m = base();
    m.hoja_de_ruta[0].items[0].proceso_id = null;
    expect(validarMapa(m, ctx).ok).toBe(false);
  });
});

describe("revisión con JARVIS (21-sep)", () => {
  const bifurcado = () => ({
    ...diagrama,
    nodos: [...diagrama.nodos, { id: "d", texto: "Pide cambio", col: 2, fila: 1, humano: true }],
    aristas: [
      { de: "a", a: "b" },
      { de: "b", a: "c", etiqueta: "Confirma" },
      { de: "b", a: "d", etiqueta: "Pide cambio" },
    ],
  });

  it("secciones nuevas opcionales: con ellas y sin ellas pasa", () => {
    const m: Mapa = {
      ...base(),
      hallazgos: [1, 2, 3].map((i) => ({ titulo: `Hallazgo ${i}`, evidencia: "Lo dijo recepción." })),
      lo_que_ya_funciona: ["La agenda está al día"],
      preocupaciones: [{ preocupacion: "Perder el trato cercano", como_lo_abordamos: "Recepción sigue decidiendo." }],
      no_rentables: [{ que: "Facturación", motivo: "Son 5 facturas al mes." }],
    };
    m.hoja_de_ruta[0].items[0].plazo_orientativo = { min_semanas: 3, max_semanas: 5 };
    expect(validarMapa(m, ctx)).toMatchObject({ ok: true });
    expect(validarMapa(base(), ctx)).toMatchObject({ ok: true });
  });

  it("hallazgos: entre 3 y 5", () => {
    const m = { ...base(), hallazgos: [{ titulo: "Uno", evidencia: "x" }] };
    expect(validarMapa(m, ctx).ok).toBe(false);
  });

  it("plazo orientativo: rango con margen, y fases sin fechas", () => {
    const m = base();
    m.hoja_de_ruta[0].items[0].plazo_orientativo = { min_semanas: 4, max_semanas: 4 };
    expect(validarMapa(m, ctx).ok).toBe(false);
    for (const plazo of ["antes del 15/10", "octubre", "en 2027"]) {
      const m2 = base();
      m2.hoja_de_ruta[0].plazo = plazo;
      const r = validarMapa(m2, ctx);
      expect(r.ok, plazo).toBe(false);
    }
  });

  it("etiquetas: obligatorias si hay 2 o más salidas, máx. 3 palabras, nunca en tramos lineales", () => {
    const ok = base();
    ok.hoja_de_ruta[0].items[0].diagrama = bifurcado();
    expect(validarMapa(ok, ctx)).toMatchObject({ ok: true });

    const sinEtiqueta = base();
    const d1 = bifurcado();
    delete (d1.aristas[2] as { etiqueta?: string }).etiqueta;
    sinEtiqueta.hoja_de_ruta[0].items[0].diagrama = d1;
    expect(validarMapa(sinEtiqueta, ctx).ok).toBe(false);

    const larga = base();
    const d2 = bifurcado();
    d2.aristas[1].etiqueta = "Si confirma la cita";
    larga.hoja_de_ruta[0].items[0].diagrama = d2;
    expect(validarMapa(larga, ctx).ok).toBe(false);

    const lineal = base();
    const d3 = bifurcado();
    (d3.aristas[0] as { etiqueta?: string }).etiqueta = "Luego";
    lineal.hoja_de_ruta[0].items[0].diagrama = d3;
    const r = validarMapa(lineal, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores[0].ruta).toBe("hoja_de_ruta[0].items[0].diagrama.aristas[0].etiqueta");
  });

  it("el mapa ya guardado de Clínica Colino se sigue leyendo sin cambios", () => {
    const r = mapaSchema.safeParse(colino);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.hallazgos).toBeUndefined();
  });
});
