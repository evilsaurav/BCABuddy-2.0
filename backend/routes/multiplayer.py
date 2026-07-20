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
    player1, player2 = list(game["scores"].keys())
    score1, score2 = game["scores"][player1], game["scores"][player2]
    
    # Elo Logic
    from database import SessionLocal, User
    db = SessionLocal()
    elo_changes = {player1: 0, player2: 0}
    try:
        u1 = db.query(User).filter(User.username == player1).first()
        u2 = db.query(User).filter(User.username == player2).first()
        
        if u1 and u2:
            r1 = float(getattr(u1, "elo_rating", 1000) or 1000)
            r2 = float(getattr(u2, "elo_rating", 1000) or 1000)
            
            # Expected scores
            e1 = 1 / (1 + 10 ** ((r2 - r1) / 400))
            e2 = 1 / (1 + 10 ** ((r1 - r2) / 400))
            
            # Actual scores (1 for win, 0.5 for draw, 0 for loss)
            s1 = 1 if score1 > score2 else (0.5 if score1 == score2 else 0)
            s2 = 1 if score2 > score1 else (0.5 if score1 == score2 else 0)
            
            # K-factor
            K = 32
            
            new_r1 = r1 + K * (s1 - e1)
            new_r2 = r2 + K * (s2 - e2)
            
            elo_changes[player1] = int(round(new_r1 - r1))
            elo_changes[player2] = int(round(new_r2 - r2))
            
            u1.elo_rating = int(round(new_r1)) # type: ignore
            u2.elo_rating = int(round(new_r2)) # type: ignore
            db.commit()
    except Exception as e:
        print(f"Error updating ELO: {e}")
    finally:
        db.close()
        
    winner = player1 if score1 > score2 else (player2 if score2 > score1 else "Draw")
    await manager.broadcast_to_game(game_id, {
        "type": "game_over",
        "winner": winner,
        "final_scores": game["scores"],
        "elo_changes": elo_changes
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
        # Message loop
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            if payload.get("type") == "join_queue":
                target = payload.get("target")
                if target:
                    # Challenge specific user
                    if target in manager.active_connections:
                        game_id = str(uuid.uuid4())
                        manager.active_games[game_id] = {
                            "players": [username, target],
                            "scores": {username: 0, target: 0}
                        }
                        await manager.send_personal_message({"type": "matched", "opponent": target, "game_id": game_id}, username)
                        await manager.send_personal_message({"type": "matched", "opponent": username, "game_id": game_id}, target)
                        asyncio.create_task(start_game(game_id))
                    else:
                        await manager.send_personal_message({"type": "error", "message": "User is not online"}, username)
                else:
                    # Random Matchmaking
                    if manager.matchmaking_queue:
                        opponent = manager.matchmaking_queue.pop(0)
                        if opponent != username:
                            game_id = str(uuid.uuid4())
                            manager.active_games[game_id] = {
                                "players": [username, opponent],
                                "scores": {username: 0, opponent: 0}
                            }
                            await manager.send_personal_message({"type": "matched", "opponent": opponent, "game_id": game_id}, username)
                            await manager.send_personal_message({"type": "matched", "opponent": username, "game_id": game_id}, opponent)
                            asyncio.create_task(start_game(game_id))
                        else:
                            manager.matchmaking_queue.append(username)
                            await manager.send_personal_message({"type": "waiting", "message": "Waiting for opponent..."}, username)
                    else:
                        manager.matchmaking_queue.append(username)
                        await manager.send_personal_message({"type": "waiting", "message": "Waiting for opponent..."}, username)
            
            elif payload.get("type") == "answer":
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
        await manager.disconnect(username)
