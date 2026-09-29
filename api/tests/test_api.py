import os
import tempfile

temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = f"sqlite:///{temp_db.name}"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402


def test_prospect_activity_pipeline_and_dashboard():
    with TestClient(app) as client:
        created = client.post("/api/prospects", json={
            "name": "Alex Morgan", "company": "Blue Sky Ltd", "email": "alex@bluesky.example", "value": 5000
        })
        assert created.status_code == 201
        prospect_id = created.json()["id"]
        assert client.get("/api/prospects?search=blue%20sky").json()[0]["id"] == prospect_id
        activity = client.post(f"/api/prospects/{prospect_id}/activities", json={
            "kind": "call", "outcome": "Connected", "note": "Meeting agreed"
        })
        assert activity.status_code == 201
        assert client.get(f"/api/prospects/{prospect_id}/activities").json()[0]["note"] == "Meeting agreed"
        updated = client.patch(f"/api/prospects/{prospect_id}", json={"stage": "meeting"})
        assert updated.json()["activity_count"] == 1
        assert updated.json()["stage"] == "meeting"
        assert client.get("/api/dashboard").json()["stages"]["meeting"] >= 1


def test_invalid_input_and_unknown_prospect():
    with TestClient(app) as client:
        assert client.post("/api/prospects", json={"name": "A", "company": "X", "email": "bad"}).status_code == 422
        assert client.patch("/api/prospects/999999", json={"stage": "won"}).status_code == 404
        assert client.get("/api/prospects?stage=imaginary").status_code == 422
