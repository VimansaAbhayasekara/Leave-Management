"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { BellIcon } from "lucide-react"; // Import BellIcon for notifications
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

export function Header({ user }: { user?: { full_name: string; is_admin: boolean } }) {
  const supabase = createClient();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);

  // Fetch pending leave requests for the current day
  const fetchNotifications = async () => {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }); // Today's date in YYYY-MM-DD format
    const { data: leaves, error } = await supabase
      .from("leaves")
      .select("*, users(full_name)")
      .eq("leave_date", today)
      .eq("status", "Pending");

    if (error) {
      console.error("Error fetching notifications:", error);
    } else {
      setNotifications(leaves || []);
      const lastSeen = localStorage.getItem("lastSeenNotifications");
      const unseen = leaves?.filter((leave) => !lastSeen || leave.created_at > lastSeen).length || 0;
      setUnseenCount(unseen);
    }
  };

  // Mark notifications as seen
  const markAsSeen = () => {
    const now = new Date().toISOString();
    localStorage.setItem("lastSeenNotifications", now); // Mark as seen with the current timestamp
    setUnseenCount(0); // Reset unseen count
  };

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel("leaves")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leaves" },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSignOut = async () => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      await supabase.from("sessions").delete().eq("user_id", userId);
      localStorage.removeItem("userId");
    }
    router.push("/signin");
    router.refresh();
  };

  return (
    <header className="w-full">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
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
          {/* Notification Icon (Admin Only) */}
          {user?.is_admin && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" onClick={markAsSeen}>
                  <BellIcon className="h-5 w-5" />
                  {unseenCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0">
                      {unseenCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 translate-x-6" align="end">
                <Card className="border-0">
                  <CardHeader className="border-b p-3">
                    <CardTitle className="text-xs font-medium">Notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-3 hover:bg-accent transition-colors border-b last:border-b-0"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src="" alt={notification.users?.full_name} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {notification.users?.full_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-xs">
                                <span className="font-medium">{notification.users?.full_name}</span>{" "}
                                has applied for a{" "}
                                <span className="font-medium">{notification.leave_time}</span>{" "}
                                {notification.leave_type} on{" "}
                                <span className="font-medium">
                                  {format(new Date(notification.leave_date), "MMM d, yyyy")}
                                </span>
                                .
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-muted-foreground">No new notifications.</div>
                    )}
                  </CardContent>
                </Card>
              </PopoverContent>
            </Popover>
          )}
          {/* Theme Toggle (Logged-in Users Only) */}
          {user && <ThemeToggle />}
        </div>
      </div>
      <Separator />
    </header>
  );
}