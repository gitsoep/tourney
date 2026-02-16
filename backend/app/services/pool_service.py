"""
Pool stage service: group generation, round-robin match creation, standings calculation.
"""
import math
import random
from itertools import combinations
from typing import List, Dict, Any

from sqlalchemy.orm import Session

from app.models.tournament import Tournament, TournamentStatus
from app.models.tournament_models import TournamentPlayer, Pool, PoolMatch
from app.models.player import Player


def _assign_play_order(matches: List["PoolMatch"]) -> None:
    """
    Assign a global play_order to all pool matches so that players get
    maximum rest between their consecutive games.

    Uses a greedy algorithm: at each step, pick the match whose players
    have had the longest gap since they last played.
    """
    if not matches:
        return

    remaining = list(matches)
    scheduled: List["PoolMatch"] = []
    # Track the last scheduled slot for each player (-inf initially)
    last_played: Dict[int, int] = {}

    for slot in range(len(remaining)):
        best_match = None
        best_score = -1

        for m in remaining:
            p1_gap = slot - last_played.get(m.player1_id, -999)
            p2_gap = slot - last_played.get(m.player2_id, -999)
            # Score = minimum gap of the two players (we maximise this)
            min_gap = min(p1_gap, p2_gap)
            if min_gap > best_score:
                best_score = min_gap
                best_match = m

        best_match.play_order = slot + 1  # 1-based
        last_played[best_match.player1_id] = slot
        last_played[best_match.player2_id] = slot
        scheduled.append(best_match)
        remaining.remove(best_match)


def generate_pools(db: Session, tournament: Tournament) -> List[Pool]:
    """Automatically assign players to pools and generate round-robin matches."""
    # Get players
    tp_list = (
        db.query(TournamentPlayer)
        .filter(TournamentPlayer.tournament_id == tournament.id)
        .all()
    )
    if len(tp_list) < 2:
        raise ValueError("Need at least 2 players to generate pools")

    player_ids = [tp.player_id for tp in tp_list]
    random.shuffle(player_ids)

    group_size = tournament.group_size or 4
    num_groups = max(1, math.ceil(len(player_ids) / group_size))

    # Delete existing pools
    db.query(PoolMatch).filter(PoolMatch.tournament_id == tournament.id).delete()
    for p in db.query(Pool).filter(Pool.tournament_id == tournament.id).all():
        db.delete(p)
    db.flush()

    # Reset pool assignments
    for tp in tp_list:
        tp.pool_id = None
    db.flush()

    pools = []
    for i in range(num_groups):
        pool = Pool(
            tournament_id=tournament.id,
            name=f"Pool {chr(65 + i)}",  # Pool A, B, C...
        )
        db.add(pool)
        db.flush()
        pools.append(pool)

    # Distribute players round-robin across pools
    for idx, pid in enumerate(player_ids):
        pool = pools[idx % num_groups]
        tp = next(t for t in tp_list if t.player_id == pid)
        tp.pool_id = pool.id

    db.flush()

    # Generate round-robin matches for each pool
    all_matches = []
    for pool in pools:
        pool_player_ids = [
            tp.player_id for tp in tp_list if tp.pool_id == pool.id
        ]
        match_pairs = list(combinations(pool_player_ids, 2))
        for rnd, (p1, p2) in enumerate(match_pairs, start=1):
            match = PoolMatch(
                pool_id=pool.id,
                tournament_id=tournament.id,
                player1_id=p1,
                player2_id=p2,
                round_number=rnd,
            )
            db.add(match)
            all_matches.append(match)

    db.flush()

    # Assign fair play order across all pools
    _assign_play_order(all_matches)

    tournament.status = TournamentStatus.POOL_STAGE
    db.commit()
    return pools


def get_pool_standings(db: Session, tournament_id: int) -> List[Dict[str, Any]]:
    """Calculate standings for all pools in a tournament."""
    pools = db.query(Pool).filter(Pool.tournament_id == tournament_id).all()
    standings = []

    for pool in pools:
        matches = (
            db.query(PoolMatch)
            .filter(PoolMatch.pool_id == pool.id)
            .all()
        )
        tp_list = (
            db.query(TournamentPlayer)
            .filter(TournamentPlayer.pool_id == pool.id)
            .all()
        )
        player_ids = [tp.player_id for tp in tp_list]

        for pid in player_ids:
            player = db.query(Player).filter(Player.id == pid).first()
            wins = 0
            losses = 0
            legs_won = 0
            legs_lost = 0
            matches_played = 0

            for m in matches:
                if m.played == 0:
                    continue
                if m.player1_id == pid:
                    matches_played += 1
                    legs_won += m.player1_legs
                    legs_lost += m.player2_legs
                    if m.winner_id == pid:
                        wins += 1
                    else:
                        losses += 1
                elif m.player2_id == pid:
                    matches_played += 1
                    legs_won += m.player2_legs
                    legs_lost += m.player1_legs
                    if m.winner_id == pid:
                        wins += 1
                    else:
                        losses += 1

            standings.append({
                "player_id": pid,
                "player_name": player.name if player else "Unknown",
                "pool_id": pool.id,
                "pool_name": pool.name,
                "matches_played": matches_played,
                "wins": wins,
                "losses": losses,
                "legs_won": legs_won,
                "legs_lost": legs_lost,
                "leg_difference": legs_won - legs_lost,
                "points": wins * 2,  # 2 points per win
            })

    # Sort by pool, then points desc, then leg diff desc
    standings.sort(key=lambda x: (x["pool_name"], -x["points"], -x["leg_difference"]))
    return standings


