"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import type {
  QuestionDetailResponse,
  QuestionListItem,
  QuestionListResponse,
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

type PracticeSessionProps = {
  initialQuestionId: string | null;
};

type Filters = {
  subject: string;
  questionType: string;
  knowledgePoint: string;
  onlyWrong: boolean;
};

type PracticeResult = {
  isCorrect: boolean;
  correctAnswer: string;
};

const initialFilters: Filters = {
  subject: "",
  questionType: "",
  knowledgePoint: "",
  onlyWrong: false,
};

const inputClassName =
  "min-h-9 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-ring/30 focus:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60";

function buildQuestionsUrl(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.questionType.trim()) {
    params.set("questionType", filters.questionType.trim());
  }
  if (filters.knowledgePoint.trim()) {
    params.set("knowledgePoint", filters.knowledgePoint.trim());
  }
  if (filters.onlyWrong) params.set("isCorrect", "false");

  const query = params.toString();
  return query ? `/api/questions?${query}` : "/api/questions";
}

function readApiError(body: unknown) {
  const record =
    typeof body === "object" && body !== null
      ? (body as { error?: unknown; message?: unknown })
      : null;
  const error = typeof record?.error === "string" ? record.error : "";
  const message = typeof record?.message === "string" ? record.message : "";

  if (error === "supabase_not_configured") {
    return "Supabase 未配置。请在服务端配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 后重试。";
  }

  return message || error || "请求失败，请稍后重试。";
}

function sectionLabel(section: QuestionListItem["section"]) {
  if (section === "quant") return "Quant";
  if (section === "verbal") return "Verbal";
  return "Data Insights";
}

