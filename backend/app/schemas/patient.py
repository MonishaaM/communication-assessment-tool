from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class PatientCreate(BaseModel):
    full_name: str = Field(..., min_length=1)
    date_of_birth: date
    caregiver_name: str = Field(..., min_length=1)
    caregiver_phone: str = Field(..., min_length=1)
    gender: Optional[str] = None
    diagnosis: Optional[str] = None
      # required — every patient belongs to a therapist; see frontend PLACEHOLDER_THERAPIST_ID until real login exists# TODO: derive from auth once login exists


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    caregiver_name: Optional[str] = None
    caregiver_phone: Optional[str] = None
    gender: Optional[str] = None
    diagnosis: Optional[str] = None


class PatientOut(BaseModel):
    id: str
    full_name: str
    date_of_birth: date
    caregiver_name: str
    caregiver_phone: str
    gender: Optional[str] = None
    diagnosis: Optional[str] = None
    therapist_id: Optional[str] = None
    created_at: Optional[str] = None