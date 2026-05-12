"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Plus, RotateCcw, Save, X } from "lucide-react";
import { StatusPanel } from "@/components/status-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Section = "quant" | "verbal" | "data_insights";
type Correctness = "correct" | "incorrect" | "";

type FormState = {
  section: Section;
  questionType: string;
  stem: string;
  choices: string[];
  correctAnswer: string;
  userAnswer: string;
  correctness: Correctness;
  timeSpentMinutes: string;
  timeSpentSeconds: string;
  knowledgeTags: string;
  errorTags: string;
  note: string;
};

type SaveResult = {
  questionId: string;
  attemptId: string | null;
};

const initialFormState: FormState = {
  section: "quant",
  questionType: "",
  stem: "",
  choices: ["", "", "", "", ""],
  correctAnswer: "",
  userAnswer: "",
  correctness: "",
  timeSpentMinutes: "",
  timeSpentSeconds: "",
  knowledgeTags: "",
  errorTags: "",
  note: "",
};

function splitTags(value: string) {
  return value
    .split(/[,，\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toNullableSeconds(minutes: string, seconds: string) {
  const parsedMinutes = Number(minutes || 0);
  const parsedSeconds = Number(seconds || 0);

  if (!minutes && !seconds) {
    return null;
  }

  if (!Number.isFinite(parsedMinutes) || !Number.isFinite(parsedSeconds)) {
    return null;
  }

  return Math.max(0, Math.trunc(parsedMinutes) * 60 + Math.trunc(parsedSeconds));
}

function FieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-foreground">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  );
}

const inputClassName =
  "min-h-9 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-ring/30 focus:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60";

const textareaClassName =
  "min-h-28 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-ring/30 focus:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60";

export function ManualQuestionForm() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<SaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const hasDraft = useMemo(() => {
    return Boolean(
      form.questionType.trim() ||
        form.stem.trim() ||
        form.choices.some((choice) => choice.trim()) ||
        form.correctAnswer.trim() ||
        form.userAnswer.trim() ||
        form.knowledgeTags.trim() ||
        form.errorTags.trim() ||
        form.note.trim(),
    );
  }, [form]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
    setValidationErrors([]);
  }

  function updateChoice(index: number, value: string) {
    setForm((current) => ({
      ...current,
      choices: current.choices.map((choice, choiceIndex) =>
        choiceIndex === index ? value : choice,
      ),
    }));
    setError(null);
    setValidationErrors([]);
  }

  function addChoice() {
    setForm((current) => ({ ...current, choices: [...current.choices, ""] }));
  }

  function removeChoice(index: number) {
    setForm((current) => ({
      ...current,
      choices:
        current.choices.length > 1
          ? current.choices.filter((_, choiceIndex) => choiceIndex !== index)
          : current.choices,
    }));
  }

  function resetForm() {
    setForm(initialFormState);
    setSuccess(null);
    setError(null);
    setValidationErrors([]);
  }

  function continueNext() {
    setForm({
      ...initialFormState,
      section: form.section,
      questionType: form.questionType,
    });
    setSuccess(null);
    setError(null);
    setValidationErrors([]);
  }

  function validate() {
    const errors: string[] = [];

    if (!form.section) errors.push("请选择科目。");
    if (!form.questionType.trim()) errors.push("请填写题型。");
    if (!form.stem.trim()) errors.push("请填写题干。");
    if (!form.correctAnswer.trim()) errors.push("请填写正确答案。");
    if (!form.userAnswer.trim()) errors.push("请填写我的答案。");
    if (!form.correctness) errors.push("请明确本次作答是否正确。");

    const minutes = Number(form.timeSpentMinutes || 0);
    const seconds = Number(form.timeSpentSeconds || 0);
    if (
      (form.timeSpentMinutes && (!Number.isFinite(minutes) || minutes < 0)) ||
      (form.timeSpentSeconds && (!Number.isFinite(seconds) || seconds < 0))
    ) {
      errors.push("耗时必须是非负数字。");
    }

    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setError("表单还不能保存，请先补齐必填项。");
      setSuccess(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setValidationErrors([]);
    setSuccess(null);

    const payload = {
      question: {
        section: form.section,
        questionType: form.questionType.trim(),
        stem: form.stem.trim(),
        choices: form.choices.map((choice) => choice.trim()).filter(Boolean),
        correctAnswer: form.correctAnswer.trim(),
        explanation: "",
        knowledgeTags: splitTags(form.knowledgeTags),
        source: "manual",
      },
      attempt: {
        userAnswer: form.userAnswer.trim(),
        isCorrect: form.correctness === "correct",
        timeSpentSeconds: toNullableSeconds(
          form.timeSpentMinutes,
          form.timeSpentSeconds,
        ),
        errorTags: splitTags(form.errorTags),
        note: form.note.trim(),
      },
    };

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "保存失败。请检查 Supabase 环境变量和数据库 migration 是否已完成。";
        throw new Error(message);
      }

      if (
        typeof body !== "object" ||
        body === null ||
        !("questionId" in body) ||
        typeof body.questionId !== "string"
      ) {
        throw new Error("保存成功响应格式异常，未拿到 questionId。");
      }

      setSuccess({
        questionId: body.questionId,
        attemptId:
          "attemptId" in body && typeof body.attemptId === "string"
            ? body.attemptId
            : null,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "保存失败。请稍后重试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      {!hasDraft && !success && !error ? (
        <StatusPanel
          state="empty"
          title="还没有录入草稿"
          description="从科目、题型和题干开始填写。手动录题不依赖 AI/OCR。"
        />
      ) : null}

      {isSubmitting ? (
        <StatusPanel
          state="loading"
          title="正在保存题目"
          description="正在提交到 /api/questions，请勿重复点击保存。"
        />
      ) : null}

      {success ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <CheckCircle2 className="size-4 text-emerald-700" />
          <AlertTitle>保存成功</AlertTitle>
          <AlertDescription className="text-emerald-900">
            <div className="flex flex-col gap-2">
              <span>questionId: {success.questionId}</span>
              <span>attemptId: {success.attemptId ?? "null"}</span>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={continueNext}>
                  <Plus className="size-4" />
                  保存并继续录下一题
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                  <RotateCcw className="size-4" />
                  清空表单
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>保存失败</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            {validationErrors.length > 0 ? (
              <ul className="list-disc pl-5">
                {validationErrors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>如果提示 Supabase 未配置，请先完成服务端环境变量和数据库初始化。</p>
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>题目信息</CardTitle>
          <CardDescription>保存到题库的结构化字段。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel required>科目</FieldLabel>
              <select
                className={inputClassName}
                value={form.section}
                onChange={(event) =>
                  updateField("section", event.target.value as Section)
                }
                disabled={isSubmitting}
              >
                <option value="quant">Quant</option>
                <option value="verbal">Verbal</option>
                <option value="data_insights">Data Insights</option>
              </select>
            </div>
            <div className="grid gap-2">
              <FieldLabel required>题型</FieldLabel>
              <input
                className={inputClassName}
                value={form.questionType}
                onChange={(event) =>
                  updateField("questionType", event.target.value)
                }
                placeholder="例如 Data Sufficiency / Critical Reasoning"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <FieldLabel required>题干</FieldLabel>
            <textarea
              className={textareaClassName}
              value={form.stem}
              onChange={(event) => updateField("stem", event.target.value)}
              placeholder="粘贴或手动输入题干。"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>选项</FieldLabel>
              <Button type="button" size="sm" variant="outline" onClick={addChoice} disabled={isSubmitting}>
                <Plus className="size-4" />
                添加选项
              </Button>
            </div>
            <div className="grid gap-2">
              {form.choices.map((choice, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    className={inputClassName}
                    value={choice}
                    onChange={(event) => updateChoice(index, event.target.value)}
                    placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeChoice(index)}
                    disabled={isSubmitting || form.choices.length <= 1}
                    aria-label="删除选项"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel required>正确答案</FieldLabel>
              <input
                className={inputClassName}
                value={form.correctAnswer}
                onChange={(event) =>
                  updateField("correctAnswer", event.target.value)
                }
                placeholder="例如 C 或完整答案"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <FieldLabel>知识点标签</FieldLabel>
              <input
                className={inputClassName}
                value={form.knowledgeTags}
                onChange={(event) =>
                  updateField("knowledgeTags", event.target.value)
                }
                placeholder="用逗号分隔，例如 algebra, rate"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>首次练习记录</CardTitle>
          <CardDescription>本次作答会作为首条 attempt 一起提交。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2 md:col-span-2">
              <FieldLabel required>我的答案</FieldLabel>
              <input
                className={inputClassName}
                value={form.userAnswer}
                onChange={(event) => updateField("userAnswer", event.target.value)}
                placeholder="记录本次实际选择或填写的答案"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <FieldLabel required>是否正确</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={form.correctness === "correct" ? "default" : "outline"}
                  onClick={() => updateField("correctness", "correct")}
                  disabled={isSubmitting}
                >
                  正确
                </Button>
                <Button
                  type="button"
                  variant={form.correctness === "incorrect" ? "default" : "outline"}
                  onClick={() => updateField("correctness", "incorrect")}
                  disabled={isSubmitting}
                >
                  错误
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <FieldLabel>耗时</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={inputClassName}
                  type="number"
                  min="0"
                  value={form.timeSpentMinutes}
                  onChange={(event) =>
                    updateField("timeSpentMinutes", event.target.value)
                  }
                  placeholder="分钟"
                  disabled={isSubmitting}
                />
                <input
                  className={inputClassName}
                  type="number"
                  min="0"
                  value={form.timeSpentSeconds}
                  onChange={(event) =>
                    updateField("timeSpentSeconds", event.target.value)
                  }
                  placeholder="秒"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <FieldLabel>错因标签</FieldLabel>
              <input
                className={inputClassName}
                value={form.errorTags}
                onChange={(event) => updateField("errorTags", event.target.value)}
                placeholder="用逗号分隔，例如 审题遗漏, 时间压力"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <FieldLabel>备注</FieldLabel>
            <textarea
              className={textareaClassName}
              value={form.note}
              onChange={(event) => updateField("note", event.target.value)}
              placeholder="记录复盘备注、卡点或下次注意事项。"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">source: manual</Badge>
            <Badge variant="outline">POST /api/questions</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
          <RotateCcw className="size-4" />
          清空表单
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          保存题目和练习记录
        </Button>
      </div>
    </form>
  );
}
