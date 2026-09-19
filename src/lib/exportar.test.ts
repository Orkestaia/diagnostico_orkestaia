import { describe, expect, it } from "vitest";
import { tarjetaNueva } from "@/config/consultor/tarjeta";
import { calcularVisita, costesConCorreccion } from "./calculo";
import {
  exportJson,
  exportMarkdown,
  nombreArchivo,
  valorLegible,
  type FilaExport,
} from "./exportar";
import { conRegistroHoy } from "./visita";

const procesos = conRegistroHoy(
  [
    tarjetaNueva({
      id: "previo-dia-expedientes-mes",
      nombre: "Recogida de documentación",
      plantilla: "Recogida de documentación",
      volumen: 10,
      minutosPorVez: 120,
      origenDatos: "previo",
      quien: "Administración",
      cita: "Nos pasamos el día persiguiendo papeles",
      prioridadCliente: 1,
      pasos: [
        { id: "p1", texto: "Pedir documentos por email", quien: "persona" },
        { id: "p2", texto: "Revisar lo que llega", quien: "persona" },
      ],
    }),
    tarjetaNueva({ id: "t2", nombre: "Facturación", rapida: true, volumen: 30, minutosPorVez: 10 }),
  ],
  "servicios_profesionales",
  "2026-09-22",
);
const privado = {
  campos: {
    "c.coste_perfil": { operativo: 18, tactico: 25, directivo: 40, origen: "cliente" },
    "e.inversion": "1.000-3.000 €",
  },
  procesos: {
    "previo-dia-expedientes-mes": { pctAutomatizable: 0.5, nota: "Usan Drive compartido" },
  },
};

const fila: FilaExport = {
  id: "6b1075ae-2055-4eb2-b2de-676116aac739",
  estado: "visita_cerrada",
  sector: "servicios_profesionales",
  subsector: null,
  tipo_negocio: "Asesoría",
  empresa: "Despacho Prueba",
  contacto_nombre: "Ana",
  web: null,
  origen: "bni",
  fecha_reunion: "2026-09-22",
  hora_reunion: "10:00:00",
  lugar_reunion: "En su oficina",
  config_version: "banco_v1",
  respuestas_previo: {
    "dia.expedientes_mes": "5-15",
    "herramientas.lista": ["Software de mi sector"],
    "herramientas.lista::Software de mi sector": "A3",
  },
  respuestas_visita: {
    inicio_at: "2026-09-22T08:00:00Z",
    campos: {
      "a.historia": "Despacho familiar desde 1990",
      "a.equipo": [{ rol: "Abogados", numero: 3 }],
      "e.prioridades": ["previo-dia-expedientes-mes"],
    },
    correcciones_previo: { "dia.expedientes_mes": "15-40" },
  },
  procesos,
  privado,
  interno: { hipotesis: [{ hipotesis: "Mucho tiempo en documentación" }], alertas: [] },
  informe: { resumen_entendido: ["Abrís unos 10 expedientes al mes"] },
  calculo: {
    ...calcularVisita(procesos, privado.procesos, {
      sector: "servicios_profesionales",
      personas: 3,
      costes: costesConCorreccion({ operativo: 18, tactico: 25, directivo: 40 }),
    }),
    coste_origen: "cliente",
    calculado_at: "2026-09-22T11:00:00Z",
  },
  previo_completado_at: "2026-09-20T10:00:00Z",
  visita_cerrada_at: "2026-09-22T11:00:00Z",
};

describe("export para JARVIS", () => {
  const md = exportMarkdown(fila, "2026-09-23");

  it("sugiere el nombre con la fecha de la visita", () => {
    expect(nombreArchivo(fila, "2026-09-23")).toBe("2026-09-22_diagnostico-app_raw.md");
    expect(
      nombreArchivo({ visita_cerrada_at: null, fecha_reunion: null }, "2026-09-23", "json"),
    ).toBe("2026-09-23_diagnostico-app_raw.json");
  });

  it("lleva previo con su corrección, opción abierta y lo entendido", () => {
    expect(md).toContain("(`dia.expedientes_mes`): 5-15 → **corregido en la visita:** 15-40");
    expect(md).toContain("Software de mi sector: A3");
    expect(md).toContain("Abrís unos 10 expedientes al mes");
  });

  it("lleva la visita, las notas privadas marcadas y las prioridades con nombre", () => {
    expect(md).toContain("Despacho familiar desde 1990");
    expect(md).toContain("rol: Abogados · numero: 3");
    expect(md).toContain("_(privado)_: 1.000-3.000 €");
    expect(md).toContain("1. Recogida de documentación");
    expect(md).toContain("Nota: Usan Drive compartido");
    expect(md).toContain("% automatizable estimado: 50 %");
  });

  it("lleva las horas de hoy del registro fijo y el cálculo con el origen del coste", () => {
    expect(md).toContain("Horas al mes hoy (registro fijo)");
    expect(md).toContain("2026-09-22 · origen previo");
    expect(md).toContain("tarjeta rápida");
    expect(md).toContain("(dato del cliente)");
    // Ordenadas por horas: documentación (20 h) antes que facturación (5 h).
    expect(md.indexOf("### Recogida de documentación")).toBeLessThan(md.indexOf("### Facturación"));
  });

  it("no lleva email ni teléfono y el json trae el cálculo completo", () => {
    const j = exportJson(fila, "2026-09-23");
    expect(JSON.stringify(j)).not.toMatch(/contacto_(email|telefono)/);
    expect(j.calculo?.tarjetas).toHaveLength(2);
    expect(j.archivo_sugerido).toBe("2026-09-22_diagnostico-app_raw.md");
  });

  it("sin visita cerrada lo dice en vez de inventar cifras", () => {
    expect(exportMarkdown({ ...fila, calculo: null }, "2026-09-23")).toContain(
      "todavía no hay cálculo",
    );
  });

  it("valorLegible", () => {
    expect(valorLegible(null)).toBe("—");
    expect(valorLegible(["a", "b"])).toBe("a, b");
    expect(valorLegible({ texto: "Yo", aqui: "Sí" })).toBe("texto: Yo · aqui: Sí");
    expect(valorLegible(2.5)).toBe("2,5");
  });
});

describe("export: notas y transcripción", () => {
  it("añade las notas privadas y la transcripción en orden, marcando lo pendiente", () => {
    const md = exportMarkdown(
      {
        ...fila,
        privado: {
          ...fila.privado,
          campos: { ...fila.privado!.campos, "x.notas": "Ojo: el socio no quiere cambios" },
        },
        transcripcion: [
          { orden: 1_000_600_000, duracion_s: 300, estado: "error", texto: null },
          {
            orden: 1_000_000_000,
            duracion_s: 300,
            estado: "transcrito",
            texto: "Buenos días, empezamos.",
          },
          { orden: 1_000_300_000, duracion_s: 300, estado: "transcrito", texto: "" },
        ],
      },
      "2026-09-23",
    );
    expect(md).toContain("Ojo: el socio no quiere cambios");
    expect(md).toContain("**[00:00:00]** Buenos días, empezamos.");
    expect(md).toContain("**[00:05:00]** _(sin voz");
    expect(md).toContain("**[00:10:00]** _(fragmento de 5 min todavía sin transcribir: error)_");
  });

  it("sin grabación no hay sección de transcripción", () => {
    expect(exportMarkdown(fila, "2026-09-23")).not.toContain("Transcripción de la reunión");
  });
});
