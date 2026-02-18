"""
Ranking service: compute player rankings across multiple tournaments.

Points are awarded based on final tournament placements (fixed mode)
or bracket depth (flexible mode).
Placements are determined from the bracket results (knockout stage).
"""
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session

from app.models.ranking import Ranking, RankingEntry
from app.models.tournament import Tournament, TournamentStatus
from app.models.tournament_models import BracketMatch, TournamentPlayer
from app.models.player import Player


def _get_points_for_placement(ranking: Ranking, placement: int) -> int:
    """Return points for a given placement based on ranking configuration (fixed mode)."""
    mapping = {
        1: ranking.points_first,
        2: ranking.points_second,
        3: ranking.points_third,
        4: ranking.points_fourth,
        5: ranking.points_fifth,
        6: ranking.points_sixth,
        7: ranking.points_seventh,
        8: ranking.points_eighth,
    }
    return mapping.get(placement, ranking.points_participation)


def compute_bracket_win_points(
    db: Session, tournament_id: int, ranking: Ranking,
) -> Dict[int, int]:
    """
    Count bracket match wins per player and compute bonus points.

    Winner bracket / grand final wins: winner_bracket_multiplier pts each
    Loser bracket wins:                loser_bracket_multiplier pts each

    Returns dict of player_id -> bracket bonus points.
    """
    bracket_matches = (
        db.query(BracketMatch)
        .filter(BracketMatch.tournament_id == tournament_id, BracketMatch.played == 1)
        .all()
    )

    wb_mult = ranking.winner_bracket_multiplier
    lb_mult = ranking.loser_bracket_multiplier

    player_bonus: Dict[int, int] = {}

    for m in bracket_matches:
        if not m.winner_id:
            continue
        if m.bracket_type in ("winner", "grand_final"):
            player_bonus[m.winner_id] = player_bonus.get(m.winner_id, 0) + wb_mult
        elif m.bracket_type == "loser":
            player_bonus[m.winner_id] = player_bonus.get(m.winner_id, 0) + lb_mult

    return player_bonus


def _get_player_bracket_types(
    db: Session, tournament_id: int,
) -> Dict[int, str]:
    """
    Determine which bracket each player participated in.

    Returns dict of player_id -> 'winner' | 'loser'.
    Players appearing in any winner bracket or grand_final match -> 'winner'.
    Players only in loser bracket matches -> 'loser'.
    Players not in any bracket match -> 'loser' (fallback).
    """
    bracket_matches = (
        db.query(BracketMatch)
        .filter(BracketMatch.tournament_id == tournament_id)
        .all()
    )

    player_types: Dict[int, str] = {}
    for m in bracket_matches:
        for pid in (m.player1_id, m.player2_id):
            if pid is None:
                continue
            if m.bracket_type in ("winner", "grand_final"):
                player_types[pid] = "winner"
            elif pid not in player_types:
                player_types[pid] = "loser"

    return player_types


def compute_flexible_points(
    db: Session, tournament_id: int, ranking: Ranking,
) -> List[Dict[str, Any]]:
    """
    Flexible mode: base points (different for winner/loser bracket) + bracket win bonus.

    Winner bracket players start with flexible_base_winner,
    Loser bracket players start with flexible_base_loser,
    then each earns additional points for bracket match wins.
    """
    tp_list = (
        db.query(TournamentPlayer)
        .filter(TournamentPlayer.tournament_id == tournament_id)
        .all()
    )
    all_player_ids = {tp.player_id for tp in tp_list}

    bracket_bonus = compute_bracket_win_points(db, tournament_id, ranking)
    player_brackets = _get_player_bracket_types(db, tournament_id)

    result = []
    for pid in all_player_ids:
        bracket_type = player_brackets.get(pid, "loser")
        base = ranking.flexible_base_winner if bracket_type == "winner" else ranking.flexible_base_loser
        total = base + bracket_bonus.get(pid, 0)
        result.append({
            "player_id": pid,
            "points": total,
            "placement": None,
        })

    # Sort by points descending to derive placement
    result.sort(key=lambda x: -x["points"])
    for i, r in enumerate(result):
        r["placement"] = i + 1

    return result


