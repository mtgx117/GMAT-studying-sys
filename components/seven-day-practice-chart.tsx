"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

type PracticePoint = {
  day: string;
  count: number;
};

type SevenDayPracticeChartProps = {
  data: PracticePoint[];
};

const PracticeBars = dynamic(
  () => import("@/components/practice-bars").then((mod) => mod.PracticeBars),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 w-full flex-col justify-end gap-3">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    ),
  },
);

export function SevenDayPracticeChart({ data }: SevenDayPracticeChartProps) {
  return <PracticeBars data={data} />;
}
