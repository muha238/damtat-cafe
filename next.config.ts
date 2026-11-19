import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Суреттер Supabase Storage CDN-нен тікелей беріледі — Vercel-дің сурет
    // оптимизация лимиті біткенде фото «жоғалып» кетпеуі үшін (24/7 көрінеді).
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  experimental: {
    // Админнен фото жүктеу (браузер алдын ала сығады, бұл — шектеу)
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
