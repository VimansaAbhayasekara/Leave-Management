"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
} from "@/components/ui/alert-dialog";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { utils, writeFile } from "xlsx"; // Import xlsx library
import toast, { Toaster } from "react-hot-toast"; // Import toast for notifications
import { NextWeekResourcesBarChart } from "@/components/NextWeekResourcesBarChart";

// Define the columns for the table
const columns: ColumnDef<any>[] = [
  {
    accessorKey: "users.full_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Employee Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.original.users?.full_name || "Unknown",
  },
  {
    accessorKey: "leave_purpose",
    header: "Leave Purpose",
  },
  {
    accessorKey: "leave_type",
    header: "Leave Type",
  },
  {
    accessorKey: "leave_date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Leave Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.leave_date);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
  },
  {
    accessorKey: "leave_time",
    header: "Leave Time",
    cell: ({ row }) => {
      const leaveTime = row.original.leave_time;
      return (
        <Badge variant={leaveTime === "Full Day" ? "default" : "secondary"}>
          {leaveTime}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={
            status === "Approved" ? "success" : status === "Rejected" ? "destructive" : "default"
          }
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const leave = row.original;
      return (
        <>
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
        </>
      );
    },
  },
];

export default function AdminView() {
  const [employees, setEmployees] = useState(0);
  const [todayLeaves, setTodayLeaves] = useState(0);
  const [tomorrowLeaves, setTomorrowLeaves] = useState(0);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [nextWeekData, setNextWeekData] = useState<any[]>([]);
  const supabase = createClient();

  // Fetch data from Supabase
  const fetchData = async () => {
    // Fetch total employees (excluding admins)
    const { data: employeesData } = await supabase
      .from("users")
      .select("id, is_admin")
      .eq("is_admin", false); // Only count non-admin users
    setEmployees(employeesData?.length || 0);

    // Fetch today's leaves (in Sri Lanka timezone)
    const today = new Date();
    const todayFormatted = today.toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }); // Format as YYYY-MM-DD
    const { data: todayLeavesData } = await supabase
      .from("leaves")
      .select("id")
      .eq("leave_date", todayFormatted);
    setTodayLeaves(todayLeavesData?.length || 0);

    // Fetch tomorrow's leaves (in Sri Lanka timezone)
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowFormatted = tomorrow.toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }); // Format as YYYY-MM-DD
    const { data: tomorrowLeavesData } = await supabase
      .from("leaves")
      .select("id")
      .eq("leave_date", tomorrowFormatted);
    setTomorrowLeaves(tomorrowLeavesData?.length || 0);

    // Fetch leaves with filters
    let query = supabase
      .from("leaves")
      .select("*, users(full_name)", { count: "exact" })
      .order("leave_date", { ascending: true });

    if (searchTerm) {
      query = query.ilike("users.full_name", `%${searchTerm}%`);
    }

    if (dateRange && dateRange.from && dateRange.to) {
      // Adjust the end date to include the entire day (up to 23:59:59)
      const adjustedToDate = new Date(dateRange.to);
      adjustedToDate.setHours(23, 59, 59, 999); // Set to the end of the day
    
      query = query
        .gte("leave_date", dateRange.from.toISOString().split("T")[0]) // Start date
        .lte("leave_date", adjustedToDate.toISOString().split("T")[0]); // End date (inclusive)
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching leaves:", error);
    } else {
      setLeaves(data || []);
    }
  };

  // Fetch next week's data for the bar chart
  const fetchNextWeekData = async () => {
    const today = new Date();
    const nextWeekStart = new Date(today);
    nextWeekStart.setDate(today.getDate() + (7 - today.getDay())); // Start of next week (Sunday)
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 6); // End of next week (Saturday)
  
    // Fetch all non-admin employees
    const { data: employees } = await supabase
      .from("users")
      .select("full_name")
      .eq("is_admin", false);
  
    // Fetch leaves for next week
    const { data: leaves } = await supabase
      .from("leaves")
      .select("leave_date, leave_time, users!inner(full_name)")
      .gte("leave_date", nextWeekStart.toISOString().split("T")[0])
      .lte("leave_date", nextWeekEnd.toISOString().split("T")[0]);
  
    const nextWeekData = [];
  
    // Process each weekday (Monday to Friday)
    for (let i = 0; i < 5; i++) {
      const date = new Date(nextWeekStart);
      date.setDate(nextWeekStart.getDate() + i + 1); // Skip Sunday and start from Monday
      const dateString = date.toISOString().split("T")[0];
  
      // Get all leaves for this date
      const dailyLeaves = leaves?.filter(l => l.leave_date === dateString) || [];
  
      // Group leaves by employee
      // Group leaves by employee
const employeeLeaveMap: { [key: string]: { halfDay: number; fullDay: number } } = {};
dailyLeaves.forEach((leave) => {
  // Explicitly type `leave.users` to avoid TypeScript errors
  const users = leave.users as { full_name: string }[] | { full_name: string } | undefined;

  // Safely access the `full_name` property
  const employeeName = users
    ? Array.isArray(users)
      ? users[0]?.full_name
      : users.full_name
    : undefined;

    if (!employeeName) {
      console.warn("Employee name is undefined for leave:", leave);
      return; // Skip this leave if the employee name is not found
    }

    if (!employeeLeaveMap[employeeName]) {
      employeeLeaveMap[employeeName] = { halfDay: 0, fullDay: 0 };
    }
    if (leave.leave_time === "Half Day") {
      employeeLeaveMap[employeeName].halfDay += 1;
    } else if (leave.leave_time === "Full Day") {
      employeeLeaveMap[employeeName].fullDay += 1;
    }
});
  
      // Categorize employees
      const fullDayEmployees: string[] = [];
      const halfDayEmployees: string[] = [];
      Object.entries(employeeLeaveMap).forEach(([employeeName, leaveCount]) => {
        if (leaveCount.fullDay > 0 || leaveCount.halfDay >= 2) {
          fullDayEmployees.push(employeeName);
        } else if (leaveCount.halfDay === 1) {
          halfDayEmployees.push(employeeName);
        }
      });
  
      // Get distinct on-leave employees
      const onLeaveEmployees = [...fullDayEmployees, ...halfDayEmployees];
  
      // Get available employees (those not in onLeaveEmployees)
      const availableEmployees = employees
        ?.filter(e => !onLeaveEmployees.includes(e.full_name))
        .map(e => e.full_name) || [];
  
      nextWeekData.push({
        name: format(date, "MMM d"), // Format as "Mar 5"
        available: availableEmployees.length,
        onLeave: onLeaveEmployees.length,
        availableEmployees,
        fullDayEmployees,
        halfDayEmployees
      });
    }
  
    setNextWeekData(nextWeekData);
  };

  useEffect(() => {
    fetchData();
    fetchNextWeekData();
  }, [searchTerm, dateRange]);

  // Handle approve/reject actions
  const handleApproveReject = async (leaveId: string, status: "Approved" | "Rejected") => {
    const { error } = await supabase.from("leaves").update({ status }).eq("id", leaveId);

    if (error) {
      console.error("Error updating leave status:", error);
    } else {
      fetchData();
    }
  };

  // Reset date range
  const handleResetDateRange = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  // Download Excel file
  const handleDownloadExcel = () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error("Please select a date range before downloading.");
      return;
    }

    // Filter leaves based on the selected date range
    const filteredLeaves = leaves.filter((leave) => {
      const leaveDate = new Date(leave.leave_date);
      return leaveDate >= dateRange.from! && leaveDate <= dateRange.to!;
    });

    // Sort by leave date
    filteredLeaves.sort((a, b) => new Date(a.leave_date).getTime() - new Date(b.leave_date).getTime());

    // Prepare data for Excel
    const excelData = filteredLeaves.map((leave) => ({
      "Leave Date": new Date(leave.leave_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      "Employee Name": leave.users?.full_name || "Unknown",
      "Leave Type": leave.leave_type,
      "Leave Purpose": leave.leave_purpose,
      "Leave Time": leave.leave_time,
    }));

    // Create a worksheet
    const worksheet = utils.json_to_sheet(excelData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Leaves");

    // Write the file and trigger download
    writeFile(workbook, `Leaves_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.xlsx`);
  };

  // Initialize the table
  const table = useReactTable({
    data: leaves,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="space-y-6">
      <Toaster /> {/* Add Toaster for toast messages */}
      {/* Cards for Total Employees, Today Leaves, and Tomorrow Leaves */}
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
            <CardTitle className="text-sm font-medium">Today Leaves</CardTitle>
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
            <div className="text-2xl font-bold">{tomorrowLeaves}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Date Range Picker */}
      <div className="flex space-x-4">
        <Input
          placeholder="Search by employee name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-1/4"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn("w-1/3 justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
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
        <Button variant="outline" onClick={handleResetDateRange}>
          Reset Date Range
        </Button>
        <Button variant="secondary" onClick={handleDownloadExcel}>
          Download Report
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Week Resource Availability & Leave Status</CardTitle>
        </CardHeader>
        <CardContent>
          <NextWeekResourcesBarChart data={nextWeekData} />
        </CardContent>
      </Card>

    </div>
  );
}