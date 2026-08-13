"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getPatient, getPatientAssessments, getReport,getCommunicationProfile,CommunicationProfile } from "@/lib/api";
import { Patient, Assessment } from "@/types";

const teachingVideos = [
  {
    title: "Eye Contact Practice",
    behaviour: "Eye Contact",
    url: "https://www.youtube.com/watch?v=4m6ZL8t5Qj8",
  },
  {
    title: "Turn Taking Games",
    behaviour: "Turn Taking",
    url: "https://www.youtube.com/watch?v=Q6r8HKw0m7Y",
  },
  {
    title: "Joint Attention Activities",
    behaviour: "Joint Attention",
    url: "https://www.youtube.com/watch?v=O7J5v0iM5K4",
  },
];

interface ParentReport {
  id: string;
  therapist_report?: string | null;
  recommendations?: string | null;
  parent_summary?: string | null;
  status: string;
  assessment_id: string;
}

export default function ParentViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [latestAssessment, setLatestAssessment] =
    useState<Assessment | null>(null);
  const [report, setReport] = useState<ParentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CommunicationProfile | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const patientData = await getPatient(id);
        setPatient(patientData);
        const profileData = await getCommunicationProfile(id);
        setProfile(profileData);

        const assessments = await getPatientAssessments(id);

        const approved = assessments
          .filter((a) => a.status === "approved")
          .sort((a, b) =>
            a.assessmentDate < b.assessmentDate ? 1 : -1
          );

        if (approved.length === 0) {
          return;
        }

        const latest = approved[0];
        setLatestAssessment(latest);
        

        const reportData = await getReport(latest.id);

        if (reportData?.status === "approved") {
          setReport(reportData);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) {
    console.log("Parent profile trend:", profile?.trend);
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-slate-500">Loading parent view...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-red-600">
          Something went wrong: {error ?? "Patient not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href={`/patients/${id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Patient Profile
        </Link>

        <div className="mt-4">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">
            Parent View Preview
          </span>

          <h1 className="text-3xl font-bold text-slate-900 mt-3">
            {patient.name}&apos;s Communication Progress
          </h1>

          <p className="text-slate-500 mt-1">
            This is the caregiver-facing view of approved information.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          About {patient.name}
        </h2>

        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <p className="text-slate-500">Date of Birth</p>
            <p className="font-medium text-slate-900">
              {patient.dateOfBirth}
            </p>
          </div>

          <div>
            <p className="text-slate-500">Caregiver</p>
            <p className="font-medium text-slate-900">
              {patient.caregiverName}
            </p>
          </div>
        </div>
      </div>

      {!latestAssessment || !report ? (
        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900">
            No approved report yet
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Approved communication information will appear here after the
            therapist approves an assessment report.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Latest Assessment
              </h2>

              <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                Approved
              </span>
            </div>

            <p className="text-sm text-slate-500 mt-2">
              Assessment date: {latestAssessment.assessmentDate}
            </p>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-700">
                Summary
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-line">
                {report.parent_summary ||
                  "No parent summary is available for this assessment."}
              </p>
            </div>
          </div>
         {profile && profile.trend.length > 0 && (
  <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Communication Progress
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Progress across approved assessment sessions.
        </p>
      </div>

      <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700">
        {profile.trend.length} session
        {profile.trend.length !== 1 ? "s" : ""}
      </span>
    </div>

    {(() => {
      const latest = profile.trend[profile.trend.length - 1];
      const previous =
        profile.trend.length > 1
          ? profile.trend[profile.trend.length - 2]
          : null;

      const latestPercent = latest
        ? Math.round(
            (latest.presentCount / latest.totalBehaviours) * 100
          )
        : 0;

      const previousPercent = previous
        ? Math.round(
            (previous.presentCount / previous.totalBehaviours) * 100
          )
        : null;

      const change =
        previousPercent !== null
          ? latestPercent - previousPercent
          : null;

      return (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500">
                Latest Session
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {latestPercent}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {latest.presentCount} of {latest.totalBehaviours} behaviours
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500">
                Previous Session
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {previousPercent !== null ? `${previousPercent}%` : "—"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {previous
                  ? `${previous.presentCount} of ${previous.totalBehaviours} behaviours`
                  : "No previous session"}
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500">
                Recent Change
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  change === null
                    ? "text-slate-400"
                    : change > 0
                    ? "text-emerald-600"
                    : change < 0
                    ? "text-amber-600"
                    : "text-slate-700"
                }`}
              >
                {change === null
                  ? "—"
                  : change > 0
                  ? `+${change}%`
                  : `${change}%`}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                {change === null
                  ? "Baseline"
                  : change > 0
                  ? "Positive progress"
                  : change < 0
                  ? "Needs more practice"
                  : "No change"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Latest communication progress</span>
              <span>{latestPercent}%</span>
            </div>

            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${latestPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700">
              Assessment History
            </h3>

            <div className="mt-3 space-y-3">
              {profile.trend.map((item, index) => {
                const percent = Math.round(
                  (item.presentCount / item.totalBehaviours) * 100
                );

                return (
                  <div
                    key={`${item.assessmentId ?? item.date}-${index}`}
                    className="flex items-center gap-4"
                  >
                    <div className="w-24 text-xs text-slate-500">
                      {item.date.slice(0, 10)}
                    </div>

                    <div className="flex-1">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="w-16 text-right text-xs font-medium text-slate-700">
                      {percent}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      );
    })()}
  </div>
)}
          <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Recommended Activities
            </h2>

            <p className="text-sm leading-6 text-slate-700 mt-3 whitespace-pre-line">
              {report.recommendations ||
                "No home activities have been added yet."}
            </p>
          </div>

          <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Teaching Activities
            </h2>

            <div className="space-y-3 mt-4">
              {teachingVideos.map((video) => (
                <div
                  key={video.title}
                  className="border border-slate-200 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {video.title}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Focus: {video.behaviour}
                    </p>
                  </div>

                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Watch
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-5">
            <p className="text-sm text-blue-900">
              This preview shows the information that is appropriate for the
              caregiver. Internal therapist notes and draft reports are not
              displayed.
            </p>
          </div>
        </>
      )}
    </div>
  );
}