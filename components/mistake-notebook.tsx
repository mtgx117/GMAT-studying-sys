"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  Filter,
  LoaderCircle,
  RotateCcw,
  Search,
  Tag,
} from "lucide-react";
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
import type { QuestionAttempt, Section } from "@/lib/question-contract";

type MistakeQuestion = {
  id: string;
  section: Section;
  questionType: string;
  stem: string;
  choices?: string[];
  correctAnswer?: string;
  explanation?: string | null;
  knowledgeTags: string[];
  source?: string;
  createdAt?: string;
  updatedAt?: string;
};

type MistakeItem = {
  question: MistakeQuestion;
  latestWrongAttempt: QuestionAttempt | null;
  attemptCount: number;
  incorrectAttemptCount: number;
  errorTags: string[];
};

type MistakesResponse = {
  mistakes: MistakeItem[];
};

type Filters = {
  subject: string;
  questionType: string;
  knowledgePoint: string;
  mistakeReason: string;
};

const initialFilters: Filters = {
  subject: "",
  questionType: "",
  knowledgePoint: "",
  mistakeReason: "",
};

const inputClassName =
  "min-h-9 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-ring/30 focus:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60";

function sectionLabel(section: Section) {
  if (section === "quant") return "Quant";
  if (section === "verbal") return "Verbal";
  return "Data Insights";
}

function formatDate(value: string | undefined) {
  if (!value) return "No date";

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

function formatTimeSpent(seconds: number | null) {
  if (seconds === null) return "Not recorded";
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
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
  return query ? `/api/mistakes?${query}` : "/api/mistakes";
}

function readErrorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;

  const record = body as Record<string, unknown>;
  const code = typeof record.error === "string" ? record.error : "";
  const message = typeof record.message === "string" ? record.message : "";

  if (code === "supabase_not_configured") {
    return "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server, then reload the mistake notebook.";
  }

  return message || (code ? `Mistake notebook failed: ${code}` : fallback);
}

export function MistakeNotebook() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
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

    async function loadMistakes() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(buildQuery(appliedFilters), {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as
          | Partial<MistakesResponse>
          | { error?: string; message?: string; missing?: string[] }
          | null;

        if (!response.ok) {
          throw new Error(
            readErrorMessage(
              body,
              "Mistake notebook failed to load. Check the API response and retry.",
            ),
          );
        }

        if (!body || !("mistakes" in body) || !Array.isArray(body.mistakes)) {
          throw new Error(
            "The mistake notebook API response is invalid: missing mistakes array.",
          );
        }

        if (isCurrent) {
          setMistakes(body.mistakes);
        }
      } catch (loadError) {
        if (isCurrent) {
          setMistakes([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Mistake notebook failed to load. Retry after checking the API.",
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadMistakes();

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
                Mistake filters
              </CardTitle>
              <CardDescription>
                Filter wrong questions by section, question type, knowledge
                point, and mistake reason without depending on AI analysis.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">
              {activeFilterCount > 0
                ? `${activeFilterCount} active filters`
                : "No filters"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-5" onSubmit={applyFilters}>
            <select
              className={inputClassName}
              value={filters.subject}
              onChange={(event) => updateFilter("subject", event.target.value)}
              disabled={isLoading}
            >
              <option value="">All sections</option>
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
              placeholder="Question type"
              disabled={isLoading}
            />
            <input
              className={inputClassName}
              value={filters.knowledgePoint}
              onChange={(event) =>
                updateFilter("knowledgePoint", event.target.value)
              }
              placeholder="Knowledge point"
              disabled={isLoading}
            />
            <input
              className={inputClassName}
              value={filters.mistakeReason}
              onChange={(event) =>
                updateFilter("mistakeReason", event.target.value)
              }
              placeholder="Mistake reason"
              disabled={isLoading}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                Filter
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={resetFilters}
                disabled={isLoading && activeFilterCount === 0}
                aria-label="Reset filters"
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
          title="Loading mistake notebook"
          description="Reading wrong attempts from /api/mistakes with the current filters."
        />
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Mistake notebook failed to load</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error && mistakes.length === 0 ? (
        <StatusPanel
          state="empty"
          title="No matching mistakes"
          description="Adjust filters or add wrong practice records to build the mistake notebook."
        />
      ) : null}

      {!isLoading && !error && mistakes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpenCheck className="size-5 text-primary" />
              Wrong questions
            </CardTitle>
            <CardDescription>
              {mistakes.length} questions with wrong attempts. Open a question
              to review its full detail page.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {mistakes.map((item) => {
              const latestWrongAttempt = item.latestWrongAttempt;
              const tags =
                item.errorTags.length > 0
                  ? item.errorTags
                  : latestWrongAttempt?.errorTags ?? [];

              return (
                <Link
                  key={item.question.id}
                  href={`/questions/${item.question.id}`}
                  className="group grid gap-3 rounded-md border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-secondary/40"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{sectionLabel(item.question.section)}</Badge>
                        <Badge variant="outline">
                          {item.question.questionType}
                        </Badge>
                        <Badge variant="destructive">
                          Wrong {item.incorrectAttemptCount}
                        </Badge>
                        <Badge variant="secondary">
                          Attempts {item.attemptCount}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm leading-6 text-foreground">
                        {item.question.stem}
                      </p>
                    </div>
                    <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.question.knowledgeTags.length > 0 ? (
                      item.question.knowledgeTags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No knowledge point tags
                      </span>
                    )}
                  </div>

                  <div className="grid gap-2 rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground md:grid-cols-4">
                    <span>
                      Latest wrong:{" "}
                      {formatDate(latestWrongAttempt?.attemptedAt)}
                    </span>
                    <span>
                      My answer: {latestWrongAttempt?.userAnswer || "N/A"}
                    </span>
                    <span>
                      Correct: {latestWrongAttempt?.correctAnswer || "N/A"}
                    </span>
                    <span>
                      Time:{" "}
                      {formatTimeSpent(
                        latestWrongAttempt?.timeSpentSeconds ?? null,
                      )}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Tag className="size-4 text-muted-foreground" />
                    {tags.length > 0 ? (
                      tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No mistake reason tags
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
