import { Patient, Assessment, BehaviourScore } from "@/types";
import { supabase } from "@/lib/supabase";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

// ---------------------------------------------------------------------------
// Backend wire types — mirror backend/app/schemas/{patient,assessment}.py on
// feature/patient-api. Do not rename without checking with backend owner.
// ---------------------------------------------------------------------------

interface ApiPatient {
  id: string;
  full_name: string;
  date_of_birth: string;
  caregiver_name: string;
  caregiver_phone: string;
  gender?: string | null;
  diagnosis?: string | null;
  therapist_id?: string | null;
  created_at?: string | null;
}

interface ApiPatientCreate {
  full_name: string;
  date_of_birth: string;
  caregiver_name: string;
  caregiver_phone: string;
  gender?: string;
  diagnosis?: string;
 
}

type ApiBehaviourStatus = "Present" | "Absent";

interface ApiBehaviourScoreIn {
  behaviour_name: string;
  status: ApiBehaviourStatus;
  therapist_notes?: string;
}

interface ApiBehaviourScoreOut extends ApiBehaviourScoreIn {
  id: string;
  assessment_id: string;
}

interface ApiAssessmentCreate {
  patient_id: string;
 
  assessment_date: string;
  scores: ApiBehaviourScoreIn[];
}

interface ApiAssessment {
  id: string;
  patient_id: string;
  therapist_id: string;
  assessment_date: string;
  status: string;
  // NOTE: GET /patients/{id}/assessments does not populate this — only
  // GET /assessments/{id} does. Always guard with `?? []`.
  scores?: ApiBehaviourScoreOut[];
}

// ---------------------------------------------------------------------------
// Mappers — translate between backend field names and frontend types
// (frontend/src/types/index.ts). This is the ONLY place field-name
// differences are reconciled.
// ---------------------------------------------------------------------------

function patientFromApi(p: ApiPatient): Patient {
  return {
    id: p.id,
    name: p.full_name,
    dateOfBirth: p.date_of_birth,
    caregiverName: p.caregiver_name,
    caregiverContact: p.caregiver_phone,
    createdAt: p.created_at ?? "",
  };
}
function patientToApiCreate(input: {
  name: string;
  dateOfBirth: string;
  caregiverName: string;
  caregiverContact: string;
  gender?: string;
  diagnosis?: string;
  
}): ApiPatientCreate {
  return {
    full_name: input.name,
    date_of_birth: input.dateOfBirth,
    caregiver_name: input.caregiverName,
    caregiver_phone: input.caregiverContact,
    
    ...(input.gender ? { gender: input.gender } : {}),
    ...(input.diagnosis ? { diagnosis: input.diagnosis } : {}),
  };
}

function behaviourStatusFromApi(
  status: ApiBehaviourStatus
): BehaviourScore["result"] {
  return status === "Present" ? "present" : "absent";
}

function behaviourStatusToApi(
  result: BehaviourScore["result"]
): ApiBehaviourStatus {
  // Caller must ensure no "unscored" rows are submitted. The Assessment
  // page already disables submit until all 10 behaviours are scored.
  return result === "present" ? "Present" : "Absent";
}

function assessmentFromApi(a: ApiAssessment): Assessment {
  return {
    id: a.id,
    patientId: a.patient_id,
    assessmentDate: a.assessment_date,
    status: a.status === "approved" ? "approved" : "draft",
    scores: (a.scores ?? []).map((s) => ({
      behaviour: s.behaviour_name,
      result: behaviourStatusFromApi(s.status),
      notes: s.therapist_notes ?? "",
    })),
  };
}

// ---------------------------------------------------------------------------
// fetch helper
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(options?.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Is the backend running on http://127.0.0.1:8000?",
      0
    );
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // body wasn't JSON, keep statusText
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Patients — GET/POST/PUT/DELETE /patients
// ---------------------------------------------------------------------------

export async function getPatients(): Promise<Patient[]> {
  const data = await request<ApiPatient[]>("/patients/");
  return data.map(patientFromApi);
}

export async function getPatient(id: string): Promise<Patient> {
  const data = await request<ApiPatient>(`/patients/${id}`);
  return patientFromApi(data);
}

export async function createPatient(input: {
  name: string;
  dateOfBirth: string;
  caregiverName: string;
  caregiverContact: string;
  gender?: string;
  diagnosis?: string;
 
}): Promise<Patient> {
  const data = await request<ApiPatient>("/patients/", {
    method: "POST",
    body: JSON.stringify(patientToApiCreate(input)),
  });
  return patientFromApi(data);
}

