import hashlib
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.errors import ApiError
from app.models import ContactMessage
from app.schemas import ContactAccepted, ContactIn

router = APIRouter(tags=["contact"])
Session = Annotated[AsyncSession, Depends(get_session)]


def client_ip(request: Request, trust_proxy: bool, hops: int = 1) -> str:
    """Visitor IP.

    X-Forwarded-For is only trusted behind a known proxy. Each trusted proxy appends
    the address it saw on the right, so the real client is `hops` entries from the
    right. Everything further left was written by the client and can be faked.
    """
    if trust_proxy:
        parts = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",")]
        parts = [p for p in parts if p]
        if len(parts) >= hops:
            return parts[-hops]
    return request.client.host if request.client else "unknown"


def hash_ip(ip: str, salt: str) -> str:
    """We only ever store this hash, never the raw IP."""
    return hashlib.sha256((salt + ip).encode()).hexdigest()


@router.post("/contact", status_code=202, response_model=ContactAccepted)
async def send_message(body: ContactIn, request: Request, session: Session) -> ContactAccepted:
    settings = request.app.state.settings
    if body.website:
        # Pretend success so bots learn nothing, but store nothing.
        return ContactAccepted(status="received")

    ip = client_ip(request, settings.trust_proxy_headers, settings.trusted_proxy_hops)
    ip_hash = hash_ip(ip, settings.ip_hash_salt)
    async with session.begin():
        # Serialize requests from the same visitor so two at once can't both pass the limit.
        await session.execute(select(func.pg_advisory_xact_lock(func.hashtext(ip_hash))))
        recent = await session.execute(
            select(func.count())
            .select_from(ContactMessage)
            .where(
                ContactMessage.ip_hash == ip_hash,
                ContactMessage.created_at > func.now() - timedelta(hours=1),
            )
        )
        if recent.scalar_one() >= settings.contact_limit_per_hour:
            raise ApiError(429, "rate_limited", "Too many messages. Please try again later.")
        session.add(
            ContactMessage(name=body.name, email=body.email, message=body.message, ip_hash=ip_hash)
        )
    return ContactAccepted(status="received")
