from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, func
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Ranking(Base):
    __tablename__ = "rankings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    # "fixed" = configurable per-placement points, "flexible" = bracket depth based
    points_mode = Column(String(20), default="fixed", nullable=False)
    # Flexible mode multipliers
    winner_bracket_multiplier = Column(Integer, default=2)
    loser_bracket_multiplier = Column(Integer, default=1)
    # Flexible mode base points per bracket
    flexible_base_winner = Column(Integer, default=0)
    flexible_base_loser = Column(Integer, default=0)
    # Configurable points per placement (used in fixed mode)
    points_first = Column(Integer, default=10)
    points_second = Column(Integer, default=8)
    points_third = Column(Integer, default=6)
    points_fourth = Column(Integer, default=5)
    points_fifth = Column(Integer, default=4)
    points_sixth = Column(Integer, default=3)
    points_seventh = Column(Integer, default=2)
    points_eighth = Column(Integer, default=1)
    points_participation = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    creator = relationship("User")
    tournaments = relationship("Tournament", back_populates="ranking")
    entries = relationship("RankingEntry", back_populates="ranking", cascade="all, delete-orphan")


class RankingEntry(Base):
    __tablename__ = "ranking_entries"

    id = Column(Integer, primary_key=True, index=True)
    ranking_id = Column(Integer, ForeignKey("rankings.id", ondelete="CASCADE"), nullable=False)
    tournament_id = Column(Integer, ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    placement = Column(Integer, nullable=True)  # final placement in tournament (1=winner, etc.)
    points = Column(Integer, default=0)

    ranking = relationship("Ranking", back_populates="entries")
    tournament = relationship("Tournament")
    player = relationship("Player")
