export type Section = "quant" | "verbal" | "data_insights";
export type QuestionSource = "manual" | "screenshot" | "ocr";

export type CreateQuestionInput = {
  question: {
    section: Section;
    questionType: string;
    stem: string;
    choices: string[];
    correctAnswer: string;
    explanation: string | null;
    knowledgeTags: string[];
    source: QuestionSource;
  };
  attempt?: {
    userAnswer: string;
    isCorrect: boolean;
    timeSpentSeconds: number | null;
    errorTags: string[];
    note: string | null;
  };
};

export type CreateQuestionResponse = {
  questionId: string;
  attemptId: string | null;
};

export type AnswerMatchKind =
  | "normalized_text"
  | "answer_letter"
  | "choice_text"
  | "selected_choice_letter"
  | "selected_choice_text"
  | "none";

export type CreateAttemptInput = {
  userAnswer: string;
  selectedChoiceIndex: number | null;
  timeSpentSeconds: number | null;
  errorTags: string[];
  note: string | null;
};

export type QuestionAttempt = {
  id: string;
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number | null;
  errorTags: string[];
  note: string | null;
  attemptedAt: string;
  createdAt: string;
};

export type QuestionListItem = {
  id: string;
  section: Section;
  questionType: string;
  stem: string;
  choices: string[];
  correctAnswer: string;
  explanation: string | null;
  knowledgeTags: string[];
  source: QuestionSource;
  createdAt: string;
  updatedAt: string;
  latestAttempt: QuestionAttempt | null;
  attemptCount: number;
  incorrectAttemptCount: number;
  isWrong: boolean;
};

export type QuestionListResponse = {
  questions: QuestionListItem[];
};

export type QuestionDetailResponse = {
  question: Omit<
    QuestionListItem,
    "latestAttempt" | "attemptCount" | "incorrectAttemptCount" | "isWrong"
  >;
  attempts: QuestionAttempt[];
};

export type CreateAttemptResponse = {
  attempt: QuestionAttempt;
  result: {
    isCorrect: boolean;
    correctAnswer: string;
    matchedBy: AnswerMatchKind;
  };
};

export type MistakeListItem = {
  question: Omit<
    QuestionListItem,
    "latestAttempt" | "attemptCount" | "incorrectAttemptCount" | "isWrong"
  >;
  latestWrongAttempt: QuestionAttempt;
  attemptCount: number;
  incorrectAttemptCount: number;
  errorTags: string[];
};

export type MistakeListResponse = {
  mistakes: MistakeListItem[];
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

const allowedSections = new Set<Section>(["quant", "verbal", "data_insights"]);
const allowedSources = new Set<QuestionSource>(["manual", "screenshot", "ocr"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(
  value: unknown,
  fieldName: string,
  errors: string[],
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${fieldName} is required`);
    return "";
  }

  return value.trim();
}

function readOptionalString(value: unknown, fieldName: string, errors: string[]) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    errors.push(`${fieldName} must be a string`);
    return null;
  }

  return value.trim();
}

function readStringArray(
  value: unknown,
  fieldName: string,
  errors: string[],
): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array`);
    return [];
  }

  const normalized: string[] = [];

  value.forEach((item, index) => {
    if (typeof item !== "string") {
      errors.push(`${fieldName}[${index}] must be a string`);
      return;
    }

    const trimmed = item.trim();
    if (trimmed.length > 0) {
      normalized.push(trimmed);
    }
  });

  return normalized;
}

function readOptionalNonNegativeInteger(
  value: unknown,
  fieldName: string,
  errors: string[],
) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    errors.push(`${fieldName} must be a non-negative integer`);
    return null;
  }

  return value;
}

export function validateCreateQuestionPayload(
  payload: unknown,
): ValidationResult<CreateQuestionInput> {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return { ok: false, errors: ["request body must be a JSON object"] };
  }

  const questionPayload = payload.question;
  if (!isRecord(questionPayload)) {
    return { ok: false, errors: ["question is required"] };
  }

  const section = readRequiredString(
    questionPayload.section,
    "question.section",
    errors,
  );
  if (section && !allowedSections.has(section as Section)) {
    errors.push("question.section must be one of quant, verbal, data_insights");
  }

  const questionType = readRequiredString(
    questionPayload.questionType,
    "question.questionType",
    errors,
  );
  const stem = readRequiredString(questionPayload.stem, "question.stem", errors);
  const correctAnswer = readRequiredString(
    questionPayload.correctAnswer,
    "question.correctAnswer",
    errors,
  );
  const choices = readStringArray(questionPayload.choices, "question.choices", errors);
  const knowledgeTags = readStringArray(
    questionPayload.knowledgeTags,
    "question.knowledgeTags",
    errors,
  );
  const explanation =
    readOptionalString(questionPayload.explanation, "question.explanation", errors) ??
    "";
  const sourceValue =
    readOptionalString(questionPayload.source, "question.source", errors) ?? "manual";
  if (!allowedSources.has(sourceValue as QuestionSource)) {
    errors.push("question.source must be one of manual, screenshot, ocr");
  }

  let attempt: CreateQuestionInput["attempt"];
  if (payload.attempt !== undefined && payload.attempt !== null) {
    if (!isRecord(payload.attempt)) {
      errors.push("attempt must be an object");
    } else {
      const userAnswer = readRequiredString(
        payload.attempt.userAnswer,
        "attempt.userAnswer",
        errors,
      );

      if (typeof payload.attempt.isCorrect !== "boolean") {
        errors.push("attempt.isCorrect must be a boolean");
      }

      attempt = {
        userAnswer,
        isCorrect:
          typeof payload.attempt.isCorrect === "boolean"
            ? payload.attempt.isCorrect
            : false,
        timeSpentSeconds: readOptionalNonNegativeInteger(
          payload.attempt.timeSpentSeconds,
          "attempt.timeSpentSeconds",
          errors,
        ),
        errorTags: readStringArray(
          payload.attempt.errorTags,
          "attempt.errorTags",
          errors,
        ),
        note: readOptionalString(payload.attempt.note, "attempt.note", errors),
      };
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      question: {
        section: section as Section,
        questionType,
        stem,
        choices,
        correctAnswer,
        explanation,
        knowledgeTags,
        source: sourceValue as QuestionSource,
      },
      ...(attempt ? { attempt } : {}),
    },
  };
}

export function validateCreateAttemptPayload(
  payload: unknown,
): ValidationResult<CreateAttemptInput> {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return { ok: false, errors: ["request body must be a JSON object"] };
  }

  const selectedChoiceIndexValue = payload.selectedChoiceIndex;
  let selectedChoiceIndex: number | null = null;

  if (
    selectedChoiceIndexValue !== undefined &&
    selectedChoiceIndexValue !== null &&
    selectedChoiceIndexValue !== ""
  ) {
    if (
      typeof selectedChoiceIndexValue !== "number" ||
      !Number.isInteger(selectedChoiceIndexValue) ||
      selectedChoiceIndexValue < 0
    ) {
      errors.push("selectedChoiceIndex must be a non-negative integer or null");
    } else {
      selectedChoiceIndex = selectedChoiceIndexValue;
    }
  }

  const userAnswer = readRequiredString(payload.userAnswer, "userAnswer", errors);
  const timeSpentSeconds = readOptionalNonNegativeInteger(
    payload.timeSpentSeconds,
    "timeSpentSeconds",
    errors,
  );
  const errorTags = readStringArray(payload.errorTags, "errorTags", errors);
  const note = readOptionalString(payload.note, "note", errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      userAnswer,
      selectedChoiceIndex,
      timeSpentSeconds,
      errorTags,
      note,
    },
  };
}