def compute_tournament_placements(db: Session, tournament_id: int) -> List[Dict[str, Any]]:
    """
    Determine player placements from bracket results.

    Returns a list of dicts: [{"player_id": int, "placement": int}, ...]
    sorted by placement ascending.

    Placement logic:
    - Grand final winner = 1st, loser = 2nd
    - If no grand final, winner bracket final winner = 1st, loser = 2nd
    - Players eliminated in earlier rounds get lower placements
    - Players who only participated in pools get participation placement
    """
    bracket_matches = (
        db.query(BracketMatch)
        .filter(BracketMatch.tournament_id == tournament_id)
        .order_by(BracketMatch.bracket_type, BracketMatch.round_number.desc())
        .all()
    )

    if not bracket_matches:
        # No bracket — give all tournament players participation placement
        tp_list = (
            db.query(TournamentPlayer)
            .filter(TournamentPlayer.tournament_id == tournament_id)
            .all()
        )
        return [{"player_id": tp.player_id, "placement": None} for tp in tp_list]

    # Find all players in the tournament
    tp_list = (
        db.query(TournamentPlayer)
        .filter(TournamentPlayer.tournament_id == tournament_id)
        .all()
    )
    all_player_ids = {tp.player_id for tp in tp_list}

    # Track placements: player_id -> placement
    placements: Dict[int, int] = {}
    placed_players = set()

    # Find the grand final first
    grand_finals = [m for m in bracket_matches if m.bracket_type == "grand_final" and m.played == 1]
    winner_matches = [m for m in bracket_matches if m.bracket_type == "winner"]
    loser_matches = [m for m in bracket_matches if m.bracket_type == "loser"]

    # Sort by round desc to process from final backwards
    winner_matches.sort(key=lambda m: -m.round_number)
    loser_matches.sort(key=lambda m: -m.round_number)

    current_placement = 1

    if grand_finals:
        gf = grand_finals[0]
        if gf.winner_id:
            placements[gf.winner_id] = current_placement
            placed_players.add(gf.winner_id)
            current_placement += 1
        if gf.loser_id:
            placements[gf.loser_id] = current_placement
            placed_players.add(gf.loser_id)
            current_placement += 1

    # Process winner bracket from final backwards
    if winner_matches:
        rounds_grouped: Dict[int, List[BracketMatch]] = {}
        for m in winner_matches:
            rounds_grouped.setdefault(m.round_number, []).append(m)

        for rnd in sorted(rounds_grouped.keys(), reverse=True):
            round_matches = rounds_grouped[rnd]
            # Players eliminated this round (losers)
            eliminated = []
            for m in round_matches:
                if m.played == 1:
                    if m.winner_id and m.winner_id not in placed_players:
                        # Winner of final round (if no grand final)
                        if rnd == max(rounds_grouped.keys()) and not grand_finals:
                            placements[m.winner_id] = current_placement
                            placed_players.add(m.winner_id)
                            current_placement += 1
                    if m.loser_id and m.loser_id not in placed_players:
                        eliminated.append(m.loser_id)
                    elif m.winner_id and m.winner_id not in placed_players:
                        # Winner not placed yet and it's not the final
                        pass

            # If this is the final and no grand final, place the loser
            if rnd == max(rounds_grouped.keys()) and not grand_finals:
                for pid in eliminated:
                    placements[pid] = current_placement
                    placed_players.add(pid)
                current_placement += 1 if eliminated else 0
            else:
                # All losers from same round share a placement tier
                for pid in eliminated:
                    placements[pid] = current_placement
                    placed_players.add(pid)
                if eliminated:
                    current_placement += len(eliminated)

    # Process loser bracket similarly
    if loser_matches:
        rounds_grouped_lb: Dict[int, List[BracketMatch]] = {}
        for m in loser_matches:
            rounds_grouped_lb.setdefault(m.round_number, []).append(m)

        for rnd in sorted(rounds_grouped_lb.keys(), reverse=True):
            round_matches = rounds_grouped_lb[rnd]
            eliminated = []
            for m in round_matches:
                if m.played == 1:
                    if m.winner_id and m.winner_id not in placed_players:
                        if rnd == max(rounds_grouped_lb.keys()):
                            placements[m.winner_id] = current_placement
                            placed_players.add(m.winner_id)
                            current_placement += 1
                    if m.loser_id and m.loser_id not in placed_players:
                        eliminated.append(m.loser_id)

            if rnd == max(rounds_grouped_lb.keys()):
                for pid in eliminated:
                    placements[pid] = current_placement
                    placed_players.add(pid)
                current_placement += 1 if eliminated else 0
            else:
                for pid in eliminated:
                    placements[pid] = current_placement
                    placed_players.add(pid)
                if eliminated:
                    current_placement += len(eliminated)

    # Remaining players get no specific placement (participation only)
    result = []
    for pid in all_player_ids:
        result.append({
            "player_id": pid,
            "placement": placements.get(pid),
        })

    result.sort(key=lambda x: (x["placement"] or 9999))
    return result


