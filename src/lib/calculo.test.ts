import { describe, expect, it } from "vitest";
import { quickWinsDeSector, SECTORES } from "@/config/sectores";
import { PLANTILLAS_COMUNES, PLANTILLAS_SECTOR } from "@/config/consultor/plantillas";
import type { TarjetaProceso } from "@/config/consultor/tarjeta";
import type { Respuestas } from "@/config/tipos";
import {
  calcularQuickWins,
  calcularVisita,
  cifras,
  costesConCorreccion,
  factorTope,
  hoyHorasMes,
  limitarPct,
  personasEquipo,
  redondearEuros,
  redondearHoras,
  sugerenciasTarea,
  temasARevisar,
} from "./calculo";
import { leerEntradas } from "./preguntas";

const qw = (r: ReturnType<typeof calcularQuickWins>, id: string) =>
  r.elegidos.find((x) => x.id === id);

function tarjeta(p: Partial<TarjetaProceso>): TarjetaProceso {
  return {
    id: p.id ?? "t1",
    nombre: "Proceso",
    area: null,
    plantilla: null,
    disparador: "",
    pasos: [],
    quien: null,
    quienPersonas: null,
    volumen: null,
    volumenUnidad: "",
    volumenPeriodo: "mes",
    minutosPorVez: null,
    herramientas: [],
    atasco: "",
    errores: null,
    erroresEjemplo: "",
    cita: "",
    visto: false,
    prioridadCliente: null,
    ...p,
  };
}

describe("Caso de regresión obligatorio — Studio Colino (banco §2.5)", () => {
  // Arquitectura, equipo 6-15, 5 expedientes al mes, documentación "15-60 min".
  const respuestas: Respuestas = {
    "negocio.equipo": "6-15",
    "dia.expedientes_mes": 5,
    "dia.minutos_documentacion": "15-60 min",
  };
  const r = calcularQuickWins(respuestas, "servicios_profesionales");
  const sp1 = qw(r, "SP-QW1")!;

  it("SP-QW1 = 5 × 35/60 × 0,6 = 1,75 h/mes sin redondear", () => {
    expect(sp1.centralBruta).toBeCloseTo(1.75, 10);
  });

  it("< 2 h → sin euros, aunque redondeado se mostraría 2", () => {
    expect(sp1.bajoMinimo).toBe(true);
    expect(sp1.eur).toBeNull();
    expect(sp1.horas!.central).toBe(2);
  });

  it("nunca más de 5 h/mes ni más de 100 €/mes (el chatbot antiguo decía 651-868 €)", () => {
    expect(sp1.horas!.max).toBeLessThanOrEqual(5);
    expect(sp1.eur?.max ?? 0).toBeLessThanOrEqual(100);
  });

  it("mismo caso en la visita: tarjeta de 5 expedientes × 35 min con pct 0,6", () => {
    const t = tarjeta({
      plantilla: "Recogida de documentación",
      quien: "Administración o recepción",
      volumen: 5,
      minutosPorVez: 35,
    });
    const c = calcularVisita([t], {}, {
      sector: "servicios_profesionales",
      personas: 10,
      costes: costesConCorreccion(),
    }).tarjetas[0];
    expect(c.hoyHorasMesBruto).toBeCloseTo(35 / 12, 10); // 2,92 h consumidas hoy
    expect(c.ahorroCentralBruto).toBeCloseTo(1.75, 10);
    expect(c.ahorroEur).toBeNull();
  });
});

