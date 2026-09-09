"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart as ReLineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatCompact } from "@/lib/format";

// A calm, accessible categorical palette (emerald-anchored).
export const CHART_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
  "#6366f1",
  "#84cc16",
  "#f97316",
  "#64748b",
];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(214 32% 91%)",
  fontSize: 12,
  boxShadow: "0 10px 30px -12px rgba(15,23,42,0.18)",
};

export function DonutChart({
  data,
  currency = "INR",
}: {
  data: { name: string; value: number }[];
  currency?: string;
}) {
  if (!data.length)
    return <div className="py-10 text-center text-sm text-muted-foreground">No data yet.</div>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={95}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => formatCompact(v, currency)}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function BarChart({
  data,
  keys,
  currency = "INR",
  height = 280,
}: {
  data: any[];
  keys: { key: string; color: string; label: string }[];
  currency?: string;
  height?: number;
}) {
  if (!data.length)
    return <div className="py-10 text-center text-sm text-muted-foreground">No data yet.</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCompact(v, currency)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => formatCompact(v, currency)}
          cursor={{ fill: "hsl(210 40% 96%)" }}
        />
        {keys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {keys.map((k) => (
          <Bar key={k.key} dataKey={k.key} name={k.label} fill={k.color} radius={[6, 6, 0, 0]} />
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  );
}

export function LineChart({
  data,
  keys,
  currency = "INR",
  height = 280,
}: {
  data: any[];
  keys: { key: string; color: string; label: string }[];
  currency?: string;
  height?: number;
}) {
  if (!data.length)
    return <div className="py-10 text-center text-sm text-muted-foreground">No data yet.</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCompact(v, currency)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => formatCompact(v, currency)}
        />
        {keys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {keys.map((k) => (
          <Line
            key={k.key}
            type="monotone"
            dataKey={k.key}
            name={k.label}
            stroke={k.color}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  );
}
