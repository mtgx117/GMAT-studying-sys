"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PracticePoint = {
  day: string;
  count: number;
};

type PracticeBarsProps = {
  data: PracticePoint[];
};

export function PracticeBars({ data }: PracticeBarsProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={288}
      >
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            fontSize={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            fontSize={12}
          />
          <Tooltip
            cursor={{
              fill: "color-mix(in oklab, var(--muted) 70%, transparent)",
            }}
            contentStyle={{
              borderRadius: 8,
              borderColor: "var(--border)",
              boxShadow:
                "0 12px 24px color-mix(in oklab, var(--foreground) 10%, transparent)",
            }}
            formatter={(value) => [`${value} 题`, "练习量"]}
            labelFormatter={(label) => `日期 ${label}`}
          />
          <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
