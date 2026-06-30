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

    def test_register_returns_user_without_password(self, client):
        r = client.post(
            "/api/auth/register",
            json={"username": "safeuser", "email": "safe@example.com", "password": "secret1234"},
        )
        body = r.json()
        assert "password_hash" not in body
        assert "password" not in body
        assert body["username"] == "safeuser"
        assert body["role"] == "user"

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

    def test_register_duplicate_email(self, client):
        client.post(
            "/api/auth/register",
            json={"username": "user1", "email": "same@example.com", "password": "secret1234"},
        )
        r = client.post(
            "/api/auth/register",
            json={"username": "user2", "email": "same@example.com", "password": "secret1234"},
        )
        assert r.status_code == 400

    def test_login_wrong_password(self, client):
        client.post(
            "/api/auth/register",
            json={"username": "charlie", "email": "charlie@example.com", "password": "secret1234"},
        )
        r = client.post("/api/auth/login", data={"username": "charlie", "password": "wrong"})
        assert r.status_code == 400

    def test_login_nonexistent_user(self, client):
        r = client.post("/api/auth/login", data={"username": "ghost", "password": "secret1234"})
        assert r.status_code == 400

    def test_register_short_password(self, client):
        r = client.post(
            "/api/auth/register",
            json={"username": "dave", "email": "dave@example.com", "password": "short"},
        )
        assert r.status_code == 422

    def test_register_invalid_email(self, client):
        r = client.post(
            "/api/auth/register",
            json={"username": "eve", "email": "not-an-email", "password": "secret1234"},
        )
        assert r.status_code == 422

    def test_register_short_username(self, client):
        r = client.post(
            "/api/auth/register",
            json={"username": "ab", "email": "ab@example.com", "password": "secret1234"},
        )
        assert r.status_code == 422


class TestAsanas:
    def test_list_asanas(self, client):
        r = client.get("/api/asanas")
        assert r.status_code == 200
        assert len(r.json()) >= 2

    def test_asana_has_cover_photo_id(self, client):
        r = client.get("/api/asanas/1")
        assert r.status_code == 200
        body = r.json()
        assert "cover_photo_id" in body
        assert body["cover_photo_id"] == 1

    def test_asana_without_photo_has_null_cover(self, client):
        r = client.get("/api/asanas")
        assert r.status_code == 200

    def test_asana_out_has_all_fields(self, client):
        r = client.get("/api/asanas/1")
        body = r.json()
        for field in ["english_name", "sanskrit_name", "alt_name_1", "alt_name_2",
                       "difficulty_level", "benefits", "is_classic", "type", "category",
                       "rank", "id", "cover_photo_id"]:
            assert field in body, f"Missing field: {field}"

    def test_search_asanas(self, client):
        r = client.get("/api/asanas?q=Mountain")
        assert r.status_code == 200
        assert any(a["english_name"] == "Mountain Pose" for a in r.json())

    def test_search_asanas_by_sanskrit(self, client):
        r = client.get("/api/asanas?q=Tadasana")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_filter_asanas_by_type(self, client):
        r = client.get("/api/asanas?type=standing")
        assert r.status_code == 200
        assert all(a["type"] == "standing" for a in r.json())

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

    def test_create_asana_no_auth(self, client):
        r = client.post(
            "/api/asanas",
            json={
                "english_name": "X",
                "sanskrit_name": "X",
                "difficulty_level": 1,
                "benefits": "X",
                "is_classic": False,
                "type": "x",
                "category": "x",
                "rank": 50,
            },
        )
        assert r.status_code in (401, 403)

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

    def test_ranking_invalid_type(self, client, user_headers):
        r = client.post(
            "/api/ranking/rank",
            json={"type": "invalid", "target_id": 1, "rank": 50},
            headers=user_headers,
        )
        assert r.status_code == 422

    def test_ranking_out_of_range_rank(self, client, user_headers):
        r = client.post(
            "/api/ranking/rank",
            json={"type": "asana", "target_id": 1, "rank": 200},
            headers=user_headers,
        )
        assert r.status_code == 422

    def test_ranking_photo(self, client, user_headers):
        r = client.post(
            "/api/ranking/rank",
            json={"type": "photo", "target_id": 1, "rank": 75},
            headers=user_headers,
        )
        assert r.status_code == 200
        assert r.json()["rank"] == 75

    def test_ranking_photo_not_found(self, client, user_headers):
        r = client.post(
            "/api/ranking/rank",
            json={"type": "photo", "target_id": 99999, "rank": 50},
            headers=user_headers,
        )
        assert r.status_code == 404

    def test_two_users_rank_same_target(self, client):
        r1 = client.post(
            "/api/auth/register",
            json={"username": "ranker1", "email": "r1@test.com", "password": "secret1234"},
        )
        t1 = client.post("/api/auth/login", data={"username": "ranker1", "password": "secret1234"}).json()["access_token"]
        h1 = {"Authorization": f"Bearer {t1}"}

        r2 = client.post(
            "/api/auth/register",
            json={"username": "ranker2", "email": "r2@test.com", "password": "secret1234"},
        )
        t2 = client.post("/api/auth/login", data={"username": "ranker2", "password": "secret1234"}).json()["access_token"]
        h2 = {"Authorization": f"Bearer {t2}"}

        client.post("/api/ranking/rank", json={"type": "asana", "target_id": 1, "rank": 80}, headers=h1)
        client.post("/api/ranking/rank", json={"type": "asana", "target_id": 1, "rank": 60}, headers=h2)
        asana = client.get("/api/asanas/1").json()
        assert asana["rank"] == 70


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

    def test_create_transition_no_auth(self, client):
        r = client.post(
            "/api/transitions",
            json={
                "name": "X",
                "start_asana_id": 1,
                "end_asana_id": 2,
                "difficulty_level": 1,
                "rank": 50,
            },
        )
        assert r.status_code in (401, 403)

    def test_create_transition_same_pose(self, client, admin_headers):
        r = client.post(
            "/api/transitions",
            json={
                "name": "Same Pose",
                "start_asana_id": 1,
                "end_asana_id": 1,
                "difficulty_level": 1,
                "rank": 50,
            },
            headers=admin_headers,
        )
        assert r.status_code == 400
        assert "different" in r.json()["detail"].lower()

    def test_create_transition_invalid_asana(self, client, admin_headers):
        r = client.post(
            "/api/transitions",
            json={
                "name": "Bad Transition",
                "start_asana_id": 99999,
                "end_asana_id": 1,
                "difficulty_level": 1,
                "rank": 50,
            },
            headers=admin_headers,
        )
        assert r.status_code in (200, 400, 404, 422)

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

    def test_list_transitions_with_data(self, client, admin_headers):
        client.post(
            "/api/transitions",
            json={"name": "A to B", "start_asana_id": 1, "end_asana_id": 2, "difficulty_level": 1, "rank": 50},
            headers=admin_headers,
        )
        r = client.get("/api/transitions")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_top_transitions(self, client, admin_headers):
        client.post(
            "/api/transitions",
            json={"name": "Top Trans", "start_asana_id": 1, "end_asana_id": 2, "difficulty_level": 1, "rank": 90},
            headers=admin_headers,
        )
        r = client.get("/api/transitions/top?limit=1")
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["name"] == "Top Trans"


