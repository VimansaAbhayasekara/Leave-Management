import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import EmployeeView from "@/components/employee-view"
import AdminView from "@/components/admin-view"

export default async function Home() {
  const supabase = createClient()

  // Check for active session
  const { data: session } = await supabase
    .from("sessions")
    .select("user_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!session) {
    redirect("/signin")
  }

  const { data: userData } = await supabase.from("users").select("*").eq("id", session.user_id).single()

  if (!userData) {
    redirect("/signin")
  }

  return (
    <main className="container mx-auto py-6">
      {userData.is_admin ? <AdminView /> : <EmployeeView userId={userData.id} />}
    </main>
  )
}

