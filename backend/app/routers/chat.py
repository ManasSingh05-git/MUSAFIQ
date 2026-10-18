"""AI assistant endpoints with persisted conversations."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..ai import check_rate_limit, handle_chat, llm_available
from ..database import get_db
from ..models import ChatConversation, ChatMessage, User
from ..schemas import ChatIn, ConversationOut
from ..security import get_current_user

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _owned_conversation(db: Session, user: User, cid: int) -> ChatConversation:
    c = db.get(ChatConversation, cid)
    if c is None or c.user_id != user.id:
        raise HTTPException(404, "Conversation not found.")
    return c


@router.get("/status")
def ai_status():
    """Lets the UI show honestly whether a live LLM is configured."""
    return {"llm_configured": llm_available(),
            "mode": "llm" if llm_available() else "rule_based",
            "note": "Plans, prices and coordinates always come from the sample dataset; the LLM only explains."}


@router.post("/chat")
def chat(body: ChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not check_rate_limit(user.id):
        raise HTTPException(429, "Too many AI requests. Please wait a minute and try again.")

    if body.conversation_id is not None:
        conv = _owned_conversation(db, user, body.conversation_id)
    else:
        conv = ChatConversation(user_id=user.id, title=body.message[:60], context={})
        db.add(conv)
        db.flush()

    db.add(ChatMessage(conversation_id=conv.id, role="user", content=body.message, source="user"))
    default_city = user.preferences.home_city if user.preferences else "Mumbai"
    try:
        reply, source, payload, ctx = handle_chat(db, conv.context or {}, body.message, default_city)
    except Exception:  # never leak internals; the user message is already stored
        db.rollback()
        raise HTTPException(500, "The assistant hit an internal error. Please rephrase and try again.")
    conv.context = ctx
    msg = ChatMessage(conversation_id=conv.id, role="assistant", content=reply, source=source, payload=payload)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"conversation_id": conv.id, "message": {
        "id": msg.id, "role": "assistant", "content": reply, "source": source, "payload": payload,
        "created_at": msg.created_at}}


@router.get("/conversations", response_model=list[ConversationOut])
def conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(ChatConversation).filter(ChatConversation.user_id == user.id).order_by(ChatConversation.id.desc()).all()
    return rows


@router.get("/conversations/{cid}", response_model=ConversationOut)
def conversation(cid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _owned_conversation(db, user, cid)


@router.delete("/conversations/{cid}", status_code=204)
def clear_conversation(cid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(_owned_conversation(db, user, cid))
    db.commit()
