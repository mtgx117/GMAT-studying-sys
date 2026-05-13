import { Dumbbell } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { PracticeSession } from "@/components/practice-session";
import { Badge } from "@/components/ui/badge";

type PracticePageProps = {
  searchParams: Promise<{ questionId?: string }>;
};

export default async function PracticePage({
  searchParams,
}: PracticePageProps) {
  const { questionId } = await searchParams;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="border-b bg-card">
            <div className="flex flex-col gap-3 px-5 py-5 md:px-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground">
                  第 4 阶段：练习记录和错题标记
                </p>
                <div className="flex items-center gap-3">
                  <Dumbbell className="size-6 text-primary" />
                  <h1 className="text-2xl font-semibold text-foreground">
                    连续练习
                  </h1>
                </div>
              </div>
              <Badge variant="secondary" className="w-fit">
                {questionId ? "单题练习" : "顺序练习"}
              </Badge>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-5 px-5 py-5 md:px-8">
            <section className="max-w-6xl">
              <PracticeSession initialQuestionId={questionId ?? null} />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
