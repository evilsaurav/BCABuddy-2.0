import asyncio
import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from socket_manager import manager
from auth_utils import get_current_user_ws

router = APIRouter()

# Dummy question set for MVP Battle
BATTLE_QUESTIONS = [
    {
        "question": "What does CPU stand for?",
        "options": ["Central Process Unit", "Computer Personal Unit", "Central Processing Unit", "Central Processor Unit"],
        "correct_answer": "Central Processing Unit"
    },
    {
        "question": "Which of the following is an OS?",
        "options": ["Intel", "Linux", "Python", "HTML"],
        "correct_answer": "Linux"
    },
    {
        "question": "What is the time complexity of binary search?",
        "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
        "correct_answer": "O(log n)"
    }
]

async def start_game(game_id: str):
    await asyncio.sleep(2)
    game = manager.active_games[game_id]
    
    # Notify players game is starting
    await manager.broadcast_to_game(game_id, {
        "type": "game_start",
        "message": "Opponent found! Battle begins..."
    })
    
    await asyncio.sleep(2)
    
    for idx, q in enumerate(BATTLE_QUESTIONS):
        await manager.broadcast_to_game(game_id, {
            "type": "question",
            "question": q["question"],
            "options": q["options"],
            "question_index": idx
        })
        
        # Wait for 10 seconds or until both answer
        await asyncio.sleep(10)
        
        # In a real system, we'd break early if both answered, but for MVP we wait 10s.
        await manager.broadcast_to_game(game_id, {
            "type": "question_result",
            "correct_answer": q["correct_answer"],
            "scores": game["scores"]
        })
        await asyncio.sleep(3)
        
    # Game Over
    winner = max(game["scores"], key=game["scores"].get)
    await manager.broadcast_to_game(game_id, {
        "type": "game_over",
        "winner": winner,
        "final_scores": game["scores"]
    })
    
    del manager.active_games[game_id]


@router.websocket("/ws/battle")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user = await get_current_user_ws(token)
    if not user:
        await websocket.close(code=1008)
        return
        
    username = user.username
    await manager.connect(websocket, username)
    
    try:
        # Matchmaking logic
        if manager.matchmaking_queue:
            opponent = manager.matchmaking_queue.pop(0)
            if opponent != username:
                game_id = str(uuid.uuid4())
                manager.active_games[game_id] = {
                    "players": [username, opponent],
                    "scores": {username: 0, opponent: 0}
                }
                
                # Notify players
                await manager.send_personal_message({"type": "matched", "opponent": opponent, "game_id": game_id}, username)
                await manager.send_personal_message({"type": "matched", "opponent": username, "game_id": game_id}, opponent)
                
                # Start game loop in background
                asyncio.create_task(start_game(game_id))
            else:
                manager.matchmaking_queue.append(username)
                await manager.send_personal_message({"type": "waiting", "message": "Waiting for opponent..."}, username)
        else:
            manager.matchmaking_queue.append(username)
            await manager.send_personal_message({"type": "waiting", "message": "Waiting for opponent..."}, username)
            
        # Message loop
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            if payload.get("type") == "answer":
                game_id = payload.get("game_id")
                question_idx = payload.get("question_index")
                answer = payload.get("answer")
                
                if game_id in manager.active_games:
                    game = manager.active_games[game_id]
                    correct = BATTLE_QUESTIONS[question_idx]["correct_answer"]
                    if answer == correct:
                        game["scores"][username] += 10
                        await manager.broadcast_to_game(game_id, {
                            "type": "score_update",
                            "scores": game["scores"]
                        })

    except WebSocketDisconnect:
        manager.disconnect(username)
