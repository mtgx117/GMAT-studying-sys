import { NextResponse } from "next/server";

import {
  stringArray,
  toQuestionAttempt,
  type AttemptSelectRow,
} from "@/lib/question-api-utils";
import { type MistakeListResponse } from "@/lib/question-contract";
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

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function compareAttemptTime(a: AttemptSelectRow, b: AttemptSelectRow) {
  const attemptedDiff =
    new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime();

  if (attemptedDiff !== 0) {
    return attemptedDiff;
  }

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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

  let wrongAttemptsQuery = supabase.client
    .from("attempts")
    .select(
      "id, question_id, user_answer, correct_answer, is_correct, time_spent_seconds, error_tags, note, attempted_at, created_at",
    )
    .eq("is_correct", false)
    .order("attempted_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (mistakeReason) {
    wrongAttemptsQuery = wrongAttemptsQuery.contains("error_tags", [
      mistakeReason,
    ]);
  }

  const { data: wrongAttempts, error: wrongAttemptsError } =
    await wrongAttemptsQuery.returns<AttemptSelectRow[]>();

  if (wrongAttemptsError) {
    return NextResponse.json(
      {
        error: "mistake_list_failed",
        message: wrongAttemptsError.message,
      },
      { status: 500 },
    );
  }

  const wrongQuestionIds = uniqueStrings(
    (wrongAttempts ?? []).map((attempt) => attempt.question_id),
  );

  if (wrongQuestionIds.length === 0) {
    const emptyResponse: MistakeListResponse = { mistakes: [] };
    return NextResponse.json(emptyResponse);
  }

  let questionsQuery = supabase.client
    .from("questions")
    .select(
      "id, section, question_type, stem, choices, correct_answer, explanation, knowledge_tags, source, created_at, updated_at",
    )
    .in("id", wrongQuestionIds)
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

  const { data: questions, error: questionsError } =
    await questionsQuery.returns<QuestionSelectRow[]>();

  if (questionsError) {
    return NextResponse.json(
      {
        error: "mistake_list_failed",
        message: questionsError.message,
      },
      { status: 500 },
    );
  }

  const questionIds = (questions ?? []).map((question) => question.id);

  if (questionIds.length === 0) {
    const emptyResponse: MistakeListResponse = { mistakes: [] };
    return NextResponse.json(emptyResponse);
  }

  const { data: attempts, error: attemptsError } = await supabase.client
    .from("attempts")
    .select(
      "id, question_id, user_answer, correct_answer, is_correct, time_spent_seconds, error_tags, note, attempted_at, created_at",
    )
    .in("question_id", questionIds)
    .order("attempted_at", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<AttemptSelectRow[]>();

  if (attemptsError) {
    return NextResponse.json(
      {
        error: "mistake_list_failed",
        message: attemptsError.message,
      },
      { status: 500 },
    );
  }

  const response: MistakeListResponse = {
    mistakes: (questions ?? []).flatMap((question) => {
      const questionAttempts = (attempts ?? []).filter(
        (attempt) => attempt.question_id === question.id,
      );
      const incorrectAttempts = questionAttempts
        .filter((attempt) => !attempt.is_correct)
        .sort(compareAttemptTime);
      const latestWrongAttempt = incorrectAttempts[0];

      if (!latestWrongAttempt) {
        return [];
      }

      return [
        {
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
          latestWrongAttempt: toQuestionAttempt(latestWrongAttempt),
          attemptCount: questionAttempts.length,
          incorrectAttemptCount: incorrectAttempts.length,
          errorTags: uniqueStrings(
            incorrectAttempts.flatMap((attempt) => stringArray(attempt.error_tags)),
          ),
        },
      ];
    }),
  };

  return NextResponse.json(response);
}
