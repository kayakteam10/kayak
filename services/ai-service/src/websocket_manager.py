# agentic_ai_service/websocket_manager.py
"""
WebSocket Connection Manager

Manages WebSocket connections for real-time event broadcasting.
Supports:
- Watch triggers
- New deal notifications
- Bundle updates
- Chat messages
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Dict, List, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manage WebSocket connections and broadcast events.
    
    Features:
    - Connection lifecycle management
    - Room-based broadcasts (e.g., per-session)
    - Global broadcasts
    - Graceful disconnection
    """
    
    def __init__(self):
        # Global connections (all users)
        self.active_connections: List[WebSocket] = []
        
        # Room-based connections (session_id -> [WebSocket])
        self.rooms: Dict[str, Set[WebSocket]] = {}
        
        # Connection metadata (WebSocket -> {user_id, session_id})
        self.connection_meta: Dict[WebSocket, Dict] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str = None):
        """
        Accept and register a WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            session_id: Optional session ID for room-based messaging
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # Store metadata
        self.connection_meta[websocket] = {
            "session_id": session_id,
            "connected_at": asyncio.get_event_loop().time()
        }
        
        # Add to room if session_id provided
        if session_id:
            if session_id not in self.rooms:
                self.rooms[session_id] = set()
            self.rooms[session_id].add(websocket)
        
        logger.info(f"✅ WebSocket connected (session: {session_id}), total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """
        Remove and clean up a WebSocket connection.
        
        Args:
            websocket: WebSocket to disconnect
        """
        # Remove from active connections
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Remove from rooms
        meta = self.connection_meta.get(websocket, {})
        session_id = meta.get("session_id")
        
        if session_id and session_id in self.rooms:
            self.rooms[session_id].discard(websocket)
            if not self.rooms[session_id]:
                del self.rooms[session_id]
        
        # Remove metadata
        if websocket in self.connection_meta:
            del self.connection_meta[websocket]
        
        logger.info(f"❌ WebSocket disconnected (session: {session_id}), remaining: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """
        Send message to a specific WebSocket connection.
        
        Args:
            message: Message data (will be JSON encoded)
            websocket: Target WebSocket
        """
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: dict):
        """
        Broadcast message to all active connections.
        
        Args:
            message: Message data (will be JSON encoded)
        """
        dead_connections = []
        message_json = json.dumps(message)
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message_json)
            except Exception as e:
                logger.warning(f"Failed to broadcast to connection: {e}")
                dead_connections.append(connection)
        
        # Clean up dead connections
        for connection in dead_connections:
            self.disconnect(connection)
        
        logger.debug(f"📤 Broadcast to {len(self.active_connections)} connections")
    
    async def broadcast_to_room(self, room_id: str, message: dict):
        """
        Broadcast message to all connections in a specific room.
        
        Args:
            room_id: Room identifier (e.g., session_id)
            message: Message data (will be JSON encoded)
        """
        if room_id not in self.rooms:
            logger.warning(f"Room {room_id} has no active connections")
            return
        
        dead_connections = []
        message_json = json.dumps(message)
        
        for connection in self.rooms[room_id]:
            try:
                await connection.send_text(message_json)
            except Exception as e:
                logger.warning(f"Failed to send to room {room_id}: {e}")
                dead_connections.append(connection)
        
        # Clean up dead connections
        for connection in dead_connections:
            self.disconnect(connection)
        
        logger.debug(f"📤 Broadcast to room '{room_id}': {len(self.rooms.get(room_id, []))} connections")
    
    async def notify_deal_event(self, deal_type: str, deal_id: int, deal_score: int, tags: List[str]):
        """
        Broadcast a new deal event.
        
        Args:
            deal_type: "flight" or "hotel"
            deal_id: Deal ID
            deal_score: Deal quality score (0-100)
            tags: Deal tags
        """
        message = {
            "type": "deal.new",
            "data": {
                "deal_type": deal_type,
                "deal_id": deal_id,
                "deal_score": deal_score,
                "tags": tags
            }
        }
        await self.broadcast(message)
    
    async def notify_watch_triggered(self, watch_id: int, bundle_id: int, reasons: List[str], session_id: str = None):
        """
        Notify about triggered watch.
        
        Args:
            watch_id: Watch ID
            bundle_id: Bundle ID
            reasons: List of trigger reasons
            session_id: Optional session to target
        """
        message = {
            "type": "watch.triggered",
            "data": {
                "watch_id": watch_id,
                "bundle_id": bundle_id,
                "reasons": reasons
            }
        }
        
        if session_id and session_id in self.rooms:
            await self.broadcast_to_room(session_id, message)
        else:
            await self.broadcast(message)
    
    async def notify_bundle_update(self, bundle_id: int, price_change: float, session_id: str = None):
        """
        Notify about bundle price change.
        
        Args:
            bundle_id: Bundle ID
            price_change: Price difference (negative = cheaper)
            session_id: Optional session to target
        """
        message = {
            "type": "bundle.updated",
            "data": {
                "bundle_id": bundle_id,
                "price_change": price_change,
                "cheaper": price_change < 0
            }
        }
        
        if session_id and session_id in self.rooms:
            await self.broadcast_to_room(session_id, message)
        else:
            await self.broadcast(message)
    
    def get_stats(self) -> dict:
        """Get connection statistics"""
        return {
            "total_connections": len(self.active_connections),
            "total_rooms": len(self.rooms),
            "connections_per_room": {
                room_id: len(conns) for room_id, conns in self.rooms.items()
            }
        }
