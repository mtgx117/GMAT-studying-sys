import { NextResponse } from "next/server";

import {
  type CreateQuestionResponse,
  type QuestionAttempt,
  type QuestionListItem,
  type QuestionListResponse,
  validateCreateQuestionPayload,
} from "@/lib/question-contract";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type QuestionRow = {
  id: string;
};

type AttemptRow = {
  id: string;
};

type QuestionSelectRow = {
  id: string;
  section: "quant" | "verbal" | "data_insights";
  question_type: string;
  stem: string;
  choices: unknown;
  correct_answer: string;
  explanation: string | null;
  knowledge_tags: unknown;
  source: "manual" | "screenshot" | "ocr";
  created_at: string;
  updated_at: string;
};

type AttemptSelectRow = {
  id: string;
  question_id: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  time_spent_seconds: number | null;
  error_tags: unknown;
  note: string | null;
  attempted_at: string;
  created_at: string;
};

function readOptionalParam(request: Request, names: string[]) {
  const url = new URL(request.url);

  for (const name of names) {
    const value = url.searchParams.get(name);
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function readOptionalBooleanParam(request: Request, names: string[]) {
  const value = readOptionalParam(request, names);
  if (value === null) {
    return null;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return "invalid";
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function toQuestionAttempt(row: AttemptSelectRow): QuestionAttempt {
  return {
    id: row.id,
    questionId: row.question_id,
    userAnswer: row.user_answer,
    correctAnswer: row.correct_answer,
    isCorrect: row.is_correct,
    timeSpentSeconds: row.time_spent_seconds,
    errorTags: stringArray(row.error_tags),
    note: row.note,
    attemptedAt: row.attempted_at,
    createdAt: row.created_at,
  };
}

function toQuestionListItem(
  row: QuestionSelectRow,
  attempts: AttemptSelectRow[],
): QuestionListItem {
  const questionAttempts = attempts
    .filter((attempt) => attempt.question_id === row.id)
    .map(toQuestionAttempt);
  const incorrectAttemptCount = questionAttempts.filter(
    (attempt) => !attempt.isCorrect,
  ).length;

  return {
    id: row.id,
    section: row.section,
    questionType: row.question_type,
    stem: row.stem,
    choices: stringArray(row.choices),
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
    knowledgeTags: stringArray(row.knowledge_tags),
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestAttempt: questionAttempts[0] ?? null,
    attemptCount: questionAttempts.length,
    incorrectAttemptCount,
    isWrong: incorrectAttemptCount > 0,
  };
}

export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase.ok) {
    return NextResponse.json(
      {
        error: "supabase_not_configured",
        missing: supabase.missing,
      },
      { status: 503 },
    );
  }

  const section = readOptionalParam(request, ["subject", "section"]);
  const questionType = readOptionalParam(request, ["questionType"]);
  const knowledgePoint = readOptionalParam(request, [
    "knowledgePoint",
    "knowledgeTag",
  ]);
  const mistakeReason = readOptionalParam(request, ["mistakeReason", "errorTag"]);
  const isCorrect = readOptionalBooleanParam(request, ["isCorrect"]);

  if (isCorrect === "invalid") {
    return NextResponse.json(
      {
        error: "validation_error",
        message: "isCorrect must be true or false",
      },
      { status: 400 },
    );
  }

  let filteredQuestionIds: string[] | null = null;

  if (mistakeReason || isCorrect !== null) {
    let attemptsQuery = supabase.client
      .from("attempts")
      .select("question_id");

    if (mistakeReason) {
      attemptsQuery = attemptsQuery.contains("error_tags", [mistakeReason]);
    }

    if (isCorrect !== null) {
      attemptsQuery = attemptsQuery.eq("is_correct", isCorrect);
    }

    const { data: matchingAttempts, error: attemptsFilterError } =
      await attemptsQuery.returns<Array<{ question_id: string }>>();

    if (attemptsFilterError) {
      return NextResponse.json(
        {
          error: "question_list_failed",
          message: attemptsFilterError.message,
        },
        { status: 500 },
      );
    }

    filteredQuestionIds = Array.from(
      new Set((matchingAttempts ?? []).map((attempt) => attempt.question_id)),
    );

    if (filteredQuestionIds.length === 0) {
      const emptyResponse: QuestionListResponse = { questions: [] };
      return NextResponse.json(emptyResponse);
    }
  }

  let questionsQuery = supabase.client
    .from("questions")
    .select(
      "id, section, question_type, stem, choices, correct_answer, explanation, knowledge_tags, source, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (section) {
    questionsQuery = questionsQuery.eq("section", section);
  }

  if (questionType) {
    questionsQuery = questionsQuery.eq("question_type", questionType);
  }

  if (knowledgePoint) {
    questionsQuery = questionsQuery.contains("knowledge_tags", [knowledgePoint]);
  }

  if (filteredQuestionIds) {
    questionsQuery = questionsQuery.in("id", filteredQuestionIds);
  }

  const { data: questions, error: questionsError } =
    await questionsQuery.returns<QuestionSelectRow[]>();

  if (questionsError) {
    return NextResponse.json(
      {
        error: "question_list_failed",
        message: questionsError.message,
      },
      { status: 500 },
    );
  }

  const questionIds = (questions ?? []).map((question) => question.id);
  let attempts: AttemptSelectRow[] = [];

  if (questionIds.length > 0) {
    const { data: attemptRows, error: attemptsError } = await supabase.client
      .from("attempts")
      .select(
        "id, question_id, user_answer, correct_answer, is_correct, time_spent_seconds, error_tags, note, attempted_at, created_at",
      )
      .in("question_id", questionIds)
      .order("created_at", { ascending: false })
      .returns<AttemptSelectRow[]>();

    if (attemptsError) {
      return NextResponse.json(
        {
          error: "question_list_failed",
          message: attemptsError.message,
        },
        { status: 500 },
      );
    }

    attempts = attemptRows ?? [];
  }

  const response: QuestionListResponse = {
    questions: (questions ?? []).map((question) =>
      toQuestionListItem(question, attempts),
    ),
  };

  return NextResponse.json(response);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const validation = validateCreateQuestionPayload(body);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: "validation_error",
        message: "Question payload is invalid",
        details: validation.errors,
      },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase.ok) {
    return NextResponse.json(
      {
        error: "supabase_not_configured",
        message:
          "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.",
        missing: supabase.missing,
      },
      { status: 503 },
    );
  }

  const { question, attempt } = validation.data;

  const { data: insertedQuestion, error: questionError } = await supabase.client
    .from("questions")
    .insert({
      section: question.section,
      question_type: question.questionType,
      stem: question.stem,
      choices: question.choices,
      correct_answer: question.correctAnswer,
      explanation: question.explanation,
      knowledge_tags: question.knowledgeTags,
      source: question.source,
    })
    .select("id")
    .single<QuestionRow>();

  if (questionError || !insertedQuestion) {
    return NextResponse.json(
      {
        error: "question_create_failed",
        message: questionError?.message ?? "Failed to create question",
      },
      { status: 500 },
    );
  }

  let attemptId: string | null = null;

  if (attempt) {
    const { data: insertedAttempt, error: attemptError } = await supabase.client
      .from("attempts")
      .insert({
        question_id: insertedQuestion.id,
        user_answer: attempt.userAnswer,
        correct_answer: question.correctAnswer,
        is_correct: attempt.isCorrect,
        time_spent_seconds: attempt.timeSpentSeconds,
        error_tags: attempt.errorTags,
        note: attempt.note,
      })
      .select("id")
      .single<AttemptRow>();

    if (attemptError || !insertedAttempt) {
      await supabase.client
        .from("questions")
        .delete()
        .eq("id", insertedQuestion.id);

      return NextResponse.json(
        {
          error: "attempt_create_failed",
          message: attemptError?.message ?? "Failed to create first attempt",
        },
        { status: 500 },
      );
    }

    attemptId = insertedAttempt.id;
  }

  const response: CreateQuestionResponse = {
    questionId: insertedQuestion.id,
    attemptId,
  };

  return NextResponse.json(response, { status: 201 });
}
