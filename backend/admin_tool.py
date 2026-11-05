"""
RoomRentFinder - Administrator & Webmaster Management Tool
Use this script from your terminal to manage users, reset passwords, and clean up rooms.

Examples:
    python backend/admin_tool.py --list-users
    python backend/admin_tool.py --reset-password owner@example.com mynewpassword123
    python backend/admin_tool.py --list-rooms
    python backend/admin_tool.py --delete-room 5
    python backend/admin_tool.py --delete-all-rooms
"""

import sys
import argparse
from pathlib import Path

# Ensure backend directory is in path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from database import SessionLocal
from models import Owner, Student, Room, RoomImage, Favorite, Enquiry

try:
    from pwdlib import PasswordHash
    password_hasher = PasswordHash.recommended()
    def hash_password(password: str) -> str:
        return password_hasher.hash(password)
except ImportError:
    import hashlib
    def hash_password(password: str) -> str:
        # Fallback if pwdlib is not installed in the active environment
        return password


def list_users():
    db = SessionLocal()
    try:
        print("\n" + "=" * 60)
        print("  REGISTERED PROPERTY OWNERS")
        print("=" * 60)
        owners = db.query(Owner).all()
        if not owners:
            print("  (No owners found)")
        for o in owners:
            room_count = db.query(Room).filter(Room.owner_id == o.id).count()
            print(f"  [ID {o.id}] {o.name} | Email: {o.email} | Phone: {o.phone or 'N/A'} | Rooms: {room_count}")

        print("\n" + "=" * 60)
        print("  REGISTERED STUDENTS")
        print("=" * 60)
        students = db.query(Student).all()
        if not students:
            print("  (No students found)")
        for s in students:
            print(f"  [ID {s.id}] {s.name} | Email: {s.email} | Phone: {s.phone or 'N/A'}")
        print("=" * 60 + "\n")
    finally:
        db.close()


def reset_user_password(email: str, new_password: str):
    if len(new_password) < 6:
        print("❌ Error: Password should be at least 6 characters.")
        return

    db = SessionLocal()
    try:
        # Check owners
        owner = db.query(Owner).filter(Owner.email == email.strip().lower()).first()
        if owner:
            owner.password_hash = hash_password(new_password)
            db.commit()
            print(f"✅ Success: Password for OWNER '{owner.name}' ({owner.email}) has been reset!")
            print(f"   You can now log in at /owner/login with your new password.")
            return

        # Check students
        student = db.query(Student).filter(Student.email == email.strip().lower()).first()
        if student:
            student.password_hash = hash_password(new_password)
            db.commit()
            print(f"✅ Success: Password for STUDENT '{student.name}' ({student.email}) has been reset!")
            print(f"   You can now log in at /student/login with your new password.")
            return

        print(f"❌ User with email '{email}' not found in database.")
    finally:
        db.close()


def list_rooms():
    db = SessionLocal()
    try:
        print("\n" + "=" * 70)
        print("  ALL ROOM LISTINGS IN DATABASE")
        print("=" * 70)
        rooms = db.query(Room).all()
        if not rooms:
            print("  (No rooms currently listed)")
        for r in rooms:
            owner = db.query(Owner).filter(Owner.id == r.owner_id).first()
            owner_name = owner.name if owner else f"Owner ID {r.owner_id}"
            coords = f"({r.latitude:.4f}, {r.longitude:.4f})" if r.latitude and r.longitude else "No GPS"
            print(
                f"  [Room #{r.id}] \"{r.title}\"\n"
                f"    - Location: {r.location or 'N/A'} | Coords: {coords}\n"
                f"    - Rent: ₹{r.rent} | Available: {r.available_rooms}/{r.total_rooms}\n"
                f"    - Owner: {owner_name} ({owner.email if owner else 'Unknown'})\n"
            )
        print("=" * 70 + "\n")
    finally:
        db.close()


