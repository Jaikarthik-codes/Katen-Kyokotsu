from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Index,
    MetaData,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Deterministic constraint names keep Alembic migrations stable across machines.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint("status in ('live','wip','archived')", name="status"),
        Index("ix_projects_stack_gin", "stack", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    summary: Mapped[str] = mapped_column(String(300))
    body_md: Mapped[str] = mapped_column(Text, default="", server_default="")
    stack: Mapped[list[str]] = mapped_column(ARRAY(String(40)), default=list, server_default="{}")
    status: Mapped[str] = mapped_column(String(10))
    repo_url: Mapped[str | None] = mapped_column(String(300))
    live_url: Mapped[str | None] = mapped_column(String(300))
    started_on: Mapped[date | None] = mapped_column(Date)
    featured: Mapped[bool] = mapped_column(default=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), unique=True)
    category: Mapped[str] = mapped_column(String(40))
    years: Mapped[Decimal | None] = mapped_column(Numeric(3, 1))
    sort_order: Mapped[int] = mapped_column(default=0, server_default="0")


class Experience(Base):
    __tablename__ = "experience"
    __table_args__ = (
        CheckConstraint("kind in ('education','work','training')", name="kind"),
        UniqueConstraint("kind", "org", "title", "start", name="uq_experience_natural"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(10))
    org: Mapped[str] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(120))
    start: Mapped[date] = mapped_column(Date)
    end: Mapped[date | None] = mapped_column(Date)
    highlights: Mapped[list[str]] = mapped_column(
        ARRAY(String(300)), default=list, server_default="{}"
    )


class ContactMessage(Base):
    __tablename__ = "contact_messages"
    __table_args__ = (Index("ix_contact_ip_created", "ip_hash", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254))
    message: Mapped[str] = mapped_column(Text)
    ip_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
