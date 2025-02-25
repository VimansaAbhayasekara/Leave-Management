import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLeaveColor(leaveType: string): string {
  switch (leaveType) {
    case "Study Leave":
      return "rgba(59, 130, 246, 0.2)" // Blue
    case "Exam Leave":
      return "rgba(16, 185, 129, 0.2)" // Green
    case "Medical Leave":
      return "rgba(239, 68, 68, 0.2)" // Red
    case "Annual Leave":
      return "rgba(245, 158, 11, 0.2)" // Yellow
    case "Parental Leave":
      return "rgba(168, 85, 247, 0.2)" // Purple
    default:
      return "rgba(156, 163, 175, 0.2)" // Gray
  }
}