describe("Redondeo (banco §2.2)", () => {
  it("horas < 5 al 0,5 más cercano; si no, a entero", () => {
    expect(redondearHoras(1.2)).toBe(1);
    expect(redondearHoras(1.3)).toBe(1.5);
    expect(redondearHoras(4.74)).toBe(4.5);
    expect(redondearHoras(4.8)).toBe(5);
    expect(redondearHoras(5.4)).toBe(5);
    expect(redondearHoras(22.6)).toBe(23);
  });
  it("euros a la decena", () => {
    expect(redondearEuros(234)).toBe(230);
    expect(redondearEuros(235)).toBe(240);
  });
  it("rango ±25 % y euros con el coste del perfil", () => {
    const c = cifras(10, 14);
    expect(c.horas).toEqual({ min: 8, central: 10, max: 13 }); // 7,5 ≥ 5 → a entero
    expect(c.eur).toEqual({ min: 110, max: 180 }); // 7,5×14=105→110 · 12,5×14=175→180
  });
  it("el mínimo se mira sobre el valor sin redondear", () => {
    expect(cifras(1.99, 40).eur).toBeNull();
    expect(cifras(2, 40).eur).not.toBeNull();
  });
});

describe("Tope de pct (banco §2.2: nunca más de 0,7, sin excepciones)", () => {
  it("limitarPct", () => {
    expect(limitarPct(0.8)).toBe(0.7);
    expect(limitarPct(-1)).toBe(0);
  });
  it("ningún QW del banco pasa de 0,7", () => {
    for (const s of Object.keys(SECTORES) as (keyof typeof SECTORES)[]) {
      for (const q of quickWinsDeSector(s)) {
        if (typeof q.pct === "number") expect(q.pct).toBeLessThanOrEqual(0.7);
      }
    }
  });
  it("ninguna plantilla de la batería pasa de 0,7", () => {
    for (const p of [...PLANTILLAS_COMUNES, ...Object.values(PLANTILLAS_SECTOR).flat()]) {
      if (typeof p.pct === "number") expect(p.pct).toBeLessThanOrEqual(0.7);
    }
  });
  it("un pct privado de 0,9 en la visita se limita a 0,7", () => {
    const t = tarjeta({ volumen: 100, minutosPorVez: 60, quien: "Responsable" });
    const c = calcularVisita([t], { t1: { pctAutomatizable: 0.9 } }, {
      sector: "otro",
      personas: 50,
      costes: costesConCorreccion(),
    }).tarjetas[0];
    expect(c.pct).toBe(0.7);
    expect(c.ahorroCentralBruto).toBeCloseTo(70, 10);
  });
});

describe("Sin dato: «No lo sé» (banco §2.3)", () => {
  it("el QW puede aparecer, sin cifras, y añade «validar: volumen real»", () => {
    const r = calcularQuickWins(
      { "negocio.equipo": "2-5", "captacion.consultas_mes": "No lo sé" },
      "servicios_profesionales",
    );
    const c1 = qw(r, "C-QW1")!;
    expect(c1.sinCifras).toBe(true);
    expect(c1.horas).toBeNull();
    expect(c1.eur).toBeNull();
    expect(c1.validar).toContain("volumen real");
  });
  it("una pregunta sin responder no hace elegible un QW", () => {
    const r = calcularQuickWins({}, "servicios_profesionales");
    expect(r.elegibles).toHaveLength(0);
  });
});

describe("Oportunidades (banco §2.3): conteo mensual, nunca euros", () => {
  it("C-QW1: 60 consultas × 0,5 fuera de horario = 30", () => {
    const r = calcularQuickWins(
      { "captacion.consultas_mes": "30-100", "captacion.fuera_horario": "La mitad", "negocio.equipo": "6-15" },
      "otro",
    );
    const c1 = qw(r, "C-QW1")!;
    expect(c1.oportunidades).toBe(30);
    // Los euros solo salen de las horas: 60 × 6/60 × 0,5 = 3 h × 14 €
    expect(c1.centralBruta).toBeCloseTo(3, 10);
    expect(c1.eur).toEqual({ min: 30, max: 50 }); // 2,25×14=31,5→30 · 3,75×14=52,5→50
  });
  it("HE-QW2 es solo oportunidad: sin horas ni euros", () => {
    const r = calcularQuickWins(
      { "dia.llamadas_servicio": "Muchas", "dia.llamadas_perdidas": "Bastantes" },
      "hosteleria_eventos",
    );
    const he2 = qw(r, "HE-QW2")!;
    expect(he2.oportunidades).toBe(208); // 20 × 26 × 0,4
    expect(he2.horas).toBeNull();
    expect(he2.eur).toBeNull();
  });
  it("valor de ranking con tope de 40 oportunidades", () => {
    const r = calcularQuickWins(
      { "dia.llamadas_servicio": "Muchas", "dia.llamadas_perdidas": "Bastantes" },
      "hosteleria_eventos",
    );
    expect(qw(r, "HE-QW2")!.valor).toBe(8 * 40);
  });
});

