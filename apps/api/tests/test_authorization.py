import httpx
import pytest
from sqlalchemy.orm import Session

from app.models import Institution
from conftest import login_as


def tenant_headers(institution: Institution) -> dict[str, str]:
    return {"X-Institution-Context": str(institution.id)}


@pytest.mark.anyio
@pytest.mark.parametrize("role", ["student", "verifier", "registry", "platform"])
async def test_all_roles_can_read_authorized_academic_structure(client: httpx.AsyncClient, seeded_data: dict[str, object], role: str):
    institution = seeded_data["institution_a"]
    assert isinstance(institution, Institution)
    assert (await login_as(client, role)).status_code == 200
    for resource in ("campuses", "programmes"):
        response = await client.get(f"/api/v1/institutions/{institution.id}/{resource}", headers=tenant_headers(institution))
        assert response.status_code == 200


@pytest.mark.anyio
async def test_registry_is_scoped_and_url_change_cannot_cross_tenants(client: httpx.AsyncClient, seeded_data: dict[str, object]):
    institution_a = seeded_data["institution_a"]
    institution_b = seeded_data["institution_b"]
    assert isinstance(institution_a, Institution) and isinstance(institution_b, Institution)
    await login_as(client, "registry")

    own = await client.get(f"/api/v1/institutions/{institution_a.id}/students", headers=tenant_headers(institution_a))
    assert own.status_code == 200 and own.json()["total"] == 1

    cross = await client.get(f"/api/v1/institutions/{institution_b.id}/students", headers=tenant_headers(institution_b))
    assert cross.status_code == 403
    mismatch = await client.get(f"/api/v1/institutions/{institution_b.id}/students", headers=tenant_headers(institution_a))
    assert mismatch.status_code == 403


@pytest.mark.anyio
@pytest.mark.parametrize("role", ["student", "verifier", "platform"])
async def test_non_registry_roles_cannot_list_students(client: httpx.AsyncClient, seeded_data: dict[str, object], role: str):
    institution = seeded_data["institution_a"]
    assert isinstance(institution, Institution)
    await login_as(client, role)
    response = await client.get(f"/api/v1/institutions/{institution.id}/students", headers=tenant_headers(institution))
    assert response.status_code == 403


@pytest.mark.anyio
async def test_student_can_read_only_own_linked_record(client: httpx.AsyncClient, seeded_data: dict[str, object]):
    institution_a = seeded_data["institution_a"]
    institution_b = seeded_data["institution_b"]
    assert isinstance(institution_a, Institution) and isinstance(institution_b, Institution)
    await login_as(client, "student")
    own = await client.get(f"/api/v1/institutions/{institution_a.id}/students/me", headers=tenant_headers(institution_a))
    assert own.status_code == 200
    assert own.json()["user_id"] == str(seeded_data["users"]["student"].id)
    cross = await client.get(f"/api/v1/institutions/{institution_b.id}/students/me", headers=tenant_headers(institution_b))
    assert cross.status_code == 403


@pytest.mark.anyio
async def test_memberships_require_admin_role_and_active_membership(client: httpx.AsyncClient, seeded_data: dict[str, object]):
    institution = seeded_data["institution_a"]
    assert isinstance(institution, Institution)
    for role, expected in (("registry", 200), ("platform", 200), ("verifier", 403)):
        client.cookies.clear()
        await login_as(client, role)
        response = await client.get(f"/api/v1/institutions/{institution.id}/memberships", headers=tenant_headers(institution))
        assert response.status_code == expected

    client.cookies.clear()
    await login_as(client, "inactive")
    response = await client.get(f"/api/v1/institutions/{institution.id}/memberships", headers=tenant_headers(institution))
    assert response.status_code == 403


@pytest.mark.anyio
async def test_missing_context_and_inactive_institution_are_denied(client: httpx.AsyncClient, seeded_data: dict[str, object], db_session: Session):
    institution = seeded_data["institution_a"]
    assert isinstance(institution, Institution)
    await login_as(client, "registry")
    missing = await client.get(f"/api/v1/institutions/{institution.id}/students")
    assert missing.status_code == 400
    institution.status = "inactive"
    db_session.commit()
    inactive = await client.get(f"/api/v1/institutions/{institution.id}/students", headers=tenant_headers(institution))
    assert inactive.status_code == 403


@pytest.mark.anyio
async def test_user_discovers_only_active_membership_institutions(client: httpx.AsyncClient):
    await login_as(client, "inactive")
    response = await client.get("/api/v1/institutions")
    assert response.status_code == 200
    assert response.json() == []
