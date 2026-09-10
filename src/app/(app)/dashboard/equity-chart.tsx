"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EquityPoint } from "@/lib/dashboard-calculations";

export default function EquityChart({ data }: { data: EquityPoint[] }) {
  const chartData = data.map((p, i) => ({
    index: i,
    date: new Date(p.date).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" }),
    cumulative: Math.round(p.cumulative),
  }));

  return (
    <div className="h-64 w-full rounded border border-black/10 p-4 text-black dark:border-white/10 dark:text-white">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-black/10 dark:text-white/10" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-black/60 dark:text-white/60"
            minTickGap={30}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-black/60 dark:text-white/60"
            width={60}
          />
          <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}円`, "累計損益"]} />
          <Line type="monotone" dataKey="cumulative" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
