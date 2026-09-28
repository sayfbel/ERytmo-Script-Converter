"""
Automated Test Suite for P2P Collaboration & Transfer Authorization Protocol
Tests:
1. Staff creation and editing with granular access_level ('full_access' vs 'spectator')
2. Enforce spectator download rejection (403 Forbidden)
3. Full access transfer request requiring owner approval prompt
4. Auto-accept toggle verification and peer-isolated approval bypass (no leaks)
5. WebSocket signaling message handling (TRANSFER_REQUEST, TRANSFER_RESPONSE, auto-approval persistence)
"""

import sys
import os
import asyncio
import json
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.main import app
from backend.models import models
from backend.database.database import get_db, Base
from backend.services.auth_service import create_access_token, hash_password
from backend.routes.p2p_signaling import manager

client = TestClient(app)

def create_test_user(db, email, password="Password123!", first_name="Test", last_name="User"):
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        return existing
    user = models.User(
        email=email,
        password_hash=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        email_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_auth_headers(user):
    token = create_access_token(data={"sub": user.id, "email": user.email})
    return {"Authorization": f"Bearer {token}"}

def test_p2p_authorization_workflow():
    db = next(get_db())
    
    # 1. Setup Users
    owner = create_test_user(db, "owner_p2p@example.com", first_name="Owner", last_name="Alice")
    spectator = create_test_user(db, "spectator_p2p@example.com", first_name="Spectator", last_name="Bob")
    full_user = create_test_user(db, "full_p2p@example.com", first_name="FullAccess", last_name="Charlie")
    
    owner_headers = get_auth_headers(owner)
    spectator_headers = get_auth_headers(spectator)
    full_headers = get_auth_headers(full_user)

    # Clean existing test staff for clean state
    db.query(models.Staff).filter(models.Staff.user_id == owner.id).delete()
    db.commit()

    print("\n--- TEST 1: Staff Creation with Granular Access Levels ---")
    # Owner adds Spectator Bob
    res_b = client.post("/api/staff", json={
        "name": "Spectator Bob",
        "email": spectator.email,
        "role": "Adaptateur",
        "access_level": "spectator",
        "auto_accept_transfers": False
    }, headers=owner_headers)
    assert res_b.status_code == 200, f"Failed to create spectator staff: {res_b.text}"
    data_b = res_b.json()
    assert data_b["access_level"] == "spectator"
    assert data_b["auto_accept_transfers"] is False
    staff_b_id = data_b["id"]

    # Owner adds Full Access Charlie
    res_c = client.post("/api/staff", json={
        "name": "Full Access Charlie",
        "email": full_user.email,
        "role": "Comédien",
        "access_level": "full_access",
        "auto_accept_transfers": False
    }, headers=owner_headers)
    assert res_c.status_code == 200, f"Failed to create full_access staff: {res_c.text}"
    data_c = res_c.json()
    assert data_c["access_level"] == "full_access"
    assert data_c["auto_accept_transfers"] is False
    staff_c_id = data_c["id"]
    print("PASS: Staff records created with proper access_level.")

    print("\n--- TEST 2: Staff Editing & Validation ---")
    # Update spectator Bob's role but keep spectator
    res_edit = client.put(f"/api/staff/{staff_b_id}", json={
        "name": "Spectator Bob Updated",
        "role": "Directeur artistique",
        "access_level": "spectator",
        "auto_accept_transfers": False
    }, headers=owner_headers)
    assert res_edit.status_code == 200
    assert res_edit.json()["name"] == "Spectator Bob Updated"
    assert res_edit.json()["access_level"] == "spectator"
    print("PASS: Staff editing preserves access_level correctly.")

    print("\n--- TEST 3: Spectator Download Request Rejected (403 Forbidden) ---")
    # Spectator Bob attempts preflight transfer authorization
    res_spec_dl = client.post("/p2p/authorize-transfer", json={
        "owner_id": owner.id,
        "file_name": "ep1_master.mov",
        "file_size": "2.4 GB"
    }, headers=spectator_headers)
    assert res_spec_dl.status_code == 403, f"Expected 403 Forbidden for spectator, got: {res_spec_dl.status_code}"
    assert "Spectators are not permitted to download" in res_spec_dl.json()["detail"]
    print("PASS: Spectator download strictly rejected with 403 Forbidden.")

    print("\n--- TEST 4: Full Access Download Request Requires Approval ---")
    # Full Access Charlie attempts transfer authorization
    res_full_dl = client.post("/p2p/authorize-transfer", json={
        "owner_id": owner.id,
        "file_name": "ep1_master.mov",
        "file_size": "2.4 GB"
    }, headers=full_headers)
    assert res_full_dl.status_code == 200
    full_dl_data = res_full_dl.json()
    assert full_dl_data["status"] == "pending_owner_approval"
    assert full_dl_data["requires_prompt"] is True
    assert full_dl_data["auto_approved"] is False
    print("PASS: Full access transfer triggers owner confirmation prompt.")

    print("\n--- TEST 5: Auto-Accept Toggle & Peer Data Isolation ---")
    # Toggle auto-accept for Full Access Charlie
    res_toggle = client.patch(f"/api/staff/{staff_c_id}/auto-accept", json={
        "auto_accept": True
    }, headers=owner_headers)
    assert res_toggle.status_code == 200
    assert res_toggle.json()["auto_accept_transfers"] is True

    # Now Full Access Charlie requests transfer -> Should be auto-approved!
    res_auto_dl = client.post("/p2p/authorize-transfer", json={
        "owner_id": owner.id,
        "file_name": "ep1_master.mov",
        "file_size": "2.4 GB"
    }, headers=full_headers)
    assert res_auto_dl.status_code == 200
    auto_data = res_auto_dl.json()
    assert auto_data["status"] == "auto_approved"
    assert auto_data["requires_prompt"] is False
    assert auto_data["auto_approved"] is True

    # Critical Isolation Check: Verify Spectator Bob is STILL rejected (NO LEAK)
    res_spec_check = client.post("/p2p/authorize-transfer", json={
        "owner_id": owner.id,
        "file_name": "ep1_master.mov",
        "file_size": "2.4 GB"
    }, headers=spectator_headers)
    assert res_spec_check.status_code == 403
    print("PASS: Auto-accept bypass works for approved peer only; Spectator Bob remains strictly restricted.")

    print("\n--- TEST 6: WebSocket Signaling & Consent Protocol (Async) ---")
    
    class MockWebSocket:
        def __init__(self):
            self.sent_messages = []
        async def send_text(self, text: str):
            self.sent_messages.append(json.loads(text))
        async def receive_text(self):
            return ""
        async def close(self, code=1000, reason=""):
            pass

    async def run_signaling_tests():
        owner_ws = MockWebSocket()
        requester_ws = MockWebSocket()
        spec_ws = MockWebSocket()

        # Connect sockets to signaling hub
        await manager.connect(owner_ws, owner.id, owner.email)
        await manager.connect(requester_ws, full_user.id, full_user.email)
        await manager.connect(spec_ws, spectator.id, spectator.email)

        assert manager.is_user_online(owner.id) is True
        assert manager.is_user_online(full_user.id) is True
        assert manager.is_user_online(spectator.id) is True
        print("PASS: WebSocket connection registry tracks live peer presence ([ONLINE]).")

        from backend.routes.p2p_signaling import handle_transfer_request, handle_transfer_response

        # 6a. Spectator attempts transfer over WebSocket -> strictly rejected with 403 error
        await handle_transfer_request({
            "type": "TRANSFER_REQUEST",
            "to_user_id": owner.id,
            "file_name": "master_video.mp4",
            "file_size": "1.2 GB"
        }, spectator, spec_ws)

        spec_err = next((m for m in spec_ws.sent_messages if m.get("type") == "TRANSFER_ERROR"), None)
        assert spec_err is not None
        assert spec_err["code"] == 403
        assert "Spectators are not permitted" in spec_err["detail"]
        print("PASS: Spectator transfer over WebSocket strictly rejected with 403 Forbidden.")

        # 6b. Full Access User requests file (auto_accept is currently False) -> Prompts owner modal
        db.query(models.Staff).filter(models.Staff.id == staff_c_id).update({"auto_accept_transfers": False})
        db.commit()

        await handle_transfer_request({
            "type": "TRANSFER_REQUEST",
            "to_user_id": owner.id,
            "file_name": "voiceover_stem.wav",
            "file_size": "450 MB",
            "request_id": "req-12345"
        }, full_user, requester_ws)

        owner_prompt = next((m for m in owner_ws.sent_messages if m.get("type") == "INCOMING_TRANSFER_REQUEST"), None)
        assert owner_prompt is not None
        assert owner_prompt["request_id"] == "req-12345"
        assert owner_prompt["from_user_id"] == full_user.id
        assert owner_prompt["file_name"] == "voiceover_stem.wav"
        print("PASS: Owner received incoming transfer request modal prompt.")

        # 6c. Decline Flow: Owner clicks [Decline]
        await handle_transfer_response({
            "type": "TRANSFER_RESPONSE",
            "to_user_id": full_user.id,
            "request_id": "req-12345",
            "status": "declined"
        }, owner, owner_ws)

        decline_resp = next((m for m in requester_ws.sent_messages if m.get("type") == "TRANSFER_RESPONSE" and m.get("status") == "declined"), None)
        assert decline_resp is not None
        assert decline_resp["request_id"] == "req-12345"
        print("PASS: Owner decline response propagated back to requester without opening data channel.")

        # 6d. Accept Flow with remember_preference = True
        await handle_transfer_request({
            "type": "TRANSFER_REQUEST",
            "to_user_id": owner.id,
            "file_name": "subtitles.srt",
            "file_size": "15 KB",
            "request_id": "req-67890"
        }, full_user, requester_ws)

        await handle_transfer_response({
            "type": "TRANSFER_RESPONSE",
            "to_user_id": full_user.id,
            "request_id": "req-67890",
            "status": "accepted",
            "remember_preference": True
        }, owner, owner_ws)

        accept_resp = next((m for m in requester_ws.sent_messages if m.get("type") == "TRANSFER_RESPONSE" and m.get("request_id") == "req-67890"), None)
        assert accept_resp is not None
        assert accept_resp["status"] == "accepted"

        # Verify DB auto_accept_transfers was persisted
        db.commit()
        db_staff_record = db.query(models.Staff).filter(models.Staff.id == staff_c_id).first()
        assert db_staff_record.auto_accept_transfers is True
        print("PASS: Transfer accepted and remember_preference persisted to database.")

        # 6e. Subsequent request from Full Access Charlie is now auto-approved without prompting owner
        owner_ws.sent_messages.clear()
        requester_ws.sent_messages.clear()

        await handle_transfer_request({
            "type": "TRANSFER_REQUEST",
            "to_user_id": owner.id,
            "file_name": "quick_take.wav",
            "file_size": "20 MB",
            "request_id": "req-auto-stream"
        }, full_user, requester_ws)

        # Owner should NOT receive any modal prompt!
        owner_new_prompts = [m for m in owner_ws.sent_messages if m.get("type") == "INCOMING_TRANSFER_REQUEST"]
        assert len(owner_new_prompts) == 0

        # Requester immediately receives accepted with auto_approved=True
        auto_resp = next((m for m in requester_ws.sent_messages if m.get("type") == "TRANSFER_RESPONSE"), None)
        assert auto_resp is not None
        assert auto_resp["status"] == "accepted"
        assert auto_resp["auto_approved"] is True
        print("PASS: Subsequent transfers automatically approved without prompting owner.")

        # Disconnect cleanup
        await manager.disconnect(owner_ws)
        await manager.disconnect(requester_ws)
        await manager.disconnect(spec_ws)
        assert manager.is_user_online(owner.id) is False

    asyncio.run(run_signaling_tests())

    print("\n=======================================================")
    print("ALL P2P AUTHORIZATION & COLLABORATION TESTS PASSED! [OK]")
    print("=======================================================")

if __name__ == "__main__":
    test_p2p_authorization_workflow()
