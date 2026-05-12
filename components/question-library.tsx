"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Filter,
  LoaderCircle,
  RotateCcw,
  Search,
} from "lucide-react";
import type { QuestionListItem, QuestionListResponse } from "@/lib/question-contract";
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

type Filters = {
  subject: string;
  questionType: string;
  knowledgePoint: string;
  mistakeReason: string;
  isCorrect: string;
};

const initialFilters: Filters = {
  subject: "",
  questionType: "",
  knowledgePoint: "",
  mistakeReason: "",
  isCorrect: "",
};

const inputClassName =
  "min-h-9 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-ring/30 focus:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60";

function sectionLabel(section: QuestionListItem["section"]) {
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
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildQuery(filters: Filters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    const trimmed = value.trim();
    if (trimmed) {
      params.set(key, trimmed);
    }
  });

  const query = params.toString();
  return query ? `/api/questions?${query}` : "/api/questions";
}

export function QuestionLibrary() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeFilterCount = useMemo(
    () =>
      Object.values(appliedFilters).filter((value) => value.trim().length > 0)
        .length,
    [appliedFilters],
  );

  useEffect(() => {
    let isCurrent = true;

    async function loadQuestions() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(buildQuery(appliedFilters), {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as
          | Partial<QuestionListResponse>
          | { error?: string; message?: string; missing?: string[] }
          | null;

        if (!response.ok) {
          const code =
            body && "error" in body && typeof body.error === "string"
              ? body.error
              : "question_list_failed";
          const detail =
            body && "message" in body && typeof body.message === "string"
              ? body.message
              : "";
          throw new Error(
            code === "supabase_not_configured"
              ? "Supabase 未配置。请在服务端设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 后重试。"
              : detail || `题库加载失败：${code}`,
          );
        }

        if (!body || !("questions" in body) || !Array.isArray(body.questions)) {
          throw new Error("题库接口响应格式异常，未返回 questions 数组。");
        }

        if (isCurrent) {
          setQuestions(body.questions);
        }
      } catch (loadError) {
        if (isCurrent) {
          setQuestions([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "题库加载失败，请稍后重试。",
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      isCurrent = false;
    };
  }, [appliedFilters]);

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function resetFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2">
                <Filter className="size-5 text-primary" />
                题库筛选
              </CardTitle>
              <CardDescription>
                按科目、题型、知识点、错因和作答结果筛选已保存题目。
              </CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">
              {activeFilterCount > 0 ? `${activeFilterCount} 个筛选条件` : "未筛选"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-6" onSubmit={applyFilters}>
            <select
              className={inputClassName}
              value={filters.subject}
              onChange={(event) => updateFilter("subject", event.target.value)}
              disabled={isLoading}
            >
              <option value="">全部科目</option>
              <option value="quant">Quant</option>
              <option value="verbal">Verbal</option>
              <option value="data_insights">Data Insights</option>
            </select>
            <input
              className={inputClassName}
              value={filters.questionType}
              onChange={(event) =>
                updateFilter("questionType", event.target.value)
              }
              placeholder="题型"
              disabled={isLoading}
            />
            <input
              className={inputClassName}
              value={filters.knowledgePoint}
              onChange={(event) =>
                updateFilter("knowledgePoint", event.target.value)
              }
              placeholder="知识点"
              disabled={isLoading}
            />
            <input
              className={inputClassName}
              value={filters.mistakeReason}
              onChange={(event) =>
                updateFilter("mistakeReason", event.target.value)
              }
              placeholder="错因"
              disabled={isLoading}
            />
            <select
              className={inputClassName}
              value={filters.isCorrect}
              onChange={(event) => updateFilter("isCorrect", event.target.value)}
              disabled={isLoading}
            >
              <option value="">全部结果</option>
              <option value="true">有正确记录</option>
              <option value="false">有错误记录</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                筛选
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={resetFilters}
                disabled={isLoading && activeFilterCount === 0}
                aria-label="重置筛选"
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <StatusPanel
          state="loading"
          title="正在加载题库"
          description="正在读取 /api/questions，筛选结果会从 Supabase 数据库返回。"
        />
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>题库加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error && questions.length === 0 ? (
        <StatusPanel
          state="empty"
          title="暂无匹配题目"
          description="可以调整筛选条件，或先从手动录题页保存题目。"
        />
      ) : null}

      {!isLoading && !error && questions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              题目列表
            </CardTitle>
            <CardDescription>
              共 {questions.length} 道题，点击列表项进入详情页查看完整记录。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {questions.map((question) => (
              <Link
                key={question.id}
                href={`/questions/${question.id}`}
                className="group grid gap-3 rounded-md border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-secondary/40"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{sectionLabel(question.section)}</Badge>
                      <Badge variant="outline">{question.questionType}</Badge>
                      {question.isWrong ? (
                        <Badge variant="destructive">
                          错题 {question.incorrectAttemptCount}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">暂无错误记录</Badge>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm leading-6 text-foreground">
                      {question.stem}
                    </p>
                  </div>
                  <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {question.knowledgeTags.length > 0 ? (
                    question.knowledgeTags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      未标记知识点
                    </span>
                  )}
                </div>

                <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                  <span>练习记录：{question.attemptCount}</span>
                  <span>
                    最近结果：
                    {question.latestAttempt
                      ? question.latestAttempt.isCorrect
                        ? "正确"
                        : "错误"
                      : "暂无"}
                  </span>
                  <span>创建：{formatDate(question.createdAt)}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
