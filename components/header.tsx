"use client"

import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

export function Header({ user }: { user?: { full_name: string } }) {
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    const userId = localStorage.getItem("userId")
    if (userId) {
      await supabase.from("sessions").delete().eq("user_id", userId)
      localStorage.removeItem("userId")
    }
    router.push("/signin")
    router.refresh()
  }

  return (
    <header className="w-full">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-rose-600" />
            <span className="text-lg font-bold">Vendor Leave Management</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <span className="text-sm text-muted-foreground">Welcome, {user.full_name}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
      <Separator />
    </header>
  )
}

