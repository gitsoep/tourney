from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PlayerCreate(BaseModel):
    name: str
    nickname: Optional[str] = None
    email: Optional[str] = None


class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    nickname: Optional[str] = None
    email: Optional[str] = None


class PlayerOut(BaseModel):
    id: int
    name: str
    nickname: Optional[str] = None
    email: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PlayerBulkImport(BaseModel):
    players: list[PlayerCreate]
