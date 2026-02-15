"""
Database Migration: Add is_creator field to users table
Run this script to add the is_creator column and set Saurav Kumar as creator
"""

import sqlite3
import os

DATABASE_PATH = "bcabuddy.db"

def migrate_add_is_creator():
    """Add is_creator column to users table if it doesn't exist"""
    
    if not os.path.exists(DATABASE_PATH):
        print(f"❌ Error: Database file '{DATABASE_PATH}' not found!")
        return False
    
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'is_creator' in columns:
            print("✅ Column 'is_creator' already exists in users table")
        else:
            # Add is_creator column (SQLite uses INTEGER for boolean: 0=False, 1=True)
            print("🔄 Adding 'is_creator' column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN is_creator INTEGER DEFAULT 0")
            conn.commit()
            print("✅ Column 'is_creator' added successfully!")
        
        # Set Saurav Kumar as creator (is_creator=1)
        print("\n🔄 Updating Saurav Kumar's account to is_creator=1...")
        cursor.execute("""
            UPDATE users 
            SET is_creator = 1 
            WHERE username = 'Saurav' OR username = 'saurav' 
            OR display_name LIKE '%Saurav%' OR display_name LIKE '%Supreme Architect%'
        """)
        affected_rows = cursor.rowcount
        conn.commit()
        
        if affected_rows > 0:
            print(f"✅ Updated {affected_rows} user(s) to creator status")
        else:
            print("⚠️  No user found matching 'Saurav' - You may need to manually update the database")
        
        # Verify the change
        print("\n📊 Current creator accounts:")
        cursor.execute("SELECT username, display_name, is_creator FROM users WHERE is_creator = 1")
        creators = cursor.fetchall()
        if creators:
            for username, display_name, is_creator in creators:
                print(f"   👑 {username} ({display_name}) - is_creator: {is_creator}")
        else:
            print("   No creator accounts found")
        
        conn.close()
        print("\n✅ Migration completed successfully!")
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("="*60)
    print("🔧 Database Migration: Add is_creator Field")
    print("="*60)
    print()
    migrate_add_is_creator()
    print()
    print("="*60)
    print("Migration script finished. You can now restart the backend.")
    print("="*60)
