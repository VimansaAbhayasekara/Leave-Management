"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/utils/supabase/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { getLeaveColor } from "@/lib/utils"

export default function EmployeeView({ userId }: { userId: string }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [leaveType, setLeaveType] = useState("")
  const [leavePurpose, setLeavePurpose] = useState("")
  const [leaveTime, setLeaveTime] = useState("")
  const [appliedLeaves, setAppliedLeaves] = useState<any[]>([])
  const [editingLeave, setEditingLeave] = useState<any>(null)
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

  const handleDateSelect = (date: Date | undefined) => {
    if (date && date.getDay() !== 0 && date.getDay() !== 6) {
      setSelectedDate(date)
    }
  }

  const handleSubmit = async () => {
    if (selectedDate && leaveType && leavePurpose && leaveTime) {
      const leaveData = {
        user_id: userId,
        leave_type: leaveType,
        leave_purpose: leavePurpose,
        leave_time: leaveTime,
        leave_date: selectedDate.toISOString().split("T")[0],
      }

      const { data, error } = editingLeave
        ? await supabase.from("leaves").update(leaveData).eq("id", editingLeave.id)
        : await supabase.from("leaves").insert(leaveData)

      if (error) {
        console.error("Error submitting leave:", error)
      } else {
        console.log("Leave submitted successfully:", data)
        fetchAppliedLeaves()
        // Reset form and close dialog
        setSelectedDate(undefined)
        setLeaveType("")
        setLeavePurpose("")
        setLeaveTime("")
        setEditingLeave(null)
      }
    }
  }

  const handleEdit = (leave: any) => {
    setEditingLeave(leave)
    setSelectedDate(new Date(leave.leave_date))
    setLeaveType(leave.leave_type)
    setLeavePurpose(leave.leave_purpose)
    setLeaveTime(leave.leave_time)
  }

  const handleDelete = async (leaveId: string) => {
    const { error } = await supabase.from("leaves").delete().eq("id", leaveId)

    if (error) {
      console.error("Error deleting leave:", error)
    } else {
      fetchAppliedLeaves()
    }
  }

  const isLeaveApplied = (date: Date) => {
    return appliedLeaves.find((leave) => new Date(leave.leave_date).toDateString() === date.toDateString())
  }

  return (
    <div className="space-y-6">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        className="rounded-md border"
        disabled={(date) => date.getDay() === 0 || date.getDay() === 6}
        modifiers={{
          applied: (date) => isLeaveApplied(date) !== undefined,
        }}
        modifiersStyles={{
          applied: (date) => {
            const leave = isLeaveApplied(date)
            return leave ? { backgroundColor: getLeaveColor(leave.leave_type) } : {}
          },
        }}
      />
      <Dialog>
        <DialogTrigger asChild>
          <Button>{editingLeave ? "Edit Leave" : "Apply for Leave"}</Button>
        </DialogTrigger>
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Leave Date</TableHead>
            <TableHead>Leave Type</TableHead>
            <TableHead>Leave Purpose</TableHead>
            <TableHead>Leave Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appliedLeaves.map((leave) => (
            <TableRow key={leave.id}>
              <TableCell>
                {new Date(leave.leave_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell>{leave.leave_type}</TableCell>
              <TableCell>{leave.leave_purpose}</TableCell>
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
                <Button variant="ghost" size="sm" onClick={() => handleEdit(leave)}>
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
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
                      <AlertDialogAction onClick={() => handleDelete(leave.id)}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

