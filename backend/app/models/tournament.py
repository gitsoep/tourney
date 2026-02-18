from sqlalchemy import (
    Column, Integer, String, DateTime, Date, Boolean, ForeignKey, Enum, func
)
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base
# NOTE: Ranking import is deferred to avoid circular imports; relationship uses string ref.


class TournamentStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    POOL_STAGE = "pool_stage"
    KNOCKOUT_STAGE = "knockout_stage"
    FINISHED = "finished"


class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    location = Column(String(200), nullable=True)
    start_date = Column(Date, nullable=True)
    game_format = Column(String(50), default="501")
    num_players = Column(Integer, default=0)
    group_size = Column(Integer, default=4)
    best_of_legs_pool = Column(Integer, default=5)
    best_of_legs_knockout = Column(Integer, default=7)
    status = Column(
        String(30), default=TournamentStatus.NOT_STARTED, nullable=False
    )
    is_published = Column(Boolean, default=False, nullable=False)
    ranking_id = Column(Integer, ForeignKey("rankings.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    creator = relationship("User")
    ranking = relationship("Ranking", back_populates="tournaments")
    players = relationship("TournamentPlayer", back_populates="tournament", cascade="all, delete-orphan")
    pools = relationship("Pool", back_populates="tournament", cascade="all, delete-orphan")
    bracket_matches = relationship("BracketMatch", back_populates="tournament", cascade="all, delete-orphan")
