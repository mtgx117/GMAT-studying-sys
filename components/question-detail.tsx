"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ListChecks,
  XCircle,
} from "lucide-react";
import type {
  QuestionAttempt,
  QuestionDetailResponse,
  Section,
} from "@/lib/question-contract";
import { StatusPanel } from "@/components/status-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type QuestionDetailProps = {
  questionId: string;
};

function sectionLabel(section: Section) {
  if (section === "quant") return "Quant";
  if (section === "verbal") return "Verbal";
  return "Data Insights";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "未记录";
  }

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) {
    return `${rest} 秒`;
  }

  return `${minutes} 分 ${rest} 秒`;
}

function attemptSummary(attempts: QuestionAttempt[]) {
  const total = attempts.length;
  const correct = attempts.filter((attempt) => attempt.isCorrect).length;
  const incorrect = total - correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;
  const latest = attempts[0] ?? null;

  return { total, correct, incorrect, accuracy, latest };
}

export function QuestionDetail({ questionId }: QuestionDetailProps) {
  const [data, setData] = useState<QuestionDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadQuestion() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/questions/${questionId}`, {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as
          | QuestionDetailResponse
          | { error?: string; message?: string; missing?: string[] }
          | null;

        if (!response.ok) {
          const code =
            body && "error" in body && typeof body.error === "string"
              ? body.error
              : "question_detail_failed";
          const detail =
            body && "message" in body && typeof body.message === "string"
              ? body.message
              : "";
          throw new Error(
            code === "supabase_not_configured"
              ? "Supabase 未配置。请在服务端设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 后重试。"
              : code === "question_not_found"
                ? "没有找到这道题，可能已被删除或链接不完整。"
                : detail || `题目详情加载失败：${code}`,
          );
        }

        if (!body || !("question" in body) || !("attempts" in body)) {
          throw new Error("题目详情接口响应格式异常。");
        }

        if (isCurrent) {
          setData(body);
        }
      } catch (loadError) {
        if (isCurrent) {
          setData(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "题目详情加载失败，请稍后重试。",
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadQuestion();

    return () => {
      isCurrent = false;
    };
  }, [questionId]);

  const summary = useMemo(
    () => attemptSummary(data?.attempts ?? []),
    [data?.attempts],
  );

  if (isLoading) {
    return (
      <StatusPanel
        state="loading"
        title="正在加载题目详情"
        description="正在读取 /api/questions/{id}，包含题目和已有练习记录。"
      />
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>题目详情加载失败</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span>{error}</span>
          <Button asChild variant="outline" className="w-fit">
            <Link href="/questions">
              <ArrowLeft className="size-4" />
              返回题库
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <StatusPanel
        state="empty"
        title="暂无题目详情"
        description="当前链接没有可展示的数据，请返回题库重新选择题目。"
      />
    );
  }

  const { question, attempts } = data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/questions">
            <ArrowLeft className="size-4" />
            返回题库
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/practice?questionId=${encodeURIComponent(questionId)}`}>
            <ListChecks className="size-4" />
            练习本题
          </Link>
        </Button>
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Badge>{sectionLabel(question.section)}</Badge>
                  <Badge variant="outline">{question.questionType}</Badge>
                  <Badge variant="secondary">source: {question.source}</Badge>
                </div>
                <CardTitle>题目详情</CardTitle>
                <CardDescription>
                  创建于 {formatDate(question.createdAt)}，最近更新{" "}
                  {formatDate(question.updatedAt)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="rounded-md border bg-background p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                {question.stem}
              </p>
            </div>

            <div className="grid gap-3">
              <h2 className="text-sm font-semibold">选项</h2>
              {question.choices.length > 0 ? (
                <div className="grid gap-2">
                  {question.choices.map((choice, index) => (
                    <div
                      key={`${choice}-${index}`}
                      className="flex gap-3 rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <Badge variant="outline">
                        {String.fromCharCode(65 + index)}
                      </Badge>
                      <span className="min-w-0 whitespace-pre-wrap leading-6">
                        {choice}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <StatusPanel
                  state="empty"
                  title="未记录选项"
                  description="这道题可能是填空或录入时没有保存选项。"
                />
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border bg-background p-4">
                <div className="text-xs text-muted-foreground">正确答案</div>
                <div className="mt-2 text-sm font-semibold">
                  {question.correctAnswer}
                </div>
              </div>
              <div className="rounded-md border bg-background p-4">
                <div className="text-xs text-muted-foreground">知识点</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {question.knowledgeTags.length > 0 ? (
                    question.knowledgeTags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      未标记
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-md border bg-background p-4">
              <div className="text-xs text-muted-foreground">解析 / 备注</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {question.explanation?.trim() || "未记录题目解析。"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-5 text-primary" />
              练习摘要
            </CardTitle>
            <CardDescription>基于当前已保存 attempts 计算。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border bg-background p-3">
                <div className="text-xs text-muted-foreground">总记录</div>
                <div className="mt-1 text-xl font-semibold">{summary.total}</div>
              </div>
              <div className="rounded-md border bg-background p-3">
                <div className="text-xs text-muted-foreground">正确率</div>
                <div className="mt-1 text-xl font-semibold">
                  {summary.accuracy === null ? "-" : `${summary.accuracy}%`}
                </div>
              </div>
              <div className="rounded-md border bg-background p-3">
                <div className="text-xs text-muted-foreground">正确</div>
                <div className="mt-1 text-xl font-semibold text-emerald-700">
                  {summary.correct}
                </div>
              </div>
              <div className="rounded-md border bg-background p-3">
                <div className="text-xs text-muted-foreground">错误</div>
                <div className="mt-1 text-xl font-semibold text-destructive">
                  {summary.incorrect}
                </div>
              </div>
            </div>

            {summary.latest ? (
              <div className="rounded-md border bg-background p-3 text-sm leading-6">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  {summary.latest.isCorrect ? (
                    <CheckCircle2 className="size-4 text-emerald-700" />
                  ) : (
                    <XCircle className="size-4 text-destructive" />
                  )}
                  最近一次：
                  {summary.latest.isCorrect ? "正确" : "错误"}
                </div>
                <div className="text-muted-foreground">
                  {formatDate(summary.latest.attemptedAt)}
                </div>
              </div>
            ) : (
              <StatusPanel
                state="empty"
                title="暂无练习记录"
                description="当前题目还没有 attempt，后续第 4 次验收会支持新增记录。"
              />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>练习记录</CardTitle>
          <CardDescription>
            展示已有作答答案、正确性、耗时、错因和备注。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {attempts.length > 0 ? (
            attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="grid gap-3 rounded-md border bg-background p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={attempt.isCorrect ? "secondary" : "destructive"}
                    >
                      {attempt.isCorrect ? "正确" : "错误"}
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="size-3" />
                      {formatDuration(attempt.timeSpentSeconds)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(attempt.attemptedAt)}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border px-3 py-2">
                    <div className="text-xs text-muted-foreground">我的答案</div>
                    <div className="mt-1 text-sm font-medium">
                      {attempt.userAnswer}
                    </div>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <div className="text-xs text-muted-foreground">正确答案</div>
                    <div className="mt-1 text-sm font-medium">
                      {attempt.correctAnswer}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {attempt.errorTags.length > 0 ? (
                    attempt.errorTags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      未记录错因
                    </span>
                  )}
                </div>

                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {attempt.note?.trim() || "未记录备注。"}
                </p>
              </div>
            ))
          ) : (
            <StatusPanel
              state="empty"
              title="暂无练习记录"
              description="题目详情页当前只展示已有记录，不新增第 4 阶段功能。"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