def recalculate_ranking_entries(
    db: Session, ranking_id: int, tournament_id: int
) -> List[RankingEntry]:
    """
    Recalculate ranking entries for a specific tournament within a ranking.
    Deletes existing entries for tournament and recreates them.
    """
    ranking = db.query(Ranking).filter(Ranking.id == ranking_id).first()
    if not ranking:
        raise ValueError("Ranking not found")

    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament or tournament.ranking_id != ranking_id:
        raise ValueError("Tournament not found or not assigned to this ranking")

    # Delete existing entries for this tournament in this ranking
    db.query(RankingEntry).filter(
        RankingEntry.ranking_id == ranking_id,
        RankingEntry.tournament_id == tournament_id,
    ).delete()
    db.flush()

    entries = []

    if ranking.points_mode == "flexible":
        # Flexible mode: points from bracket depth
        flex_results = compute_flexible_points(db, tournament_id, ranking)
        for p in flex_results:
            entry = RankingEntry(
                ranking_id=ranking_id,
                tournament_id=tournament_id,
                player_id=p["player_id"],
                placement=p["placement"],
                points=p["points"],
            )
            db.add(entry)
            entries.append(entry)
    else:
        # Fixed mode: placement points only (no bracket win bonus)
        placements = compute_tournament_placements(db, tournament_id)
        for p in placements:
            pts = _get_points_for_placement(ranking, p["placement"]) if p["placement"] else ranking.points_participation
            entry = RankingEntry(
                ranking_id=ranking_id,
                tournament_id=tournament_id,
                player_id=p["player_id"],
                placement=p["placement"],
                points=pts,
            )
            db.add(entry)
            entries.append(entry)

    db.commit()
    return entries


def get_ranking_standings(db: Session, ranking_id: int) -> List[Dict[str, Any]]:
    """
    Get aggregated ranking standings across all tournaments for a ranking.
    Returns sorted list of players with total points.
    """
    entries = (
        db.query(RankingEntry)
        .filter(RankingEntry.ranking_id == ranking_id)
        .all()
    )

    # Aggregate by player
    player_data: Dict[int, Dict[str, Any]] = {}
    for e in entries:
        if e.player_id not in player_data:
            player = db.query(Player).filter(Player.id == e.player_id).first()
            player_data[e.player_id] = {
                "player_id": e.player_id,
                "player_name": player.name if player else "Unknown",
                "total_points": 0,
                "tournaments_played": 0,
                "best_placement": None,
                "tournament_results": [],
            }

        pd = player_data[e.player_id]
        pd["total_points"] += e.points
        pd["tournaments_played"] += 1
        if e.placement:
            if pd["best_placement"] is None or e.placement < pd["best_placement"]:
                pd["best_placement"] = e.placement

        tournament = db.query(Tournament).filter(Tournament.id == e.tournament_id).first()
        pd["tournament_results"].append({
            "id": e.id,
            "ranking_id": e.ranking_id,
            "tournament_id": e.tournament_id,
            "tournament_name": tournament.name if tournament else "Unknown",
            "player_id": e.player_id,
            "player_name": pd["player_name"],
            "placement": e.placement,
            "points": e.points,
        })

    standings = list(player_data.values())
    standings.sort(key=lambda x: (-x["total_points"], x["best_placement"] or 9999))
    return standings
