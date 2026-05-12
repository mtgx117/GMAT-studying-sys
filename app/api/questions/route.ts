import { NextResponse } from "next/server";

import {
  type CreateQuestionResponse,
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
