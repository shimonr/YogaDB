import pytest


class TestAuth:
    def test_register_and_login(self, client):
        response = client.post(
            "/api/auth/register",
            json={"username": "alice", "email": "alice@example.com", "password": "secret1234"},
        )
        assert response.status_code == 200
        assert response.json()["username"] == "alice"

        login = client.post("/api/auth/login", data={"username": "alice", "password": "secret1234"})
        assert login.status_code == 200
        assert "access_token" in login.json()

    def test_register_duplicate_username(self, client):
        client.post(
            "/api/auth/register",
            json={"username": "bob", "email": "bob@example.com", "password": "secret1234"},
        )
        r = client.post(
            "/api/auth/register",
            json={"username": "bob", "email": "bob2@example.com", "password": "secret1234"},
        )
        assert r.status_code == 400

    def test_login_wrong_password(self, client):
        client.post(
            "/api/auth/register",
            json={"username": "charlie", "email": "charlie@example.com", "password": "secret1234"},
        )
        r = client.post("/api/auth/login", data={"username": "charlie", "password": "wrong"})
        assert r.status_code == 400

    def test_register_short_password(self, client):
        r = client.post(
            "/api/auth/register",
            json={"username": "dave", "email": "dave@example.com", "password": "short"},
        )
        assert r.status_code == 422


