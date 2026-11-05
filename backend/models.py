from sqlalchemy import Column, Integer, String, Float, CheckConstraint, Boolean, Text, UniqueConstraint, Index, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(
        Integer,
        ForeignKey("owners.id"),
        nullable=True,
        index=True
    )
    
    title = Column(String(150), nullable=False)
    location = Column(String(150), nullable=False, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    rent = Column(Integer, nullable=False, index=True)
    deposit = Column(Integer, nullable=False)
    total_rooms = Column(Integer, nullable=False)
    available_rooms = Column(Integer, nullable=False, index=True)
    property_type = Column(String(50), default="PG")
    room_type = Column(String(50), default="Single")
    furnished = Column(Boolean, default=False)
    wifi = Column(Boolean, default=False)
    attached_bathroom = Column(Boolean, default=False)
    food_included = Column(Boolean, default=False)
    gender_preference = Column(String(20), default="Any")
    description = Column(Text, nullable=True)

    # Relationships
    images = relationship("RoomImage", back_populates="room", cascade="all, delete-orphan", order_by="RoomImage.id")
    enquiries = relationship("Enquiry", back_populates="room", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="room", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("rent > 0"),
        CheckConstraint("deposit >= 0"),
        CheckConstraint("total_rooms > 0"),
        CheckConstraint(
            "available_rooms >= 0 AND available_rooms <= total_rooms"
        ),
        Index("ix_rooms_property_room_type", "property_type", "room_type"),
    )


class Owner(Base):
    __tablename__ = "owners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    phone = Column(String(15), nullable=False)
    password_hash = Column(String(255), nullable=False)

    rooms = relationship("Room", backref="owner", cascade="all, delete-orphan")


class RoomImage(Base):
    __tablename__ = "room_images"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(
        Integer,
        ForeignKey("rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    image_url = Column(String, nullable=False)

    room = relationship("Room", back_populates="images")

class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(
        Integer,
        ForeignKey("rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    student_id = Column(
        Integer,
        ForeignKey("students.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    student_name = Column(String, nullable=False)
    student_phone = Column(String, nullable=False)
    message = Column(String, nullable=False)
    status = Column(String, default="Pending", nullable=False)

    room = relationship("Room", back_populates="enquiries")
    student = relationship("Student", back_populates="enquiries")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(15), nullable=False)
    password_hash = Column(String(255), nullable=False)

    enquiries = relationship("Enquiry", back_populates="student")
    favorites = relationship("Favorite", back_populates="student", cascade="all, delete-orphan")

class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    room_id = Column(
        Integer,
        ForeignKey("rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    room = relationship("Room", back_populates="favorites")
    student = relationship("Student", back_populates="favorites")

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "room_id",
            name="uq_student_room_favorite"
        ),
    )





