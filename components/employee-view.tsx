"use client"

import { useState, useEffect } from "react"
import { addDays, format, startOfWeek, isSameDay, parseISO } from "date-fns"
import { ChevronLeft, ChevronRight, Plus, ArrowUpDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/utils/supabase/client"
import { Badge } from "@/components/ui/badge"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI"]

const LEAVE_COLORS = {
  "Study Leave": "bg-gradient-to-r from-blue-500/20 to-blue-500/10 border-blue-500/20",
  "Exam Leave": "bg-gradient-to-r from-green-500/20 to-green-500/10 border-green-500/20",
  "Medical Leave": "bg-gradient-to-r from-red-500/20 to-red-500/10 border-red-500/20",
  "Annual Leave": "bg-gradient-to-r from-yellow-500/20 to-yellow-500/10 border-yellow-500/20",
  "Parental Leave": "bg-gradient-to-r from-purple-500/20 to-purple-500/10 border-purple-500/20",
}

export default function EmployeeView({ userId }: { userId: string }) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [leaveType, setLeaveType] = useState("")
  const [leavePurpose, setLeavePurpose] = useState("")
  const [leaveTime, setLeaveTime] = useState("")
  const [appliedLeaves, setAppliedLeaves] = useState<any[]>([])
  const [editingLeave, setEditingLeave] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchAppliedLeaves()
  }, [])

  const fetchAppliedLeaves = async () => {
    const { data, error } = await supabase
      .from("leaves")
      .select("*")
      .eq("user_id", userId)
      .order("leave_date", { ascending: true })

    if (error) {
      console.error("Error fetching applied leaves:", error)
    } else {
      setAppliedLeaves(data || [])
    }
  }

  const handleDateClick = (date: Date, existingLeave?: any) => {
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      setSelectedDate(date)
      if (existingLeave) {
        setEditingLeave(existingLeave)
        setLeaveType(existingLeave.leave_type)
        setLeavePurpose(existingLeave.leave_purpose)
        setLeaveTime(existingLeave.leave_time)
      } else {
        setEditingLeave(null)
        setLeaveType("")
        setLeavePurpose("")
        setLeaveTime("")
      }
      setIsDialogOpen(true)
    }
  }

  const handleSubmit = async () => {
    if (selectedDate && leaveType && leavePurpose && leaveTime) {
      const leaveData = {
        user_id: userId,
        leave_type: leaveType,
        leave_purpose: leavePurpose,
        leave_time: leaveTime,
        leave_date: selectedDate.toISOString().split("T")[0], // Ensure UTC date
      };

      const { data, error } = editingLeave
        ? await supabase.from("leaves").update(leaveData).eq("id", editingLeave.id)
        : await supabase.from("leaves").insert(leaveData);

      if (error) {
        console.error("Error submitting leave:", error);
      } else {
        console.log("Leave submitted successfully:", data);
        fetchAppliedLeaves();
        // Reset form and close dialog
        setSelectedDate(undefined);
        setLeaveType("");
        setLeavePurpose("");
        setLeaveTime("");
        setEditingLeave(null);
        setIsDialogOpen(false);
      }
    }
  };

  const handleDelete = async (leaveId: string) => {
    const { error } = await supabase.from("leaves").delete().eq("id", leaveId)

    if (error) {
      console.error("Error deleting leave:", error)
    } else {
      fetchAppliedLeaves()
    }
  }

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDates = WEEKDAYS.map((_, index) => addDays(weekStart, index))

  const getLeavesForDate = (date: Date) => {
    return appliedLeaves.filter((leave) => isSameDay(parseISO(leave.leave_date), date))
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "leave_date",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Leave Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => format(parseISO(row.getValue("leave_date")), "MMMM do, yyyy"),
    },
    {
      accessorKey: "leave_type",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Leave Type
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: "leave_purpose",
      header: "Leave Purpose",
    },
    {
      accessorKey: "leave_time",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Leave Time
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <Badge variant="secondary" className="bg-rose-500 text-white">
          {row.getValue("leave_time")}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.getValue("status") === "Approved"
              ? "success"
              : row.getValue("status") === "Rejected"
                ? "destructive"
                : "default"
          }
        >
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDateClick(parseISO(row.getValue("leave_date")), row.original)}
          >
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your leave request.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(row.original.id)}
                  className="bg-red-500 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(weekStart, "dd MMM yyyy")} - {format(addDays(weekStart, 4), "dd MMM yyyy")}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {weekDates.map((date, index) => {
          const leavesForDate = getLeavesForDate(date)
          const hasFullDay = leavesForDate.some((leave) => leave.leave_time === "Full Day")
          const halfDayLeaves = leavesForDate.filter((leave) => leave.leave_time === "Half Day")

          return (
            <div key={index} className="space-y-2">
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground">{WEEKDAYS[index]}</div>
                <div className="text-lg">{format(date, "dd")}</div>
              </div>
              <div
                className="h-[180px] rounded-lg border border-dashed p-2 hover:border-solid cursor-pointer relative"
                onClick={() => !hasFullDay && handleDateClick(date)}
              >
                {hasFullDay ? (
                  <Card
                    className={cn(
                      "border h-full",
                      LEAVE_COLORS[leavesForDate[0].leave_type as keyof typeof LEAVE_COLORS],
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDateClick(date, leavesForDate[0])
                    }}
                  >
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm font-medium">{leavesForDate[0].leave_type}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xs text-muted-foreground">{leavesForDate[0].leave_purpose}</p>
                      <Badge variant="secondary" className="mt-2 bg-rose-500 text-white">
                        {leavesForDate[0].leave_time}
                      </Badge>
                    </CardContent>
                  </Card>
                ) : halfDayLeaves.length > 0 ? (
                  <>
                    {halfDayLeaves.map((leave, i) => (
                      <Card
                        key={i}
                        className={cn(
                          "border mb-1",
                          i === 0 ? "h-[calc(50%-2px)]" : "h-[calc(50%-2px)]",
                          LEAVE_COLORS[leave.leave_type as keyof typeof LEAVE_COLORS],
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDateClick(date, leave)
                        }}
                      >
                        <CardHeader className="p-2">
                          <CardTitle className="text-xs font-medium">{leave.leave_type}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 pt-0">
                          <Badge variant="secondary" className="mt-1 bg-rose-500 text-white text-xs">
                            Half Day
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                    {halfDayLeaves.length === 1 && (
                      <div className="flex items-center justify-center h-[calc(50%-2px)]">
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-full bg-blue-100 hover:bg-blue-200 h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDateClick(date)
                          }}
                        >
                          <Plus className="h-3 w-3 text-blue-500" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Button variant="outline" size="icon" className="rounded-full bg-blue-100 hover:bg-blue-200">
                      <Plus className="h-4 w-4 text-blue-500" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingLeave ? "Edit Leave" : "Apply for Leave"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leave-type" className="text-right">
                Leave Type
              </Label>
              <Select onValueChange={setLeaveType} value={leaveType}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Study Leave">Study Leave</SelectItem>
                  <SelectItem value="Exam Leave">Exam Leave</SelectItem>
                  <SelectItem value="Medical Leave">Medical Leave</SelectItem>
                  <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                  <SelectItem value="Parental Leave">Parental Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leave-purpose" className="text-right">
                Leave Purpose
              </Label>
              <Input
                id="leave-purpose"
                value={leavePurpose}
                onChange={(e) => setLeavePurpose(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leave-time" className="text-right">
                Leave Time
              </Label>
              <Select onValueChange={setLeaveTime} value={leaveTime}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select leave time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Half Day">Half Day</SelectItem>
                  <SelectItem value="Full Day">Full Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSubmit}>{editingLeave ? "Update" : "Submit"}</Button>
        </DialogContent>
      </Dialog>

      <DataTable columns={columns} data={appliedLeaves} />
    </div>
  )
}

