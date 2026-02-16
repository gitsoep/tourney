from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import require_admin, get_current_user
from app.models.user import User
from app.models.player import Player
from app.models.tournament import Tournament, TournamentStatus
from app.models.tournament_models import TournamentPlayer, Pool, PoolMatch, BracketMatch
from app.schemas.tournament import (
    TournamentCreate, TournamentUpdate, TournamentOut,
    PoolOut, PoolMatchOut, StandingEntry, MatchScoreUpdate,
    BracketMatchOut, AddPlayersToTournament, DashboardStats,
)
from app.services.pool_service import (
    generate_pools, get_pool_standings, update_pool_match_score,
    get_pool_top_players, get_pool_players_split, get_pool_players_split_by_total,
)
from app.services.bracket_service import (
    generate_bracket, update_bracket_match_score,
)

router = APIRouter(prefix="/api/tournaments", tags=["tournaments"])


def _get_tournament_with_access(tid: int, db: Session, user: User) -> Tournament:
    """Get tournament and verify the user has access (owner or admin)."""
    t = db.query(Tournament).filter(Tournament.id == tid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if user.role != "admin" and t.created_by != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return t


# ── Dashboard ──
@router.get("/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    base_query = db.query(Tournament)
    if current_user.role != "admin":
        base_query = base_query.filter(Tournament.created_by == current_user.id)

    active = base_query.filter(
        Tournament.status.in_([TournamentStatus.POOL_STAGE, TournamentStatus.KNOCKOUT_STAGE])
    ).count()
    total_t = base_query.count()
    total_p = db.query(Player).count()

    tournament_ids = [t.id for t in base_query.all()]
    if tournament_ids:
        pool_matches = db.query(PoolMatch).filter(
            PoolMatch.played == 1, PoolMatch.tournament_id.in_(tournament_ids)
        ).count()
        bracket_matches = db.query(BracketMatch).filter(
            BracketMatch.played == 1, BracketMatch.tournament_id.in_(tournament_ids)
        ).count()
    else:
        pool_matches = 0
        bracket_matches = 0

    return DashboardStats(
        active_tournaments=active,
        total_players=total_p,
        matches_played=pool_matches + bracket_matches,
        total_tournaments=total_t,
    )


# ── CRUD ──
@router.get("", response_model=List[TournamentOut])
def list_tournaments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Tournament)
    if current_user.role != "admin":
        query = query.filter(Tournament.created_by == current_user.id)
    tournaments = query.order_by(Tournament.created_at.desc()).all()
    result = []
    for t in tournaments:
        out = TournamentOut.model_validate(t)
        out.player_count = (
            db.query(TournamentPlayer)
            .filter(TournamentPlayer.tournament_id == t.id)
            .count()
        )
        if t.creator:
            out.created_by_username = t.creator.username
        result.append(out)
    return result


@router.post("", response_model=TournamentOut, status_code=status.HTTP_201_CREATED)
def create_tournament(
    data: TournamentCreate, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tournament = Tournament(**data.model_dump(), created_by=current_user.id)
    db.add(tournament)
    db.commit()
    db.refresh(tournament)
    out = TournamentOut.model_validate(tournament)
    out.player_count = 0
    out.created_by_username = current_user.username
    return out


@router.get("/{tid}", response_model=TournamentOut)
def get_tournament(tid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(Tournament).filter(Tournament.id == tid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if current_user.role != "admin" and t.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    out = TournamentOut.model_validate(t)
    if t.creator:
        out.created_by_username = t.creator.username
    out.player_count = (
        db.query(TournamentPlayer).filter(TournamentPlayer.tournament_id == t.id).count()
    )
    return out


@router.put("/{tid}", response_model=TournamentOut)
def update_tournament(
    tid: int, data: TournamentUpdate, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Tournament).filter(Tournament.id == tid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if current_user.role != "admin" and t.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(t, key, val)
    db.commit()
    db.refresh(t)
    out = TournamentOut.model_validate(t)
    out.player_count = (
        db.query(TournamentPlayer).filter(TournamentPlayer.tournament_id == t.id).count()
    )
    return out


@router.delete("/{tid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tournament(tid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(Tournament).filter(Tournament.id == tid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if current_user.role != "admin" and t.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(t)
    db.commit()


@router.put("/{tid}/publish")
def toggle_publish(tid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = _get_tournament_with_access(tid, db, current_user)
    t.is_published = not t.is_published
    db.commit()
    db.refresh(t)
    return {"is_published": t.is_published}


# ── Player assignment ──
@router.get("/{tid}/players")
def get_tournament_players(tid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_tournament_with_access(tid, db, current_user)
    tp_list = (
        db.query(TournamentPlayer)
        .filter(TournamentPlayer.tournament_id == tid)
        .all()
    )
    result = []
    for tp in tp_list:
        player = db.query(Player).filter(Player.id == tp.player_id).first()
        result.append({
            "id": tp.id,
            "tournament_id": tp.tournament_id,
            "player_id": tp.player_id,
            "seed": tp.seed,
            "pool_id": tp.pool_id,
            "player_name": player.name if player else "Unknown",
            "player_nickname": player.nickname if player else None,
        })
    return result


@router.post("/{tid}/players")
def add_players_to_tournament(
    tid: int, data: AddPlayersToTournament, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = _get_tournament_with_access(tid, db, current_user)

    existing = {
        tp.player_id
        for tp in db.query(TournamentPlayer).filter(TournamentPlayer.tournament_id == tid).all()
    }
    added = 0
    for pid in data.player_ids:
        if pid not in existing:
            db.add(TournamentPlayer(tournament_id=tid, player_id=pid))
            added += 1
    db.commit()
    return {"added": added}


@router.delete("/{tid}/players/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_player_from_tournament(
    tid: int, player_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_tournament_with_access(tid, db, current_user)
    tp = (
        db.query(TournamentPlayer)
        .filter(TournamentPlayer.tournament_id == tid, TournamentPlayer.player_id == player_id)
        .first()
    )
    if not tp:
        raise HTTPException(status_code=404, detail="Player not in tournament")
    db.delete(tp)
    db.commit()


# ── Pool Stage ──
@router.post("/{tid}/generate-pools")
def api_generate_pools(tid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = _get_tournament_with_access(tid, db, current_user)
    try:
        pools = generate_pools(db, t)
        return {"pools_created": len(pools)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{tid}/pools", response_model=List[PoolOut])
def get_pools(tid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_tournament_with_access(tid, db, current_user)
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

        matches = db.query(PoolMatch).filter(PoolMatch.pool_id == pool.id).order_by(PoolMatch.play_order.asc().nullslast(), PoolMatch.id.asc()).all()
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


@router.get("/{tid}/standings", response_model=List[StandingEntry])
def get_standings(tid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_tournament_with_access(tid, db, current_user)
    return get_pool_standings(db, tid)


@router.put("/{tid}/pool-matches/{match_id}/score", response_model=PoolMatchOut)
def score_pool_match(
    tid: int, match_id: int, data: MatchScoreUpdate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    _get_tournament_with_access(tid, db, current_user)
    try:
        m = update_pool_match_score(db, match_id, data.player1_legs, data.player2_legs)
        p1 = db.query(Player).filter(Player.id == m.player1_id).first()
        p2 = db.query(Player).filter(Player.id == m.player2_id).first()
        w = db.query(Player).filter(Player.id == m.winner_id).first() if m.winner_id else None
        return PoolMatchOut(
            id=m.id, pool_id=m.pool_id, tournament_id=m.tournament_id,
            player1_id=m.player1_id, player2_id=m.player2_id,
            player1_legs=m.player1_legs, player2_legs=m.player2_legs,
            winner_id=m.winner_id, played=m.played, round_number=m.round_number,
            player1_name=p1.name if p1 else None,
            player2_name=p2.name if p2 else None,
            winner_name=w.name if w else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Knockout Stage ──
@router.post("/{tid}/generate-bracket")
def api_generate_bracket(
    tid: int, winners_per_pool: int = None, total_winners: int = None,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    t = _get_tournament_with_access(tid, db, current_user)
    try:
        if total_winners is not None:
            split = get_pool_players_split_by_total(db, tid, total_winners)
        else:
            split = get_pool_players_split(db, tid, winners_per_pool or 2)
        winners = split["winners"]
        losers = split["losers"]
        pool_map = split["player_pool_map"]
        if len(winners) < 2:
            raise ValueError("Not enough players for the winners bracket")
        matches = generate_bracket(
            db, t, winners,
            loser_player_ids=losers if losers else None,
            player_pool_map=pool_map,
        )
        return {
            "matches_created": len(matches),
            "winners_bracket_players": winners,
            "losers_bracket_players": losers,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{tid}/bracket", response_model=List[BracketMatchOut])
def get_bracket(tid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_tournament_with_access(tid, db, current_user)
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


@router.put("/{tid}/bracket-matches/{match_id}/score", response_model=BracketMatchOut)
def score_bracket_match(
    tid: int, match_id: int, data: MatchScoreUpdate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    _get_tournament_with_access(tid, db, current_user)
    try:
        m = update_bracket_match_score(db, match_id, data.player1_legs, data.player2_legs)
        p1 = db.query(Player).filter(Player.id == m.player1_id).first() if m.player1_id else None
        p2 = db.query(Player).filter(Player.id == m.player2_id).first() if m.player2_id else None
        return BracketMatchOut(
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
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
