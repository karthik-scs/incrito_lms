"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FileUploadField } from "@/components/ui/FileUploadField";
import { apiJson } from "@/lib/authClient";

type Submission = {
  id: string;
  status: "SUBMITTED" | "GRADED" | "RESUBMITTED" | "OVERDUE";
  content: string | null;
  fileUrl: string | null;
  marksObtained: number | null;
  feedback: string | null;
};

export function AssignmentModal({
  assignmentId,
  title,
  description,
  dueDate,
  maxMarks,
  open,
  onClose,
  onSubmitted,
}: {
  assignmentId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxMarks: number;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    setEditing(false);
    setError(null);

    apiJson<Submission | null>(`/api/assignments/${assignmentId}/submissions/me`).then((res) => {
      if (res.ok) {
        setSubmission(res.data);
        setEditing(!res.data);
        setContent(res.data?.content ?? "");
        setFileUrl(res.data?.fileUrl ?? "");
      }
      setLoaded(true);
    });
  }, [open, assignmentId]);

  async function handleSubmit() {
    setError(null);
    if (!content && !fileUrl) {
      setError("Add some text or a file link before submitting.");
      return;
    }
    setSubmitting(true);
    const result = await apiJson<Submission>(`/api/assignments/${assignmentId}/submissions`, {
      method: "POST",
      body: JSON.stringify({ content: content || undefined, fileUrl: fileUrl || undefined }),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSubmission(result.data);
    setEditing(false);
    onSubmitted();
  }

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-lg">
      {!loaded && <p className="text-sm text-text-secondary">Loading…</p>}

      {loaded && (
        <div className="flex flex-col gap-4">
          {description && <p className="text-sm text-text-secondary whitespace-pre-wrap">{description}</p>}
          <div className="flex items-center gap-3 text-xs text-text-muted">
            {dueDate && <span>Due {new Date(dueDate).toLocaleString()}</span>}
            <span>{maxMarks} marks</span>
          </div>

          {submission && !editing && (
            <div className="bg-surface-secondary rounded-lg p-4 flex flex-col gap-2">
              <Badge variant={submission.status === "GRADED" ? "success" : "info"}>
                {submission.status === "GRADED" ? "Graded" : "Submitted"}
              </Badge>
              {submission.content && <p className="text-sm text-text-primary whitespace-pre-wrap">{submission.content}</p>}
              {submission.fileUrl && (
                <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-accent hover:text-accent-dark">
                  View submitted file
                </a>
              )}

              {submission.status === "GRADED" ? (
                <div className="mt-2 pt-3 border-t border-border">
                  <p className="text-2xl font-bold text-text-primary">
                    {submission.marksObtained}<span className="text-sm text-text-muted">/{maxMarks}</span>
                  </p>
                  {submission.feedback && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-text-secondary">Mentor feedback</p>
                      <p className="text-sm text-text-primary mt-0.5 whitespace-pre-wrap">{submission.feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 mt-1">
                  <p className="text-sm text-text-muted">Waiting for your mentor's feedback.</p>
                  <Button variant="secondary" onClick={() => setEditing(true)} className="self-start px-3 py-1.5 text-xs">
                    Edit submission
                  </Button>
                </div>
              )}
            </div>
          )}

          {editing && (
            <div className="flex flex-col gap-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Write your answer…"
                className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
              <FileUploadField
                kind="file"
                endpoint="/api/uploads/submission"
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,video/mp4,video/webm,video/quicktime,image/png,image/jpeg,image/webp"
                value={fileUrl || null}
                onUploaded={(url) => setFileUrl(url)}
              />
              {error && <p className="text-sm text-error">{error}</p>}
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
                {submission && (
                  <Button variant="secondary" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
