from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.ranking import Ranking, RankingEntry
from app.models.tournament import Tournament
from app.schemas.ranking import (
    RankingCreate, RankingUpdate, RankingOut,
    RankingStandingEntry, RankingEntryOut,
)
from app.services.ranking_service import (
    get_ranking_standings, recalculate_ranking_entries,
)

router = APIRouter(prefix="/api/rankings", tags=["rankings"])


def _get_ranking_with_access(rid: int, db: Session, user: User) -> Ranking:
    """Get ranking and verify the user has access (owner or admin)."""
    r = db.query(Ranking).filter(Ranking.id == rid).first()
    if not r:
        raise HTTPException(status_code=404, detail="Ranking not found")
    if user.role != "admin" and r.created_by != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return r


# ── CRUD ──
@router.get("", response_model=List[RankingOut])
def list_rankings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Ranking)
    if current_user.role != "admin":
        query = query.filter(Ranking.created_by == current_user.id)
    rankings = query.order_by(Ranking.created_at.desc()).all()
    result = []
    for r in rankings:
        out = RankingOut.model_validate(r)
        out.tournament_count = (
            db.query(Tournament)
            .filter(Tournament.ranking_id == r.id)
            .count()
        )
        if r.creator:
            out.created_by_username = r.creator.username
        result.append(out)
    return result


@router.post("", response_model=RankingOut, status_code=status.HTTP_201_CREATED)
def create_ranking(
    data: RankingCreate, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ranking = Ranking(**data.model_dump(), created_by=current_user.id)
    db.add(ranking)
    db.commit()
    db.refresh(ranking)
    out = RankingOut.model_validate(ranking)
    out.tournament_count = 0
    out.created_by_username = current_user.username
    return out


@router.get("/{rid}", response_model=RankingOut)
def get_ranking(rid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = _get_ranking_with_access(rid, db, current_user)
    out = RankingOut.model_validate(r)
    out.tournament_count = db.query(Tournament).filter(Tournament.ranking_id == r.id).count()
    if r.creator:
        out.created_by_username = r.creator.username
    return out


@router.put("/{rid}", response_model=RankingOut)
def update_ranking(
    rid: int, data: RankingUpdate, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = _get_ranking_with_access(rid, db, current_user)
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(r, key, val)
    db.commit()
    db.refresh(r)
    out = RankingOut.model_validate(r)
    out.tournament_count = db.query(Tournament).filter(Tournament.ranking_id == r.id).count()
    return out


@router.delete("/{rid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ranking(rid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = _get_ranking_with_access(rid, db, current_user)
    # Unlink tournaments
    db.query(Tournament).filter(Tournament.ranking_id == r.id).update({"ranking_id": None})
    db.delete(r)
    db.commit()


# ── Standings ──
@router.get("/{rid}/standings", response_model=List[RankingStandingEntry])
def get_standings(rid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_ranking_with_access(rid, db, current_user)
    return get_ranking_standings(db, rid)


# ── Recalculate ──
@router.post("/{rid}/recalculate")
def recalculate_all(rid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Recalculate ranking entries for all tournaments in this ranking."""
    r = _get_ranking_with_access(rid, db, current_user)
    tournaments = db.query(Tournament).filter(Tournament.ranking_id == r.id).all()
    total_entries = 0
    for t in tournaments:
        entries = recalculate_ranking_entries(db, r.id, t.id)
        total_entries += len(entries)
    return {"tournaments_processed": len(tournaments), "entries_created": total_entries}


@router.post("/{rid}/recalculate/{tid}")
def recalculate_tournament(
    rid: int, tid: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recalculate ranking entries for a specific tournament."""
    _get_ranking_with_access(rid, db, current_user)
    entries = recalculate_ranking_entries(db, rid, tid)
    return {"entries_created": len(entries)}


# ── Tournaments in ranking ──
@router.get("/{rid}/tournaments")
def get_ranking_tournaments(
    rid: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_ranking_with_access(rid, db, current_user)
    tournaments = (
        db.query(Tournament)
        .filter(Tournament.ranking_id == rid)
        .order_by(Tournament.start_date.desc().nullslast(), Tournament.created_at.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "name": t.name,
            "status": t.status,
            "start_date": str(t.start_date) if t.start_date else None,
            "location": t.location,
        }
        for t in tournaments
    ]