describe("Ranking (banco §2.4)", () => {
  it("riesgo entra con valor 50", () => {
    const r = calcularQuickWins({ "dia.plazos": "De memoria" }, "servicios_profesionales");
    expect(qw(r, "SP-QW4")!.valor).toBe(50);
  });
  it("×1,3 si coincide una etiqueta con prioridad.exito y ×1,2 si una palabra clave está en la tarea", () => {
    const base: Respuestas = { "dia.plazos": "De memoria" };
    const conExito = calcularQuickWins({ ...base, "prioridad.exito": ["Menos errores"] }, "servicios_profesionales");
    expect(qw(conExito, "SP-QW4")!.score).toBeCloseTo(65, 10);
    const conTarea = calcularQuickWins({ ...base, "prioridad.tarea": "Vigilar los PLAZOS" }, "servicios_profesionales");
    expect(qw(conTarea, "SP-QW4")!.score).toBeCloseTo(60, 10);
  });
  it("palabras clave sin tener en cuenta tildes", () => {
    const r = calcularQuickWins(
      { "dia.expedientes_mes": "5-15", "dia.minutos_documentacion": "1-3 h", "prioridad.tarea": "la documentacion" },
      "servicios_profesionales",
    );
    const sin = calcularQuickWins(
      { "dia.expedientes_mes": "5-15", "dia.minutos_documentacion": "1-3 h" },
      "servicios_profesionales",
    );
    expect(qw(r, "SP-QW1")!.score).toBeCloseTo(qw(sin, "SP-QW1")!.score * 1.2, 10);
  });
  it("elige 3, como máximo 2 de la misma categoría", () => {
    const r = calcularQuickWins(
      {
        "negocio.equipo": "16-50",
        "captacion.consultas_mes": "Más de 300",
        "captacion.hace_presupuestos": "Sí",
        "captacion.presupuestos_mes": "Más de 40",
        "captacion.minutos_presupuesto": "Más de 3 h",
        "dia.expedientes_mes": "5-15",
        "dia.minutos_documentacion": "15-60 min",
      },
      "servicios_profesionales",
    );
    expect(r.elegidos).toHaveLength(3);
    expect(r.elegidos.filter((x) => x.categoria === "captacion").length).toBeLessThanOrEqual(2);
  });
  it("si hay menos de 3 elegibles, completa con los comunes (marcados como relleno, sin cifras)", () => {
    const r = calcularQuickWins({ "dia.plazos": "Excel" }, "servicios_profesionales");
    expect(r.elegidos).toHaveLength(3);
    expect(r.elegidos[0].id).toBe("SP-QW4");
    expect(r.elegidos.slice(1).every((x) => x.relleno && x.sinCifras)).toBe(true);
  });
});

