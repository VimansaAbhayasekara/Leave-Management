import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import { createClient } from "@/utils/supabase/server"

const inter = Inter({ subsets: ["latin"] })

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  // Check for active session
  const { data: session } = await supabase
    .from("sessions")
    .select("user_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  let userData = null
  if (session) {
    const { data } = await supabase.from("users").select("*").eq("id", session.user_id).single()
    userData = data
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Header user={userData} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

