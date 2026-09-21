import { describe, expect, it } from "vitest";
import { tarjetaNueva } from "@/config/consultor/tarjeta";
import { calcularVisita, costesConCorreccion } from "./calculo";
import { validarMapa, type Mapa } from "./mapa";

const procesos = [
  tarjetaNueva({
    id: "p1",
    nombre: "Recordatorios de cita",
    volumen: 20,
    volumenPeriodo: "semana",
    minutosPorVez: 10,
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
});