def delete_rooms(room_ids: list):
    db = SessionLocal()
    try:
        deleted_count = 0
        for room_id in room_ids:
            room = db.query(Room).filter(Room.id == room_id).first()
            if not room:
                print(f"⚠️ Room #{room_id} does not exist (skipped).")
                continue

            title = room.title
            # Delete related dependencies
            db.query(RoomImage).filter(RoomImage.room_id == room_id).delete()
            db.query(Favorite).filter(Favorite.room_id == room_id).delete()
            db.query(Enquiry).filter(Enquiry.room_id == room_id).delete()
            db.delete(room)
            db.commit()

            print(f"✅ Deleted Room #{room_id} (\"{title}\")")
            deleted_count += 1

        print(f"\nDone! {deleted_count} room(s) successfully deleted.")
    finally:
        db.close()


def delete_no_gps_rooms():
    db = SessionLocal()
    try:
        no_gps_rooms = db.query(Room).filter(
            (Room.latitude == None) | (Room.longitude == None)
        ).all()

        if not no_gps_rooms:
            print("ℹ️ No rooms without GPS coordinates found.")
            return

        print(f"Found {len(no_gps_rooms)} room(s) without GPS coordinates:")
        for r in no_gps_rooms:
            print(f"  - [#{r.id}] \"{r.title}\" ({r.location or 'No address'})")

        confirm = input(f"Type 'yes' to delete these {len(no_gps_rooms)} room(s): ")
        if confirm.strip().lower() != "yes":
            print("Cancelled.")
            return

        deleted = 0
        for r in no_gps_rooms:
            db.query(RoomImage).filter(RoomImage.room_id == r.id).delete()
            db.query(Favorite).filter(Favorite.room_id == r.id).delete()
            db.query(Enquiry).filter(Enquiry.room_id == r.id).delete()
            db.delete(r)
            deleted += 1

        db.commit()
        print(f"✅ Success: Deleted {deleted} room(s) lacking GPS coordinates.")
    finally:
        db.close()


