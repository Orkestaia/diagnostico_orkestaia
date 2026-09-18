import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Spec §10: los enlaces personales nunca se indexan (además del meta robots de cada página).
  async headers() {
    return ["/d/:path*", "/m/:path*", "/api/d/:path*", "/api/m/:path*"].map((source) => ({
      source,
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    }));
  },
};

export default nextConfig;
