from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import date

BehaviourStatus = Literal["Present", "Absent"]


class BehaviourScoreIn(BaseModel):
    behaviour_name: str = Field(..., min_length=1)
    status: BehaviourStatus
    therapist_notes: Optional[str] = ""


class BehaviourScoreOut(BehaviourScoreIn):
    id: str
    assessment_id: str


class AssessmentCreate(BaseModel):
    patient_id: str
      # required — DB enforces NOT NULL + foreign key
    assessment_date: date
    scores: List[BehaviourScoreIn] = Field(..., min_length=10, max_length=10)


class AssessmentOut(BaseModel):
    id: str
    patient_id: str
    
    assessment_date: str
    status: str
    scores: List[BehaviourScoreOut] = []