import type { Metadata } from "next";
import "./globals.css";
import BotonCerrarSesion from "@/components/BotonCerrarSesion";
import NavLinks from "@/components/NavLinks";

export const metadata: Metadata = {
  title: "Accessphone App - Sistema Mayorista",
  description: "Plataforma de Operaciones Mayoristas con Agentes de IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-zinc-50 text-zinc-900">
        
        {/* Contenedor principal: Barra lateral + Área de Trabajo */}
        <div className="grid grid-cols-[260px_1fr] min-h-screen">
          
          {/* BARRA LATERAL NAVEGABLE */}
          <aside className="bg-zinc-100 text-zinc-800 p-6 flex flex-col justify-between border-r border-zinc-200 select-none">
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-black tracking-tight text-emerald-600">Accessphone</h2>
                <p className="text-xs text-zinc-500 font-medium">Plataforma Mayorista v2.0</p>
              </div>

              {/* ⚡ MENÚ DINÁMICO RESTRINGIDO POR ROL */}
              <NavLinks />
            </div>

            {/* SECCIÓN INFERIOR: BOTÓN CERRAR SESIÓN */}
            <div className="pt-4 border-t border-zinc-200">
              <div className="text-[11px] text-zinc-400 font-mono mb-1">
                Accessphone Mayorista v2.0
              </div>
              <BotonCerrarSesion />
            </div>
          </aside>

          {/* ÁREA DE CONTENIDO */}
          <main className="overflow-y-auto bg-slate-50">
            {children}
          </main>

        </div>

      </body>
    </html>
  );
}