export async function updatePatient(
  id: string,
  input: Partial<{
    name: string;
    dateOfBirth: string;
    caregiverName: string;
    caregiverContact: string;
  }>
): Promise<Patient> {
  const payload: Partial<ApiPatientCreate> = {};
  if (input.name !== undefined) payload.full_name = input.name;
  if (input.dateOfBirth !== undefined) payload.date_of_birth = input.dateOfBirth;
  if (input.caregiverName !== undefined) payload.caregiver_name = input.caregiverName;
  if (input.caregiverContact !== undefined)
    payload.caregiver_phone = input.caregiverContact;

  const data = await request<ApiPatient>(`/patients/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return patientFromApi(data);
}

export async function deletePatient(id: string): Promise<void> {
  await request<{ deleted: boolean; id: string }>(`/patients/${id}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Assessments — POST /assessments, GET /assessments/{id},
//               GET /patients/{id}/assessments
// ---------------------------------------------------------------------------

export async function createAssessment(input: {
  patientId: string;
  // required by backend; no auth yet — see report
  assessmentDate: string; // YYYY-MM-DD
  scores: BehaviourScore[]; // all 10 must be "present" or "absent"
}): Promise<Assessment> {
  const payload: ApiAssessmentCreate = {
    patient_id: input.patientId,
   
    assessment_date: input.assessmentDate,
    scores: input.scores.map((s) => ({
      behaviour_name: s.behaviour,
      status: behaviourStatusToApi(s.result),
      therapist_notes: s.notes,
    })),
  };

  const data = await request<ApiAssessment>("/assessments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return assessmentFromApi(data);
}

export async function getAssessment(id: string): Promise<Assessment> {
  const data = await request<ApiAssessment>(`/assessments/${id}`);
  return assessmentFromApi(data);
}

export async function getPatientAssessments(
  patientId: string
): Promise<Assessment[]> {
  const data = await request<ApiAssessment[]>(
    `/patients/${patientId}/assessments`
  );
  return data.map(assessmentFromApi);
}
// ---------------------------------------------------------------------------
// Communication Intelligence Profile — GET /communication-profile, /timeline
// ---------------------------------------------------------------------------

interface ApiTrendPoint {
  assessment_id: string;
  assessment_date: string;
  present_count: number;
  total_behaviours: number;
}

interface ApiCommunicationProfile {
  patient: ApiPatient;
  approved_assessments: ApiAssessment[];
  trend: ApiTrendPoint[];
}

interface ApiTimelineEntry {
  id: string;
  assessment_date: string;
  status: string;
}

export interface TrendPoint {
   assessmentId: string;
  date: string;
  presentCount: number;
  totalBehaviours: number;
}

export interface CommunicationProfile {
  patient: Patient;
  approvedAssessments: Assessment[];
  trend: TrendPoint[];
}

export async function getCommunicationProfile(
  patientId: string
): Promise<CommunicationProfile> {
  const data = await request<ApiCommunicationProfile>(
    `/communication-profile?patient_id=${patientId}`
  );
  return {
    patient: patientFromApi(data.patient),
    approvedAssessments: data.approved_assessments.map(assessmentFromApi),
  trend: data.trend.map((t) => ({
  assessmentId: t.assessment_id,
  date: t.assessment_date,
  presentCount: t.present_count,
  totalBehaviours: t.total_behaviours,
})),
  };
}

export async function getTimeline(
  patientId: string
): Promise<{ id: string; date: string; status: string }[]> {
  const data = await request<ApiTimelineEntry[]>(
    `/timeline?patient_id=${patientId}`
  );
  return data.map((t) => ({
    id: t.id,
    date: t.assessment_date,
    status: t.status,
  }));
}
export async function approveAssessment(assessmentId: string): Promise<void> {
  await request<ApiAssessment>(`/assessments/${assessmentId}/approve`, {
    method: "PATCH",
  });
}
export async function inviteParent(data: {
  full_name: string;
  email: string;
  phone: string;
  patient_id: string;
  
}) {
  return request<{ message: string; temporary_password: string; parent: unknown }>(
    "/parents/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}
export interface ParentDashboard {
  parent: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };

  patient: {
    id: string;
    full_name: string;
    date_of_birth: string;
    caregiver_name: string;
    caregiver_phone: string;
  };
}

export async function getParentDashboard() {
    return request<ParentDashboard>(`/parents/dashboard`);
  }
  export interface Report {
  id: string;
  assessment_id: string;
  patient_id: string;
  therapist_id: string;
  ai_report: string;
  therapist_report: string;
  status: string;
}

export async function generateReport(data: {
  assessment_id: string;
  patient_id: string;
}) {
  return request<Report>("/reports/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export async function getReport(assessmentId: string) {
  return request<any>(`/reports/${assessmentId}`);
}
export async function getReportById(reportId: string) {
  return request<Report>(`/reports/id/${reportId}`);
}

export async function updateReport(
  reportId: string,
  data: {
    therapist_report: string;
    recommendations: string;
    parent_summary: string;
  }
) {
  return request<Report>(`/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function approveReport(reportId: string) {
  return request<Report>(`/reports/${reportId}/approve`, {
    method: "PATCH",
  });
}

export async function downloadReportPdf(reportId: string): Promise<Blob> {
  const authHeaders = await getAuthHeaders();

  const response = await fetch(
`${API_BASE_URL}/reports/${reportId}/pdf`,    {
      headers: authHeaders,
    }
  );

  if (!response.ok) {
    throw new ApiError("Could not download the PDF report.", response.status);
  }

  return response.blob();
}