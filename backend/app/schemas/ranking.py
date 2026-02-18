from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class RankingCreate(BaseModel):
    name: str
    description: Optional[str] = None
    points_mode: str = "fixed"  # "fixed" or "flexible"
    winner_bracket_multiplier: int = 2
    loser_bracket_multiplier: int = 1
    flexible_base_winner: int = 0
    flexible_base_loser: int = 0
    points_first: int = 10
    points_second: int = 8
    points_third: int = 6
    points_fourth: int = 5
    points_fifth: int = 4
    points_sixth: int = 3
    points_seventh: int = 2
    points_eighth: int = 1
    points_participation: int = 0


class RankingUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    points_mode: Optional[str] = None
    winner_bracket_multiplier: Optional[int] = None
    loser_bracket_multiplier: Optional[int] = None
    flexible_base_winner: Optional[int] = None
    flexible_base_loser: Optional[int] = None
    points_first: Optional[int] = None
    points_second: Optional[int] = None
    points_third: Optional[int] = None
    points_fourth: Optional[int] = None
    points_fifth: Optional[int] = None
    points_sixth: Optional[int] = None
    points_seventh: Optional[int] = None
    points_eighth: Optional[int] = None
    points_participation: Optional[int] = None


class RankingOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    points_mode: str
    winner_bracket_multiplier: int
    loser_bracket_multiplier: int
    flexible_base_winner: int
    flexible_base_loser: int
    points_first: int
    points_second: int
    points_third: int
    points_fourth: int
    points_fifth: int
    points_sixth: int
    points_seventh: int
    points_eighth: int
    points_participation: int
    created_by: int
    created_by_username: Optional[str] = None
    tournament_count: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RankingEntryOut(BaseModel):
    id: int
    ranking_id: int
    tournament_id: int
    tournament_name: Optional[str] = None
    player_id: int
    player_name: Optional[str] = None
    placement: Optional[int] = None
    points: int

    class Config:
        from_attributes = True


class RankingStandingEntry(BaseModel):
    player_id: int
    player_name: str
    total_points: int
    tournaments_played: int
    best_placement: Optional[int] = None
    tournament_results: List[RankingEntryOut] = []


class RankingEntryCreate(BaseModel):
    tournament_id: int
    player_id: int
    placement: Optional[int] = None
    points: int
