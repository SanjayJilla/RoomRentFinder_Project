from sqlalchemy import Column, Integer, String, CheckConstraint, Boolean, Text, UniqueConstraint
from database import Base
from sqlalchemy import ForeignKey
class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(
    Integer,
    ForeignKey("owners.id"),
    nullable=True
    )
    
    title = Column(String(150), nullable=False)
    location = Column(String(150), nullable=False)
    rent = Column(Integer, nullable=False)
    deposit = Column(Integer, nullable=False)
    total_rooms = Column(Integer, nullable=False)
    available_rooms = Column(Integer, nullable=False)
    property_type = Column(String(50), default="PG")
    room_type = Column(String(50), default="Single")
    furnished = Column(Boolean, default=False)
    wifi = Column(Boolean, default=False)
    attached_bathroom = Column(Boolean, default=False)
    food_included = Column(Boolean, default=False)
    gender_preference = Column(String(20), default="Any")
    description = Column(Text, nullable=True)
    __table_args__ = (
        CheckConstraint("rent > 0"),
        CheckConstraint("deposit >= 0"),
        CheckConstraint("total_rooms > 0"),
        CheckConstraint(
            "available_rooms >= 0 AND available_rooms <= total_rooms"
        ),
    )


class Owner(Base):
    __tablename__="owners"

    id=Column(Integer,primary_key=True,index=True)
    name=Column(String(100),nullable=False)
    email=Column(String(150),unique=True,nullable=False,index=True)
    phone=Column(String(15),nullable=False)
    password_hash=Column(String(255),nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    

class RoomImage(Base):
    __tablename__ = "room_images"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(
        Integer,
        ForeignKey("rooms.id", ondelete="CASCADE"),
        nullable=False
    )
    image_url = Column(String, nullable=False)

class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(
        Integer,
        ForeignKey("rooms.id", ondelete="CASCADE"),
        nullable=False
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

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(15), nullable=False)
    password_hash = Column(String(255), nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)

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

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "room_id",
            name="uq_student_room_favorite"
        ),
    )