describe("Tope de equipo (banco §2.3)", () => {
  it("factorTope: 25 % de personas × 140 h", () => {
    expect(factorTope(35, 1)).toBe(1); // tope 35
    expect(factorTope(70, 1)).toBe(0.5);
    expect(factorTope(70, null)).toBe(1);
  });
  it("«Solo yo» con 8 h/semana copiando datos y 60 presupuestos de 4 h: se escala y marca ajustado", () => {
    const r = calcularQuickWins(
      {
        "negocio.equipo": "Solo yo",
        "herramientas.horas_copiando": "Más de 8 h",
        "captacion.hace_presupuestos": "Sí",
        "captacion.presupuestos_mes": "Más de 40",
        "captacion.minutos_presupuesto": "Más de 3 h",
      },
      "otro",
    );
    expect(r.ajustadoPorTope).toBe(true);
    const suma = r.elegidos.reduce((s, x) => s + (x.centralBruta ?? 0), 0);
    expect(suma).toBeCloseTo(35, 6);
    // «Solo yo» → todo con perfil directivo
    expect(r.elegidos.filter((x) => x.perfil).every((x) => x.perfil === "directivo")).toBe(true);
  });
});

describe("Perfiles (banco §2.1 y QW)", () => {
  it("SP-QW1: operativo, tactico si equipo ≤ 5", () => {
    const e = { "dia.expedientes_mes": "5-15", "dia.minutos_documentacion": "1-3 h" };
    expect(qw(calcularQuickWins({ ...e, "negocio.equipo": "6-15" }, "servicios_profesionales"), "SP-QW1")!.perfil).toBe("operativo");
    expect(qw(calcularQuickWins({ ...e, "negocio.equipo": "2-5" }, "servicios_profesionales"), "SP-QW1")!.perfil).toBe("tactico");
  });
  it("OT-QW1: según dia.quien, y su etiqueta_tarea es el texto del cliente", () => {
    const r = calcularQuickWins(
      { "dia.proceso_repetitivo": "Cuadrar la caja", "dia.veces_mes": "10-50", "dia.minutos_vez": "15-60 min", "dia.quien": "Un responsable" },
      "otro",
    );
    const o = qw(r, "OT-QW1")!;
    expect(o.perfil).toBe("tactico");
    expect(o.etiquetaTarea).toBe("Cuadrar la caja");
    expect(o.centralBruta).toBeCloseTo((30 * 35 * 0.4) / 60, 10);
  });
  it("costes corregidos en privado (c.coste_perfil)", () => {
    expect(costesConCorreccion({ tactico: 30 })).toEqual({ operativo: 14, tactico: 30, directivo: 40 });
  });
});

describe("Preguntas condicionales", () => {
  it("una respuesta a una pregunta ya oculta no cuenta", () => {
    const e = leerEntradas(
      { "captacion.hace_presupuestos": "No", "captacion.presupuestos_mes": "Más de 40" },
      "otro",
    );
    expect(e.n("captacion.presupuestos_mes")).toBeUndefined();
  });
  it("gt: minutos_respuesta_evento solo si solicitudes_evento > 0", () => {
    const r = { "dia.solicitudes_evento": "Ninguna", "dia.minutos_respuesta_evento": "30-60 min" };
    expect(leerEntradas(r, "hosteleria_eventos").n("dia.minutos_respuesta_evento")).toBeUndefined();
  });
});

describe("Sugerencias y temas del previo (banco §3-V, §10; spec §3)", () => {
  const previo: Respuestas = {
    "negocio.equipo": "6-15",
    "captacion.consultas_mes": "30-100",
    "captacion.hace_presupuestos": "Sí",
    "captacion.presupuestos_mes": "5-15",
    "dia.expedientes_mes": "15-40",
    "dia.minutos_documentacion": "1-3 h",
    "dia.llamadas_estado": "15-30",
  };
  it("sugerencias = etiquetas de tarea (nunca títulos de QW), hasta 3", () => {
    const s = sugerenciasTarea(previo, "servicios_profesionales");
    expect(s.length).toBeGreaterThan(0);
    expect(s.length).toBeLessThanOrEqual(3);
    const titulos = quickWinsDeSector("servicios_profesionales").map((q) => q.tituloBase);
    for (const x of s) expect(titulos).not.toContain(x);
    expect(s[0]).toBe("Pedir y perseguir documentación"); // 25 × 2 h × 0,6 = 30 h: la mayor
  });
  it("sin elegibles, sin sugerencias", () => {
    expect(sugerenciasTarea({}, "servicios_profesionales")).toEqual([]);
  });
  it("temas = etiquetas de tarea de los mejor situados, sin rellenos", () => {
    expect(temasARevisar({ "dia.plazos": "Excel" }, "servicios_profesionales")).toEqual([
      "Controlar plazos y vencimientos",
    ]);
  });
});

