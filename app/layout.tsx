import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gabinete Digital — Danilo Gomes",
  description: "Sistema de gestão de demandas do mandato",
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
