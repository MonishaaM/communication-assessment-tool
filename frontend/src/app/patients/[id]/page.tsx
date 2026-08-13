"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getPatient, getPatientAssessments, inviteParent } from "@/lib/api";
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

export default function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const p = await getPatient(id);
        setPatient(p);
        const a = await getPatientAssessments(id);
        setAssessments(a);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  async function handleInvite() {
    if (!patient) return;

    try {
      setSendingInvite(true);

      await inviteParent({
        full_name: parentName,
        email: parentEmail,
        phone: parentPhone,
        patient_id: patient.id,
     
      });

      alert("Parent invited successfully!");

      setParentName("");
      setParentEmail("");
      setParentPhone("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to invite parent.");
    } finally {
      setSendingInvite(false);
    }
  }

  if (loading) return <p className="text-slate-500">Loading patient...</p>;

  if (error || !patient)
    return <p className="text-red-600">{error || "Patient not found"}</p>;

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/patients" className="text-blue-600 hover:underline">
        Back to Patients
      </Link>

      <h1 className="text-3xl font-bold mt-4">{patient.name}</h1>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Patient Information</h2>
          <p>
            <b>Date of Birth:</b> {patient.dateOfBirth}
          </p>
          <p className="mt-2">
            <b>Caregiver:</b> {patient.caregiverName}
          </p>
          <p className="mt-2">
            <b>Phone:</b> {patient.caregiverContact}
          </p>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href={`/patients/${id}/parent-view`}
              className="block bg-slate-600 text-white rounded-md px-4 py-2 hover:bg-slate-700 text-center"
            >
              Parent View
            </Link>

            <Link
              href={`/patients/${id}/vr-assessment`}
              className="block bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 text-center"
            >
              Start VR Assessment
            </Link>

            <Link
              href={`/patients/${id}/assessment/new`}
              className="block bg-emerald-600 text-white rounded-md px-4 py-2 hover:bg-emerald-700 text-center"
            >
              New Assessment
            </Link>

            <Link
              href={`/patients/${id}/profile`}
              className="block bg-slate-700 text-white rounded-md px-4 py-2 hover:bg-slate-800 text-center"
            >
              Communication Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white border rounded-lg p-5">
        <h2 className="text-xl font-semibold mb-4">
          Recommended Teaching Videos
        </h2>
        <div className="space-y-4">
          {teachingVideos.map((video) => (
            <div
              key={video.title}
              className="border rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{video.title}</p>
                <p className="text-sm text-gray-500">
                  Behaviour: {video.behaviour}
                </p>
              </div>
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
             >
                Watch
              </a> 
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 bg-white border rounded-lg p-5">
        <h2 className="text-xl font-semibold mb-4">Invite Parent</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Parent Name"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
          <input
            type="email"
            placeholder="Parent Email"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
          <button
            onClick={handleInvite}
            disabled={sendingInvite}
            className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {sendingInvite ? "Sending Invitation..." : "Send Invitation"}
          </button>
        </div>
      </div>
<div className="mt-8 bg-white border rounded-lg p-5">
  <h2 className="text-xl font-semibold mb-4">Assessment History</h2>

  {assessments.length === 0 ? (
    <p className="text-sm text-slate-500">No assessments yet.</p>
  ) : (
    <div className="divide-y divide-slate-100">
      {assessments.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between py-4"
        >
          <div>
            <p className="font-medium text-slate-900">
              {a.assessmentDate}
            </p>

            <span
              className={`inline-block mt-1 text-xs font-medium px-2 py-1 rounded-full ${
                a.status === "approved"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {a.status}
            </span>
          </div>

          {a.status === "draft" ? (
            <Link
              href={`/patients/${id}/report?assessment=${a.id}`}
              className="text-blue-600 hover:underline font-medium"
            >
              Continue Report →
            </Link>
          ) : (
            <Link
              href={`/patients/${id}/profile`}
              className="text-emerald-600 hover:underline font-medium"
            >
              View Profile →
            </Link>
          )}
        </div>
      ))}
    </div>
  )}
</div>
    </div>
  );
}