class TestAsanas:
    def test_list_asanas(self, client):
        r = client.get("/api/asanas")
        assert r.status_code == 200
        assert len(r.json()) >= 2

    def test_search_asanas(self, client):
        r = client.get("/api/asanas?q=Mountain")
        assert r.status_code == 200
        assert any(a["english_name"] == "Mountain Pose" for a in r.json())

    def test_top_asanas(self, client):
        r = client.get("/api/asanas/top?limit=1")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_get_asana_by_id(self, client):
        r = client.get("/api/asanas/1")
        assert r.status_code == 200
        assert r.json()["english_name"] == "Mountain Pose"

    def test_get_asana_not_found(self, client):
        r = client.get("/api/asanas/99999")
        assert r.status_code == 404

    def test_create_asana_admin(self, client, admin_headers):
        r = client.post(
            "/api/asanas",
            json={
                "english_name": "Warrior Pose",
                "sanskrit_name": "Virabhadrasana",
                "difficulty_level": 3,
                "benefits": "Strength",
                "is_classic": True,
                "type": "standing",
                "category": "strength",
                "rank": 50,
            },
            headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.json()["english_name"] == "Warrior Pose"

    def test_create_asana_unauthorized(self, client, user_headers):
        r = client.post(
            "/api/asanas",
            json={
                "english_name": "Warrior Pose",
                "sanskrit_name": "Virabhadrasana",
                "difficulty_level": 3,
                "benefits": "Strength",
                "is_classic": True,
                "type": "standing",
                "category": "strength",
                "rank": 50,
            },
            headers=user_headers,
        )
        assert r.status_code == 403

    def test_update_asana_admin(self, client, admin_headers):
        r = client.put(
            "/api/asanas/1",
            json={
                "english_name": "Mountain Pose Updated",
                "sanskrit_name": "Tadasana",
                "difficulty_level": 1,
                "benefits": "Updated benefits",
                "is_classic": True,
                "type": "standing",
                "category": "focus",
                "rank": 50,
            },
            headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.json()["english_name"] == "Mountain Pose Updated"

    def test_delete_asana_admin(self, client, admin_headers):
        r = client.delete("/api/asanas/1", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["ok"] is True
        r2 = client.get("/api/asanas/1")
        assert r2.status_code == 404

    def test_delete_asana_not_found(self, client, admin_headers):
        r = client.delete("/api/asanas/99999", headers=admin_headers)
        assert r.status_code == 404


class TestRanking:
    def test_ranking_updates_average(self, client, user_headers):
        r = client.post(
            "/api/ranking/rank",
            json={"type": "asana", "target_id": 1, "rank": 80},
            headers=user_headers,
        )
        assert r.status_code == 200
        asana = client.get("/api/asanas/1")
        assert asana.json()["rank"] == 80

    def test_ranking_update_existing(self, client, user_headers):
        client.post(
            "/api/ranking/rank",
            json={"type": "asana", "target_id": 1, "rank": 80},
            headers=user_headers,
        )
        r = client.post(
            "/api/ranking/rank",
            json={"type": "asana", "target_id": 1, "rank": 90},
            headers=user_headers,
        )
        assert r.status_code == 200
        asana = client.get("/api/asanas/1")
        assert asana.json()["rank"] == 90

    def test_ranking_target_not_found(self, client, user_headers):
        r = client.post(
            "/api/ranking/rank",
            json={"type": "asana", "target_id": 99999, "rank": 50},
            headers=user_headers,
        )
        assert r.status_code == 404

    def test_ranking_unauthorized(self, client):
        r = client.post(
            "/api/ranking/rank",
            json={"type": "asana", "target_id": 1, "rank": 50},
        )
        assert r.status_code == 401


class TestTransitions:
    def test_list_transitions_empty(self, client):
        r = client.get("/api/transitions")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_transition_admin(self, client, admin_headers):
        r = client.post(
            "/api/transitions",
            json={
                "name": "Mountain to Tree",
                "start_asana_id": 1,
                "end_asana_id": 2,
                "difficulty_level": 2,
                "rank": 50,
            },
            headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.json()["name"] == "Mountain to Tree"

    def test_create_transition_unauthorized(self, client, user_headers):
        r = client.post(
            "/api/transitions",
            json={
                "name": "Mountain to Tree",
                "start_asana_id": 1,
                "end_asana_id": 2,
                "difficulty_level": 2,
                "rank": 50,
            },
            headers=user_headers,
        )
        assert r.status_code == 403

    def test_get_transition_not_found(self, client):
        r = client.get("/api/transitions/99999")
        assert r.status_code == 404

    def test_update_transition_admin(self, client, admin_headers):
        client.post(
            "/api/transitions",
            json={
                "name": "Mountain to Tree",
                "start_asana_id": 1,
                "end_asana_id": 2,
                "difficulty_level": 2,
                "rank": 50,
            },
            headers=admin_headers,
        )
        r = client.put(
            "/api/transitions/1",
            json={
                "name": "Updated Transition",
                "start_asana_id": 1,
                "end_asana_id": 2,
                "difficulty_level": 3,
                "rank": 60,
            },
            headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.json()["name"] == "Updated Transition"

    def test_delete_transition_admin(self, client, admin_headers):
        client.post(
            "/api/transitions",
            json={
                "name": "To Delete",
                "start_asana_id": 1,
                "end_asana_id": 2,
                "difficulty_level": 1,
                "rank": 50,
            },
            headers=admin_headers,
        )
        r = client.delete("/api/transitions/1", headers=admin_headers)
        assert r.status_code == 200


class TestFlows:
    def test_list_flows_empty(self, client):
        r = client.get("/api/flows")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_flow_admin(self, client, admin_headers):
        for i in range(1, 5):
            client.post(
                "/api/transitions",
                json={
                    "name": f"Trans {i}",
                    "start_asana_id": 1,
                    "end_asana_id": 2,
                    "difficulty_level": 1,
                    "rank": 50,
                },
                headers=admin_headers,
            )
        r = client.post(
            "/api/flows",
            json={
                "name": "Test Flow",
                "transition_1_id": 1,
                "transition_2_id": 2,
                "transition_3_id": 3,
                "transition_4_id": 4,
                "difficulty_level": 2,
                "rank": 50,
            },
            headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.json()["name"] == "Test Flow"

    def test_get_flow_not_found(self, client):
        r = client.get("/api/flows/99999")
        assert r.status_code == 404


class TestPhotos:
    def test_list_photos_empty(self, client, admin_headers):
        r = client.get("/api/photos", headers=admin_headers)
        assert r.status_code == 200
        assert r.json() == []

    def test_photos_by_asana_empty(self, client):
        r = client.get("/api/photos/by-asana/1")
        assert r.status_code == 200
        assert r.json() == []


class TestUsers:
    def test_list_users_admin(self, client, admin_headers):
        r = client.get("/api/users", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_list_users_unauthorized(self, client, user_headers):
        r = client.get("/api/users", headers=user_headers)
        assert r.status_code == 403

    def test_delete_user_admin(self, client, admin_headers):
        client.post(
            "/api/auth/register",
            json={"username": "to_delete", "email": "delete@example.com", "password": "password123"},
        )
        db_user = None
        from tests.conftest import TestingSessionLocal
        from app.models import User
        db = TestingSessionLocal()
        db_user = db.query(User).filter(User.username == "to_delete").first()
        user_id = db_user.id if db_user else None
        db.close()
        if user_id:
            r = client.delete(f"/api/users/{user_id}", headers=admin_headers)
            assert r.status_code == 200


class TestHealth:
    def test_health_check(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
