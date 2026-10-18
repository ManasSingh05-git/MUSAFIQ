"""Pydantic request/response models with validation."""
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from .budget import CATEGORIES

Style = Literal["budget", "comfort", "luxury", "adventure"]
Pace = Literal["relaxed", "balanced", "packed"]
Transport = Literal["train", "bus", "car", "flight"]
Accommodation = Literal["hostel", "budget", "hotel", "resort"]
Slot = Literal["morning", "afternoon", "evening"]
INTERESTS = ["food", "culture", "nature", "shopping", "nightlife", "history", "photography", "adventure"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- auth ----------
class RegisterIn(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be blank")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(ORM):
    id: int
    email: str
    name: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PreferencesIO(ORM):
    home_city: str = "Mumbai"
    currency: Literal["INR"] = "INR"
    travel_style: Style = "budget"
    interests: list[str] = []


# ---------- destinations ----------
class AttractionOut(ORM):
    id: int
    name: str
    description: str
    image_url: str = ""
    latitude: float
    longitude: float
    tags: list[str]
    duration_hours: float
    entry_fee_inr: int
    best_time: str
    crowded: bool


class DestinationOut(ORM):
    id: int
    slug: str
    name: str
    country: str
    region: str
    description: str
    image_url: str
    latitude: float
    longitude: float
    categories: list[str]
    interests: list[str]
    climate: str
    best_months: list[int]
    crowd_level: str
    suggested_days: int
    stay_per_night_inr: int
    food_per_day_inr: int
    local_transport_per_day_inr: int
    activities_per_day_inr: int
    practical_info: str
    est_daily_per_person_inr: int = 0


class DestinationDetail(DestinationOut):
    attractions: list[AttractionOut]


# ---------- itinerary ----------
class ActivityIO(BaseModel):
    id: int | None = None
    attraction_id: int | None = None
    slot: Slot = "morning"
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    image_url: str = ""
    duration_hours: float = Field(default=1.0, ge=0, le=24)
    estimated_cost: float = Field(default=0, ge=0)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    position: int = 0

    @model_validator(mode="after")
    def coords_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together")
        return self


class DayIO(BaseModel):
    id: int | None = None
    day_number: int = Field(ge=1)
    title: str = Field(default="", max_length=160)
    notes: str = Field(default="", max_length=4000)
    activities: list[ActivityIO] = []


class ExpenseIO(BaseModel):
    id: int | None = None
    category: str
    estimated: float = Field(ge=0)
    actual: float = Field(default=0, ge=0)

    @field_validator("category")
    @classmethod
    def known_category(cls, v: str) -> str:
        if v not in CATEGORIES:
            raise ValueError(f"category must be one of: {', '.join(CATEGORIES)}")
        return v


class PackingIO(BaseModel):
    id: int | None = None
    label: str = Field(min_length=1, max_length=160)
    packed: bool = False


# ---------- trips ----------
class TripCore(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    start_city: str = Field(min_length=1, max_length=120)
    destination_id: int | None = None
    start_date: date
    end_date: date
    travelers: int = Field(ge=1, le=30)
    budget: float = Field(ge=0, le=100_000_000)
    currency: Literal["INR"] = "INR"
    travel_style: Style = "budget"
    pace: Pace = "balanced"
    transport: Transport = "train"
    accommodation: Accommodation = "budget"
    interests: list[str] = []
    notes: str = Field(default="", max_length=5000)

    @model_validator(mode="after")
    def dates_ok(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must not be before start_date")
        if (self.end_date - self.start_date).days > 60:
            raise ValueError("trips longer than 60 days are not supported")
        return self

    @field_validator("interests")
    @classmethod
    def valid_interests(cls, v: list[str]) -> list[str]:
        bad = [i for i in v if i not in INTERESTS]
        if bad:
            raise ValueError(f"unknown interests: {', '.join(bad)}. Allowed: {', '.join(INTERESTS)}")
        return list(dict.fromkeys(v))


class TripCreate(TripCore):
    overview: str = ""
    tips: list[str] = []
    weather_alternatives: list[str] = []
    generated_by: Literal["manual", "rule_based", "llm"] = "manual"
    days: list[DayIO] = []
    expenses: list[ExpenseIO] = []


class TripUpdate(TripCore):
    overview: str | None = None
    tips: list[str] | None = None
    weather_alternatives: list[str] | None = None


class TripSummary(ORM):
    id: int
    title: str
    start_city: str
    destination_id: int | None
    destination_name: str | None = None
    start_date: date
    end_date: date
    travelers: int
    budget: float
    currency: str
    generated_by: str
    status: str = "upcoming"
    estimated_total: float | None = None
    created_at: datetime


class TripDetail(TripCore):
    id: int
    overview: str
    tips: list[str]
    weather_alternatives: list[str]
    generated_by: str
    status: str
    destination_name: str | None = None
    days: list[DayIO]
    expenses: list[ExpenseIO]
    packing: list[PackingIO]
    created_at: datetime
    updated_at: datetime


class GenerateIn(BaseModel):
    start_city: str = Field(min_length=1, max_length=120)
    destination_id: int | None = None  # None => "suggest a destination"
    start_date: date
    end_date: date
    travelers: int = Field(ge=1, le=30)
    budget: float = Field(ge=0, le=100_000_000)
    currency: Literal["INR"] = "INR"
    travel_style: Style = "budget"
    pace: Pace = "balanced"
    transport: Transport = "train"
    accommodation: Accommodation = "budget"
    interests: list[str] = []
    dietary: str = Field(default="", max_length=200)
    avoid_crowds: bool = False
    use_llm: bool = True

    @model_validator(mode="after")
    def dates_ok(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must not be before start_date")
        if (self.end_date - self.start_date).days > 60:
            raise ValueError("trips longer than 60 days are not supported")
        return self

    @field_validator("interests")
    @classmethod
    def valid_interests(cls, v: list[str]) -> list[str]:
        bad = [i for i in v if i not in INTERESTS]
        if bad:
            raise ValueError(f"unknown interests: {', '.join(bad)}")
        return list(dict.fromkeys(v))


class BudgetUpdate(BaseModel):
    expenses: list[ExpenseIO]


# ---------- favourites ----------
class FavoriteIn(BaseModel):
    destination_id: int


class FavoriteOut(ORM):
    id: int
    destination_id: int
    created_at: datetime
    destination: DestinationOut


# ---------- AI chat ----------
class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: int | None = None


class ChatMessageOut(ORM):
    id: int
    role: str
    content: str
    source: str
    payload: dict | None = None
    created_at: datetime


class ConversationOut(ORM):
    id: int
    title: str
    created_at: datetime
    messages: list[ChatMessageOut] = []
