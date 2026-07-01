"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Eye, FileText, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { apiJson } from "@/lib/authClient";
import { QuizModal } from "./QuizModal";
import { AssignmentModal } from "./AssignmentModal";
import { ResourceViewer } from "./ResourceViewer";

type Resource = { id: string; title: string; fileType: string; fileUrl: string };
type Assessment = { id: string; title: string; kind: "QUIZ" | "ASSESSMENT"; passingScore: number; status: string; maxAttempts: number };
type Attempt = { attemptNumber: number; status: string; score: number | null };
type Assignment = { id: string; title: string; description: string | null; dueDate: string | null; maxMarks: number };
type Submission = { status: "SUBMITTED" | "GRADED" | "RESUBMITTED" | "OVERDUE"; marksObtained: number | null };

const TABS = [
  { key: "quiz", label: "Quiz", icon: HelpCircle },
  { key: "assignments", label: "Assignments", icon: ClipboardList },
  { key: "resources", label: "Resources", icon: FileText },
] as const;

export function LessonSidebar({ moduleId, lessonId, resources }: { moduleId: string; lessonId: string; resources: Resource[] }) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("quiz");

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attemptsByAssessment, setAttemptsByAssessment] = useState<Record<string, Attempt[]>>({});
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissionByAssignment, setSubmissionByAssignment] = useState<Record<string, Submission | null>>({});
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);

  const [activeResource, setActiveResource] = useState<Resource | null>(null);

  async function loadAssessments() {
    const result = await apiJson<Assessment[]>(`/api/assessments?lessonId=${lessonId}`);
    const moduleResult = await apiJson<Assessment[]>(`/api/assessments?moduleId=${moduleId}`);
    const all = [...(result.ok ? result.data : []), ...(moduleResult.ok ? moduleResult.data : [])].filter(
      (a) => a.status === "PUBLISHED"
    );
    setAssessments(all);

    const attemptEntries = await Promise.all(
      all.map(async (a) => {
        const res = await apiJson<Attempt[]>(`/api/assessments/${a.id}/attempts/me`);
        return [a.id, res.ok ? res.data : []] as const;
      })
    );
    setAttemptsByAssessment(Object.fromEntries(attemptEntries));
  }

  async function loadAssignments() {
    const result = await apiJson<Assignment[]>(`/api/assignments?lessonId=${lessonId}`);
    const moduleResult = await apiJson<Assignment[]>(`/api/assignments?moduleId=${moduleId}`);
    const all = [...(result.ok ? result.data : []), ...(moduleResult.ok ? moduleResult.data : [])];
    setAssignments(all);

    const submissionEntries = await Promise.all(
      all.map(async (a) => {
        const res = await apiJson<Submission | null>(`/api/assignments/${a.id}/submissions/me`);
        return [a.id, res.ok ? res.data : null] as const;
      })
    );
    setSubmissionByAssignment(Object.fromEntries(submissionEntries));
  }

  useEffect(() => {
    loadAssessments();
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, moduleId]);

  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center gap-5 border-b border-border pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 text-sm font-medium pb-2 -mb-3.5 border-b-2 ${
                isActive ? "border-accent text-accent" : "border-transparent text-text-secondary"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "quiz" && (
        <div className="mt-4 flex flex-col gap-2">
          {assessments.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No quizzes for this lesson yet.</p>}
          {assessments.map((assessment) => {
            const attempts = attemptsByAssessment[assessment.id] ?? [];
            const best = attempts.reduce((max, a) => Math.max(max, a.score ?? 0), 0);
            const completed = attempts.length > 0;
            const attemptsLeft = assessment.maxAttempts - attempts.length;
            const exhausted = attemptsLeft <= 0;
            return (
              <div key={assessment.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-surface-secondary">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{assessment.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant={completed ? "success" : "info"}>{completed ? "Completed" : "Available"}</Badge>
                    {completed && <span className="text-xs text-text-secondary">Best score: {best}%</span>}
                    <span className="text-xs text-text-muted">
                      Attempt {attempts.length} of {assessment.maxAttempts}
                    </span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setActiveQuizId(assessment.id)}
                  disabled={exhausted}
                  className="shrink-0 px-3 py-1.5 text-xs"
                >
                  {exhausted ? "No attempts left" : completed ? "Retake" : "Start"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "assignments" && (
        <div className="mt-4 flex flex-col gap-2">
          {assignments.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No assignments for this lesson yet.</p>}
          {assignments.map((assignment) => {
            const submission = submissionByAssignment[assignment.id];
            const graded = submission?.status === "GRADED";
            return (
              <div key={assignment.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-surface-secondary">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{assignment.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={graded ? "success" : submission ? "info" : "muted"}>
                      {graded ? "Graded" : submission ? "Submitted" : "Not submitted"}
                    </Badge>
                    {graded && <span className="text-xs text-text-secondary">{submission?.marksObtained}/{assignment.maxMarks}</span>}
                    {assignment.dueDate && !submission && (
                      <span className="text-xs text-text-muted">Due {new Date(assignment.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <Button variant="secondary" onClick={() => setActiveAssignment(assignment)} className="shrink-0 px-3 py-1.5 text-xs">
                  {submission ? "View" : "Submit"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "resources" && (
        <div className="mt-4 flex flex-col gap-2">
          {resources.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No resources shared for this lesson yet.</p>}
          {resources.map((resource) => (
            <div key={resource.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-surface-secondary">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex items-center justify-center w-8 h-8 rounded-md bg-surface text-text-secondary shrink-0">
                  <FileText size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{resource.title}</p>
                  <p className="text-xs text-text-muted">{resource.fileType}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveResource(resource)}
                className="text-text-muted hover:text-accent shrink-0 flex items-center gap-1 text-xs font-medium"
                aria-label="View resource"
              >
                <Eye size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeQuizId && (
        <QuizModal assessmentId={activeQuizId} open onClose={() => setActiveQuizId(null)} onSubmitted={loadAssessments} />
      )}

      {activeAssignment && (
        <AssignmentModal
          assignmentId={activeAssignment.id}
          title={activeAssignment.title}
          description={activeAssignment.description}
          dueDate={activeAssignment.dueDate}
          maxMarks={activeAssignment.maxMarks}
          open
          onClose={() => setActiveAssignment(null)}
          onSubmitted={loadAssignments}
        />
      )}

      <ResourceViewer resource={activeResource} open={!!activeResource} onClose={() => setActiveResource(null)} />
    </div>
  );
}