def update_pool_match_score(
    db: Session, match_id: int, player1_legs: int, player2_legs: int
) -> PoolMatch:
    """Update a pool match score."""
    match = db.query(PoolMatch).filter(PoolMatch.id == match_id).first()
    if not match:
        raise ValueError("Match not found")

    if player1_legs < 0 or player2_legs < 0:
        raise ValueError("Legs cannot be negative")
    if player1_legs == player2_legs:
        raise ValueError("Match must have a winner (no draws)")

    match.player1_legs = player1_legs
    match.player2_legs = player2_legs
    match.played = 1

    if player1_legs > player2_legs:
        match.winner_id = match.player1_id
    else:
        match.winner_id = match.player2_id

    db.commit()
    db.refresh(match)
    return match


def get_pool_top_players(db: Session, tournament_id: int, top_n: int = 2) -> List[int]:
    """Get top N players from each pool for knockout stage advancement."""
    standings = get_pool_standings(db, tournament_id)
    pools = db.query(Pool).filter(Pool.tournament_id == tournament_id).all()

    advancing = []
    for pool in pools:
        pool_standings = [s for s in standings if s["pool_id"] == pool.id]
        pool_standings.sort(key=lambda x: (-x["points"], -x["leg_difference"]))
        for s in pool_standings[:top_n]:
            advancing.append(s["player_id"])

    return advancing


def get_pool_players_split(
    db: Session, tournament_id: int, winners_per_pool: int
) -> Dict[str, Any]:
    """
    Split pool players into winners bracket and losers bracket lists.
    Top `winners_per_pool` from each pool go to winners bracket,
    the rest go to losers bracket.
    Also returns pool membership mapping for bracket seeding.
    """
    standings = get_pool_standings(db, tournament_id)
    pools = db.query(Pool).filter(Pool.tournament_id == tournament_id).all()

    winners = []
    losers = []
    # Map player_id -> pool index (0, 1, 2, ...) for seeding spread
    player_pool_map: Dict[int, int] = {}

    for pool_idx, pool in enumerate(pools):
        pool_standings = [s for s in standings if s["pool_id"] == pool.id]
        pool_standings.sort(key=lambda x: (-x["points"], -x["leg_difference"]))
        for i, s in enumerate(pool_standings):
            player_pool_map[s["player_id"]] = pool_idx
            if i < winners_per_pool:
                winners.append(s["player_id"])
            else:
                losers.append(s["player_id"])

    return {"winners": winners, "losers": losers, "player_pool_map": player_pool_map}


def get_pool_players_split_by_total(
    db: Session, tournament_id: int, total_winners: int
) -> Dict[str, Any]:
    """
    Split pool players into winners/losers brackets by a global total.

    Distributes `total_winners` slots as equally as possible across pools.
    Each pool gets at least `total_winners // num_pools` advancing slots.
    The remaining slots go to the best-ranked non-qualifying players across
    all pools (ordered by points desc, then leg difference desc).
    """
    standings = get_pool_standings(db, tournament_id)
    pools = db.query(Pool).filter(Pool.tournament_id == tournament_id).all()
    num_pools = len(pools)

    if num_pools == 0:
        return {"winners": [], "losers": [], "player_pool_map": {}}

    # Base allocation per pool + remaining spots
    base_per_pool = total_winners // num_pools
    extra_spots = total_winners % num_pools

    winners = []
    bubble_players = []  # candidates for extra spots
    losers = []
    player_pool_map: Dict[int, int] = {}
    pool_sizes: Dict[int, int] = {}  # pool_idx -> number of players

    for pool_idx, pool in enumerate(pools):
        pool_standings = [s for s in standings if s["pool_id"] == pool.id]
        pool_standings.sort(key=lambda x: (-x["points"], -x["leg_difference"]))
        pool_sizes[pool_idx] = len(pool_standings)
        for i, s in enumerate(pool_standings):
            player_pool_map[s["player_id"]] = pool_idx
            if i < base_per_pool:
                winners.append(s["player_id"])
            else:
                # Potential candidate for extra spots
                bubble_players.append(s)

    # Sort bubble players globally by performance; on ties prefer larger pools.
    # Each pool can receive at most 1 extra spot so max difference between pools is 1.
    bubble_players.sort(
        key=lambda x: (-x["points"], -x["leg_difference"],
                       -pool_sizes[player_pool_map[x["player_id"]]])
    )
    pools_with_extra: set = set()
    extra_picked = 0
    remaining_bubble = []
    for s in bubble_players:
        pool_idx = player_pool_map[s["player_id"]]
        if extra_picked < extra_spots and pool_idx not in pools_with_extra:
            winners.append(s["player_id"])
            pools_with_extra.add(pool_idx)
            extra_picked += 1
        else:
            remaining_bubble.append(s)
    for s in remaining_bubble:
        losers.append(s["player_id"])

    return {"winners": winners, "losers": losers, "player_pool_map": player_pool_map}
