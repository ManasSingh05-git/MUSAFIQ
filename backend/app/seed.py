"""Database initialisation and idempotent seeding."""
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Attraction, Destination, User, UserPreference
from .security import hash_password
from .seed_data import DESTINATIONS

DEMO_EMAIL = "demo@tourplan.ai"
DEMO_PASSWORD = "demo12345"  # public demo credential for the lab; change/remove for any real deployment


def seed_destinations(db: Session) -> int:
    if db.query(Destination).count() > 0:
        return 0
    for d in DESTINATIONS:
        dest = Destination(
            slug=d["slug"], name=d["name"], country=d["country"], region=d["region"],
            description=d["description"], image_url=f"/images/{d['slug']}.jpg",
            latitude=d["lat"], longitude=d["lon"], categories=d["categories"], interests=d["interests"],
            climate=d["climate"], best_months=d["best_months"], crowd_level=d["crowd"],
            suggested_days=d["days"], stay_per_night_inr=d["stay"], food_per_day_inr=d["food"],
            local_transport_per_day_inr=d["local"], activities_per_day_inr=d["activities"],
            practical_info=d["info"],
        )
        for idx, item in enumerate(d["attractions"]):
            name, desc, lat, lon, tags, hours, fee, best, crowded = item[:9]
            attr_img = f"/images/attractions/{d['slug']}_{idx}.jpg"
            dest.attractions.append(Attraction(
                name=name, description=desc, latitude=lat, longitude=lon, tags=tags,
                duration_hours=hours, entry_fee_inr=fee, best_time=best, crowded=crowded,
                image_url=attr_img,
            ))
        db.add(dest)
    db.commit()
    return len(DESTINATIONS)


def seed_demo_user(db: Session) -> None:
    if db.query(User).filter_by(email=DEMO_EMAIL).first():
        return
    user = User(email=DEMO_EMAIL, name="Demo Traveller", password_hash=hash_password(DEMO_PASSWORD))
    user.preferences = UserPreference(home_city="Mumbai", interests=["photography", "food", "nature"])
    db.add(user)
    db.commit()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_destinations(db)
        seed_demo_user(db)


if __name__ == "__main__":
    init_db()
    print("Database initialised and seeded.")