describe("Visita: horas de hoy y periodos (batería §2)", () => {
  it("día × 21, hostelería × 26, semana × 4,3", () => {
    const t = { volumen: 2, minutosPorVez: 30 };
    expect(hoyHorasMes({ ...t, volumenPeriodo: "dia" }, "otro")).toBeCloseTo(21, 10);
    expect(hoyHorasMes({ ...t, volumenPeriodo: "dia" }, "hosteleria_eventos")).toBeCloseTo(26, 10);
    expect(hoyHorasMes({ ...t, volumenPeriodo: "semana" }, "otro")).toBeCloseTo(4.3, 10);
    expect(hoyHorasMes({ ...t, volumenPeriodo: "mes" }, "otro")).toBeCloseTo(1, 10);
  });
  it("sin minutos, no hay horas", () => {
    expect(hoyHorasMes({ volumen: 5, minutosPorVez: null, volumenPeriodo: "mes" }, "otro")).toBeNull();
  });
  it("plantilla de riesgo u oportunidad: horas de hoy sí, ahorro no (salvo pct privado)", () => {
    const t = tarjeta({ plantilla: "Plazos y vencimientos", volumen: 10, minutosPorVez: 30, quien: "Responsable" });
    const ctx = { sector: "servicios_profesionales" as const, personas: 10, costes: costesConCorreccion() };
    const c = calcularVisita([t], {}, ctx).tarjetas[0];
    expect(c.hoyHorasMesBruto).toBeCloseTo(5, 10);
    expect(c.ahorroHoras).toBeNull();
  });
  it("tope de equipo sobre todas las tarjetas", () => {
    const ts = [
      tarjeta({ id: "a", volumen: 200, minutosPorVez: 60, quien: "Responsable" }),
      tarjeta({ id: "b", volumen: 200, minutosPorVez: 60, quien: "Responsable" }),
    ];
    const v = calcularVisita(ts, {}, { sector: "otro", personas: 2, costes: costesConCorreccion() });
    // 2 × 200 h × 0,4 = 160 h > tope 70 h
    expect(v.ajustadoPorTope).toBe(true);
    expect(v.totalAhorroCentral).toBeCloseTo(70, 6);
  });
  it("personas: suma de a.equipo, si no negocio.equipo", () => {
    expect(personasEquipo([{ rol: "Socios", numero: 2 }, { rol: "Admin", numero: 3 }], {}, "otro")).toBe(5);
    expect(personasEquipo([], { "negocio.equipo": "16-50" }, "otro")).toBe(30);
    expect(personasEquipo(undefined, {}, "otro")).toBeNull();
  });
});

describe("Catálogo de tipos de negocio", async () => {
  const { TIPOS_NEGOCIO } = await import("@/config/catalogoSectores");
  it("todo tipo apunta a un sector y subsector que existen en el banco", () => {
    for (const t of TIPOS_NEGOCIO) {
      const s = SECTORES[t.sector];
      expect(s, t.etiqueta).toBeDefined();
      if (t.subsector) expect(s.subsectores, t.etiqueta).toContain(t.subsector);
    }
  });
  it("sin etiquetas repetidas", () => {
    expect(new Set(TIPOS_NEGOCIO.map((t) => t.etiqueta)).size).toBe(TIPOS_NEGOCIO.length);
  });
});
