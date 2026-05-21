import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "bcabuddy.db")

def migrate():
    print(f"Connecting to database: {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print("Database not found! Migration skipped.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    columns_to_add = [
        ("total_xp", "INTEGER DEFAULT 0"),
        ("highest_exam_score", "REAL DEFAULT 0.0"),
        ("current_streak", "INTEGER DEFAULT 0"),
        ("last_active_date", "TEXT")
    ]

    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            print(f"Added column: {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"Column {col_name} already exists. Skipping.")
            else:
                print(f"Error adding {col_name}: {e}")

    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
