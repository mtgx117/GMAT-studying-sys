import { ClipboardList } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ManualQuestionForm } from "@/components/manual-question-form";
import { Badge } from "@/components/ui/badge";

export default function NewQuestionPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="border-b bg-card">
            <div className="flex flex-col gap-3 px-5 py-5 md:px-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground">
                  第 2 次验收：Supabase 数据库和手动录题入库
                </p>
                <div className="flex items-center gap-3">
                  <ClipboardList className="size-6 text-primary" />
                  <h1 className="text-2xl font-semibold text-foreground">
                    手动录题
                  </h1>
                </div>
              </div>
              <Badge variant="secondary" className="w-fit">
                AI/OCR 不参与本流程
              </Badge>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-5 px-5 py-5 md:px-8">
            <section className="max-w-5xl">
              <ManualQuestionForm />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
