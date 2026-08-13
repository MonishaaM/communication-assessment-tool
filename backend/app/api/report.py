from datetime import date

from fastapi import APIRouter, HTTPException, Depends
from app.services import report_service, patient_service, assessment_service
from app.models.report import ReportCreate, ReportUpdate
from app.auth import require_therapist, ensure_patient_access, CurrentUser
from app.schemas.ai_report import AIReportRequest, BehaviourScore as AIBehaviourScore
from app.services.ai_report_service import generate_ai_report

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)


def _calculate_age(date_of_birth: str) -> int:
    dob = date.fromisoformat(str(date_of_birth))
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


@router.post("/generate")
def generate_report(
    report: ReportCreate,
    user: CurrentUser = Depends(require_therapist),
):
    ensure_patient_access(report.patient_id, user)

    patient = patient_service.get_patient(report.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    assessment = assessment_service.get_assessment(report.assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if assessment["patient_id"] != report.patient_id:
        raise HTTPException(
        status_code=400,
        detail="This assessment does not belong to the selected patient",
    )

    ai_request = AIReportRequest(
        patient_name=patient["full_name"],
        age=_calculate_age(patient["date_of_birth"]),
        assessment_date=assessment["assessment_date"],
        behaviours=[
            AIBehaviourScore(
                behaviour_name=s["behaviour_name"],
                status=s["status"],
                therapist_notes=s.get("therapist_notes") or "",
            )
            for s in assessment["scores"]
        ],
    )
    ai_result = generate_ai_report(ai_request)

    return report_service.generate_report({
        "assessment_id": report.assessment_id,
        "patient_id": report.patient_id,
        # Server-derived, always — never trust a therapist_id sent by the client.
        "therapist_id": user.profile_id,
        "ai_report": ai_result.clinical_impression,
        "therapist_report": ai_result.clinical_impression,
        "recommendations": ai_result.recommendations,
        "parent_summary": ai_result.parent_summary,
        "status": "draft",
    })

@router.get("/{assessment_id}")
def get_report(
    assessment_id: str,
    user: CurrentUser = Depends(require_therapist),
):
    report = report_service.get_report(assessment_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    ensure_patient_access(report["patient_id"], user)
    return report


@router.patch("/{report_id}")
def update_report(
    report_id: str,
    report: ReportUpdate,
    user: CurrentUser = Depends(require_therapist),
):
    existing = report_service.get_report_by_id(report_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Report not found")
    ensure_patient_access(existing["patient_id"], user)
    return report_service.update_report(
        report_id,
        report.model_dump(exclude_none=True)
    )


@router.patch("/{report_id}/approve")
def approve_report(
    report_id: str,
    user: CurrentUser = Depends(require_therapist),
):
    existing = report_service.get_report_by_id(report_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Report not found")
    ensure_patient_access(existing["patient_id"], user)
    return report_service.approve_report(report_id)


@router.get("/id/{report_id}")
def get_report_by_id(
    report_id: str,
    user: CurrentUser = Depends(require_therapist),
):
    report = report_service.get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    ensure_patient_access(report["patient_id"], user)
    return report