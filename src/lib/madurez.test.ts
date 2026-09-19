import { describe, expect, it } from "vitest";
import { MINIMO_RESPUESTAS, OTRAS_AREAS } from "@/config/consultor/encuesta";
import {
  calcularMadurez,
  dimensionesDe,
  indiceDe,
  nivelDe,
  sanearRespuestaEncuesta,
  type RespuestaEncuesta,
} from "./madurez";

const AREAS = ["Administración", "Producción"];

/** Persona "media": uso 2, competencia 2, seguridad 2, actitud 3. */
const persona = (p: Partial<RespuestaEncuesta> = {}): RespuestaEncuesta => ({
  "s.area": "Administración",
  "s.frecuencia": "Cada semana",
  "s.usos": ["Redactar textos o emails", "Resumir documentos"],
  "s.nivel": "Sé pedir lo que quiero y corregir",
  "s.revision": "La reviso por encima",
  "s.formacion": "Un curso corto",
  "s.datos": "A veces, con cuidado",
  "s.normas": "Hay algo informal",
  "s.sentir": "Curiosidad",
  "s.hora": "Probablemente sí",
  "s.aprender": ["Automatizar tareas repetitivas"],
  ...p,
});

describe("madurez: cálculo por persona (§6)", () => {
  it("dimensiones e índice con la fórmula del documento", () => {
    const d = dimensionesDe(persona());
    expect(d).toEqual({ uso: 2, competencia: 2, seguridad: 2, actitud: 3 });
    // (0,30·2 + 0,30·2 + 0,20·2 + 0,20·3) / 4 × 100 = 55
    expect(indiceDe(d)).toBeCloseTo(55, 6);
    expect(nivelDe(55)).toMatchObject({ nivel: 3, nombre: "Uso personal" });
  });

  it("s.usos puntúa por número de usos, con tope 4, y 'No la uso' resta a 0", () => {
    const muchos = dimensionesDe(
      persona({
        "s.frecuencia": "A diario",
        "s.usos": ["a", "b", "c", "d", "e"].map(() => "Traducir"),
      }),
    );
    expect(muchos.uso).not.toBeNull();
    const ninguno = dimensionesDe(persona({ "s.frecuencia": "Nunca", "s.usos": ["No la uso"] }));
    expect(ninguno.uso).toBe(0);
  });

  it("las opciones 'excluir' no cuentan y el peso se reparte", () => {
    const d = dimensionesDe(persona({ "s.datos": "No uso IA", "s.normas": null }));
    expect(d.seguridad).toBeNull();
    // Sin seguridad: (0,30·2 + 0,30·2 + 0,20·3) / 0,80 / 4 × 100
    expect(indiceDe(d)).toBeCloseTo(56.25, 6);
  });

  it("los niveles cortan donde dice el documento", () => {
    expect(nivelDe(0).nivel).toBe(1);
    expect(nivelDe(20).nivel).toBe(1);
    expect(nivelDe(20.5).nivel).toBe(2);
    expect(nivelDe(100).nivel).toBe(5);
  });
});

describe("madurez: anonimato (§6)", () => {
  it(`no publica nada con menos de ${MINIMO_RESPUESTAS} respuestas`, () => {
    const r = calcularMadurez([persona(), persona()]);
    expect(r.publicable).toBe(false);
    expect(r.empresa).toBeNull();
    expect(r.areas).toEqual([]);
  });

  it("un área con menos de 3 respuestas no se enseña suelta", () => {
    const rs = [persona(), persona(), persona(), persona({ "s.area": "Producción" })];
    const r = calcularMadurez(rs);
    expect(r.publicable).toBe(true);
    expect(r.empresa!.respuestas).toBe(4);
    expect(r.areas.map((a) => a.nombre)).toEqual(["Administración"]);
  });

  it("las áreas pequeñas se juntan en 'Otras áreas' cuando llegan al mínimo", () => {
    const rs = [
      ...Array.from({ length: 3 }, () => persona()),
      persona({ "s.area": "Producción" }),
      persona({ "s.area": "Ventas" }),
      persona({ "s.area": "Prefiero no decirlo" }),
    ];
    const r = calcularMadurez(rs);
    expect(r.areas.map((a) => a.nombre).sort()).toEqual(["Administración", OTRAS_AREAS]);
    expect(r.areas.find((a) => a.nombre === OTRAS_AREAS)!.respuestas).toBe(3);
  });

  it("los textos de 's.tarea' solo salen con 5 o más respuestas", () => {
    const con = (n: number) =>
      calcularMadurez(
        Array.from({ length: n }, () => persona({ "s.tarea": "Pasar facturas a mano" })),
      );
    expect(con(4).tareas).toEqual([]);
    expect(con(5).tareas).toHaveLength(5);
  });
});

