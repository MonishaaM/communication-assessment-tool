"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BEHAVIOURS } from "@/lib/behaviours";
import { BehaviourResult, Patient } from "@/types";
import { getPatient, createAssessment } from "@/lib/api";

// TODO(backend): AssessmentCreate.therapist_id is required, but there's no
// auth/session yet to derive a real value from. Using a placeholder until
// the backend owner confirms a real therapist_id (or makes it optional).


interface ScoreRow {
  behaviour: string;
  result: BehaviourResult;
  notes: string;
}

export default function NewAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [scores, setScores] = useState<ScoreRow[]>(
    BEHAVIOURS.map((b) => ({ behaviour: b, result: "unscored", notes: "" }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPatient(id)
      .then((p) => {
        if (!cancelled) setPatient(p);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(
            err instanceof Error ? err.message : "Something went wrong."
          );
      })
      .finally(() => {
        if (!cancelled) setLoadingPatient(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function setResult(index: number, result: BehaviourResult) {
    setScores((prev) =>
      prev.map((row, i) => (i === index ? { ...row, result } : row))
    );
  }

  function setNotes(index: number, notes: string) {
    setScores((prev) =>
      prev.map((row, i) => (i === index ? { ...row, notes } : row))
    );
  }

  const allScored = scores.every((s) => s.result !== "unscored");

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const assessment = await createAssessment({
        patientId: id,
       
        assessmentDate: new Date().toISOString().slice(0, 10),
        scores: scores.map((s) => ({
          behaviour: s.behaviour,
          result: s.result,
          notes: s.notes,
        })),
      });
      // Kept for the AI Report page, which still reads from sessionStorage.
      sessionStorage.setItem(`cat-scores-${id}`, JSON.stringify(scores));
      sessionStorage.setItem(`cat-assessment-id-${id}`, assessment.id);
      router.push(`/patients/${id}/report`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setSubmitting(false);
    }
  }

  if (loadingPatient) {
    return <p className="text-slate-500">Loading...</p>;
  }

  if (loadError || !patient) {
    return (
      <p className="text-red-600">
        Something went wrong: {loadError ?? "Patient not found."}
      </p>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link
        href={`/patients/${id}`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to {patient.name}
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 mt-3">
        New Assessment
      </h1>
      <p className="text-slate-500 mt-1">
        Score each behaviour as Present, Sometimes, or Absent. Notes are optional.
      </p>

      {submitError && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          Something went wrong: {submitError}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {scores.map((row, i) => (
          <div
            key={row.behaviour}
            className="bg-white border border-slate-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-900">{row.behaviour}</p>
              <div className="flex gap-2">
                <button
  type="button"
  onClick={() => setResult(i, "sometimes")}
  className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
    row.result === "sometimes"
      ? "bg-yellow-500 text-white border-yellow-500"
      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
  }`}
>
  Sometimes
</button>
                <button
                  type="button"
                  onClick={() => setResult(i, "present")}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
                    row.result === "present"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  Present
                </button>
                <button
                  type="button"
                  onClick={() => setResult(i, "absent")}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md border ${
                    row.result === "absent"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  Absent
                </button>
              </div>
            </div>
            <textarea
              value={row.notes}
              onChange={(e) => setNotes(i, e.target.value)}
              placeholder="Optional clinical notes..."
              rows={2}
              className="mt-3 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!allScored || submitting}
          className="bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save & Generate AI Report"}
        </button>
        {!allScored && (
          <p className="text-sm text-slate-500">
            Score all 10 behaviours to continue.
          </p>
        )}
      </div>
    </div>
  );
}