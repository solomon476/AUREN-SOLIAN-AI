"""Team and Staff management endpoints with RBAC and organizational hierarchy."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import require_role, UserRole, AuthUser, ROLE_HIERARCHY
from app.models.organization import (
    MemberRoleUpdate,
    MemberStatusUpdate,
    MemberInviteCreate,
    DepartmentCreate,
    DepartmentUpdate,
)
from app.services.storage.sqlite_repository import repo

router = APIRouter()


@router.get("/members")
async def list_members(user: AuthUser = Depends(require_role(UserRole.GUEST))):
    members = repo.list_members()
    return [
        {
            "id": m.id,
            "userId": m.user_id,
            "name": m.name,
            "email": m.email,
            "role": m.role.value,
            "title": m.title,
            "departmentId": m.department_id,
            "department": m.department,
            "teamId": m.team_id,
            "team": m.team,
            "responsibilities": m.responsibilities,
            "reportsToId": m.reports_to_id,
            "reportsToName": m.reports_to_name,
            "status": m.status,
            "assignedProjects": m.assigned_projects,
            "joinedDate": m.joined_date,
            "isDemo": m.is_demo,
        }
        for m in members
    ]


@router.get("/members/{member_id}")
async def get_member(member_id: str, user: AuthUser = Depends(require_role(UserRole.GUEST))):
    member = repo.get_member_by_id(member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found.")
    return {
        "id": member.id,
        "userId": member.user_id,
        "name": member.name,
        "email": member.email,
        "role": member.role.value,
        "title": member.title,
        "departmentId": member.department_id,
        "department": member.department,
        "teamId": member.team_id,
        "team": member.team,
        "responsibilities": member.responsibilities,
        "reportsToId": member.reports_to_id,
        "reportsToName": member.reports_to_name,
        "status": member.status,
        "assignedProjects": member.assigned_projects,
        "joinedDate": member.joined_date,
        "isDemo": member.is_demo,
    }


@router.patch("/members/{member_id}/role")
async def update_member_role(
    member_id: str,
    update: MemberRoleUpdate,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    """
    Update member role tier.
    Administrative security check:
    - Caller must be at least ADMIN.
    - Caller cannot assign a role higher than their own (e.g., ADMIN cannot assign OWNER).
    - Caller cannot demote or alter the OWNER unless caller is OWNER.
    """
    target = repo.get_member_by_id(member_id)
    if not target:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    caller_level = ROLE_HIERARCHY.get(user.role, 0)
    target_current_level = ROLE_HIERARCHY.get(target.role, 0)
    target_new_level = ROLE_HIERARCHY.get(update.role, 0)

    # Cannot alter OWNER unless caller is OWNER
    if target.role == UserRole.OWNER and user.role != UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only an OWNER can modify the organization OWNER account.",
        )

    # Cannot grant a role higher than the caller's role
    if target_new_level > caller_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Cannot assign role '{update.role.value}' exceeding your own authority.",
        )

    updated = repo.update_member_role(member_id, update.role)
    repo.log_activity(
        actor_name=user.full_name,
        action_type="role_updated",
        title=f"Role Updated: {target.name}",
        description=f"Assigned new role tier '{update.role.value.upper()}' by {user.full_name}.",
        module="teams",
    )
    return {
        "id": updated.id,
        "name": updated.name,
        "role": updated.role.value,
        "message": f"Successfully updated role for {updated.name} to {updated.role.value}.",
    }


@router.post("/members/invite", status_code=status.HTTP_201_CREATED)
async def invite_member(
    invite: MemberInviteCreate,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    """Invite/Add a new member to the organization roster."""
    caller_level = ROLE_HIERARCHY.get(user.role, 0)
    target_new_level = ROLE_HIERARCHY.get(invite.role, 0)
    if target_new_level > caller_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Cannot invite member with role '{invite.role.value}' exceeding your own authority.",
        )
    member = repo.invite_member(invite, inviter_name=user.full_name)
    return {
        "id": member.id,
        "userId": member.user_id,
        "name": member.name,
        "email": member.email,
        "role": member.role.value,
        "title": member.title,
        "department": member.department,
        "team": member.team,
        "responsibilities": member.responsibilities,
        "status": member.status,
        "joinedDate": member.joined_date,
        "message": f"Successfully invited {member.name} ({member.email}) as {member.role.value}.",
    }


@router.patch("/members/{member_id}/status")
async def update_member_status(
    member_id: str,
    body: MemberStatusUpdate,
    user: AuthUser = Depends(require_role(UserRole.MEMBER)),
):
    """Update member operational status (active | away | offline | deactivated)."""
    target = repo.get_member_by_id(member_id)
    if not target:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    caller_is_admin = ROLE_HIERARCHY.get(user.role, 0) >= ROLE_HIERARCHY.get(UserRole.ADMIN, 0)
    caller_is_self = user.id == target.user_id or user.email.lower() == target.email.lower()

    if not (caller_is_self or caller_is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only update your own status.",
        )

    if body.status == "deactivated" and not caller_is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only administrators can deactivate members.",
        )

    updated = repo.update_member_status(member_id, body.status)
    return {
        "id": updated.id,
        "name": updated.name,
        "status": updated.status,
        "message": f"Status updated to '{updated.status}'.",
    }


@router.get("/departments")
async def list_departments(user: AuthUser = Depends(require_role(UserRole.GUEST))):
    departments = repo.list_departments()
    return [
        {
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "description": d.description,
            "leadId": d.lead_id,
            "leadName": d.lead_name,
            "memberCount": d.member_count,
            "activeInitiatives": d.active_initiatives,
            "isDemo": d.is_demo,
        }
        for d in departments
    ]


@router.get("/departments/{dept_id}")
async def get_department(
    dept_id: str,
    user: AuthUser = Depends(require_role(UserRole.GUEST)),
):
    """Retrieve departmental profile by ID or Code."""
    dept = repo.get_department(dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")
    return {
        "id": dept.id,
        "name": dept.name,
        "code": dept.code,
        "description": dept.description,
        "leadId": dept.lead_id,
        "leadName": dept.lead_name,
        "memberCount": dept.member_count,
        "activeInitiatives": dept.active_initiatives,
        "isDemo": dept.is_demo,
    }


@router.post("/departments", status_code=status.HTTP_201_CREATED)
async def create_department(
    body: DepartmentCreate,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    """Create a new corporate division/department. Restricted to ADMIN and above."""
    dept = repo.create_department(body)
    repo.log_activity(
        actor_name=user.full_name,
        action_type="department_created",
        title=f"Department Established: {dept.name}",
        description=f"Department '{dept.name}' ({dept.code}) established by {user.full_name}.",
        module="teams",
    )
    return {
        "id": dept.id,
        "name": dept.name,
        "code": dept.code,
        "description": dept.description,
        "leadName": dept.lead_name,
        "message": f"Successfully created department '{dept.name}'.",
    }


@router.patch("/departments/{dept_id}")
async def update_department(
    dept_id: str,
    body: DepartmentUpdate,
    user: AuthUser = Depends(require_role(UserRole.ADMIN)),
):
    """Update department details or assigned leadership. Restricted to ADMIN and above."""
    updated = repo.update_department(dept_id, body.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Department not found.")
    repo.log_activity(
        actor_name=user.full_name,
        action_type="department_updated",
        title=f"Department Updated: {updated.name}",
        description=f"Department '{updated.name}' modified by {user.full_name}.",
        module="teams",
    )
    return {
        "id": updated.id,
        "name": updated.name,
        "code": updated.code,
        "description": updated.description,
        "leadName": updated.lead_name,
        "message": f"Successfully updated department '{updated.name}'.",
    }


@router.get("/teams")
async def list_teams(
    department_id: Optional[str] = None,
    user: AuthUser = Depends(require_role(UserRole.GUEST)),
):
    teams = repo.list_teams(department_id=department_id)
    return [
        {
            "id": t.id,
            "departmentId": t.department_id,
            "departmentName": t.department_name,
            "name": t.name,
            "leadName": t.lead_name,
            "description": t.description,
            "focusArea": t.focus_area,
            "memberCount": t.member_count,
            "isDemo": t.is_demo,
        }
        for t in teams
    ]


@router.get("/hierarchy")
async def get_hierarchy(user: AuthUser = Depends(require_role(UserRole.GUEST))):
    """Returns organizational reporting tree."""
    members = repo.list_members()
    # Build tree
    member_map = {m.id: {"member": m, "subordinates": []} for m in members}
    roots = []

    for m in members:
        if m.reports_to_id and m.reports_to_id in member_map:
            member_map[m.reports_to_id]["subordinates"].append(member_map[m.id])
        else:
            roots.append(member_map[m.id])

    roots.sort(key=lambda r: 0 if r["member"].role.value == "owner" else (1 if r["member"].role.value == "admin" else 2))

    def serialize_node(node):
        m = node["member"]
        return {
            "id": m.id,
            "name": m.name,
            "title": m.title,
            "role": m.role.value,
            "department": m.department,
            "team": m.team,
            "isDemo": m.is_demo,
            "subordinates": [serialize_node(child) for child in node["subordinates"]],
        }

    return [serialize_node(r) for r in roots]
