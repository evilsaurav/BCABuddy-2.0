import sys
sys.path.insert(0, r'd:\ignou\BCABuddy\backend')

from database import SessionLocal, User, Base, engine
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Initialize database
Base.metadata.create_all(bind=engine)

# Create a test user
db = SessionLocal()

# Check if test user exists
existing_user = db.query(User).filter(User.username == "test").first()

if not existing_user:
    test_user = User(
        username="test",
        hashed_password=pwd_context.hash("test123"),
        display_name="Test User",
        gender=None,
        mobile_number=None,
        profile_picture_url=None
    )
    db.add(test_user)
    db.commit()
    print("✅ Test user created!")
    print("   Username: test")
    print("   Password: test123")
else:
    print("ℹ️  Test user already exists")
    print("   Username: test")
    print("   Password: test123")

# Show all users
users = db.query(User).all()
print(f"\nTotal users in database: {len(users)}")
for u in users:
    print(f"  - {u.username}")

db.close()
