"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface EmployeeData {
  name: string; // Date format like "March 3"
  available: number;
  onLeave: number;
  availableEmployees: string[]; // Employees with no leave
  fullDayEmployees: string[]; // Employees on full-day leave
  halfDayEmployees: string[]; // Employees on half-day leave
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload?.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
        <p className="font-bold text-white mb-2">{label}</p> {/* Title in white */}
        
        <div>
          <p className="text-white">
            Available Employees: <span className="text-teal-400">{data.available}</span>
          </p>
          <ul className="mt-2 ml-2" >
            {data.availableEmployees.map((name: string, index: number) => (
              <li key={index} className="text-teal-400 text-sm">{name}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <p className="text-white">
            On-Leave Employees: <span className="text-red-400">{data.onLeave}</span>
          </p>
          <div className="ml-2">
            <p className="text-white">
              Full-Day: <span className="text-red-400">{data.fullDayEmployees.length}</span>
            </p>
            <ul className="ml-2">
              {data.fullDayEmployees.map((name: string, index: number) => (
                <li key={index} className="text-red-400 text-sm">{name}</li>
              ))}
            </ul>
          </div>
          <div className="ml-2">
            <p className="text-white">
              Half-Day: <span className="text-red-400">{data.halfDayEmployees.length}</span>
            </p>
            <ul className="ml-2">
              {data.halfDayEmployees.map((name: string, index: number) => (
                <li key={index} className="text-red-400 text-sm">{name}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const NextWeekResourcesBarChart: React.FC<{ data: EmployeeData[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={400}>
    <BarChart data={data}>
      <XAxis dataKey="name" tick={{ fill: "#fff" }} />
      <YAxis allowDecimals={false} tick={{ fill: "#fff" }} />
      <Tooltip content={<CustomTooltip />} cursor={false} />
      <Legend />
      <Bar
        dataKey="available"
        name="Available Resources"
        fill="url(#availableGradient)"
        radius={[10, 10, 0, 0]}
      />
      <Bar
        dataKey="onLeave"
        name="On Leave Resources"
        fill="url(#onLeaveGradient)"
        radius={[10, 10, 0, 0]}
      />
      <defs>
        <linearGradient id="availableGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.2} />
        </linearGradient>
        <linearGradient id="onLeaveGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f87171" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#f87171" stopOpacity={0.2} />
        </linearGradient>
      </defs>
    </BarChart>
  </ResponsiveContainer>
);