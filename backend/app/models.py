"""Relational schema for TourPlan AI."""
from datetime import date, datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    preferences: Mapped["UserPreference"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    trips: Mapped[list["Trip"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    favorites: Mapped[list["Favorite"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    conversations: Mapped[list["ChatConversation"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    home_city: Mapped[str] = mapped_column(String(120), default="Mumbai")
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    travel_style: Mapped[str] = mapped_column(String(20), default="budget")
    interests: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped[User] = relationship(back_populates="preferences")


class Destination(Base):
    __tablename__ = "destinations"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    country: Mapped[str] = mapped_column(String(80), index=True)
    region: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str] = mapped_column(String(500), default="")
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    categories: Mapped[list] = mapped_column(JSON, default=list)  # beach, mountain, heritage...
    interests: Mapped[list] = mapped_column(JSON, default=list)  # food, nature, photography...
    climate: Mapped[str] = mapped_column(String(20))  # cool, warm, tropical, temperate
    best_months: Mapped[list] = mapped_column(JSON, default=list)  # [10, 11, ...]
    crowd_level: Mapped[str] = mapped_column(String(10), default="medium")  # low/medium/high
    suggested_days: Mapped[int] = mapped_column(Integer, default=3)
    # Indicative per-person-per-day costs in INR (sample estimates, not live prices)
    stay_per_night_inr: Mapped[int] = mapped_column(Integer)
    food_per_day_inr: Mapped[int] = mapped_column(Integer)
    local_transport_per_day_inr: Mapped[int] = mapped_column(Integer)
    activities_per_day_inr: Mapped[int] = mapped_column(Integer)
    practical_info: Mapped[str] = mapped_column(Text, default="")

    attractions: Mapped[list["Attraction"]] = relationship(
        back_populates="destination", cascade="all, delete-orphan", order_by="Attraction.id"
    )

    @property
    def est_daily_per_person_inr(self) -> int:
        """Indicative daily cost per person (room shared by two, excl. activities). A sample estimate."""
        return round(self.stay_per_night_inr / 2 + self.food_per_day_inr + self.local_transport_per_day_inr)


class Attraction(Base):
    __tablename__ = "attractions"

    id: Mapped[int] = mapped_column(primary_key=True)
    destination_id: Mapped[int] = mapped_column(ForeignKey("destinations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(String(500), default="")
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    duration_hours: Mapped[float] = mapped_column(Float, default=2.0)
    entry_fee_inr: Mapped[int] = mapped_column(Integer, default=0)
    best_time: Mapped[str] = mapped_column(String(12), default="morning")  # morning/afternoon/evening
    crowded: Mapped[bool] = mapped_column(Boolean, default=False)

    destination: Mapped[Destination] = relationship(back_populates="attractions")


class Trip(Base):
    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint("travelers >= 1", name="ck_trip_travelers"),
        CheckConstraint("budget >= 0", name="ck_trip_budget"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    destination_id: Mapped[int | None] = mapped_column(ForeignKey("destinations.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(160))
    start_city: Mapped[str] = mapped_column(String(120))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    travelers: Mapped[int] = mapped_column(Integer, default=1)
    budget: Mapped[float] = mapped_column(Float, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    travel_style: Mapped[str] = mapped_column(String(20), default="budget")
    pace: Mapped[str] = mapped_column(String(10), default="balanced")
    transport: Mapped[str] = mapped_column(String(20), default="train")
    accommodation: Mapped[str] = mapped_column(String(20), default="budget")
    interests: Mapped[list] = mapped_column(JSON, default=list)
    notes: Mapped[str] = mapped_column(Text, default="")
    overview: Mapped[str] = mapped_column(Text, default="")
    tips: Mapped[list] = mapped_column(JSON, default=list)
    weather_alternatives: Mapped[list] = mapped_column(JSON, default=list)
    generated_by: Mapped[str] = mapped_column(String(20), default="manual")  # manual / rule_based / llm
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped[User] = relationship(back_populates="trips")
    destination: Mapped[Destination | None] = relationship()
    days: Mapped[list["ItineraryDay"]] = relationship(
        back_populates="trip", cascade="all, delete-orphan", order_by="ItineraryDay.day_number"
    )
    expenses: Mapped[list["BudgetExpense"]] = relationship(
        back_populates="trip", cascade="all, delete-orphan", order_by="BudgetExpense.id"
    )
    packing_items: Mapped[list["PackingItem"]] = relationship(
        back_populates="trip", cascade="all, delete-orphan", order_by="PackingItem.id"
    )


class ItineraryDay(Base):
    __tablename__ = "itinerary_days"
    __table_args__ = (UniqueConstraint("trip_id", "day_number", name="uq_trip_day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), index=True)
    day_number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(160), default="")
    notes: Mapped[str] = mapped_column(Text, default="")

    trip: Mapped[Trip] = relationship(back_populates="days")
    activities: Mapped[list["ItineraryActivity"]] = relationship(
        back_populates="day", cascade="all, delete-orphan", order_by="ItineraryActivity.position"
    )


class ItineraryActivity(Base):
    __tablename__ = "itinerary_activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    day_id: Mapped[int] = mapped_column(ForeignKey("itinerary_days.id", ondelete="CASCADE"), index=True)
    attraction_id: Mapped[int | None] = mapped_column(ForeignKey("attractions.id"), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    slot: Mapped[str] = mapped_column(String(12), default="morning")  # morning/afternoon/evening
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(String(500), default="")
    duration_hours: Mapped[float] = mapped_column(Float, default=1.0)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    day: Mapped[ItineraryDay] = relationship(back_populates="activities")
    attraction: Mapped["Attraction"] = relationship()


class BudgetExpense(Base):
    __tablename__ = "budget_expenses"
    __table_args__ = (
        CheckConstraint("estimated >= 0", name="ck_expense_estimated"),
        CheckConstraint("actual >= 0", name="ck_expense_actual"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(40))
    estimated: Mapped[float] = mapped_column(Float, default=0)
    actual: Mapped[float] = mapped_column(Float, default=0)

    trip: Mapped[Trip] = relationship(back_populates="expenses")


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "destination_id", name="uq_user_destination"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    destination_id: Mapped[int] = mapped_column(ForeignKey("destinations.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped[User] = relationship(back_populates="favorites")
    destination: Mapped[Destination] = relationship()


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160), default="New conversation")
    context: Mapped[dict] = mapped_column(JSON, default=dict)  # extracted requirements so far
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped[User] = relationship(back_populates="conversations")
    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan", order_by="ChatMessage.id"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("chat_conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(10))  # user / assistant
    content: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(20), default="user")  # user / llm / rule_based
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # structured plan, if any
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    conversation: Mapped[ChatConversation] = relationship(back_populates="messages")


class PackingItem(Base):
    __tablename__ = "packing_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(160))
    packed: Mapped[bool] = mapped_column(Boolean, default=False)

    trip: Mapped[Trip] = relationship(back_populates="packing_items")
