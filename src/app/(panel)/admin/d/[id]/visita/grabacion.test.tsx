/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BotonGrabar, Grabacion } from "./grabacion";

/**
 * Pausa de la grabación (Aitor, 21-sep): pausar y seguir usan el MISMO fragmento y el mismo
 * micrófono; el reloj no vuelve a cero. Micrófono y MediaRecorder simulados.
 */

class GrabadorFalso {
  static instancias: GrabadorFalso[] = [];
  static isTypeSupported = () => true;
  state: "inactive" | "recording" | "paused" = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor() {
    GrabadorFalso.instancias.push(this);
  }
  start() {
    this.state = "recording";
  }
  pause() {
    this.state = "paused";
  }
  resume() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}

const pista = { stop: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
let pedidasMicro = 0;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  GrabadorFalso.instancias = [];
  pedidasMicro = 0;
  (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = GrabadorFalso;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        pedidasMicro++;
        return { getTracks: () => [pista], getAudioTracks: () => [pista] };
      },
    },
  });
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ consentimiento_at: "2026-09-21T10:00:00Z", fragmentos: [] }),
    )) as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("pausa de la grabación", () => {
  it("pausa y sigue en el mismo fragmento, sin reiniciar el reloj", async () => {
    render(
      <Grabacion id="986d5763-bbe8-49e1-83c9-239d3ec4c9b4">
        <BotonGrabar />
      </Grabacion>,
    );
    await act(async () => {}); // consentimiento cargado
    await act(async () => screen.getByRole("button", { name: /Grabar/ }).click());
    expect(GrabadorFalso.instancias).toHaveLength(1);

    await act(async () => vi.advanceTimersByTime(65_000));
    expect(screen.getByRole("button", { name: /Grabando 1:05/ })).toBeTruthy();

    await act(async () => screen.getByRole("button", { name: /Grabando/ }).click());
    expect(GrabadorFalso.instancias[0].state).toBe("paused");
    expect(screen.getByRole("button", { name: /En pausa 1:05/ })).toBeTruthy();

    // En pausa no corre el reloj ni se corta el fragmento.
    await act(async () => vi.advanceTimersByTime(10 * 60_000));
    expect(GrabadorFalso.instancias).toHaveLength(1);
    expect(screen.getByRole("button", { name: /En pausa 1:05/ })).toBeTruthy();

    await act(async () => screen.getByRole("button", { name: /En pausa/ }).click());
    expect(GrabadorFalso.instancias).toHaveLength(1);
    expect(GrabadorFalso.instancias[0].state).toBe("recording");
    expect(pedidasMicro).toBe(1);

    await act(async () => vi.advanceTimersByTime(5_000));
    expect(screen.getByRole("button", { name: /Grabando 1:10/ })).toBeTruthy();

    await act(async () => screen.getByRole("button", { name: "Terminar" }).click());
    expect(GrabadorFalso.instancias[0].state).toBe("inactive");
    expect(screen.getByRole("button", { name: /^Grabar$/ })).toBeTruthy();
  });
});
