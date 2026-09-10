"""Health + contract unit tests (no network, no DB)."""

from httpx import AsyncClient

from app.utils.reference_id import generate_reference_id, is_valid_reference_id


async def test_health_ok(client: AsyncClient) -> None:
    response = await client.get("/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["app"]
    assert body["version"]


def test_reference_id_canonical_format() -> None:
    ref = generate_reference_id()
    assert is_valid_reference_id(ref)
    assert ref.startswith("KJAC-")
    assert not is_valid_reference_id("KJ-2026-001234")
    assert not is_valid_reference_id("KJAC-2026-abc123")
