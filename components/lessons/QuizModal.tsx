"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { apiJson } from "@/lib/authClient";

type Question = {
  id: string;
  text: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  options: { id: string; text: string }[];
};

type AssessmentDetail = {
  id: string;
  title: string;
  passingScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  questions: Question[];
};

export function QuizModal({
  assessmentId,
  open,
  onClose,
  onSubmitted,
}: {
  assessmentId: string;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError(null);
    setAnswers({});

    async function start() {
      const [assessmentRes, attemptRes] = await Promise.all([
        apiJson<AssessmentDetail>(`/api/assessments/${assessmentId}`),
        apiJson<{ id: string; attemptNumber: number }>(`/api/assessments/${assessmentId}/attempts`, { method: "POST" }),
      ]);
      if (assessmentRes.ok) setAssessment(assessmentRes.data);
      if (attemptRes.ok) {
        setAttemptId(attemptRes.data.id);
        setAttemptNumber(attemptRes.data.attemptNumber);
      } else {
        setError(attemptRes.message);
      }
    }
    start();
  }, [open, assessmentId]);

  function toggleOption(questionId: string, optionId: string, multi: boolean) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (multi) {
        return { ...prev, [questionId]: current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId] };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  }

  async function handleSubmit() {
    if (!attemptId || !assessment) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      answers: assessment.questions.map((q) => ({ questionId: q.id, selectedOptionIds: answers[q.id] ?? [] })),
    };
    const result = await apiJson<{ score: number }>(`/api/assessments/attempts/${attemptId}/submit`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setResult({ score: result.data.score, passed: result.data.score >= assessment.passingScore });
    onSubmitted();
  }

  return (
    <Modal open={open} onClose={onClose} title={assessment?.title ?? "Quiz"} maxWidth="max-w-lg">
      {!assessment && !error && <p className="text-sm text-text-secondary">Loading…</p>}
      {error && <p className="text-sm text-error">{error}</p>}

      {assessment && result && (
        <div className="text-center py-6">
          <p className={`text-3xl font-bold ${result.passed ? "text-success" : "text-error"}`}>{result.score}%</p>
          <p className="text-sm text-text-secondary mt-2">
            {result.passed ? "You passed!" : `You need ${assessment.passingScore}% to pass.`}
          </p>
          {attemptNumber != null && (
            <p className="text-xs text-text-muted mt-1">
              Attempt {attemptNumber} of {assessment.maxAttempts}
            </p>
          )}
          <Button onClick={onClose} className="mt-4">
            Close
          </Button>
        </div>
      )}

      {assessment && !result && (
        <div className="flex flex-col gap-5">
          {attemptNumber != null && (
            <p className="text-xs text-text-muted -mb-2">
              Attempt {attemptNumber} of {assessment.maxAttempts}
            </p>
          )}
          {assessment.questions.map((question, index) => (
            <div key={question.id}>
              <p className="text-sm font-medium text-text-primary">
                {index + 1}. {question.text}
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {question.options.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type={question.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                      name={question.id}
                      checked={(answers[question.id] ?? []).includes(option.id)}
                      onChange={() => toggleOption(question.id, option.id, question.type === "MULTIPLE_CHOICE")}
                      className="w-4 h-4"
                    />
                    {option.text}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Quiz"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
