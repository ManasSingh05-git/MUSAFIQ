from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserPreference
from ..schemas import LoginIn, PreferencesIO, RegisterIn, TokenOut, UserOut
from ..schemas import INTERESTS
from ..security import create_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(email=email, name=data.name, password_hash=hash_password(data.password))
    user.preferences = UserPreference()
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    # Same message for unknown email and wrong password (no account enumeration).
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return TokenOut(access_token=create_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.get("/preferences", response_model=PreferencesIO)
def get_preferences(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.preferences is None:
        user.preferences = UserPreference()
        db.commit()
    return user.preferences


@router.put("/preferences", response_model=PreferencesIO)
def put_preferences(data: PreferencesIO, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bad = [i for i in data.interests if i not in INTERESTS]
    if bad:
        raise HTTPException(status_code=422, detail=f"unknown interests: {', '.join(bad)}")
    pref = user.preferences or UserPreference(user_id=user.id)
    pref.home_city = data.home_city
    pref.currency = data.currency
    pref.travel_style = data.travel_style
    pref.interests = data.interests
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref
