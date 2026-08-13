from fastapi import APIRouter,Depends
from app.database.supabase import supabase
from pydantic import BaseModel
from fastapi import HTTPException
from app.auth import require_parent, CurrentUser
import secrets
router = APIRouter(
    prefix="/parents",
    tags=["Parents"]
)
class ParentCreate(BaseModel):
    full_name: str
    email: str
    phone: str
    patient_id: str
    invited_by: str
@router.get("/")
def get_all_parents():
    response = supabase.table("parents").select("*").execute()

    return response.data
@router.post("/")
def create_parent(parent: ParentCreate):

    # Check if parent already exists
    existing = (
        supabase.table("parents")
        .select("id")
        .eq("email", parent.email)
        .execute()
    )

    if existing.data:
        raise HTTPException(
            status_code=400,
            detail="Parent already exists"
        )

    # Generate temporary password
    temp_password = secrets.token_urlsafe(10)

  # Create Supabase Auth user
    try:
        auth = supabase.auth.admin.create_user({
            "email": parent.email,
            "password": temp_password,
            "email_confirm": True
        })
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=(
                "This email is already registered as an auth account "
                "(possibly from a deleted parent record). Delete it under "
                "Supabase Auth > Users before re-inviting, or use a "
                "different email."
            ),
        )
    auth_user = auth.user

    # Save parent record
    response = (
        supabase.table("parents")
        .insert({
            "auth_user_id": auth_user.id,
            "full_name": parent.full_name,
            "email": parent.email,
            "phone": parent.phone,
            "patient_id": parent.patient_id,
            "invited_by": parent.invited_by,
            "invitation_status": "pending"
        })
        .execute()
    )
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import CurrentUser, ensure_patient_access, require_parent, require_therapist
from app.database.supabase import supabase

router = APIRouter(prefix="/parents", tags=["Parents"])


class ParentCreate(BaseModel):
    full_name: str
    email: str
    phone: str
    patient_id: str


@router.post("/", status_code=201)
def create_parent(
    parent: ParentCreate,
    user: CurrentUser = Depends(require_therapist),
):
    ensure_patient_access(parent.patient_id, user)

    existing = (
        supabase.table("parents")
        .select("id")
        .eq("email", parent.email)
        .maybe_single()
        .execute()
    )

    if existing.data:
        raise HTTPException(status_code=400, detail="Parent already exists")

    temp_password = secrets.token_urlsafe(10)

    try:
        auth = supabase.auth.admin.create_user(
            {
                "email": parent.email,
                "password": temp_password,
                "email_confirm": True,
            }
        )
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to create the parent account. The email may already be registered.",
        )

    response = (
        supabase.table("parents")
        .insert(
            {
                "auth_user_id": auth.user.id,
                "full_name": parent.full_name,
                "email": parent.email,
                "phone": parent.phone,
                "patient_id": parent.patient_id,
                "invited_by": user.profile_id,
                "invitation_status": "pending",
            }
        )
        .execute()
    )

    return {
        "message": "Parent invited successfully",
        "temporary_password": temp_password,
        "parent": response.data[0],
    }


@router.get("/dashboard")
def get_parent_dashboard(user: CurrentUser = Depends(require_parent)):
    parent_response = (
        supabase.table("parents")
        .select("*")
        .eq("auth_user_id", user.auth_user_id)
        .single()
        .execute()
    )

    parent = parent_response.data
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    patient_response = (
        supabase.table("patients")
        .select("*")
        .eq("id", parent["patient_id"])
        .single()
        .execute()
    )

    patient = patient_response.data
    if not patient:
        raise HTTPException(status_code=404, detail="Linked patient not found")

    report_response = (
        supabase.table("reports")
        .select("*")
        .eq("patient_id", patient["id"])
        .eq("status", "approved")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    return {
        "parent": parent,
        "patient": patient,
        "report": report_response.data[0] if report_response.data else None,
    }
    return {
        "message": "Parent invited successfully",
        "temporary_password": temp_password,
        "parent": response.data
    }
@router.get("/dashboard")
def get_parent_dashboard(user: CurrentUser = Depends(require_parent)):
    parent_response = (
        supabase.table("parents")
        .select("*")
        .eq("auth_user_id", user.auth_user_id)
        .single()
        .execute()
    )

    parent = parent_response.data

    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    patient_response = (
        supabase.table("patients")
        .select("*")
        .eq("id", parent["patient_id"])
        .single()
        .execute()
    )

    patient = patient_response.data

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Linked patient not found"
        )

    report_response = (
        supabase.table("reports")
        .select("*")
        .eq("patient_id", patient["id"])
        .eq("status", "approved")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    report = (
        report_response.data[0]
        if report_response.data
        else None
    )

    return {
        "parent": parent,
        "patient": patient,
        "report": report,
    }