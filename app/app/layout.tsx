export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <title>Gabinete Digital — Danilo Gomes</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
