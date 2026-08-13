from pydantic import BaseModel
from typing import Optional


class ReportCreate(BaseModel):
    assessment_id: str
    patient_id: str


class ReportUpdate(BaseModel):
    therapist_report: Optional[str] = None
    recommendations: Optional[str] = None
    parent_summary: Optional[str] = None


class ReportOut(BaseModel):
    id: str
    assessment_id: str
    patient_id: str
    therapist_id: str
    ai_report: Optional[str] = None
    therapist_report: Optional[str] = None
    recommendations: Optional[str] = None
    parent_summary: Optional[str] = None
    status: str