from fastapi import APIRouter, HTTPException, Depends

from app.schemas.assessment import AssessmentCreate
from app.services import assessment_service
from app.services.assessment_service import get_communication_profile, get_patient_timeline
from app.auth import require_therapist, ensure_patient_access, CurrentUser

router = APIRouter(tags=["assessments"])


@router.post("/assessments", status_code=201)
def create_new_assessment(
    assessment: AssessmentCreate,
    user: CurrentUser = Depends(require_therapist),
):
    ensure_patient_access(assessment.patient_id, user)
    return assessment_service.create_assessment(assessment,user.profile_id)


@router.get("/assessments/{assessment_id}")
def get_one_assessment(
    assessment_id: str,
    user: CurrentUser = Depends(require_therapist),
):
    assessment = assessment_service.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    ensure_patient_access(assessment["patient_id"], user)
    return assessment


@router.get("/patients/{patient_id}/assessments")
def get_patient_assessments(
    patient_id: str,
    user: CurrentUser = Depends(require_therapist),
):
    ensure_patient_access(patient_id, user)
    return assessment_service.list_patient_assessments(patient_id)


@router.get("/communication-profile")
def communication_profile(
    patient_id: str,
    user: CurrentUser = Depends(require_therapist),
):
    ensure_patient_access(patient_id, user)
    profile = get_communication_profile(patient_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Patient not found")
    return profile


@router.get("/timeline")
def patient_timeline(
    patient_id: str,
    user: CurrentUser = Depends(require_therapist),
):
    ensure_patient_access(patient_id, user)
    return get_patient_timeline(patient_id)


@router.patch("/assessments/{assessment_id}/approve")
def approve_one_assessment(
    assessment_id: str,
    user: CurrentUser = Depends(require_therapist),
):
    assessment = assessment_service.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    ensure_patient_access(assessment["patient_id"], user)
    approved = assessment_service.approve_assessment(assessment_id)
    return approved