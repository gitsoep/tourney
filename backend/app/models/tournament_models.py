from sqlalchemy import (
    Column, Integer, ForeignKey, DateTime, String, func
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class TournamentPlayer(Base):
    __tablename__ = "tournament_players"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    seed = Column(Integer, nullable=True)
    pool_id = Column(Integer, ForeignKey("pools.id", ondelete="SET NULL"), nullable=True)

    tournament = relationship("Tournament", back_populates="players")
    player = relationship("Player")
    pool = relationship("Pool", back_populates="players")


class Pool(Base):
    __tablename__ = "pools"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)

    tournament = relationship("Tournament", back_populates="pools")
    players = relationship("TournamentPlayer", back_populates="pool")
    matches = relationship("PoolMatch", back_populates="pool", cascade="all, delete-orphan")


class PoolMatch(Base):
    __tablename__ = "pool_matches"

    id = Column(Integer, primary_key=True, index=True)
    pool_id = Column(Integer, ForeignKey("pools.id", ondelete="CASCADE"), nullable=False)
    tournament_id = Column(Integer, ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    player1_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    player2_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    player1_legs = Column(Integer, default=0)
    player2_legs = Column(Integer, default=0)
    winner_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    played = Column(Integer, default=0)  # 0 = not played, 1 = played
    round_number = Column(Integer, default=1)
    play_order = Column(Integer, nullable=True)  # global play order across all pools

    pool = relationship("Pool", back_populates="matches")
    player1 = relationship("Player", foreign_keys=[player1_id])
    player2 = relationship("Player", foreign_keys=[player2_id])
    winner = relationship("Player", foreign_keys=[winner_id])


class BracketMatch(Base):
    __tablename__ = "bracket_matches"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    bracket_type = Column(String(20), nullable=False)  # "winner", "loser", "grand_final"
    round_number = Column(Integer, nullable=False)
    match_number = Column(Integer, nullable=False)
    player1_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    player2_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    player1_legs = Column(Integer, default=0)
    player2_legs = Column(Integer, default=0)
    winner_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    loser_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    played = Column(Integer, default=0)
    next_winner_match_id = Column(Integer, ForeignKey("bracket_matches.id"), nullable=True)
    next_loser_match_id = Column(Integer, ForeignKey("bracket_matches.id"), nullable=True)

    tournament = relationship("Tournament", back_populates="bracket_matches")
    player1 = relationship("Player", foreign_keys=[player1_id])
    player2 = relationship("Player", foreign_keys=[player2_id])
    winner = relationship("Player", foreign_keys=[winner_id])
    loser = relationship("Player", foreign_keys=[loser_id])
    next_winner_match = relationship("BracketMatch", foreign_keys=[next_winner_match_id], remote_side=[id])
    next_loser_match = relationship("BracketMatch", foreign_keys=[next_loser_match_id], remote_side=[id])
