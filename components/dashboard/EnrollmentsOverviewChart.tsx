"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { DashboardCard } from "./DashboardCard";

const COLOR_BY_NAME: Record<string, string> = {
  Completed: "var(--color-success)",
  "In Progress": "var(--color-info)",
  "Not Started": "var(--color-warning)",
};

export function EnrollmentsOverviewChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <DashboardCard title="Enrollments Overview" className="h-full">
      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={64} outerRadius={92} paddingAngle={2} stroke="none">
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLOR_BY_NAME[entry.name] ?? "var(--color-text-muted)"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-bold text-text-primary">{total.toLocaleString()}</p>
          <p className="text-xs text-text-muted">Total Enrollments</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        {data.map((entry) => (
          <span key={entry.name} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_BY_NAME[entry.name] ?? "var(--color-text-muted)" }} />
            {entry.name}
          </span>
        ))}
      </div>
    </DashboardCard>
  );
}
