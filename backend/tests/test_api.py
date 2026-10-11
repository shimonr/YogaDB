from pathlib import Path

from app.models import Asana, Photo
from app.services.photo_storage import UPLOAD_ROOT
from tests.conftest import TestingSessionLocal


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


    def test_register_password_over_72_bytes_rejected(self, client):
        r = client.post(
            "/api/auth/register",
            json={"username": "longpw", "email": "longpw@example.com", "password": "é" * 37},
        )
        assert r.status_code == 422

    def test_login_password_over_72_bytes_fails_cleanly(self, client):
        r = client.post("/api/auth/login", data={"username": "nobody", "password": "a" * 100})
        assert r.status_code == 400


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

    def test_search_treats_wildcards_literally(self, client, admin_headers):
        payload = {
            "english_name": "Half_Moon", "sanskrit_name": "Ardha Chandrasana", "difficulty_level": 3,
            "benefits": "Balance", "is_classic": True, "type": "standing", "category": "balance",
        }
        assert client.post("/api/asanas", json=payload, headers=admin_headers).status_code == 200
        names = [a["english_name"] for a in client.get("/api/asanas", params={"q": "Half_Moon"}).json()]
        assert names == ["Half_Moon"]
        assert client.get("/api/asanas", params={"q": "%"}).json() == []

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
        client.post(
            "/api/auth/register",
            json={"username": "ranker1", "email": "r1@test.com", "password": "secret1234"},
        )
        t1 = client.post("/api/auth/login", data={"username": "ranker1", "password": "secret1234"}).json()["access_token"]
        h1 = {"Authorization": f"Bearer {t1}"}

        client.post(
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
        assert r.status_code == 400

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

    def test_create_flow_unknown_transition(self, client, admin_headers):
        self._create_transitions(client, admin_headers)
        r = client.post(
            "/api/flows",
            json={"name": "Ghost Flow", "transition_ids": [1, 999], "difficulty_level": 1, "rank": 50},
            headers=admin_headers,
        )
        assert r.status_code == 400

    def test_search_flows_treats_underscore_literally(self, client, admin_headers):
        self._create_transitions(client, admin_headers)
        client.post(
            "/api/flows",
            json={"name": "Morning Flow", "transition_ids": [1, 2], "difficulty_level": 1, "rank": 50},
            headers=admin_headers,
        )
        assert client.get("/api/flows", params={"q": "_"}).json() == []

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
        for field in ["id", "type", "asana_id", "user_id", "original_url", "rank"]:
            assert field in body, f"Missing field: {field}"


    JPEG = b"\xff\xd8\xff\xe0" + b"0" * 32

    def test_upload_rank_must_be_in_range(self, client, user_headers):
        r = client.post(
            "/api/photos/upload",
            data={"asana_id": "1", "rank": "99999"},
            files={"file": ("pose.jpg", self.JPEG, "image/jpeg")},
            headers=user_headers,
        )
        assert r.status_code == 422

    def test_upload_is_served_and_deleted_with_record(self, client, user_headers, admin_headers):
        r = client.post(
            "/api/photos/upload",
            data={"asana_id": "1"},
            files={"file": ("pose.jpg", self.JPEG, "image/jpeg")},
            headers=user_headers,
        )
        assert r.status_code == 201
        photo_id = r.json()["id"]
        db = TestingSessionLocal()
        stored = db.get(Photo, photo_id).local_path
        db.close()
        assert not Path(stored).is_absolute()
        path = UPLOAD_ROOT.parent / stored
        try:
            assert client.get(f"/api/photos/{photo_id}/file").content == self.JPEG
            assert client.delete(f"/api/photos/{photo_id}", headers=admin_headers).status_code == 200
            assert not path.exists()
        finally:
            path.unlink(missing_ok=True)

    def test_deleting_imported_photo_keeps_source_file(self, client, admin_headers, images_dir):
        source = images_dir / "Tree_Pose" / "Tree_Pose_01.jpg"
        source.parent.mkdir()
        source.write_bytes(self.JPEG)
        r = client.post(
            "/api/photos/create",
            json={"type": "download", "asana_id": 2, "local_path": "Tree_Pose/Tree_Pose_01.jpg"},
            headers=admin_headers,
        )
        assert r.status_code == 201
        photo_id = r.json()["id"]
        assert client.get(f"/api/photos/{photo_id}/file").content == self.JPEG
        assert client.delete(f"/api/photos/{photo_id}", headers=admin_headers).status_code == 200
        assert source.is_file()

    def test_create_photo_rejects_path_outside_photo_folders(self, client, admin_headers):
        r = client.post(
            "/api/photos/create",
            json={"type": "download", "asana_id": 1, "local_path": "/etc/passwd"},
            headers=admin_headers,
        )
        assert r.status_code == 400


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


    def test_delete_user_with_rankings_recomputes_average(self, client, admin_headers, user_headers):
        client.post("/api/ranking/rank", json={"type": "asana", "target_id": 1, "rank": 90}, headers=admin_headers)
        client.post("/api/ranking/rank", json={"type": "asana", "target_id": 1, "rank": 10}, headers=user_headers)
        assert client.get("/api/asanas/1").json()["rank"] == 50
        users = {u["username"]: u["id"] for u in client.get("/api/users", headers=admin_headers).json()}
        r = client.delete(f"/api/users/{users['regular_user']}", headers=admin_headers)
        assert r.status_code == 200
        assert client.get("/api/asanas/1").json()["rank"] == 90

    def test_admin_cannot_delete_self(self, client, admin_headers):
        users = {u["username"]: u["id"] for u in client.get("/api/users", headers=admin_headers).json()}
        r = client.delete(f"/api/users/{users['admin_user']}", headers=admin_headers)
        assert r.status_code == 400


class TestAdminDatabase:
    def test_list_tables(self, client, admin_headers):
        r = client.get("/api/admin/tables", headers=admin_headers)
        assert r.status_code == 200
        assert {"asanas", "users", "photos"} <= set(r.json())

    def test_browse_unknown_table(self, client, admin_headers):
        r = client.get("/api/admin/table/nope", headers=admin_headers)
        assert r.status_code == 404

    def test_select_with_created_at_column(self, client, admin_headers):
        r = client.post("/api/admin/query", json={"sql": "SELECT username, created_at FROM users"}, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["count"] >= 1

    def test_query_cannot_write(self, client, admin_headers):
        r = client.post(
            "/api/admin/query",
            json={"sql": "WITH x AS (SELECT 1) DELETE FROM asanas"},
            headers=admin_headers,
        )
        assert r.status_code == 400
        assert len(client.get("/api/asanas").json()) == 2
        # The read-only switch must not leak into later requests on the same connection.
        r = client.post("/api/ranking/rank", json={"type": "asana", "target_id": 1, "rank": 70}, headers=admin_headers)
        assert r.status_code == 200

    def test_multiple_statements_rejected(self, client, admin_headers):
        r = client.post("/api/admin/query", json={"sql": "SELECT 1; DROP TABLE users"}, headers=admin_headers)
        assert r.status_code == 400


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


class TestAsanaImport:
    def test_reimport_updates_asanas_replaces_imported_photos_keeps_uploads(self):
        from app.services.asana_import import upsert_asanas

        row = {
            "sanskrit_name": "S", "alternative_name_1": None, "alternative_name_2": None,
            "difficulty_level": 2, "benefits": "", "is_classic": True, "type": "standing", "category": "focus",
        }
        db = TestingSessionLocal()
        db.add(Photo(type="upload", asana_id=1, user_id=None, local_path="uploads/asanas/1/u.jpg", rank=50))
        db.commit()
        upsert_asanas(db, [
            {**row, "id": 1, "english_name": "Mountain Pose v2", "photos": [{"local_path": "Mountain_Pose/a.jpg"}]},
            {**row, "id": 3, "english_name": "Brand New Pose", "photos": []},
        ])
        db.commit()
        assert db.get(Asana, 1).english_name == "Mountain Pose v2"
        assert db.get(Asana, 3).english_name == "Brand New Pose"
        paths = sorted(p.local_path for p in db.query(Photo).filter(Photo.asana_id == 1))
        assert paths == ["Mountain_Pose/a.jpg", "uploads/asanas/1/u.jpg"]
        db.close()