function splitTags(value: string) {
  return value
    .split(/[,，\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function PracticeSession({ initialQuestionId }: PracticeSessionProps) {
  const startedAtRef = useRef(0);
  const singleMode = Boolean(initialQuestionId);

  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [detail, setDetail] = useState<QuestionDetailResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [errorTags, setErrorTags] = useState("");
  const [note, setNote] = useState("");
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(
    null,
  );
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = useMemo(() => {
    if (singleMode) return detail?.question ?? null;
    return questions[currentIndex] ?? null;
  }, [currentIndex, detail?.question, questions, singleMode]);

  function resetAnswer() {
    startedAtRef.current = Date.now();
    setAnswer("");
    setErrorTags("");
    setNote("");
    setSelectedChoiceIndex(null);
    setResult(null);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        if (initialQuestionId) {
          const response = await fetch(`/api/questions/${initialQuestionId}`, {
            cache: "no-store",
          });
          const body = (await response.json().catch(() => null)) as
            | QuestionDetailResponse
            | { error?: string; message?: string }
            | null;

          if (!response.ok) throw new Error(readApiError(body));
          if (!body || !("question" in body)) {
            throw new Error("题目详情接口响应格式异常。");
          }

          if (active) {
            setDetail(body);
            setQuestions([]);
            setCurrentIndex(0);
            resetAnswer();
          }
          return;
        }

        const response = await fetch(buildQuestionsUrl(appliedFilters), {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as
          | Partial<QuestionListResponse>
          | { error?: string; message?: string }
          | null;

        if (!response.ok) throw new Error(readApiError(body));
        if (!body || !("questions" in body) || !Array.isArray(body.questions)) {
          throw new Error("题库接口响应格式异常。");
        }

        if (active) {
          setQuestions(body.questions);
          setDetail(null);
          setCurrentIndex(0);
          resetAnswer();
        }
      } catch (loadError) {
        if (active) {
          setQuestions([]);
          setDetail(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "练习题加载失败，请稍后重试。",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [appliedFilters, initialQuestionId]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function chooseAnswer(index: number) {
    const value = String.fromCharCode(65 + index);
    setSelectedChoiceIndex(index);
    setAnswer(value);
  }

  async function submitAttempt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentQuestion || !answer.trim() || result) return;

    setIsSubmitting(true);
    setError(null);

    const timeSpentSeconds = Math.max(
      0,
      Math.round((Date.now() - startedAtRef.current) / 1000),
    );

    try {
      const response = await fetch(
        `/api/questions/${currentQuestion.id}/attempts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAnswer: answer.trim(),
            selectedChoiceIndex,
            timeSpentSeconds,
            errorTags: splitTags(errorTags),
            note: note.trim() || null,
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | {
            result?: {
              isCorrect?: boolean;
              correctAnswer?: string;
            };
          }
        | { error?: string; message?: string }
        | null;

      if (!response.ok) throw new Error(readApiError(body));
      if (!body || !("result" in body) || !body.result) {
        throw new Error("练习记录接口响应格式异常。");
      }

      setResult({
        isCorrect: Boolean(body.result.isCorrect),
        correctAnswer: String(body.result.correctAnswer ?? ""),
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "练习记录保存失败，请稍后重试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function nextQuestion() {
    if (singleMode) {
      resetAnswer();
      return;
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((value) => value + 1);
      resetAnswer();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {!singleMode ? (
        <Card>
          <CardHeader>
            <CardTitle>练习筛选</CardTitle>
            <CardDescription>
              默认按题库顺序练习；可按科目、题型、知识点或错题记录筛选。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 lg:grid-cols-5" onSubmit={applyFilters}>
              <select
                className={inputClassName}
                value={filters.subject}
                onChange={(event) =>
                  setFilters((value) => ({
                    ...value,
                    subject: event.target.value,
                  }))
                }
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
                  setFilters((value) => ({
                    ...value,
                    questionType: event.target.value,
                  }))
                }
                placeholder="题型"
                disabled={isLoading}
              />
              <input
                className={inputClassName}
                value={filters.knowledgePoint}
                onChange={(event) =>
                  setFilters((value) => ({
                    ...value,
                    knowledgePoint: event.target.value,
                  }))
                }
                placeholder="知识点"
                disabled={isLoading}
              />
              <label className="flex min-h-9 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.onlyWrong}
                  onChange={(event) =>
                    setFilters((value) => ({
                      ...value,
                      onlyWrong: event.target.checked,
                    }))
                  }
                  disabled={isLoading}
                />
                只练错题
              </label>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                应用筛选
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <StatusPanel
          state="loading"
          title="正在加载练习题"
          description="正在读取题库或单题详情。"
        />
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>练习页错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error && !currentQuestion ? (
        <StatusPanel
          state="empty"
          title="暂无可练习题目"
          description="当前题库或筛选条件下没有可练习题目。"
        />
      ) : null}

      {!isLoading && currentQuestion ? (
        <form className="grid gap-5" onSubmit={submitAttempt}>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{sectionLabel(currentQuestion.section)}</Badge>
                    <Badge variant="outline">
                      {currentQuestion.questionType}
                    </Badge>
                  </div>
                  <CardTitle>当前题目</CardTitle>
                  <CardDescription>
                    {!singleMode && questions.length > 0
                      ? `${currentIndex + 1} / ${questions.length}`
                      : "单题练习"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="rounded-md border bg-background p-4">
                <p className="whitespace-pre-wrap text-sm leading-7">
                  {currentQuestion.stem}
                </p>
              </div>

              {currentQuestion.choices.length > 0 ? (
                <div className="grid gap-2">
                  {currentQuestion.choices.map((choice, index) => {
                    const selected = selectedChoiceIndex === index;
                    return (
                      <button
                        key={`${choice}-${index}`}
                        type="button"
                        className={`flex min-h-11 gap-3 rounded-md border px-3 py-2 text-left text-sm ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "bg-background hover:bg-secondary"
                        }`}
                        onClick={() => chooseAnswer(index)}
                        disabled={isSubmitting || Boolean(result)}
                      >
                        <Badge variant={selected ? "default" : "outline"}>
                          {String.fromCharCode(65 + index)}
                        </Badge>
                        <span className="whitespace-pre-wrap leading-6">
                          {choice}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  className={`${inputClassName} min-h-28 resize-y`}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="输入你的答案"
                  disabled={isSubmitting || Boolean(result)}
                />
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">错因标签</label>
                  <input
                    className={inputClassName}
                    value={errorTags}
                    onChange={(event) => setErrorTags(event.target.value)}
                    placeholder="用逗号分隔，例如 审题遗漏, 时间压力"
                    disabled={isSubmitting || Boolean(result)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">练习备注</label>
                  <input
                    className={inputClassName}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="记录这次作答的卡点"
                    disabled={isSubmitting || Boolean(result)}
                  />
                </div>
              </div>

              {result ? (
                <Alert>
                  {result.isCorrect ? (
                    <CheckCircle2 className="size-4 text-emerald-700" />
                  ) : (
                    <XCircle className="size-4 text-destructive" />
                  )}
                  <AlertTitle>
                    {result.isCorrect ? "回答正确" : "回答错误"}
                  </AlertTitle>
                  <AlertDescription>
                    正确答案：{result.correctAnswer || "-"}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-muted-foreground">
                  {answer.trim()
                    ? `当前答案：${answer.trim()}`
                    : "空答案不能提交。"}
                </span>
                {!result ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting || !answer.trim()}
                  >
                    {isSubmitting ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : null}
                    提交
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={nextQuestion}
                    disabled={!singleMode && currentIndex >= questions.length - 1}
                  >
                    {singleMode ? "再练一次" : "下一题"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      ) : null}
    </div>
  );
}
