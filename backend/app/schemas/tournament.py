from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class TournamentCreate(BaseModel):
    name: str
    location: Optional[str] = None
    start_date: Optional[date] = None
    game_format: str = "501"
    num_players: int = 0
    group_size: int = 4
    best_of_legs_pool: int = 5
    best_of_legs_knockout: int = 7
    is_published: bool = False


class TournamentUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[date] = None
    game_format: Optional[str] = None
    num_players: Optional[int] = None
    group_size: Optional[int] = None
    best_of_legs_pool: Optional[int] = None
    best_of_legs_knockout: Optional[int] = None
    is_published: Optional[bool] = None


class TournamentOut(BaseModel):
    id: int
    name: str
    location: Optional[str] = None
    start_date: Optional[date] = None
    game_format: str
    num_players: int
    group_size: int
    best_of_legs_pool: int
    best_of_legs_knockout: int
    status: str
    is_published: bool = False
    created_by: int
    created_by_username: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    player_count: Optional[int] = None

    class Config:
        from_attributes = True


class PoolMatchOut(BaseModel):
    id: int
    pool_id: int
    tournament_id: int
    player1_id: int
    player2_id: int
    player1_legs: int
    player2_legs: int
    winner_id: Optional[int] = None
    played: int
    round_number: int
    play_order: Optional[int] = None
    player1_name: Optional[str] = None
    player2_name: Optional[str] = None
    winner_name: Optional[str] = None
    pool_name: Optional[str] = None

    class Config:
        from_attributes = True


class PoolOut(BaseModel):
    id: int
    tournament_id: int
    name: str
    players: List[dict] = []
    matches: List[PoolMatchOut] = []

    class Config:
        from_attributes = True


class StandingEntry(BaseModel):
    player_id: int
    player_name: str
    pool_name: str
    matches_played: int
    wins: int
    losses: int
    legs_won: int
    legs_lost: int
    leg_difference: int
    points: int


class MatchScoreUpdate(BaseModel):
    player1_legs: int
    player2_legs: int


class BracketMatchOut(BaseModel):
    id: int
    tournament_id: int
    bracket_type: str
    round_number: int
    match_number: int
    player1_id: Optional[int] = None
    player2_id: Optional[int] = None
    player1_legs: int
    player2_legs: int
    winner_id: Optional[int] = None
    loser_id: Optional[int] = None
    played: int
    next_winner_match_id: Optional[int] = None
    next_loser_match_id: Optional[int] = None
    player1_name: Optional[str] = None
    player2_name: Optional[str] = None

    class Config:
        from_attributes = True


class AddPlayersToTournament(BaseModel):
    player_ids: List[int]


class DashboardStats(BaseModel):
    active_tournaments: int
    total_players: int
    matches_played: int
    total_tournaments: int
