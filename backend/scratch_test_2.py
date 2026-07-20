import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from database import User
from routes.rag import generate_quiz
from models import QuizRequest

async def test():
    user = User(id=1, username="test", hashed_password="pw")
    try:
        req = QuizRequest(subject="General BCA", semester=1, count=2)
        res = generate_quiz(req, user)
        print("Quiz Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("Quiz Failed:", e)

if __name__ == "__main__":
    asyncio.run(test())
