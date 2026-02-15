import sys
sys.path.insert(0, r'd:\ignou\BCABuddy\backend')

from database import SessionLocal, User, Base, engine

# Initialize database
Base.metadata.create_all(bind=engine)

# Check users
db = SessionLocal()
users = db.query(User).all()

print(f'Database initialized. Total users: {len(users)}')
for u in users:
    print(f'  Username: {u.username}')

db.close()
