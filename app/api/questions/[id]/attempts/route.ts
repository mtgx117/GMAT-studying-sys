import { NextResponse } from "next/server";

import {
  matchAnswer,
  stringArray,
  toQuestionAttempt,
  type AttemptSelectRow,
} from "@/lib/question-api-utils";
import {
  type CreateAttemptResponse,
  validateCreateAttemptPayload,
} from "@/lib/question-contract";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type QuestionAnswerRow = {
  correct_answer: string;
  choices: unknown;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const validation = validateCreateAttemptPayload(body);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: "validation_error",
        message: "Attempt payload is invalid",
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
        missing: supabase.missing,
      },
      { status: 503 },
    );
  }

  const { id } = await context.params;

  const { data: question, error: questionError } = await supabase.client
    .from("questions")
    .select("correct_answer, choices")
    .eq("id", id)
    .maybeSingle<QuestionAnswerRow>();

  if (questionError) {
    return NextResponse.json(
      {
        error: "question_lookup_failed",
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

  const attemptInput = validation.data;
  const choices = stringArray(question.choices);
  const answerMatch = matchAnswer(
    attemptInput.userAnswer,
    question.correct_answer,
    choices,
    attemptInput.selectedChoiceIndex,
  );

  const { data: insertedAttempt, error: attemptError } = await supabase.client
    .from("attempts")
    .insert({
      question_id: id,
      user_answer: attemptInput.userAnswer,
      correct_answer: question.correct_answer,
      is_correct: answerMatch.isCorrect,
      time_spent_seconds: attemptInput.timeSpentSeconds,
      error_tags: attemptInput.errorTags,
      note: attemptInput.note,
    })
    .select(
      "id, question_id, user_answer, correct_answer, is_correct, time_spent_seconds, error_tags, note, attempted_at, created_at",
    )
    .single<AttemptSelectRow>();

  if (attemptError || !insertedAttempt) {
    return NextResponse.json(
      {
        error: "attempt_create_failed",
        message: attemptError?.message ?? "Failed to create attempt",
      },
      { status: 500 },
    );
  }

  const response: CreateAttemptResponse = {
    attempt: toQuestionAttempt(insertedAttempt),
    result: {
      isCorrect: answerMatch.isCorrect,
      correctAnswer: question.correct_answer,
      matchedBy: answerMatch.matchedBy,
    },
  };

  return NextResponse.json(response, { status: 201 });
}
