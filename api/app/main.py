import os
from collections import Counter
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, create_engine, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dealflow.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(engine, expire_on_commit=False)
STAGES = ("new", "contacted", "qualified", "meeting", "proposal", "won", "lost")
Stage = Literal["new", "contacted", "qualified", "meeting", "proposal", "won", "lost"]
Kind = Literal["call", "email", "meeting", "note"]


def utcnow():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Workspace(Base):
    __tablename__ = "workspaces"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))


class Prospect(Base):
    __tablename__ = "prospects"
    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    company: Mapped[str] = mapped_column(String(160), index=True)
    email: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(50), default="")
    source: Mapped[str] = mapped_column(String(80), default="Outbound")
    stage: Mapped[str] = mapped_column(String(20), default="new", index=True)
    value: Mapped[int] = mapped_column(Integer, default=0)
    follow_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    activities: Mapped[list["Activity"]] = relationship(back_populates="prospect", cascade="all, delete-orphan")


class Activity(Base):
    __tablename__ = "activities"
    id: Mapped[int] = mapped_column(primary_key=True)
    prospect_id: Mapped[int] = mapped_column(ForeignKey("prospects.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    outcome: Mapped[str] = mapped_column(String(80), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    prospect: Mapped[Prospect] = relationship(back_populates="activities")


class ProspectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    company: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str = Field(default="", max_length=50)
    source: str = Field(default="Outbound", max_length=80)
    stage: Stage = "new"
    value: int = Field(default=0, ge=0)
    follow_up_at: datetime | None = None


class ProspectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    company: str | None = Field(default=None, min_length=2, max_length=160)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    source: str | None = Field(default=None, max_length=80)
    stage: Stage | None = None
    value: int | None = Field(default=None, ge=0)
    follow_up_at: datetime | None = None


class ProspectOut(ProspectCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    activity_count: int = 0
    last_contact_at: datetime | None = None


class ActivityCreate(BaseModel):
    kind: Kind
    outcome: str = Field(default="", max_length=80)
    note: str = Field(default="", max_length=3000)


class ActivityOut(ActivityCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    prospect_id: int
    created_at: datetime


def get_db():
    with SessionLocal() as db:
        yield db


def seed(db: Session):
    if db.scalar(select(Workspace.id).limit(1)):
        return
    db.add(Workspace(id=1, name="Demo workspace"))
    now = utcnow()
    samples = [
        ("Maya Patel", "Northstar Studio", "maya@northstar.example", "qualified", 6800, -2, "Referral"),
        ("Oliver Reed", "Meridian Coffee", "oliver@meridian.example", "meeting", 4200, 1, "Outbound"),
        ("Amara Okafor", "Forma Fitness", "amara@forma.example", "proposal", 12500, 0, "Website"),
        ("Leo Martin", "Fieldwork Co", "leo@fieldwork.example", "contacted", 3100, -1, "Outbound"),
        ("Sofia Chen", "Good Goods", "sofia@goodgoods.example", "new", 2400, 2, "Outbound"),
        ("Noah Williams", "Brightside Labs", "noah@brightside.example", "won", 9200, None, "Referral"),
        ("Zara Ahmed", "Common Ground", "zara@commonground.example", "lost", 1900, None, "Website"),
        ("Ethan Brooks", "Harbour Supply", "ethan@harbour.example", "qualified", 5400, 3, "Outbound"),
    ]
    for name, company, email, stage, value, offset, source in samples:
        p = Prospect(workspace_id=1, name=name, company=company, email=email, stage=stage, value=value,
                     follow_up_at=now + timedelta(days=offset) if offset is not None else None, source=source)
        db.add(p)
        db.flush()
        if stage != "new":
            db.add(Activity(prospect_id=p.id, kind="call", outcome="Connected" if stage != "lost" else "Not interested",
                            note="Introduced the solution and agreed next steps." if stage != "lost" else "Closed for now.",
                            created_at=now - timedelta(days=2)))
    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="DealFlow AI API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def as_out(db: Session, p: Prospect) -> ProspectOut:
    count, latest = db.execute(select(func.count(Activity.id), func.max(Activity.created_at)).where(Activity.prospect_id == p.id)).one()
    return ProspectOut.model_validate(p, from_attributes=True).model_copy(update={"activity_count": count, "last_contact_at": latest})


def get_prospect(db: Session, prospect_id: int) -> Prospect:
    p = db.scalar(select(Prospect).where(Prospect.id == prospect_id, Prospect.workspace_id == 1))
    if not p:
        raise HTTPException(404, "Prospect not found")
    return p


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/prospects", response_model=list[ProspectOut])
def list_prospects(search: str = Query(default="", max_length=160), stage: Stage | None = None, db: Session = Depends(get_db)):
    query = select(Prospect).where(Prospect.workspace_id == 1)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(Prospect.name.ilike(term) | Prospect.company.ilike(term) | Prospect.email.ilike(term))
    if stage:
        query = query.where(Prospect.stage == stage)
    return [as_out(db, p) for p in db.scalars(query.order_by(Prospect.updated_at.desc(), Prospect.id.desc())).all()]


@app.post("/api/prospects", response_model=ProspectOut, status_code=201)
def create_prospect(data: ProspectCreate, db: Session = Depends(get_db)):
    p = Prospect(workspace_id=1, **data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return as_out(db, p)


@app.patch("/api/prospects/{prospect_id}", response_model=ProspectOut)
def update_prospect(prospect_id: int, data: ProspectUpdate, db: Session = Depends(get_db)):
    p = get_prospect(db, prospect_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(p, key, value)
    p.updated_at = utcnow()
    db.commit()
    db.refresh(p)
    return as_out(db, p)


@app.get("/api/prospects/{prospect_id}/activities", response_model=list[ActivityOut])
def list_activities(prospect_id: int, db: Session = Depends(get_db)):
    get_prospect(db, prospect_id)
    return db.scalars(select(Activity).where(Activity.prospect_id == prospect_id).order_by(Activity.created_at.desc())).all()


@app.post("/api/prospects/{prospect_id}/activities", response_model=ActivityOut, status_code=201)
def add_activity(prospect_id: int, data: ActivityCreate, db: Session = Depends(get_db)):
    p = get_prospect(db, prospect_id)
    activity = Activity(prospect_id=p.id, **data.model_dump())
    p.updated_at = utcnow()
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    prospects = db.scalars(select(Prospect).where(Prospect.workspace_id == 1)).all()
    now = utcnow()
    counts = Counter(p.stage for p in prospects)
    overdue = [p for p in prospects if p.stage not in ("won", "lost") and p.follow_up_at and p.follow_up_at.replace(tzinfo=timezone.utc) < now]
    since = now - timedelta(days=7)
    activity_week = db.scalar(select(func.count(Activity.id)).join(Prospect).where(Prospect.workspace_id == 1, Activity.created_at >= since)) or 0
    queue = []
    for p in prospects:
        if p.stage in ("won", "lost"):
            continue
        if p.follow_up_at and p.follow_up_at.replace(tzinfo=timezone.utc) < now:
            reason, priority = "Follow-up is overdue", 0
        elif p.stage == "new":
            reason, priority = "New lead awaiting first contact", 1
        elif p.follow_up_at and p.follow_up_at.replace(tzinfo=timezone.utc) < now + timedelta(days=1):
            reason, priority = "Follow-up due within 24 hours", 2
        else:
            continue
        queue.append({"id": p.id, "name": p.name, "company": p.company, "stage": p.stage,
                      "reason": reason, "priority": priority, "follow_up_at": p.follow_up_at})
    queue.sort(key=lambda item: (item["priority"], item["follow_up_at"] or now))
    decided = counts["won"] + counts["lost"]
    return {"total": len(prospects), "pipeline_value": sum(p.value for p in prospects if p.stage not in ("won", "lost")),
            "overdue": len(overdue), "activities_week": activity_week,
            "win_rate": round(100 * counts["won"] / decided) if decided else 0,
            "stages": {stage: counts[stage] for stage in STAGES}, "attention": queue[:8]}
