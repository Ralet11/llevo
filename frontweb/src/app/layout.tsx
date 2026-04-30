import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LLEVO',
  description: 'Conectamos viajes con necesidades — plataforma de viajes compartidos y encomiendas interurbanas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
