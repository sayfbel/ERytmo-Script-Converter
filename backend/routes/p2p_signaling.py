import json
import asyncio
import uuid
import datetime
from typing import Dict, Set, Optional, Any
from pydantic import BaseModel
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from backend.database.database import get_db, SessionLocal
from backend.models import models
from backend.routes.auth import decode_access_token, get_current_user

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # user_id -> Set of active WebSockets
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # WebSocket -> user_id
        self.ws_to_user: Dict[WebSocket, int] = {}
        # WebSocket -> client_id
        self.ws_to_client_id: Dict[WebSocket, str] = {}
        # client_id -> WebSocket
        self.client_id_to_ws: Dict[str, WebSocket] = {}
        # Pending transfer requests: request_id -> dict
        self.pending_requests: Dict[str, dict] = {}
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: int, client_id: Optional[str] = None):
        cid = client_id or str(uuid.uuid4())
        async with self.lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            self.active_connections[user_id].add(websocket)
            self.ws_to_user[websocket] = user_id
            self.ws_to_client_id[websocket] = cid
            self.client_id_to_ws[cid] = websocket
            first_conn = len(self.active_connections[user_id]) == 1

        print(f"[P2P Signaling] User {user_id} (Client {cid}) connected (Total devices for user: {len(self.active_connections[user_id])})")
        
        # Broadcast presence to connected peers (without leaking email addresses)
        await self.broadcast_presence(user_id, "online")

    async def disconnect(self, websocket: WebSocket):
        user_id = None
        went_offline = False
        async with self.lock:
            user_id = self.ws_to_user.pop(websocket, None)
            cid = self.ws_to_client_id.pop(websocket, None)
            if cid:
                self.client_id_to_ws.pop(cid, None)
            if user_id and user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
                    went_offline = True

        if user_id:
            print(f"[P2P Signaling] User {user_id} socket disconnected")
            status_text = "offline" if went_offline else "online"
            await self.broadcast_presence(user_id, status_text)

    def is_user_online(self, user_id: int) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def get_user_device_count(self, user_id: int) -> int:
        return len(self.active_connections.get(user_id, set()))

    def get_online_user_ids(self) -> Set[int]:
        return set(self.active_connections.keys())

    async def broadcast_presence(self, user_id: int, status: str):
        count = self.get_user_device_count(user_id)
        message = {
            "type": "PRESENCE_UPDATE",
            "user_id": user_id,
            "status": status,
            "devices_count": count,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        await self.broadcast(message)

    async def broadcast(self, message: dict):
        text_data = json.dumps(message)
        dead_sockets = []
        async with self.lock:
            for uid, sockets in list(self.active_connections.items()):
                for ws in list(sockets):
                    try:
                        await ws.send_text(text_data)
                    except Exception as e:
                        print(f"[P2P Signaling] send error: {e}")
                        dead_sockets.append(ws)

        for ws in dead_sockets:
            await self.disconnect(ws)

    async def send_to_user(
        self, 
        user_id: int, 
        message: dict, 
        exclude_ws: Optional[WebSocket] = None, 
        target_client_id: Optional[str] = None
    ) -> bool:
        text_data = json.dumps(message)
        sent = False
        dead_sockets = []
        async with self.lock:
            if target_client_id and target_client_id in self.client_id_to_ws:
                ws = self.client_id_to_ws[target_client_id]
                try:
                    await ws.send_text(text_data)
                    return True
                except Exception:
                    dead_sockets.append(ws)
            else:
                sockets = self.active_connections.get(user_id, set()).copy()
                for ws in sockets:
                    if exclude_ws and ws == exclude_ws:
                        continue
                    try:
                        await ws.send_text(text_data)
                        sent = True
                    except Exception:
                        dead_sockets.append(ws)

        for ws in dead_sockets:
            await self.disconnect(ws)
        return sent

manager = ConnectionManager()


def get_user_from_ws(websocket: WebSocket, db: Session) -> Optional[models.User]:
    # 1. Cookie
    token = websocket.cookies.get("erytmo_token")
    # 2. Query param
    if not token:
        token = websocket.query_params.get("token")
    # 3. Header
    if not token:
        auth_hdr = websocket.headers.get("authorization")
        if auth_hdr and auth_hdr.startswith("Bearer "):
            token = auth_hdr.split(" ")[1].strip()

    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        return None

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        return None

    return db.query(models.User).filter(models.User.id == user_id).first()


@router.websocket("/ws/signaling")
async def p2p_signaling_websocket(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()

    # Authenticate initial connection
    user = get_user_from_ws(websocket, db)
    if not user:
        # Wait up to 3 seconds for initial AUTH message if cookies were not passed during handshake
        try:
            raw_msg = await asyncio.wait_for(websocket.receive_text(), timeout=3.0)
            data = json.loads(raw_msg)
            if data.get("type") == "AUTH" and data.get("token"):
                payload = decode_access_token(data["token"])
                if payload and payload.get("sub"):
                    user = db.query(models.User).filter(models.User.id == int(payload["sub"])).first()
        except Exception:
            pass

    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized")
        return

    cid = websocket.query_params.get("client_id") or str(uuid.uuid4())
    await manager.connect(websocket, user.id, client_id=cid)

    # Send initial welcome and online users list + devices count
    try:
        await websocket.send_text(json.dumps({
            "type": "INIT_STATE",
            "current_user_id": user.id,
            "client_id": cid,
            "user_id": user.id,
            "online_user_ids": list(manager.get_online_user_ids()),
            "devices_count": manager.get_user_device_count(user.id)
        }))
    except Exception:
        await manager.disconnect(websocket)
        return

    try:
        while True:
            raw_msg = await websocket.receive_text()
            if not raw_msg.strip():
                continue

            try:
                data = json.loads(raw_msg)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            # 1. PING -> PONG (Keep-Alive)
            if msg_type == "PING":
                await websocket.send_text(json.dumps({"type": "PONG"}))

            # 2. TRANSFER_REQUEST
            elif msg_type == "TRANSFER_REQUEST":
                await handle_transfer_request(data, user, websocket)

            # 3. TRANSFER_RESPONSE
            elif msg_type == "TRANSFER_RESPONSE":
                await handle_transfer_response(data, user, websocket)

            # 4. Peer-to-Peer messaging & data transfer passthrough (WebRTC signals & file chunks)
            elif data.get("to_user_id"):
                target_user_id = int(data.get("to_user_id"))
                target_client_id = data.get("to_client_id")
                data["from_user_id"] = user.id
                data["from_client_id"] = manager.ws_to_client_id.get(websocket)
                exclude = websocket if target_user_id == user.id else None
                await manager.send_to_user(target_user_id, data, exclude_ws=exclude, target_client_id=target_client_id)

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        print(f"[P2P Signaling] Error in socket loop: {e}")
        await manager.disconnect(websocket)


async def handle_transfer_request(data: dict, requester: models.User, ws: WebSocket):
    """
    Handles a download / transfer request from a collaborator or another device of the same user.
    """
    owner_id = data.get("to_user_id")
    target_file_id = data.get("target_file_id") or data.get("file_name", "unknown")
    file_name = data.get("file_name", "Unknown File")
    file_size = data.get("file_size", "Unknown Size")
    project_id = data.get("project_id")

    if not owner_id:
        await ws.send_text(json.dumps({
            "type": "TRANSFER_ERROR",
            "code": 400,
            "detail": "Target project owner not specified."
        }))
        return

    owner_id = int(owner_id)

    # Same-user self cross-device transfer (e.g. PC 1 to PC 2 with same account)
    if owner_id == requester.id:
        requester_cid = manager.ws_to_client_id.get(ws, "")
        other_devices = [s for s in manager.active_connections.get(requester.id, set()) if s != ws]
        if not other_devices:
            await ws.send_text(json.dumps({
                "type": "TRANSFER_ERROR",
                "file_name": file_name,
                "code": 404,
                "detail": "Your other PC is currently offline. Please open ERytmo on the other PC where the files are stored."
            }))
            return

        # Auto-accept since it's the SAME user account
        await ws.send_text(json.dumps({
            "type": "TRANSFER_RESPONSE",
            "status": "accepted",
            "target_file_id": target_file_id,
            "file_name": file_name,
            "from_user_id": owner_id,
            "auto_approved": True,
            "is_self_sync": True
        }))

        # Tell other device(s) of this user (PC 1) to stream the file data to this device (PC 2)!
        await manager.send_to_user(
            user_id=requester.id,
            message={
                "type": "SEND_FILE_DATA",
                "to_user_id": requester.id,
                "to_client_id": requester_cid,
                "file_name": file_name,
                "project_id": project_id,
                "is_self_sync": True
            },
            exclude_ws=ws
        )
        return

    # Check project and staff records in database
    with SessionLocal() as db:
        # Check if project exists
        project = None
        if project_id:
            project = db.query(models.Project).filter(models.Project.id == int(project_id)).first()

        # Check Staff record for requester under owner
        staff_entry = db.query(models.Staff).filter(
            models.Staff.user_id == owner_id,
            (models.Staff.staff_user_id == requester.id) | (models.Staff.email == requester.email)
        ).first()

        # If requester is spectator -> STRICT 403
        if staff_entry and staff_entry.access_level == "spectator":
            await ws.send_text(json.dumps({
                "type": "TRANSFER_ERROR",
                "code": 403,
                "detail": "Spectators are not permitted to download project files. Access is view-only."
            }))
            return

        # If auto_accept_transfers is enabled -> instant approval without prompting
        if staff_entry and staff_entry.auto_accept_transfers:
            await ws.send_text(json.dumps({
                "type": "TRANSFER_RESPONSE",
                "status": "accepted",
                "target_file_id": target_file_id,
                "file_name": file_name,
                "from_user_id": owner_id,
                "auto_approved": True
            }))
            # Instruct owner's client to stream the file data directly to requester
            await manager.send_to_user(owner_id, {
                "type": "SEND_FILE_DATA",
                "to_user_id": requester.id,
                "file_name": file_name,
                "project_id": project_id
            })
            return

        # Check if owner is online
        if not manager.is_user_online(owner_id):
            await ws.send_text(json.dumps({
                "type": "TRANSFER_ERROR",
                "code": 503,
                "detail": "Owner is currently offline. Files can only be downloaded when owner is connected."
            }))
            return

        # Prompt owner with incoming modal
        request_id = data.get("request_id") or str(uuid.uuid4())
        manager.pending_requests[request_id] = {
            "request_id": request_id,
            "requester_id": requester.id,
            "requester_name": f"{requester.first_name} {requester.last_name}".strip(),
            "requester_email": requester.email,
            "owner_id": owner_id,
            "file_name": file_name,
            "file_size": file_size,
            "target_file_id": target_file_id,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }

        # Send approval prompt to owner
        owner_notified = await manager.send_to_user(owner_id, {
            "type": "INCOMING_TRANSFER_REQUEST",
            "request_id": request_id,
            "from_user_id": requester.id,
            "requester_name": f"{requester.first_name} {requester.last_name}".strip(),
            "requester_email": requester.email,
            "file_name": file_name,
            "file_size": file_size,
            "target_file_id": target_file_id
        })

        if not owner_notified:
            await ws.send_text(json.dumps({
                "type": "TRANSFER_ERROR",
                "code": 503,
                "detail": "Failed to reach owner. Owner may have just disconnected."
            }))
        else:
            await ws.send_text(json.dumps({
                "type": "TRANSFER_PENDING",
                "request_id": request_id,
                "detail": "Waiting for owner approval..."
            }))


async def handle_transfer_response(data: dict, owner: models.User, ws: WebSocket):
    """
    Handles the owner's response (Accept / Decline) to an incoming transfer prompt.
    """
    request_id = data.get("request_id")
    target_requester_id = data.get("to_user_id")
    status_choice = data.get("status", "declined") # "accepted" | "declined"
    remember_preference = bool(data.get("remember_preference", False))

    req = manager.pending_requests.pop(request_id, None) if request_id else None
    requester_id = req["requester_id"] if req else (int(target_requester_id) if target_requester_id else None)

    if not requester_id:
        return

    # If remember_preference was checked, update DB
    if remember_preference and status_choice == "accepted":
        with SessionLocal() as db:
            from sqlalchemy import or_
            req_email = req.get("requester_email") if req else None
            staff_entry = db.query(models.Staff).filter(
                models.Staff.user_id == owner.id,
                or_(
                    models.Staff.staff_user_id == requester_id,
                    models.Staff.email == req_email
                )
            ).first()

            if not staff_entry and requester_id:
                req_user = db.query(models.User).filter(models.User.id == requester_id).first()
                if req_user and req_user.email:
                    staff_entry = db.query(models.Staff).filter(
                        models.Staff.user_id == owner.id,
                        models.Staff.email == req_user.email
                    ).first()

            if staff_entry:
                staff_entry.auto_accept_transfers = True
                if not staff_entry.staff_user_id and requester_id:
                    staff_entry.staff_user_id = requester_id
                db.commit()

    # Forward decision to requester
    await manager.send_to_user(requester_id, {
        "type": "TRANSFER_RESPONSE",
        "request_id": request_id,
        "status": status_choice,
        "file_name": req["file_name"] if req else data.get("file_name", ""),
        "target_file_id": req["target_file_id"] if req else data.get("target_file_id", ""),
        "from_user_id": owner.id
    })

    if status_choice == "accepted":
        # Instruct owner's client to stream the file data directly to requester
        await ws.send_text(json.dumps({
            "type": "SEND_FILE_DATA",
            "to_user_id": requester_id,
            "file_name": req["file_name"] if req else data.get("file_name", ""),
            "project_id": req.get("project_id") if req else None
        }))


# ==============================================================================
# HTTP Endpoints for Signaling, Presence, and Authorizations
# ==============================================================================

@router.get("/staff/online-status")
def get_online_status():
    """
    Returns active connection states for quick client synchronization on page load.
    """
    return {
        "online_user_ids": list(manager.get_online_user_ids())
    }


class TransferAuthorizeRequest(BaseModel):
    to_user_id: Optional[int] = None
    owner_id: Optional[int] = None
    file_name: Optional[str] = None
    file_size: Optional[str] = None
    project_id: Optional[int] = None


@router.post("/p2p/authorize-transfer")
async def authorize_transfer(
    request: Request,
    to_user_id: Optional[int] = None,
    owner_id: Optional[int] = None,
    file_name: Optional[str] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    requester: models.User = Depends(get_current_user)
):
    """
    Pre-flight authorization check for a P2P transfer request.
    """
    if not requester:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        body = await request.json()
    except Exception:
        body = {}

    target_owner_id = (
        body.get("to_user_id") or 
        body.get("owner_id") or 
        to_user_id or 
        owner_id
    )

    if not target_owner_id:
        raise HTTPException(status_code=400, detail="Target owner user id is required")

    target_owner_id = int(target_owner_id)

    if requester.id == target_owner_id:
        return {"status": "accepted", "auto_approved": True, "requires_prompt": False}

    staff_entry = db.query(models.Staff).filter(
        models.Staff.user_id == target_owner_id,
        (models.Staff.staff_user_id == requester.id) | (models.Staff.email == requester.email)
    ).first()

    if staff_entry and staff_entry.access_level == "spectator":
        raise HTTPException(
            status_code=403, 
            detail="Spectators are not permitted to download project files. Access is view-only."
        )

    is_online = manager.is_user_online(target_owner_id)
    auto_accept = bool(staff_entry and staff_entry.auto_accept_transfers)

    if auto_accept:
        return {
            "status": "auto_approved",
            "requires_prompt": False,
            "auto_approved": True,
            "access_level": staff_entry.access_level if staff_entry else "full_access",
            "owner_is_online": is_online
        }
    else:
        return {
            "status": "pending_owner_approval",
            "requires_prompt": True,
            "auto_approved": False,
            "access_level": staff_entry.access_level if staff_entry else "full_access",
            "owner_is_online": is_online
        }
