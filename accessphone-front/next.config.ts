import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 
    React Strict Mode activado para detectar efectos secundarios duplicados, 
    lo cual es crítico al manejar flujos de renderizado complejos y llamadas a APIs de IA.
  */
  reactStrictMode: true,

  /* 
    Si tus agentes de IA o inventarios cargan imágenes de productos desde un backend externo 
    o URLs dinámicas, debes autorizar los dominios aquí para el componente <Image /> de Next.
  */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "via.placeholder.com", // Reemplazar por el dominio de tu servidor de imágenes
      },
    ],
  },

  /*
    Configuración opcional de headers para CORS si planeas que este frontend 
    sirva endpoints de API internos que consuman otros servicios directamente.
  */
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
        ],
      },
    ];
  },
};

export default nextConfig;