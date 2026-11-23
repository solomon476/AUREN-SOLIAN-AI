"""Organization models and schemas for Solian Wolves."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.core.security import UserRole


class Department(BaseModel):
    id: str
    organization_id: str
    name: str
    code: str
    description: str
    lead_id: Optional[str] = None
    lead_name: str
    member_count: int = 0
    active_initiatives: int = 0
    is_demo: bool = False


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    code: str = Field(min_length=2, max_length=20)
    description: str = Field(default="")
    lead_name: str = Field(min_length=2, max_length=100)


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    lead_name: Optional[str] = None
    lead_id: Optional[str] = None


class Team(BaseModel):
    id: str
    organization_id: str
    department_id: str
    department_name: str
    name: str
    lead_name: str
    description: str
    focus_area: str
    member_count: int = 0
    is_demo: bool = False


class OrganizationMember(BaseModel):
    id: str
    user_id: str
    auth_user_id: Optional[str] = None
    organization_id: str
    name: str
    email: str
    role: UserRole
    title: str
    department_id: Optional[str] = None
    department: str
    team_id: Optional[str] = None
    team: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)
    reports_to_id: Optional[str] = None
    reports_to_name: Optional[str] = None
    status: str = "active"  # active | away | offline
    assigned_projects: int = 0
    joined_date: str = "2024-01-15"
    is_demo: bool = False


class MemberRoleUpdate(BaseModel):
    role: UserRole


class MemberStatusUpdate(BaseModel):
    status: str  # active | away | offline | deactivated


class MemberInviteCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=120)
    role: UserRole = UserRole.MEMBER
    title: str = Field(min_length=2, max_length=100)
    department: str = Field(min_length=2, max_length=100)
    team: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)


class VerifiedLeader(BaseModel):
    name: str
    title: str
    source: str = "Official Solian Wolves Leadership Registry"


VERIFIED_LEADERSHIP_COUNCIL: List[VerifiedLeader] = [
    VerifiedLeader(name="Ian Momanyi Nyakundi", title="Chief Executive Officer"),
    VerifiedLeader(name="Hillary Onchwati Isaiah", title="Chief Operating Officer"),
    VerifiedLeader(name="Alice Moraa Nyakundi", title="Chief Financial Officer"),
    VerifiedLeader(name="Noella Maraka Kaatho", title="Executive Director / Finance & Administration"),
    VerifiedLeader(name="Solomon Nyangweso Omwenga", title="Chief Technology Officer"),
]


class OrganizationProfile(BaseModel):
    id: str
    name: str
    code: str
    tagline: str
    mission: Optional[str] = None
    vision: Optional[str] = None
    operating_model: Optional[str] = None
    headquarters: Optional[str] = None
    founded_year: Optional[int] = None
    primary_timezone: Optional[str] = "UTC"
    fiscal_year: Optional[str] = None
    tier: str = "enterprise"
    total_members: int = 1
    leadership_council: List[VerifiedLeader] = Field(default_factory=list)


class OrganizationProfileUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    mission: Optional[str] = None
    vision: Optional[str] = None
    operating_model: Optional[str] = None
    headquarters: Optional[str] = None
    primary_timezone: Optional[str] = None
    fiscal_year: Optional[str] = None
    founded_year: Optional[int] = None


class OperatingCadence(BaseModel):
    id: str
    name: str
    cadence: str
    audience: str
    description: str
    lead: str
    is_demo: bool = False


class OperatingPrinciple(BaseModel):
    id: str
    title: str
    description: str
    is_demo: bool = False


class CompanyOperatingInfo(BaseModel):
    organization_id: str
    principles: List[OperatingPrinciple]
    cadences: List[OperatingCadence]
    escalation_slas: List[Dict[str, str]]
    leadership_council: List[VerifiedLeader] = Field(default_factory=list)
    has_demo_data: bool = True
