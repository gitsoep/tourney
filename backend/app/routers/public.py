from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.player import Player
from app.models.tournament import Tournament
from app.models.tournament_models import TournamentPlayer, Pool, PoolMatch, BracketMatch
from app.models.ranking import Ranking
from app.schemas.tournament import (
    TournamentOut, PoolOut, PoolMatchOut, StandingEntry, BracketMatchOut,
)
from app.schemas.ranking import RankingOut, RankingStandingEntry
from app.services.pool_service import get_pool_standings
from app.services.ranking_service import get_ranking_standings

router = APIRouter(prefix="/api/public", tags=["public"])


def _get_published_tournament(tid: int, db: Session) -> Tournament:
    """Get tournament only if it is published."""
    t = db.query(Tournament).filter(Tournament.id == tid, Tournament.is_published == True).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return t


@router.get("/tournaments", response_model=List[TournamentOut])
def list_published_tournaments(db: Session = Depends(get_db)):
    tournaments = (
        db.query(Tournament)
        .filter(Tournament.is_published == True)
        .order_by(Tournament.created_at.desc())
        .all()
    )
    result = []
    for t in tournaments:
        out = TournamentOut.model_validate(t)
        out.player_count = (
            db.query(TournamentPlayer)
            .filter(TournamentPlayer.tournament_id == t.id)
            .count()
        )
        if t.ranking_id:
            ranking = db.query(Ranking).filter(Ranking.id == t.ranking_id).first()
            out.ranking_name = ranking.name if ranking else None
        result.append(out)
    return result


@router.get("/tournaments/{tid}", response_model=TournamentOut)
def get_published_tournament(tid: int, db: Session = Depends(get_db)):
    t = _get_published_tournament(tid, db)
    out = TournamentOut.model_validate(t)
    out.player_count = (
        db.query(TournamentPlayer).filter(TournamentPlayer.tournament_id == t.id).count()
    )
    if t.ranking_id:
        ranking = db.query(Ranking).filter(Ranking.id == t.ranking_id).first()
        out.ranking_name = ranking.name if ranking else None
    return out


@router.get("/tournaments/{tid}/pools", response_model=List[PoolOut])
def get_published_pools(tid: int, db: Session = Depends(get_db)):
    _get_published_tournament(tid, db)
    pools = db.query(Pool).filter(Pool.tournament_id == tid).all()
    result = []
    for pool in pools:
        tp_list = db.query(TournamentPlayer).filter(TournamentPlayer.pool_id == pool.id).all()
        players = []
        for tp in tp_list:
            p = db.query(Player).filter(Player.id == tp.player_id).first()
            players.append({
                "player_id": tp.player_id,
                "player_name": p.name if p else "Unknown",
                "seed": tp.seed,
            })

        matches = (
            db.query(PoolMatch)
            .filter(PoolMatch.pool_id == pool.id)
            .order_by(PoolMatch.play_order.asc().nullslast(), PoolMatch.id.asc())
            .all()
        )
        match_list = []
        for m in matches:
            p1 = db.query(Player).filter(Player.id == m.player1_id).first()
            p2 = db.query(Player).filter(Player.id == m.player2_id).first()
            w = db.query(Player).filter(Player.id == m.winner_id).first() if m.winner_id else None
            match_list.append(PoolMatchOut(
                id=m.id,
                pool_id=m.pool_id,
                tournament_id=m.tournament_id,
                player1_id=m.player1_id,
                player2_id=m.player2_id,
                player1_legs=m.player1_legs,
                player2_legs=m.player2_legs,
                winner_id=m.winner_id,
                played=m.played,
                round_number=m.round_number,
                play_order=m.play_order,
                player1_name=p1.name if p1 else None,
                player2_name=p2.name if p2 else None,
                winner_name=w.name if w else None,
                pool_name=pool.name,
            ))

        result.append(PoolOut(
            id=pool.id,
            tournament_id=pool.tournament_id,
            name=pool.name,
            players=players,
            matches=match_list,
        ))
    return result


@router.get("/tournaments/{tid}/standings", response_model=List[StandingEntry])
def get_published_standings(tid: int, db: Session = Depends(get_db)):
    _get_published_tournament(tid, db)
    return get_pool_standings(db, tid)


@router.get("/tournaments/{tid}/bracket", response_model=List[BracketMatchOut])
def get_published_bracket(tid: int, db: Session = Depends(get_db)):
    _get_published_tournament(tid, db)
    matches = (
        db.query(BracketMatch)
        .filter(BracketMatch.tournament_id == tid)
        .order_by(BracketMatch.bracket_type, BracketMatch.round_number, BracketMatch.match_number)
        .all()
    )
    result = []
    for m in matches:
        p1 = db.query(Player).filter(Player.id == m.player1_id).first() if m.player1_id else None
        p2 = db.query(Player).filter(Player.id == m.player2_id).first() if m.player2_id else None
        result.append(BracketMatchOut(
            id=m.id, tournament_id=m.tournament_id,
            bracket_type=m.bracket_type, round_number=m.round_number,
            match_number=m.match_number,
            player1_id=m.player1_id, player2_id=m.player2_id,
            player1_legs=m.player1_legs, player2_legs=m.player2_legs,
            winner_id=m.winner_id, loser_id=m.loser_id, played=m.played,
            next_winner_match_id=m.next_winner_match_id,
            next_loser_match_id=m.next_loser_match_id,
            player1_name=p1.name if p1 else None,
            player2_name=p2.name if p2 else None,
        ))
    return result


@router.get("/tournaments/{tid}/ranking-points")
def get_published_ranking_points(tid: int, db: Session = Depends(get_db)):
    """Get ranking points per player for a published tournament."""
    from app.models.ranking import RankingEntry
    t = _get_published_tournament(tid, db)
    if not t.ranking_id:
        return []
    entries = (
        db.query(RankingEntry)
        .filter(RankingEntry.ranking_id == t.ranking_id, RankingEntry.tournament_id == tid)
        .all()
    )
    return [
        {
            "player_id": e.player_id,
            "player_name": e.player.name if e.player else None,
            "placement": e.placement,
            "points": e.points,
        }
        for e in entries
    ]


# ── Public Rankings ──
@router.get("/rankings", response_model=List[RankingOut])
def list_public_rankings(db: Session = Depends(get_db)):
    """List all rankings (public view)."""
    rankings = db.query(Ranking).order_by(Ranking.created_at.desc()).all()
    result = []
    for r in rankings:
        out = RankingOut.model_validate(r)
        out.tournament_count = (
            db.query(Tournament)
            .filter(Tournament.ranking_id == r.id)
            .count()
        )
        result.append(out)
    return result


@router.get("/rankings/{rid}", response_model=RankingOut)
def get_public_ranking(rid: int, db: Session = Depends(get_db)):
    r = db.query(Ranking).filter(Ranking.id == rid).first()
    if not r:
        raise HTTPException(status_code=404, detail="Ranking not found")
    out = RankingOut.model_validate(r)
    out.tournament_count = db.query(Tournament).filter(Tournament.ranking_id == r.id).count()
    return out


@router.get("/rankings/{rid}/standings", response_model=List[RankingStandingEntry])
def get_public_ranking_standings(rid: int, db: Session = Depends(get_db)):
    r = db.query(Ranking).filter(Ranking.id == rid).first()
    if not r:
        raise HTTPException(status_code=404, detail="Ranking not found")
    return get_ranking_standings(db, rid)

