# agentic_ai_service/websocket_manager.py
from __future__ import annotations

from typing import Set

from fastapi import WebSocket, WebSocketDisconnect


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict) -> None:
        dead = []
        for ws in list(self.active_connections):
            try:
                await ws.send_json(message)
            except WebSocketDisconnect:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)
