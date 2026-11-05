from sqlalchemy import text
from database import engine

def run_migrations():
    print("Running database migrations...")
    with engine.begin() as conn:
        print("- Adding public_id column to room_images if missing...")
        conn.execute(text("ALTER TABLE room_images ADD COLUMN IF NOT EXISTS public_id VARCHAR(255);"))
        print("- Adding performance indexes...")
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rooms_location ON rooms (location);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rooms_rent ON rooms (rent);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rooms_available_rooms ON rooms (available_rooms);"))
    print("Database migrations applied successfully!")

if __name__ == "__main__":
    run_migrations()

