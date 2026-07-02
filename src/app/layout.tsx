import type { Metadata } from "next"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Bodega FC",
  description: "Gestión de precios para Bodega FC",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="bg-[var(--color-background)] pb-20">
        <Header />
        <main className="container mx-auto max-w-2xl p-4">
          {children}
        </main>
        <Toaster position="bottom-center" />
      </body>
    </html>
  )
}
