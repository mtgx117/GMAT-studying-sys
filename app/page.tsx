import {
  BookOpenCheck,
  Brain,
  ClipboardList,
  FilePlus2,
  Library,
  UploadCloud,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { MetricCard } from "@/components/metric-card";
import { SevenDayPracticeChart } from "@/components/seven-day-practice-chart";
import { StatusPanel } from "@/components/status-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const practiceData = [
  { day: "05/06", count: 2 },
  { day: "05/07", count: 0 },
  { day: "05/08", count: 3 },
  { day: "05/09", count: 1 },
  { day: "05/10", count: 4 },
  { day: "05/11", count: 0 },
  { day: "05/12", count: 2 },
];

const weakSpots = [
  { label: "Data Sufficiency - 条件判断", count: 6 },
  { label: "Critical Reasoning - 论证漏洞", count: 4 },
  { label: "Data Insights - 图表读取", count: 3 },
];

const recentMistakes = [
  {
    title: "Quant / Data Sufficiency",
    meta: "审题遗漏 / 120 秒 / 占位记录",
  },
  {
    title: "Verbal / Critical Reasoning",
    meta: "选项陷阱 / 95 秒 / 占位记录",
  },
  {
    title: "Data Insights / Table Analysis",
    meta: "数据读取错误 / 140 秒 / 占位记录",
  },
];

const quickActions = [
  { label: "手动录题", icon: FilePlus2, stage: "第 2 阶段接入" },
  { label: "查看题库", icon: Library, stage: "第 3 阶段接入" },
  { label: "查看错题本", icon: BookOpenCheck, stage: "第 4 阶段接入" },
  { label: "上传截图", icon: UploadCloud, stage: "第 6 阶段接入" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="border-b bg-card">
            <div className="flex flex-col gap-3 px-5 py-5 md:px-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground">
                  第 1 次验收：项目可启动
                </p>
                <h1 className="text-2xl font-semibold text-foreground">
                  GMAT Study Agent
                </h1>
              </div>
              <Badge variant="secondary" className="w-fit">
                本地占位数据 / 待接入 Supabase
              </Badge>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-5 px-5 py-5 md:px-8">
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <CardTitle>今日建议</CardTitle>
                      <CardDescription>
                        静态规则占位，后续由真实练习记录生成。
                      </CardDescription>
                    </div>
                    <Brain className="mt-1 size-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="max-w-3xl text-sm leading-6 text-foreground">
                    先录入最近做错的 3 道题，补齐“正确答案、我的答案、耗时、错因标签”。
                    当前看板只展示本地占位数据，不代表真实学习进度。
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {quickActions.map((action) => (
                      <Button
                        key={action.label}
                        variant="outline"
                        className="h-auto justify-start gap-3 p-3"
                        disabled
                      >
                        <action.icon data-icon="inline-start" />
                        <span className="flex min-w-0 flex-col items-start gap-1 text-left">
                          <span className="text-sm font-medium">
                            {action.label}
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {action.stage}
                          </span>
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>阶段状态组件</CardTitle>
                  <CardDescription>
                    本阶段预置通用 empty/loading/error/success 模式。
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <StatusPanel
                    state="empty"
                    title="暂无真实数据"
                    description="第 2 阶段接入数据库后，这里会显示题库和练习记录。"
                  />
                  <StatusPanel
                    state="success"
                    title="骨架已准备"
                    description="当前首页、导航、卡片和图表均为本地静态占位。"
                  />
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-5 md:grid-cols-3">
              <MetricCard
                title="总题数"
                value="24"
                description="占位值，待第 2 阶段入库后替换"
                icon={ClipboardList}
              />
              <MetricCard
                title="正确率"
                value="68%"
                description="占位值，待第 5 阶段真实统计"
                icon={BookOpenCheck}
              />
              <MetricCard
                title="最近 7 天练习量"
                value="12"
                description="占位值，图表同样为静态数据"
                icon={Library}
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <Card>
                <CardHeader>
                  <CardTitle>最近 7 天练习量</CardTitle>
                  <CardDescription>
                    Recharts 占位图，后续从 Supabase 统计接口读取。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SevenDayPracticeChart data={practiceData} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top 薄弱点</CardTitle>
                  <CardDescription>
                    占位排序，后续由错题标签聚合生成。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    {weakSpots.map((item, index) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Badge variant="outline">{index + 1}</Badge>
                          <span className="truncate text-sm font-medium">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {item.count} 次
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <Card>
                <CardHeader>
                  <CardTitle>最近错题</CardTitle>
                  <CardDescription>
                    静态列表，只用于第 1 阶段验证首页布局。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    {recentMistakes.map((item) => (
                      <div
                        key={item.title}
                        className="flex flex-col gap-1 rounded-md border bg-background px-3 py-3"
                      >
                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {item.meta}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>未接入能力</CardTitle>
                  <CardDescription>
                    本阶段明确不连接 Supabase、OCR 或 AI。
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <StatusPanel
                    state="loading"
                    title="数据同步待接入"
                    description="第 2 阶段再创建 Supabase migration 和入库接口。"
                  />
                  <StatusPanel
                    state="error"
                    title="AI/OCR 未启用"
                    description="这是预期状态，手动学习闭环不会依赖 AI/OCR。"
                  />
                </CardContent>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