describe("madurez: alertas (§6)", () => {
  const cinco = (p: Partial<RespuestaEncuesta>) => Array.from({ length: 5 }, () => persona(p));

  it("IA en la sombra con el 20 % o más", () => {
    const rs = [
      ...cinco({}),
      persona({ "s.datos": "Sí, sin pensarlo mucho" }),
      persona({ "s.datos": "Sí, sin pensarlo mucho" }),
    ];
    expect(calcularMadurez(rs).alertas.map((a) => a.id)).toContain("ia_en_la_sombra");
  });

  it("uso sin control: mucho uso y poca seguridad", () => {
    const rs = cinco({
      "s.frecuencia": "A diario",
      "s.usos": ["Traducir", "Resumir documentos", "Buscar información"],
      "s.datos": "Sí, sin pensarlo mucho",
      "s.normas": "No hay",
    });
    expect(calcularMadurez(rs).alertas.map((a) => a.id)).toContain("uso_sin_control");
  });

  it("brecha de formación por área", () => {
    const rs = cinco({
      "s.nivel": "Hago preguntas sencillas",
      "s.revision": "La uso tal cual",
      "s.formacion": "Ninguna",
    });
    expect(calcularMadurez(rs).alertas.map((a) => a.id)).toContain("brecha_formacion");
  });

  it("brecha de comunicación solo si dirección dice que las normas están escritas", () => {
    const rs = cinco({ "s.normas": "No lo sé" });
    expect(calcularMadurez(rs).alertas.map((a) => a.id)).not.toContain("brecha_comunicacion");
    expect(
      calcularMadurez(rs, { normasDireccion: "Escritas y comunicadas" }).alertas.map((a) => a.id),
    ).toContain("brecha_comunicacion");
  });

  it("miedo con el 30 % o más", () => {
    const rs = [
      ...cinco({}),
      ...Array.from({ length: 3 }, () => persona({ "s.sentir": "Me preocupa que me sustituya" })),
    ];
    expect(calcularMadurez(rs).alertas.map((a) => a.id)).toContain("miedo");
  });

  it("ranking de formación, global y por área", () => {
    const rs = [
      ...Array.from({ length: 3 }, () =>
        persona({ "s.aprender": ["Usar la IA con seguridad", "Excel y datos con IA"] }),
      ),
      ...Array.from({ length: 3 }, () =>
        persona({ "s.area": "Producción", "s.aprender": ["Automatizar tareas repetitivas"] }),
      ),
    ];
    const r = calcularMadurez(rs);
    // Empate a 3: se ordena por votos y, a igualdad, por orden alfabético.
    expect(r.formacion).toEqual([
      { etiqueta: "Automatizar tareas repetitivas", votos: 3 },
      { etiqueta: "Excel y datos con IA", votos: 3 },
      { etiqueta: "Usar la IA con seguridad", votos: 3 },
    ]);
    expect(r.formacionPorArea.find((x) => x.area === "Producción")!.ranking[0].etiqueta).toBe(
      "Automatizar tareas repetitivas",
    );
  });
});

describe("madurez: saneado del envío", () => {
  it("se queda solo con ids y opciones de la batería, y respeta el máximo de 3", () => {
    const r = sanearRespuestaEncuesta(
      {
        "s.area": "Administración",
        "s.frecuencia": "Cada semana",
        "s.nivel": "Inventada",
        "s.aprender": [
          "Traducir mal",
          "Excel y datos con IA",
          "Emails y propuestas",
          "Presentaciones e imágenes",
          "Usar la IA con seguridad",
        ],
        "s.tarea": "  Pasar facturas  ",
        otro: "lo que sea",
      },
      AREAS,
    );
    expect(r).toEqual({
      "s.area": "Administración",
      "s.frecuencia": "Cada semana",
      "s.aprender": ["Excel y datos con IA", "Emails y propuestas", "Presentaciones e imágenes"],
      "s.tarea": "Pasar facturas",
    });
  });

  it("un área que no existe se descarta y una respuesta vacía no cuenta", () => {
    expect(sanearRespuestaEncuesta({ "s.area": "Marketing" }, AREAS)).toBeNull();
    expect(sanearRespuestaEncuesta({}, AREAS)).toBeNull();
    expect(sanearRespuestaEncuesta({ "s.area": "Prefiero no decirlo" }, AREAS)).toEqual({
      "s.area": "Prefiero no decirlo",
    });
  });
});