def seed_demo_rooms():
    db = SessionLocal()
    try:
        print("\n🌱 Seeding High-Quality Demonstration Properties...")

        # 1. Ensure Demo Host Owner exists
        demo_email = "demo.owner@roomrentfinder.com"
        owner = db.query(Owner).filter(Owner.email == demo_email).first()
        if not owner:
            owner = Owner(
                name="Verified Demo Host",
                email=demo_email,
                phone="9876543210",
                password_hash=hash_password("Password123!"),
            )
            db.add(owner)
            db.commit()
            db.refresh(owner)
            print(f"  Created Demo Host Account: {demo_email}")

        # 2. Sample property definitions
        demo_properties = [
            {
                "title": "[Demo] Luxury Single AC Room near Mindspace, Madhapur",
                "location": "Madhapur, Hyderabad, Telangana, 500081",
                "latitude": 17.4485,
                "longitude": 78.3800,
                "rent": 8500,
                "deposit": 15000,
                "total_rooms": 4,
                "available_rooms": 2,
                "property_type": "PG",
                "room_type": "Single",
                "gender_preference": "Any",
                "furnished": True,
                "wifi": True,
                "attached_bathroom": True,
                "food_included": True,
                "description": "Spacious, fully ventilated single room in a premium student residence. 5 minutes from Mindspace IT Park & Inorbit Mall. High-speed 100Mbps Wi-Fi, 3 times home-cooked food, daily housekeeping, and 24/7 security. #demo",
                "images": [
                    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
                ],
            },
            {
                "title": "[Demo] Executive Double Sharing Room near DLF Cybercity, Gachibowli",
                "location": "Gachibowli, Hyderabad, Telangana, 500032",
                "latitude": 17.4401,
                "longitude": 78.3489,
                "rent": 6500,
                "deposit": 10000,
                "total_rooms": 6,
                "available_rooms": 3,
                "property_type": "PG",
                "room_type": "Double",
                "gender_preference": "Male",
                "furnished": True,
                "wifi": True,
                "attached_bathroom": True,
                "food_included": True,
                "description": "Comfortable double sharing accommodation for students and tech professionals. Walkable to DLF Cybercity & IIIT Hyderabad. Includes study desks, wardrobes, power backup, and laundry services. #demo",
                "images": [
                    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=80",
                ],
            },
            {
                "title": "[Demo] Fully Furnished 1BHK Studio Apartment, Kondapur",
                "location": "Kondapur, Hyderabad, Telangana, 500084",
                "latitude": 17.4682,
                "longitude": 78.3639,
                "rent": 14000,
                "deposit": 25000,
                "total_rooms": 2,
                "available_rooms": 1,
                "property_type": "Flat",
                "room_type": "Single",
                "gender_preference": "Any",
                "furnished": True,
                "wifi": True,
                "attached_bathroom": True,
                "food_included": False,
                "description": "Private independent 1BHK studio apartment on the 3rd floor. Features a modular kitchenette, refrigerator, queen-sized bed, high-speed fiber internet, and covered two-wheeler parking. No landlord restrictions. #demo",
                "images": [
                    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1540518614846-7ede433c4550?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=800&q=80",
                ],
            },
            {
                "title": "[Demo] Budget Friendly Student PG with Food, Ameerpet",
                "location": "Ameerpet, Hyderabad, Telangana, 500016",
                "latitude": 17.4375,
                "longitude": 78.4483,
                "rent": 4800,
                "deposit": 5000,
                "total_rooms": 8,
                "available_rooms": 4,
                "property_type": "Hostel",
                "room_type": "Double",
                "gender_preference": "Any",
                "furnished": True,
                "wifi": True,
                "attached_bathroom": False,
                "food_included": True,
                "description": "Ideal for coaching students near Ameerpet Metro & training institutes. Includes hygienic breakfast, lunch and dinner, RO drinking water, silent study hall, and 24-hour hot water. #demo",
                "images": [
                    "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
                ],
            },
            {
                "title": "[Demo] Modern 1 RK Room with Balcony, KPHB Colony",
                "location": "KPHB Colony, Kukatpally, Hyderabad, 500072",
                "latitude": 17.4933,
                "longitude": 78.3995,
                "rent": 7000,
                "deposit": 12000,
                "total_rooms": 3,
                "available_rooms": 2,
                "property_type": "RK",
                "room_type": "Single",
                "gender_preference": "Any",
                "furnished": True,
                "wifi": True,
                "attached_bathroom": True,
                "food_included": False,
                "description": "Bright and airy 1 RK room with an attached private balcony. Walking distance to JNTU College & KPHB Metro Station. Safe residential neighborhood with supermarkets and cafes nearby. #demo",
                "images": [
                    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80",
                ],
            },
        ]

        created = 0
        for p in demo_properties:
            images = p.pop("images", [])
            # Avoid duplicate seeding
            existing = db.query(Room).filter(Room.title == p["title"]).first()
            if existing:
                print(f"  [Already exists] {p['title']}")
                continue

            room = Room(owner_id=owner.id, **p)
            db.add(room)
            db.commit()
            db.refresh(room)

            for img_url in images:
                db.add(RoomImage(room_id=room.id, image_url=img_url))
            db.commit()

            print(f"  + Added Room #{room.id}: {room.title} (₹{room.rent}/mo)")
            created += 1

        print(f"\n✅ Done! {created} demonstration properties seeded successfully.")
        print("   Students will see them with a stylish 'DEMO' badge on cards and maps.")
    finally:
        db.close()


def delete_demo_rooms():
    db = SessionLocal()
    try:
        demo_rooms = db.query(Room).filter(
            (Room.title.like("%[Demo]%")) | (Room.description.like("%#demo%"))
        ).all()

        if not demo_rooms:
            print("ℹ️ No demo rooms found to delete.")
            return

        print(f"Found {len(demo_rooms)} demo room(s):")
        for r in demo_rooms:
            print(f"  - [#{r.id}] \"{r.title}\"")

        deleted = 0
        for r in demo_rooms:
            db.query(RoomImage).filter(RoomImage.room_id == r.id).delete()
            db.query(Favorite).filter(Favorite.room_id == r.id).delete()
            db.query(Enquiry).filter(Enquiry.room_id == r.id).delete()
            db.delete(r)
            deleted += 1

        db.commit()
        print(f"✅ Success: Deleted {deleted} demonstration room(s) and associated data.")
    finally:
        db.close()


