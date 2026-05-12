import { NextResponse } from "next/server";

import {
  type QuestionAttempt,
  type QuestionDetailResponse,
} from "@/lib/question-contract";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;

  const { data: question, error: questionError } = await supabase.client
    .from("questions")
    .select(
      "id, section, question_type, stem, choices, correct_answer, explanation, knowledge_tags, source, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle<QuestionSelectRow>();

  if (questionError) {
    return NextResponse.json(
      {
        error: "question_detail_failed",
        message: questionError.message,
      },
      { status: 500 },
    );
  }

  if (!question) {
    return NextResponse.json(
      {
        error: "question_not_found",
        message: "Question was not found",
      },
      { status: 404 },
    );
  }

  const { data: attempts, error: attemptsError } = await supabase.client
    .from("attempts")
    .select(
      "id, question_id, user_answer, correct_answer, is_correct, time_spent_seconds, error_tags, note, attempted_at, created_at",
    )
    .eq("question_id", id)
    .order("created_at", { ascending: false })
    .returns<AttemptSelectRow[]>();

  if (attemptsError) {
    return NextResponse.json(
      {
        error: "question_attempts_failed",
        message: attemptsError.message,
      },
      { status: 500 },
    );
  }

  const response: QuestionDetailResponse = {
    question: {
      id: question.id,
      section: question.section,
      questionType: question.question_type,
      stem: question.stem,
      choices: stringArray(question.choices),
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
      knowledgeTags: stringArray(question.knowledge_tags),
      source: question.source,
      createdAt: question.created_at,
      updatedAt: question.updated_at,
    },
    attempts: (attempts ?? []).map(toQuestionAttempt),
  };

  return NextResponse.json(response);
}
