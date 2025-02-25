"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function AdminView() {
  const [employees, setEmployees] = useState(0)
  const [todayLeaves, setTodayLeaves] = useState(0)
  const [upcomingLeaves, setUpcomingLeaves] = useState(0)
  const [leaves, setLeaves] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const supabase = createClient()
  const itemsPerPage = 10

  useEffect(() => {
    fetchData()
  }, [currentPage, searchTerm, dateRange])

  const fetchData = async () => {
    const { data: employeesData } = await supabase.from("users").select("id")
    setEmployees(employeesData?.length || 0)

    const today = new Date().toISOString().split("T")[0]
    const { data: todayLeavesData } = await supabase.from("leaves").select("id").eq("leave_date", today)
    setTodayLeaves(todayLeavesData?.length || 0)

    const { data: upcomingLeavesData } = await supabase.from("leaves").select("id").gt("leave_date", today)
    setUpcomingLeaves(upcomingLeavesData?.length || 0)

    let query = supabase
      .from("leaves")
      .select("*, users(full_name)", { count: "exact" })
      .order("leave_date", { ascending: true })

    if (searchTerm) {
      query = query.ilike("users.full_name", `%${searchTerm}%`)
    }

    if (dateRange.from && dateRange.to) {
      query = query
        .gte("leave_date", dateRange.from.toISOString().split("T")[0])
        .lte("leave_date", dateRange.to.toISOString().split("T")[0])
    }

    const { data, count, error } = await query.range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)

    if (error) {
      console.error("Error fetching leaves:", error)
    } else {
      setLeaves(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    }
  }

  const handleApproveReject = async (leaveId: string, status: "Approved" | "Rejected") => {
    const { error } = await supabase.from("leaves").update({ status }).eq("id", leaveId)

    if (error) {
      console.error("Error updating leave status:", error)
    } else {
      fetchData()
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Leaves</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayLeaves}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Leaves</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingLeaves}</div>
          </CardContent>
        </Card>
      </div>
      <div className="flex space-x-4">
        <Input
          placeholder="Search by employee name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee Name</TableHead>
            <TableHead>Leave Purpose</TableHead>
            <TableHead>Leave Type</TableHead>
            <TableHead>Leave Date</TableHead>
            <TableHead>Leave Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaves.map((leave: any) => (
            <TableRow key={leave.id}>
              <TableCell>{leave.users.full_name}</TableCell>
              <TableCell>{leave.leave_purpose}</TableCell>
              <TableCell>{leave.leave_type}</TableCell>
              <TableCell>
                {new Date(leave.leave_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell>
                <Badge variant={leave.leave_time === "Full Day" ? "default" : "secondary"}>{leave.leave_time}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    leave.status === "Approved" ? "success" : leave.status === "Rejected" ? "destructive" : "default"
                  }
                >
                  {leave.status}
                </Badge>
              </TableCell>
              <TableCell>
                {leave.status === "Pending" && (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mr-2">
                          Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Leave Request</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to approve this leave request?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleApproveReject(leave.id, "Approved")}>
                            Approve
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Leave Request</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to reject this leave request?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleApproveReject(leave.id, "Rejected")}>
                            Reject
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-center space-x-2">
        <Button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
          Previous
        </Button>
        <span className="self-center">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

