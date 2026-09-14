import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ControlStoreProvider } from "@/components/nomina/control-store";
import { WorkspaceShell } from "@/components/nomina/workspace-shell";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NóminaCheck",
  description: "Revisión y conciliación de documentación salarial.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="bg-background">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ControlStoreProvider>
          <WorkspaceShell>{children}</WorkspaceShell>
        </ControlStoreProvider>
      </body>
    </html>
  );
}
