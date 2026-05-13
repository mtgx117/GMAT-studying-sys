import { type AnswerMatchKind, type QuestionAttempt } from "@/lib/question-contract";

export type AttemptSelectRow = {
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

export type AnswerMatchResult = {
  isCorrect: boolean;
  matchedBy: AnswerMatchKind;
};

export function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function toQuestionAttempt(row: AttemptSelectRow): QuestionAttempt {
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

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

function choiceLetter(index: number) {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

function correctAnswerRepresentations(correctAnswer: string, choices: string[]) {
  const correct = normalizeAnswer(correctAnswer);
  const representations = new Map<string, AnswerMatchKind>();

  representations.set(correct, "normalized_text");

  choices.forEach((choice, index) => {
    const letter = choiceLetter(index);
    const normalizedLetter = normalizeAnswer(letter);
    const normalizedChoice = normalizeAnswer(choice);

    if (correct === normalizedLetter) {
      representations.set(normalizedLetter, "answer_letter");
      representations.set(normalizedChoice, "choice_text");
    }

    if (correct === normalizedChoice) {
      representations.set(normalizedChoice, "choice_text");
      representations.set(normalizedLetter, "answer_letter");
    }
  });

  return representations;
}

export function matchAnswer(
  userAnswer: string,
  correctAnswer: string,
  choices: string[],
  selectedChoiceIndex: number | null,
): AnswerMatchResult {
  const correctRepresentations = correctAnswerRepresentations(
    correctAnswer,
    choices,
  );

  if (
    selectedChoiceIndex !== null &&
    selectedChoiceIndex >= 0 &&
    selectedChoiceIndex < choices.length
  ) {
    const selectedLetter = normalizeAnswer(choiceLetter(selectedChoiceIndex));
    const selectedText = normalizeAnswer(choices[selectedChoiceIndex] ?? "");

    if (correctRepresentations.has(selectedLetter)) {
      return { isCorrect: true, matchedBy: "selected_choice_letter" };
    }

    if (correctRepresentations.has(selectedText)) {
      return { isCorrect: true, matchedBy: "selected_choice_text" };
    }

    return { isCorrect: false, matchedBy: "none" };
  }

  const normalizedUserAnswer = normalizeAnswer(userAnswer);
  const matchedBy = correctRepresentations.get(normalizedUserAnswer);

  return matchedBy
    ? { isCorrect: true, matchedBy }
    : { isCorrect: false, matchedBy: "none" };
}
