from fastapi import FastAPI, Depends, HTTPException, status, Request, Header
from fastapi.responses import JSONResponse
from pwdlib import PasswordHash
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from sqlalchemy.orm import Session, selectinload
from database import Base, engine, get_db
from models import Room, Owner, RoomImage, Enquiry, Student, Favorite
from sqlalchemy import func, text
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security
from jwt.exceptions import InvalidTokenError
from fastapi import UploadFile, File
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from typing import Literal
import re
import math

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle distance between two GPS coordinates in kilometers.
    """
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

import cloudinary
import cloudinary.uploader
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
import os
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

from email_service import (
    send_password_reset_email,
    send_verification_email,
    send_enquiry_received_email,
    send_enquiry_status_updated_email
)

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_EXPIRE_MINUTES", "60")
)

if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is missing in .env")

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Rental Room Finder")
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down and try again later."}
    )

app.add_middleware(SlowAPIMiddleware)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

allowed_origins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://room-rent-finder-one.vercel.app",
]
frontend_env = os.getenv("FRONTEND_URL")
if frontend_env and frontend_env.rstrip("/") not in allowed_origins:
    allowed_origins.append(frontend_env.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
Base.metadata.create_all(bind=engine)

# Auto-migration for room coordinates
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;"))
        conn.execute(text("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;"))
except Exception as e:
    print(f"[DB MIGRATION NOTICE] Coordinates column check: {e}")

class RoomCreate(BaseModel):
    title: str
    location: str
    latitude: float | None = None
    longitude: float | None = None
    rent: int = Field(gt=0)
    deposit: int = Field(ge=0)
    total_rooms: int = Field(gt=0)
    available_rooms: int = Field(ge=0)
    owner_id: int | None = None
    property_type: str = "PG"
    room_type: str = "Single"
    furnished: bool = False
    wifi: bool = False
    attached_bathroom: bool = False
    food_included: bool = False
    gender_preference: str = "Any"
    description: str | None = None

class RoomResponse(RoomCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)



class RoomUpdate(BaseModel):
    title: str | None = None
    location: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    rent: int | None = Field(default=None, gt=0)
    deposit: int | None = Field(default=None, ge=0)
    total_rooms: int | None = Field(default=None, gt=0)
    available_rooms: int | None = Field(default=None, ge=0)
    property_type: str | None = None
    room_type: str | None = None
    furnished: bool | None = None
    wifi: bool | None = None
    attached_bathroom: bool | None = None
    food_included: bool | None = None
    gender_preference: str | None = None
    description: str | None = None


class EnquiryCreate(BaseModel):
    message: str = Field(min_length=5, max_length=1000)


@app.get("/")
def home():
    return {"message": "Rental Room Finder API running"}

bearer_scheme = HTTPBearer()

def get_current_owner(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Invalid or expired owner token",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        owner_id = payload.get("sub")
        role = payload.get("role")

        if role != "owner" or owner_id is None:
            raise credentials_exception

        owner_id = int(owner_id)

    except (InvalidTokenError, KeyError, ValueError, TypeError):
        raise credentials_exception

    owner = db.get(Owner, owner_id)

    if not owner:
        raise credentials_exception

    return owner



student_bearer = HTTPBearer()

def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(student_bearer),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired student token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        student_id = payload.get("sub")
        role = payload.get("role")

        if role != "student" or student_id is None:
            raise credentials_exception

        student_id = int(student_id)

    except (InvalidTokenError, KeyError, ValueError, TypeError):
        raise credentials_exception

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise credentials_exception

    return student


@app.post("/rooms", response_model=RoomResponse)
def add_room(
    room: RoomCreate,
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner)
):
    if room.available_rooms > room.total_rooms:
        raise HTTPException(
            status_code=400,
            detail="Available rooms cannot exceed total rooms"
        )

    room_data = room.model_dump(exclude={"owner_id"})

    new_room = Room(
    **room_data,
    owner_id=current_owner.id
    )

    db.add(new_room)
    db.commit()
    db.refresh(new_room)

    return new_room

@app.get("/rooms")
def get_rooms(
    location: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float = 5.0,
    max_rent: int | None = None,
    available_only: bool = False,
    property_type: str | None = None,
    room_type: str | None = None,
    gender_preference: str | None = None,
    wifi: bool | None = None,
    furnished: bool | None = None,
    attached_bathroom: bool | None = None,
    food_included: bool | None = None,
    page: int | None = None,
    limit: int | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Room)

    if location and (lat is None or lng is None):
        query = query.filter(
            Room.location.ilike(f"%{location}%")
        )

    if max_rent is not None:
        query = query.filter(Room.rent <= max_rent)

    if available_only:
        query = query.filter(Room.available_rooms > 0)

    if property_type:
        query = query.filter(
            func.lower(Room.property_type) == property_type.lower()
        )

    if room_type:
        query = query.filter(
            func.lower(Room.room_type) == room_type.lower()
        )

    if gender_preference:
        query = query.filter(
            func.lower(Room.gender_preference) == gender_preference.lower()
        )

    if wifi is not None:
        query = query.filter(Room.wifi == wifi)

    if furnished is not None:
        query = query.filter(Room.furnished == furnished)

    if attached_bathroom is not None:
        query = query.filter(
            Room.attached_bathroom == attached_bathroom
        )

    if food_included is not None:
        query = query.filter(Room.food_included == food_included)

    rooms = query.options(selectinload(Room.images)).all()

    results = []
    for room in rooms:
        dist = None
        # Calculate distance if user provided GPS coordinates
        if lat is not None and lng is not None:
            room_lat = getattr(room, "latitude", None)
            room_lng = getattr(room, "longitude", None)
            if room_lat is not None and room_lng is not None:
                dist = haversine_distance_km(lat, lng, room_lat, room_lng)
                if dist > radius_km:
                    continue  # Exclude rooms outside the radius
            elif location:
                # Fallback: room has no GPS; check if text matches
                if location.lower() not in (room.location or "").lower():
                    continue

        room_dict = {
            **{
                column.name: getattr(room, column.name)
                for column in Room.__table__.columns
            },
            "images": [image.image_url for image in room.images],
            "distance_km": dist
        }
        results.append(room_dict)

    # If coordinates were provided, sort by distance (closest first)
    if lat is not None and lng is not None:
        results.sort(key=lambda r: (r["distance_km"] is None, r["distance_km"] or 999999))

    # Apply pagination after spatial filtering
    if page is not None and limit is not None:
        page_num = max(1, page)
        page_size = min(max(1, limit), 100)
        start = (page_num - 1) * page_size
        return results[start:start + page_size]
    elif limit is not None:
        return results[:min(max(1, limit), 100)]

    return results


@app.get("/rooms/{room_id}")
def get_room_details(room_id: int, db: Session = Depends(get_db)):

    room = (
        db.query(Room)
        .options(selectinload(Room.images))
        .filter(Room.id == room_id)
        .first()
    )

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    owner = db.query(Owner).filter(Owner.id == room.owner_id).first() if room.owner_id else None

    return {
        "id": room.id,
        "title": room.title,
        "location": room.location,
        "latitude": getattr(room, "latitude", None),
        "longitude": getattr(room, "longitude", None),
        "rent": room.rent,
        "deposit": room.deposit,
        "property_type": room.property_type,
        "room_type": room.room_type,
        "total_rooms": room.total_rooms,
        "available_rooms": room.available_rooms,
        "furnished": room.furnished,
        "wifi": room.wifi,
        "attached_bathroom": room.attached_bathroom,
        "food_included": room.food_included,
        "gender_preference": room.gender_preference,
        "description": room.description,

        # Owner details
        "owner_name": owner.name if owner else None,
        "owner_phone": owner.phone if owner else None,
        "images": [image.image_url for image in room.images],
    }

@app.patch("/rooms/{room_id}/availability")
def update_availability(
    room_id: int,
    available: int,
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner)
):
    room = db.get(Room, room_id)

    if not room or room.owner_id != current_owner.id:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    if available < 0 or available > room.total_rooms:
        raise HTTPException(
            status_code=400,
            detail="Invalid available room count"
        )

    room.available_rooms = available

    db.commit()
    db.refresh(room)

    return room
password_hasher = PasswordHash.recommended()

def validate_password_strength(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if len(password) > 64:
        raise ValueError("Password cannot exceed 64 characters")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter (A-Z)")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter (a-z)")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one number (0-9)")
    if not re.search(r"[@$!%*?&_\-#^~+=<>,.:;]", password):
        raise ValueError("Password must contain at least one special character (@$!%*?&_-#^~+=<>,.:;)")
    return password


class OwnerRegister(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(pattern=r"^[0-9]{10}$")
    password: str

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)

class StudentRegister(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(pattern=r"^[0-9]{10}$")
    password: str

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)

class StudentLogin(BaseModel):
    email: EmailStr
    password: str
    


class OwnerResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str


@app.post(
    "/owners/register",
    response_model=OwnerResponse,
    status_code=status.HTTP_201_CREATED
)
@limiter.limit("3/minute")
def register_owner(
    request: Request,
    owner: OwnerRegister,
    db: Session = Depends(get_db)
):
    email = owner.email.lower()

    existing_owner = db.query(Owner).filter(
        func.lower(Owner.email) == email
    ).first()

    if existing_owner:
        raise HTTPException(
            status_code=409,
            detail="An owner with this email already exists"
        )

    new_owner = Owner(
        name=owner.name,
        email=email,
        phone=owner.phone,
        password_hash=password_hasher.hash(owner.password)
    )

    db.add(new_owner)

    try:
        db.commit()
        db.refresh(new_owner)
    except Exception:
        db.rollback()
        raise

    try:
        verify_token = create_action_token(
            user_id=new_owner.id,
            role="owner",
            purpose="email_verification",
            expires_minutes=1440
        )
        send_verification_email(new_owner.email, new_owner.name, verify_token)
    except Exception:
        pass

    return new_owner

@app.post("/students/register", status_code=201)
@limiter.limit("3/minute")
def register_student(
    request: Request,
    data: StudentRegister,
    db: Session = Depends(get_db)
):
    email = str(data.email).lower()

    existing_student = (
        db.query(Student)
        .filter(Student.email == email)
        .first()
    )

    if existing_student:
        raise HTTPException(
            status_code=400,
            detail="Student email already registered"
        )

    student = Student(
        name=data.name.strip(),
        email=email,
        phone=data.phone,
        password_hash=password_hasher.hash(data.password)
    )

    db.add(student)
    db.commit()
    db.refresh(student)

    try:
        verify_token = create_action_token(
            user_id=student.id,
            role="student",
            purpose="email_verification",
            expires_minutes=1440
        )
        send_verification_email(student.email, student.name, verify_token)
    except Exception:
        pass

    return {
        "message": "Student registered successfully",
        "student_id": student.id
    }


class OwnerLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


def create_access_token(owner_id: int, role: str = "owner"):
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(owner_id),
        "exp": expire,
        "role": role
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


def create_action_token(user_id: int, role: str, purpose: str, expires_minutes: int = 15) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {
        "sub": str(user_id),
        "role": role,
        "purpose": purpose,
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_action_token(token: str, expected_purpose: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != expected_purpose:
            raise HTTPException(status_code=400, detail="Invalid token purpose")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token has expired. Please request a new link.")
    except InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid token.")

@app.post("/owners/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login_owner(
    request: Request,
    credentials: OwnerLogin,
    db: Session = Depends(get_db)
):
    owner = db.query(Owner).filter(
        func.lower(Owner.email) == credentials.email.lower()
    ).first()

    if not owner or not password_hasher.verify(
        credentials.password,
        owner.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token = create_access_token(owner.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/students/login")
@limiter.limit("5/minute")
def login_student(
    request: Request,
    data: StudentLogin,
    db: Session = Depends(get_db)
):
    student = (
        db.query(Student)
        .filter(Student.email == str(data.email).lower())
        .first()
    )

    if not student or not password_hasher.verify(
        data.password, student.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token(student.id, role="student")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": "student",
        "student_id": student.id,
        "student_name": student.name
    }


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    role: Literal["owner", "student"]


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)


class VerifyEmailRequest(BaseModel):
    token: str


@app.post("/auth/forgot-password")
@limiter.limit("3/minute")
def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    email = str(data.email).lower().strip()
    user = None
    if data.role == "owner":
        user = db.query(Owner).filter(func.lower(Owner.email) == email).first()
    else:
        user = db.query(Student).filter(func.lower(Student.email) == email).first()

    if user:
        reset_token = create_action_token(
            user_id=user.id,
            role=data.role,
            purpose="password_reset",
            expires_minutes=15
        )
        sent = send_password_reset_email(to_email=user.email, name=user.name, reset_token=reset_token)
        if not sent:
            print(f"[AUTH ERROR] Failed to deliver reset email to {user.email}")
    else:
        print(f"[AUTH INFO] Password reset requested for non-existent or wrong-role email: '{email}' (role: {data.role})")

    return {
        "message": "If an account with this email exists, a password reset link has been sent."
    }


@app.post("/auth/reset-password")
@limiter.limit("5/minute")
def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    payload = decode_action_token(data.token, expected_purpose="password_reset")
    user_id = int(payload.get("sub", 0))
    role = payload.get("role")

    user = db.get(Owner if role == "owner" else Student, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    if password_hasher.verify(data.new_password, user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password"
        )

    user.password_hash = password_hasher.hash(data.new_password)
    db.commit()

    return {"message": "Password reset successfully. You can now log in with your new password."}


@app.post("/auth/verify-email")
@limiter.limit("5/minute")
def verify_email(
    request: Request,
    data: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    payload = decode_action_token(data.token, expected_purpose="email_verification")
    user_id = int(payload.get("sub", 0))
    role = payload.get("role")

    user = db.get(Owner if role == "owner" else Student, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    if getattr(user, "email_verified", False):
        return {"message": "Email is already verified."}

    if hasattr(user, "email_verified"):
        user.email_verified = True
        db.commit()

    return {"message": "Email verified successfully! Your account is now confirmed."}

class StudentProfileUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r"^[0-9]{10,15}$")

class OwnerProfileUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r"^[0-9]{10,15}$")



class StudentChangePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)

class OwnerChangePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)


@app.get("/students/me/enquiries")
def get_student_enquiries(
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    results = (
        db.query(Enquiry, Room)
        .join(Room, Enquiry.room_id == Room.id)
        .filter(Enquiry.student_id == current_student.id)
        .order_by(Enquiry.id.desc())
        .all()
    )

    return [
        {
            "id": enquiry.id,
            "room_id": room.id,
            "room_title": room.title,
            "location": room.location,
            "rent": room.rent,
            "message": enquiry.message,
            "status": enquiry.status
        }
        for enquiry, room in results
    ]

@app.get("/owners/me")
def get_owner_profile(
    current_owner: Owner = Depends(get_current_owner)
):
    return {
        "id": current_owner.id,
        "name": current_owner.name,
        "email": current_owner.email,
        "phone": current_owner.phone
    }
@app.patch("/owners/me")
def update_owner_profile(
    data: OwnerProfileUpdate,
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner)
):
    name = data.name.strip()
    phone = data.phone.strip()

    if len(name) < 2:
        raise HTTPException(
            status_code=422,
            detail="Name must contain at least 2 characters"
        )

    if not phone.isdigit() or not 10 <= len(phone) <= 15:
        raise HTTPException(
            status_code=422,
            detail="Enter a valid phone number"
        )

    current_owner.name = name
    current_owner.phone = phone

    db.commit()
    db.refresh(current_owner)

    return {
        "message": "Owner profile updated successfully",
        "owner": {
            "id": current_owner.id,
            "name": current_owner.name,
            "email": current_owner.email,
            "phone": current_owner.phone
        }
    }

@app.patch("/owners/me/password")
@limiter.limit("5/minute")
def change_owner_password(
    request: Request,
    data: OwnerChangePassword,
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner)
):
    # Verify current password
    if not password_hasher.verify(
        data.current_password,
        current_owner.password_hash
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    # Validate new password
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must contain at least 8 characters"
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password"
        )

    # Hash new password before saving
    current_owner.password_hash = password_hasher.hash(
        data.new_password
    )

    db.commit()

    return {
        "message": "Password changed successfully"
    }


@app.get("/owners/me/rooms")
def get_my_rooms(
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner)
):
    rooms = (
        db.query(Room)
        .options(selectinload(Room.images))
        .filter(Room.owner_id == current_owner.id)
        .order_by(Room.id.desc())
        .all()
    )

    return [
        {
            **{
                column.name: getattr(room, column.name)
                for column in Room.__table__.columns
            },
            "images": [image.image_url for image in room.images]
        }
        for room in rooms
    ]

@app.get("/students/me")
def get_student_profile(
    current_student: Student = Depends(get_current_student)
):
    return {
        "id": current_student.id,
        "name": current_student.name,
        "email": current_student.email,
        "phone": current_student.phone
    }

@app.patch("/students/me")
def update_student_profile(
    data: StudentProfileUpdate,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    name = data.name.strip()
    phone = data.phone.strip()

    if len(name) < 2:
        raise HTTPException(
            status_code=422,
            detail="Name must contain at least 2 characters"
        )

    if not phone.isdigit() or not 10 <= len(phone) <= 15:
        raise HTTPException(
            status_code=422,
            detail="Enter a valid phone number"
        )

    current_student.name = name
    current_student.phone = phone

    db.commit()
    db.refresh(current_student)

    return {
        "message": "Student profile updated successfully",
        "student": {
            "id": current_student.id,
            "name": current_student.name,
            "email": current_student.email,
            "phone": current_student.phone
        }
    }

@app.patch("/students/me/password")
@limiter.limit("5/minute")
def change_student_password(
    request: Request,
    data: StudentChangePassword,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    # Verify current password
    if not password_hasher.verify(
        data.current_password,
        current_student.password_hash
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    # Validate new password
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must contain at least 8 characters"
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password"
        )

    # Hash new password before saving
    current_student.password_hash = password_hasher.hash(
        data.new_password
    )

    db.commit()

    return {
        "message": "Password changed successfully"
    }

@app.patch("/rooms/{room_id}")
def update_room(
    room_id: int,
    updates: RoomUpdate,
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner)
):
    room = db.get(Room, room_id)

    if not room:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    if room.owner_id != current_owner.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot edit another owner's room"
        )

    update_data = updates.model_dump(exclude_unset=True)

    if any(value is None for value in update_data.values()):
        raise HTTPException(
            status_code=422,
            detail="Room fields cannot be null"
        )

    total = update_data.get("total_rooms", room.total_rooms)
    available = update_data.get("available_rooms", room.available_rooms)

    if available > total:
        raise HTTPException(
            status_code=400,
            detail="Available rooms cannot exceed total rooms"
        )

    for key, value in update_data.items():
        setattr(room, key, value)

    db.commit()
    db.refresh(room)

    return room

@app.delete("/rooms/{room_id}")
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner)
):
    room = db.get(Room, room_id)

    if not room:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    if room.owner_id != current_owner.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot delete another owner's room"
        )

    
    # Fetch all photos belonging to this property
    room_images = db.query(RoomImage).filter(
        RoomImage.room_id == room_id
    ).all()

    from pathlib import Path
    from urllib.parse import urlparse, unquote

    # Delete stored photos
    for image in room_images:
        image_url = image.image_url

        if image_url.startswith("https://res.cloudinary.com/"):
            path = unquote(urlparse(image_url).path)
            parts = path.split("/upload/", 1)

            if len(parts) != 2:
                raise HTTPException(
                    status_code=500,
                    detail="Invalid Cloudinary image URL"
                )

            segments = parts[1].split("/")
            version_index = next(
                (
                    i for i, segment in enumerate(segments)
                    if segment.startswith("v") and segment[1:].isdigit()
                ),
                None
            )

            if version_index is None:
                raise HTTPException(
                    status_code=500,
                    detail="Unable to identify Cloudinary image"
                )

            public_id = "/".join(
                segments[version_index + 1:]
            ).rsplit(".", 1)[0]

            try:
                result = cloudinary.uploader.destroy(
                    public_id,
                    resource_type="image",
                    invalidate=True
                )

                if result.get("result") not in ("ok", "not found"):
                    raise Exception("Cloudinary deletion failed")

            except Exception:
                raise HTTPException(
                    status_code=502,
                    detail="Unable to delete property images from Cloudinary"
                )

        else:
            # Older locally stored photos
            file_path = UPLOAD_DIR / Path(image_url).name
            file_path.unlink(missing_ok=True)

    # Remove image records before deleting the property
    for image in room_images:
        db.delete(image)

    db.delete(room)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete property"
        )


    return {"message": "Room deleted successfully"}


ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "admin_roomrentfinder_master_secret")

@app.delete("/admin/rooms/{room_id}", status_code=status.HTTP_200_OK)
def admin_delete_room(
    room_id: int,
    admin_key: str = Header(..., alias="X-Admin-Key"),
    db: Session = Depends(get_db)
):
    """Allows webmaster / administrator to delete any room directly using the admin secret key."""
    if admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid admin secret key"
        )

    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    # Delete related dependencies (images, favorites, enquiries)
    db.query(RoomImage).filter(RoomImage.room_id == room_id).delete()
    db.query(Favorite).filter(Favorite.room_id == room_id).delete()
    db.query(Enquiry).filter(Enquiry.room_id == room_id).delete()
    db.delete(room)
    db.commit()

    return {"message": f"Room #{room_id} deleted successfully by admin"}


@app.post("/rooms/{room_id}/images")
async def upload_room_image(
    room_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner)
):
    room = db.query(Room).filter(Room.id == room_id).first()

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.owner_id != current_owner.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot upload images for this property"
        )
    image_count = db.query(RoomImage).filter(
        RoomImage.room_id == room_id
    ).count()

    if image_count >= 3:
        raise HTTPException(
            status_code=400,
            detail="Maximum 3 photos allowed per property. Delete a photo before uploading another."
        )

    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed"
        )

    # Limit each image to 5 MB
    max_size = 5 * 1024 * 1024
    contents = await file.read(max_size + 1)

    if len(contents) > max_size:
        raise HTTPException(
            status_code=400,
            detail="Image must be smaller than 5 MB"
        )

    from io import BytesIO
    from PIL import Image, UnidentifiedImageError

    try:
        with Image.open(BytesIO(contents)) as img:
            img.verify()
        with Image.open(BytesIO(contents)) as img:
            if img.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError("Unsupported image format")
    except (UnidentifiedImageError, ValueError, OSError):
        raise HTTPException(
            status_code=400,
            detail="Invalid image file. Only JPG, PNG and WEBP images are allowed(Max 5 MB)"
        )

    try:
        upload_result = cloudinary.uploader.upload(
            contents,
            folder="roomrentfinder/rooms",
            resource_type="image"
        )

        image_url = upload_result["secure_url"]
        public_id = upload_result["public_id"]

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Image upload failed. Please try again."
        )

    new_image = RoomImage(
        room_id=room_id,
        image_url=image_url
    )

    try:
        db.add(new_image)
        db.commit()
        db.refresh(new_image)

    except Exception:
        db.rollback()

        try:
            cloudinary.uploader.destroy(public_id)
        except Exception:
            pass

        raise HTTPException(
            status_code=500,
            detail="Unable to save image information."
        )

@app.delete("/rooms/{room_id}/images/{image_id}")
def delete_room_image(
    room_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner)
):
    room = db.query(Room).filter(Room.id == room_id).first()

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.owner_id != current_owner.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot delete photos of this property"
        )

    image = db.query(RoomImage).filter(
        RoomImage.id == image_id,
        RoomImage.room_id == room_id
    ).first()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    
    image_url = image.image_url

    # Delete Cloudinary images
    if image_url.startswith("https://res.cloudinary.com/"):
        from urllib.parse import urlparse, unquote

        path = unquote(urlparse(image_url).path)
        upload_path = path.split("/upload/", 1)

        if len(upload_path) != 2:
            raise HTTPException(
                status_code=500,
                detail="Invalid Cloudinary image URL"
            )

        parts = upload_path[1].split("/")
        version_index = next(
            (i for i, part in enumerate(parts) if part.startswith("v") and part[1:].isdigit()),
            None
        )

        if version_index is None:
            raise HTTPException(
                status_code=500,
                detail="Unable to identify Cloudinary image"
            )

        public_id = "/".join(parts[version_index + 1:]).rsplit(".", 1)[0]

        try:
            result = cloudinary.uploader.destroy(
                public_id,
                resource_type="image",
                invalidate=True
            )

            if result.get("result") not in ("ok", "not found"):
                raise Exception("Cloudinary deletion unsuccessful")

        except Exception:
            raise HTTPException(
                status_code=502,
                detail="Unable to delete image from Cloudinary"
            )

    else:
        # Support older locally stored images
        file_path = UPLOAD_DIR / Path(image_url).name
        file_path.unlink(missing_ok=True)

    db.delete(image)
    db.commit()

    return {"message": "Image deleted successfully"}


    

@app.get("/rooms/{room_id}/images")
def get_room_images(
    room_id: int,
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    images = (
        db.query(RoomImage)
        .filter(RoomImage.room_id == room_id)
        .order_by(RoomImage.id)
        .all()
    )

    return [
        {
            "id": image.id,
            "image_url": image.image_url
        }
        for image in images
    ]

@app.post("/rooms/{room_id}/enquiries", status_code=201)
def create_enquiry(
    room_id: int,
    data: EnquiryCreate,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    room = db.query(Room).filter(Room.id == room_id).first()

    if not room:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    if room.available_rooms <= 0:
        raise HTTPException(
            status_code=400,
            detail="This property currently has no available rooms"
        )
    existing_enquiry = (
    db.query(Enquiry)
    .filter(
        Enquiry.room_id == room_id,
        Enquiry.student_id == current_student.id
    )
        .first()
    )

    if existing_enquiry:
        raise HTTPException(
            status_code=409,
            detail="You have already sent an enquiry for this room."
        )
    enquiry = Enquiry(
        room_id=room_id,
        student_id=current_student.id,
        student_name=current_student.name,
        student_phone=current_student.phone,
        message=data.message.strip(),
        status="Pending"
    )

    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)

    try:
        if room.owner_id:
            owner = db.get(Owner, room.owner_id)
            if owner and owner.email:
                send_enquiry_received_email(
                    owner_email=owner.email,
                    owner_name=owner.name,
                    room_title=room.title,
                    student_name=current_student.name,
                    student_phone=current_student.phone,
                    message=enquiry.message
                )
    except Exception:
        pass

    return {
        "message": "Enquiry submitted successfully",
        "enquiry_id": enquiry.id
    }


@app.get("/owners/me/enquiries")
def get_owner_enquiries(
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner)
):
    results = (
        db.query(Enquiry, Room)
        .join(Room, Enquiry.room_id == Room.id)
        .filter(Room.owner_id == current_owner.id)
        .order_by(Enquiry.id.desc())
        .all()
    )

    return [
        {
            "id": enquiry.id,
            "room_id": room.id,
            "room_title": room.title,
            "student_name": enquiry.student_name,
            "student_phone": enquiry.student_phone,
            "message": enquiry.message,
            "status": enquiry.status
        }
        for enquiry, room in results
    ]

class EnquiryStatusUpdate(BaseModel):
    status: Literal["Pending", "Accepted", "Rejected"]


@app.patch("/owners/enquiries/{enquiry_id}/status")
def update_enquiry_status(
    enquiry_id: int,
    data: EnquiryStatusUpdate,
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner)
):
    # STEP 1: Find the enquiry
    enquiry = db.query(Enquiry).filter(
        Enquiry.id == enquiry_id
    ).first()

    if not enquiry:
        raise HTTPException(
            status_code=404,
            detail="Enquiry not found"
        )

    # STEP 2: Verify the room belongs to the logged-in owner
    room = db.query(Room).filter(
        Room.id == enquiry.room_id,
        Room.owner_id == current_owner.id
    ).first()

    if not room:
        raise HTTPException(
            status_code=403,
            detail="You cannot update enquiries for another owner's room"
        )

    # STEP 3: Update status
    enquiry.status = data.status

    db.commit()
    db.refresh(enquiry)

    try:
        if enquiry.student_id:
            student = db.get(Student, enquiry.student_id)
            if student and student.email:
                send_enquiry_status_updated_email(
                    student_email=student.email,
                    student_name=student.name,
                    room_title=room.title,
                    status=data.status
                )
    except Exception:
        pass

    return {
        "message": "Enquiry status updated successfully",
        "enquiry_id": enquiry.id,
        "status": enquiry.status
    }


@app.post("/students/me/favorites/{room_id}", status_code=201)
def add_favorite(
    room_id: int,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    room = db.query(Room).filter(Room.id == room_id).first()

    if not room:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    existing = db.query(Favorite).filter(
        Favorite.student_id == current_student.id,
        Favorite.room_id == room_id
    ).first()

    if existing:
        return {
            "message": "Room already saved",
            "room_id": room_id
        }

    favorite = Favorite(
        student_id=current_student.id,
        room_id=room_id
    )

    db.add(favorite)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {
            "message": "Room already saved",
            "room_id": room_id
        }

    return {
        "message": "Room added to favorites",
        "room_id": room_id
    }

@app.get("/students/me/favorites")
def get_student_favorites(
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    results = (
        db.query(Favorite, Room)
        .join(Room, Favorite.room_id == Room.id)
        .options(selectinload(Favorite.room).selectinload(Room.images))
        .filter(Favorite.student_id == current_student.id)
        .order_by(Favorite.id.desc())
        .all()
    )

    return [
        {
            "favorite_id": favorite.id,
            "room_id": room.id,
            "title": room.title,
            "location": room.location,
            "rent": room.rent,
            "available_rooms": room.available_rooms,
            "property_type": room.property_type,
            "room_type": room.room_type,
            "images": [image.image_url for image in (room.images or [])]
        }
        for favorite, room in results
    ]

@app.delete("/students/me/favorites/{room_id}")
def remove_favorite(
    room_id: int,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    favorite = db.query(Favorite).filter(
        Favorite.student_id == current_student.id,
        Favorite.room_id == room_id
    ).first()

    if not favorite:
        raise HTTPException(
            status_code=404,
            detail="Favorite not found"
        )

    db.delete(favorite)
    db.commit()

    return {
        "message": "Room removed from favorites",
        "room_id": room_id
    }


