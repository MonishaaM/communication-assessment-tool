from app.database.supabase import supabase
from app.schemas.assessment import AssessmentCreate

def create_assessment(assessment: AssessmentCreate, therapist_id: str):
    assessment_payload = {
        "patient_id": assessment.patient_id,
        "therapist_id": therapist_id,
        "assessment_date": assessment.assessment_date.isoformat(),
        "status": "draft",
    }
    assessment_response = (
        supabase.table("assessments").insert(assessment_payload).execute()
    )
    new_assessment = assessment_response.data[0]
    assessment_id = new_assessment["id"]

    scores_payload = [
        {
            "assessment_id": assessment_id,
            "behaviour_name": s.behaviour_name,
            "status": s.status,
            "therapist_notes": s.therapist_notes or "",
        }
        for s in assessment.scores
    ]
    scores_response = (
        supabase.table("behaviour_scores").insert(scores_payload).execute()
    )

    new_assessment["scores"] = scores_response.data
    return new_assessment


def get_assessment(assessment_id: str):
    assessment_response = (
        supabase.table("assessments")
        .select("*")
        .eq("id", assessment_id)
        .single()
        .execute()
    )
    assessment = assessment_response.data
    if not assessment:
        return None

    scores_response = (
        supabase.table("behaviour_scores")
        .select("*")
        .eq("assessment_id", assessment_id)
        .execute()
    )
    assessment["scores"] = scores_response.data
    return assessment


def list_patient_assessments(patient_id: str):
    response = (
        supabase.table("assessments")
        .select("""
            *,
            reports(id,status)
        """)
        .eq("patient_id", patient_id)
        .order("assessment_date", desc=True)
        .execute()
    )

    return response.data
def get_communication_profile(patient_id: str):
    patient_response = (
        supabase.table("patients")
        .select("*")
        .eq("id", patient_id)
        .single()
        .execute()
    )
    patient = patient_response.data
    if not patient:
        return None

    assessments_response = (
        supabase.table("assessments")
        .select("*")
        .eq("patient_id", patient_id)
        .eq("status", "approved")
        .order("assessment_date", desc=False)
        .execute()
    )
    approved_assessments = assessments_response.data

    trend = []
    for assessment in approved_assessments:
        scores_response = (
            supabase.table("behaviour_scores")
            .select("status")
            .eq("assessment_id", assessment["id"])
            .execute()
        )
        present_count = sum(
            1 for s in scores_response.data if s["status"] == "Present"
        )
        trend.append(
            {
                "assessment_id": assessment["id"],
                "assessment_date": assessment["assessment_date"],
                "present_count": present_count,
                "total_behaviours": len(scores_response.data),
            }
        )

    return {
        "patient": patient,
        "approved_assessments": approved_assessments,
        "trend": trend,
    }


def get_patient_timeline(patient_id: str):
    response = (
        supabase.table("assessments")
        .select("id, assessment_date, status")
        .eq("patient_id", patient_id)
        .order("assessment_date", desc=True)
        .execute()
    )
    return response.data
def approve_assessment(assessment_id: str):
    response = (
        supabase.table("assessments")
        .update({"status": "approved"})
        .eq("id", assessment_id)
        .execute()
    )
    return response.data[0] if response.data else None