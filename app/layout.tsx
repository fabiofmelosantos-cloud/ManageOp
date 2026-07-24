import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/lib/auth-context"
import { AppHeader, DateProvider } from "@/components/layout/app-header"
import { ProtectedWrapper } from "@/components/layout/protected-wrapper"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata = {
  title: "ManageOp - Gestão de Produção",
  description: "Sistema completo de gestão de escalas e operações industriais",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" suppressHydrationWarning className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#1e40af" />
      </head>
      <body className="antialiased font-sans">
        <AuthProvider>
          <DateProvider>
            <ProtectedWrapper>
              <MainLayout>{children}</MainLayout>
            </ProtectedWrapper>
          </DateProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">{children}</main>
    </div>
  )
}
