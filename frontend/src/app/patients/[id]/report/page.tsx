"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getPatient, getPatientAssessments, getAssessment, approveAssessment } from "@/lib/api";
import { Patient, BehaviourScore, Assessment, BehaviourResult } from "@/types";
import {
  generateReport,
  getReport,
  getReportById,
  updateReport,
  approveReport,
  downloadReportPdf,
} from "@/lib/api";
import { useSearchParams } from "next/navigation";

interface DiffRow {
  behaviour: string;
  previous: BehaviourResult | null;
  current: BehaviourResult;
  change: "improved" | "declined" | "same" | "new";
}

export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
const router = useRouter();
const searchParams = useSearchParams();
const reportId = searchParams.get("report");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [approved, setApproved] = useState(false);
  const [diffRows, setDiffRows] = useState<DiffRow[]>([]);
  const [previousAssessment, setPreviousAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const p = await getPatient(id);
        setPatient(p);

        const assessmentId =
  searchParams.get("assessment") ??
  sessionStorage.getItem(`cat-assessment-id-${id}`);

if (!assessmentId) {
  throw new Error("Assessment not found");
}
let reportData;

if (reportId) {
  reportData = await getReportById(reportId);
} else {
  reportData = await getReport(assessmentId);

  if (!reportData) {
    reportData = await generateReport({
      assessment_id: assessmentId,
      patient_id: id,
    });
  }
}

setReport(reportData);
console.log(reportData);
const raw = sessionStorage.getItem(`cat-scores-${id}`);

const currentScores: BehaviourScore[] = raw
  ? JSON.parse(raw)
  : [];
        const currentAssessmentId = assessmentId;
        const allAssessments = await getPatientAssessments(id);
        const previousApproved = allAssessments
          .filter((a) => a.status === "approved" && a.id !== currentAssessmentId)
          .sort((a, b) => (a.assessmentDate < b.assessmentDate ? 1 : -1))[0];

        if (previousApproved) {
          const fullPrevious = await getAssessment(previousApproved.id);
          setPreviousAssessment(fullPrevious);

          const rows: DiffRow[] = currentScores.map((cur) => {
            const prevScore = fullPrevious.scores.find(
              (s) => s.behaviour === cur.behaviour
            );
            const prevResult = prevScore ? prevScore.result : null;
            let change: DiffRow["change"] = "new";
            if (prevResult) {
              if (prevResult === cur.result) change = "same";
              else if (prevResult === "absent" && cur.result === "present")
                change = "improved";
              else change = "declined";
            }
            return {
              behaviour: cur.behaviour,
              previous: prevResult,
              current: cur.result,
              change,
            };
          });
          setDiffRows(rows);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSaveDraft() {
    console.log("SAVE DRAFT CLICKED")
  if (!report) 
    {
      console.log("REPORT IS EMPTY")
      return;
    }
    console.log("REPORT BEFORE SAVE")
    const data={
      therapist_report:report.therapist_report,
      recommendations:report.recommendations,
      parent_summary:report.parent_summary,
    };
    console.log("REPORT DATA SENT:",data)
  try {
    
    const updated = await updateReport(report.id,data
   );
   console.log("Server response:",updated)

    setReport(updated);
  } catch (err) {
    console.log("Save error")
    setError(
      err instanceof Error ? err.message : "Could not save the draft."
    );
  }
}

async function handleApprove() {
  if (!report) return;
  try {
    // Save therapist edits
    await updateReport(report.id, {
      therapist_report: report.therapist_report,
      recommendations: report.recommendations,
      parent_summary: report.parent_summary,
    });
    // Approve the report
    await approveReport(report.id);
    setReport({
      ...report,
      status: "approved",
    });
    // Approve the assessment — use the id already on the loaded report,
    // not a re-derived value that can silently come back empty.
    await approveAssessment(report.assessment_id);

    setApproved(true);

    setTimeout(() => {
      router.push(`/patients/${id}/profile`);
    }, 700);

  } catch (err) {
    console.log(err);
    setError(
      err instanceof Error
        ? err.message
        : JSON.stringify(err)
    );
  }
}
async function handleDownloadPdf() {
  if (!report) return;

  try {
    const blob = await downloadReportPdf(report.id);
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "CAT_Report.pdf";
    link.click();

    URL.revokeObjectURL(url);
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Could not download the PDF."
    );
  }
}

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error || !patient || !report)
    return (
      <p className="text-red-600">
        Something went wrong: {error ?? "Patient not found."}
      </p>
    );

  const changeStyles: Record<DiffRow["change"], string> = {
    improved: "bg-emerald-100 text-emerald-700",
    declined: "bg-red-100 text-red-700",
    same: "bg-slate-100 text-slate-600",
    new: "bg-blue-100 text-blue-700",
  };
  const changeLabels: Record<DiffRow["change"], string> = {
    improved: "↑ Improved",
    declined: "↓ Regressed",
    same: "No change",
    new: "First recorded",
  };

  return (
    <div className="max-w-3xl">
      <Link
        href={`/patients/${id}`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to {patient.name}
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          AI-Generated Report
        </h1>
      <span
  className={`text-xs px-2 py-1 rounded-full ${
    report.status === "approved"
      ? "bg-green-100 text-green-700"
      : "bg-amber-100 text-amber-700"
  }`}
>
  {report.status === "approved"
    ? "Approved"
    : "Draft — pending your review"}
</span>
      </div>
      <p className="text-slate-500 mt-1">
Review and edit the AI-generated draft. You can save changes as a draft
or approve the report when it is ready.      </p>

      {previousAssessment && diffRows.length > 0 && (
        <div className="mt-6 bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">
            Compared to previous session ({previousAssessment.assessmentDate})
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Here's what changed since the last approved assessment.
          </p>
          <div className="space-y-2">
            {diffRows.map((row) => (
              <div
                key={row.behaviour}
                className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0"
              >
                <span className="text-slate-800">{row.behaviour}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${changeStyles[row.change]}`}
                >
                  {changeLabels[row.change]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!previousAssessment && (
        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-500">
          No previous approved assessment yet — this will be the baseline for future comparisons.
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          Something went wrong: {error}
        </div>
      )}

      <div className="mt-6 space-y-5">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Clinical Impression
          </label>
          <textarea
            value={report.therapist_report}
            onChange={(e) =>
              setReport({ ...report, therapist_report: e.target.value })
            }
            rows={4}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Recommendations &amp; Home Activities
          </label>
          <textarea
            value={report.recommendations}
            onChange={(e) =>
              setReport({ ...report, recommendations: e.target.value })
            }
            rows={4}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Parent-Friendly Summary
          </label>
          <textarea
            value={report.parent_summary ?? ""}
            onChange={(e) =>
              setReport({ ...report, parent_summary: e.target.value })
            }
            rows={4}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSaveDraft}
          className=" bg-black text-white text-sm font-medium px-5 py-2.5 rounded-md curosr pointer hover:bg-black disabled:opacity-50"
          >
            
            Save Draft
        </button>
        <button
          onClick={handleApprove}
        disabled={approved || report.status === "approved"}
          className="bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-emerald-700 disabled:opacity-50"
        >
         {report.status === "approved"
  ? "Already Approved"
  : approved
  ? "Approved ✓"
  : "Approve Report"}
        </button>
       <button
  onClick={handleDownloadPdf}
  className="bg-slate-700 text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-slate-800"
>
  Download PDF
</button>
        <p className="text-sm text-slate-500">
          Review the draft carefully before approving it for caregiver use.
        </p>
      </div>
    </div>
  );
}
