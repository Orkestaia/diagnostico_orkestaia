import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fuentes autoalojadas, las mismas del portfolio. Nada de Google Fonts por CDN.
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin-700-normal.woff2",
  weight: "700",
  display: "optional",
  variable: "--font-space-grotesk",
});

const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "400 700",
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin-400-normal.woff2",
  weight: "400",
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Diagnóstico Orkesta",
  description: "Diagnóstico de procesos de Orkesta Automatización & IA.",
  // Nada de esta app se indexa: enlaces personales y panel privado (spec §10).
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
