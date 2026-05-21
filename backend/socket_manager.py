import asyncio
import json
from typing import Dict, List, Any
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps username to WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # Queue for matchmaking (usernames)
        self.matchmaking_queue: List[str] = []
        # Active games: game_id -> { players: {username: score}, questions: [] }
        self.active_games: Dict[str, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections[username] = websocket

    def disconnect(self, username: str):
        if username in self.active_connections:
            del self.active_connections[username]
        if username in self.matchmaking_queue:
            self.matchmaking_queue.remove(username)

    async def send_personal_message(self, message: dict, username: str):
        websocket = self.active_connections.get(username)
        if websocket:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception:
                self.disconnect(username)

    async def broadcast_to_game(self, game_id: str, message: dict):
        game = self.active_games.get(game_id)
        if not game:
            return
        for player in game["players"]:
            await self.send_personal_message(message, player)

manager = ConnectionManager()
