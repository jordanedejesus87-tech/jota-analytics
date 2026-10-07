import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JOTA Analytics',
  description: 'Plataforma de análise financeira e comercial',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