def update_user_email(old_email: str, new_email: str):
    db = SessionLocal()
    try:
        old_clean = old_email.strip().lower()
        new_clean = new_email.strip().lower()

        # Check existing email clash
        existing_owner = db.query(Owner).filter(Owner.email == new_clean).first()
        existing_student = db.query(Student).filter(Student.email == new_clean).first()
        if existing_owner or existing_student:
            print(f"❌ Error: The new email '{new_clean}' is already registered to another account.")
            return

        owner = db.query(Owner).filter(Owner.email == old_clean).first()
        if owner:
            owner.email = new_clean
            db.commit()
            print(f"✅ Success: Updated Owner '{owner.name}' email from '{old_clean}' to '{new_clean}'.")
            return

        student = db.query(Student).filter(Student.email == old_clean).first()
        if student:
            student.email = new_clean
            db.commit()
            print(f"✅ Success: Updated Student '{student.name}' email from '{old_clean}' to '{new_clean}'.")
            return

        print(f"❌ User with email '{old_clean}' not found in database.")
    finally:
        db.close()


def delete_all_rooms():
    db = SessionLocal()
    try:
        count = db.query(Room).count()
        if count == 0:
            print("ℹ️ No rooms to delete.")
            return

        confirm = input(f"⚠️ Are you sure you want to delete ALL {count} rooms? Type 'yes' to confirm: ")
        if confirm.strip().lower() != "yes":
            print("Cancelled.")
            return

        db.query(RoomImage).delete()
        db.query(Favorite).delete()
        db.query(Enquiry).delete()
        db.query(Room).delete()
        db.commit()

        print(f"✅ Success: Deleted all {count} rooms and associated data.")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="RoomRentFinder Admin & Webmaster CLI Tool")
    parser.add_argument("--list-users", action="store_true", help="List all registered owners and students")
    parser.add_argument("--reset-password", nargs=2, metavar=("EMAIL", "NEW_PASSWORD"), help="Reset password for any user")
    parser.add_argument("--update-email", nargs=2, metavar=("OLD_EMAIL", "NEW_EMAIL"), help="Fix a user's wrong email address (works for both owners and students)")
    parser.add_argument("--list-rooms", action="store_true", help="List all posted rooms with their IDs")
    parser.add_argument("--delete-room", "--delete-rooms", type=int, nargs="+", metavar="ROOM_ID", help="Delete one or more rooms by ID (e.g. --delete-rooms 2 4 7)")
    parser.add_argument("--delete-no-gps", action="store_true", help="Delete all rooms that have No GPS coordinates")
    parser.add_argument("--seed-demo-rooms", action="store_true", help="Seed 5 realistic sample demonstration properties with photos and GPS")
    parser.add_argument("--delete-demo-rooms", action="store_true", help="Delete all demonstration properties tagged with [Demo]")
    parser.add_argument("--delete-all-rooms", action="store_true", help="Delete all rooms from the database")
    parser.add_argument("--mark-demo", type=int, nargs="+", metavar="ROOM_ID", help="Tag specific rooms as demo by ID (e.g. --mark-demo 3 7)")
    parser.add_argument("--mark-all-demo", action="store_true", help="Tag ALL existing rooms as demo listings")
    parser.add_argument("--unmark-demo", type=int, nargs="+", metavar="ROOM_ID", help="Remove demo tag from specific rooms by ID")

    args = parser.parse_args()

    if args.list_users:
        list_users()
    elif args.reset_password:
        reset_user_password(args.reset_password[0], args.reset_password[1])
    elif args.update_email:
        update_user_email(args.update_email[0], args.update_email[1])
    elif args.list_rooms:
        list_rooms()
    elif args.delete_room:
        delete_rooms(args.delete_room)
    elif args.delete_no_gps:
        delete_no_gps_rooms()
    elif args.seed_demo_rooms:
        seed_demo_rooms()
    elif args.delete_demo_rooms:
        delete_demo_rooms()
    elif args.delete_all_rooms:
        delete_all_rooms()
    elif args.mark_demo:
        mark_demo_rooms(args.mark_demo)
    elif args.mark_all_demo:
        mark_all_demo_rooms()
    elif args.unmark_demo:
        unmark_demo_rooms(args.unmark_demo)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