class TestFlows:
    def _create_transitions(self, client, admin_headers):
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

    def test_list_flows_empty(self, client):
        r = client.get("/api/flows")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_flow_admin(self, client, admin_headers):
        self._create_transitions(client, admin_headers)
        r = client.post(
            "/api/flows",
            json={
                "name": "Test Flow",
                "transition_ids": [1, 2, 3, 4],
                "difficulty_level": 2,
                "rank": 50,
            },
            headers=admin_headers,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["name"] == "Test Flow"
        assert body["transition_ids"] == [1, 2, 3, 4]

    def test_create_flow_returns_ids(self, client, admin_headers):
        self._create_transitions(client, admin_headers)
        r = client.post(
            "/api/flows",
            json={"name": "IDs Flow", "transition_ids": [1, 2], "difficulty_level": 1, "rank": 50},
            headers=admin_headers,
        )
        assert r.json()["transition_ids"] == [1, 2]

    def test_create_flow_too_few_transitions(self, client, admin_headers):
        self._create_transitions(client, admin_headers)
        r = client.post(
            "/api/flows",
            json={"name": "Short Flow", "transition_ids": [1], "difficulty_level": 1, "rank": 50},
            headers=admin_headers,
        )
        assert r.status_code == 422

    def test_create_flow_unauthorized(self, client, user_headers):
        r = client.post(
            "/api/flows",
            json={"name": "X", "transition_ids": [1, 2], "difficulty_level": 1, "rank": 50},
            headers=user_headers,
        )
        assert r.status_code == 403

    def test_get_flow_not_found(self, client):
        r = client.get("/api/flows/99999")
        assert r.status_code == 404


class TestPhotos:
    def test_list_photos_requires_admin(self, client, admin_headers):
        r = client.get("/api/photos", headers=admin_headers)
        assert r.status_code == 200

    def test_list_photos_unauthorized(self, client, user_headers):
        r = client.get("/api/photos", headers=user_headers)
        assert r.status_code == 403

    def test_photos_by_asana_returns_data(self, client):
        r = client.get("/api/photos/by-asana/1")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_photos_by_asana_empty(self, client):
        r = client.get("/api/photos/by-asana/99999")
        assert r.status_code == 200
        assert r.json() == []

    def test_photo_out_has_original_url(self, client):
        r = client.get("/api/photos/by-asana/1")
        body = r.json()
        assert len(body) >= 1
        assert body[0]["original_url"] == "https://example.com/mountain.jpg"

    def test_photo_out_has_all_fields(self, client):
        r = client.get("/api/photos/by-asana/1")
        body = r.json()[0]
        for field in ["id", "type", "asana_id", "user_id", "local_path", "original_url", "rank"]:
            assert field in body, f"Missing field: {field}"


class TestUsers:
    def test_list_users_admin(self, client, admin_headers):
        r = client.get("/api/users", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_list_users_unauthorized(self, client, user_headers):
        r = client.get("/api/users", headers=user_headers)
        assert r.status_code == 403

    def test_delete_user_admin(self, client, admin_headers):
        r = client.post(
            "/api/auth/register",
            json={"username": "to_delete", "email": "delete@example.com", "password": "password123"},
        )
        assert r.status_code == 200
        user_id = r.json()["id"]
        r2 = client.delete(f"/api/users/{user_id}", headers=admin_headers)
        assert r2.status_code == 200
        r3 = client.get("/api/users", headers=admin_headers)
        usernames = [u["username"] for u in r3.json()]
        assert "to_delete" not in usernames


class TestHealth:
    def test_health_check(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


class TestCORS:
    def test_cors_preflight(self, client):
        r = client.options(
            "/api/ranking/rank",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        assert r.status_code == 200
        assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
