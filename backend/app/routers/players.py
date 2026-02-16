from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import csv
import io

from app.core.database import get_db
from app.core.security import require_admin, get_current_user
from app.models.player import Player
from app.models.user import User
from app.schemas.player import PlayerCreate, PlayerUpdate, PlayerOut

router = APIRouter(prefix="/api/players", tags=["players"])


@router.get("", response_model=List[PlayerOut])
def list_players(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Player).order_by(Player.name).all()


@router.post("", response_model=PlayerOut, status_code=status.HTTP_201_CREATED)
def create_player(data: PlayerCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    player = Player(**data.model_dump())
    db.add(player)
    db.commit()
    db.refresh(player)
    return player


@router.post("/bulk", response_model=List[PlayerOut], status_code=status.HTTP_201_CREATED)
def bulk_create_players(
    players: List[PlayerCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    created = []
    for p in players:
        player = Player(**p.model_dump())
        db.add(player)
        created.append(player)
    db.commit()
    for p in created:
        db.refresh(p)
    return created


@router.post("/import-csv", response_model=List[PlayerOut])
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    created = []
    for row in reader:
        player = Player(
            name=row.get("name", "").strip(),
            nickname=row.get("nickname", "").strip() or None,
            email=row.get("email", "").strip() or None,
        )
        if player.name:
            db.add(player)
            created.append(player)
    db.commit()
    for p in created:
        db.refresh(p)
    return created


@router.get("/{player_id}", response_model=PlayerOut)
def get_player(player_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.put("/{player_id}", response_model=PlayerOut)
def update_player(
    player_id: int, data: PlayerUpdate, db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(player, key, value)
    db.commit()
    db.refresh(player)
    return player


@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player(player_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    db.delete(player)
    db.commit()
