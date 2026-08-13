from fastapi import APIRouter, Depends

from app.auth import CurrentUser, require_therapist
from app.schemas.ai_report import AIReportRequest, AIReportResponse
from app.services.ai_report_service import generate_ai_report

router = APIRouter(prefix="/ai", tags=["AI Reports"])


@router.post("/generate-report", response_model=AIReportResponse)
def generate_report(
    payload: AIReportRequest,
    user: CurrentUser = Depends(require_therapist),
):
    return generate_ai_report(payload)