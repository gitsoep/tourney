"""
Bracket service: bracket generation, match progression,
winner bracket (single-elim) + loser bracket.

Winner bracket losers are ELIMINATED (they do NOT drop to loser bracket).
Only pool-phase non-qualifiers are pre-seeded into the loser bracket.
Players are spread so same-pool opponents only meet in the final if possible
(recursive half-splitting ensures maximum separation).
"""
import math
from typing import List, Optional, Dict

from sqlalchemy.orm import Session

from app.models.tournament import Tournament, TournamentStatus
from app.models.tournament_models import BracketMatch
from app.models.player import Player
from app.services.ranking_service import recalculate_ranking_entries


def _next_power_of_2(n: int) -> int:
    return 1 << (n - 1).bit_length()


def _place_players_for_bracket(
    player_ids: List[int],
    player_pool_map: Optional[Dict[int, int]],
    bracket_size: int,
) -> List[Optional[int]]:
    """
    Place players into bracket positions so that same-pool players are
    separated as far as possible — they can only meet in the latest
    possible round (the final, if the bracket is large enough).

    Returns a list of length ``bracket_size`` where each element is a
    player ID or ``None`` (bye).  Positions 2*i and 2*i+1 are opponents
    in round-1 match i.

    The algorithm recursively splits the bracket in half and distributes
    each pool's members across opposite halves, alternating by pool index
    and rank so that #1 and #2 from the same pool always land on opposite
    sides.  Without meaningful pool info it falls back to standard
    seeding (seed 1 vs seed N, etc.).
    """
    has_pool_info = (
        player_pool_map
        and len(set(player_pool_map.get(p, 0) for p in player_ids)) >= 2
    )

    if not has_pool_info:
        # Fall back to standard bracket seeding
        slots = _bracket_seeding_slots(bracket_size)
        padded = list(player_ids) + [None] * (bracket_size - len(player_ids))
        return [padded[s] if s < len(padded) else None for s in slots]

    result: List[Optional[int]] = [None] * bracket_size

    def _place(start: int, size: int, players: List[int]):
        if not players or size == 0:
            return
        if size <= 2:
            for k, pid in enumerate(players[:size]):
                result[start + k] = pid
            return

        half = size // 2

        # Group by pool, preserving rank order within each pool
        pools: Dict[int, List[int]] = {}
        for pid in players:
            pi = player_pool_map.get(pid, 0)
            pools.setdefault(pi, []).append(pid)

        top: List[int] = []
        bottom: List[int] = []

        # Distribute each pool's members across the two halves.
        # Alternate the starting half by pool index so pools spread
        # evenly; alternate by member rank so same-pool players land
        # in opposite halves.
        for i, pk in enumerate(sorted(pools.keys())):
            for j, pid in enumerate(pools[pk]):
                want_top = (i + j) % 2 == 0
                if want_top and len(top) < half:
                    top.append(pid)
                elif not want_top and len(bottom) < half:
                    bottom.append(pid)
                elif len(top) < half:
                    top.append(pid)
                else:
                    bottom.append(pid)

        _place(start, half, top)
        _place(start + half, half, bottom)

    _place(0, bracket_size, player_ids)
    return result


def _bracket_seeding_slots(n: int) -> List[int]:
    """
    Generate standard bracket seeding positions for n slots (power of 2).
    Seed 1 plays seed n, seed 2 plays seed n-1, etc., arranged so top seeds
    are on opposite sides of the bracket.

    Returns a list of seed indices (0-based) in match order:
    match 0 gets slots[0] vs slots[1], match 1 gets slots[2] vs slots[3], etc.
    """
    if n == 1:
        return [0]
    if n == 2:
        return [0, 1]

    # Recursively build the bracket
    half = _bracket_seeding_slots(n // 2)
    result = []
    for seed in half:
        result.append(seed)
        result.append(n - 1 - seed)
    return result


def generate_bracket(
    db: Session, tournament: Tournament, player_ids: List[int],
    loser_player_ids: Optional[List[int]] = None,
    player_pool_map: Optional[Dict[int, int]] = None,
) -> List[BracketMatch]:
    """
    Generate knockout bracket.

    Winner bracket: single-elimination, seeded to spread pool opponents.
    Loser bracket: separate single-elim for pool-phase non-qualifiers.
    WB losers are OUT — they do NOT drop to the loser bracket.
    """
    if len(player_ids) < 2:
        raise ValueError("Need at least 2 players for a bracket")

    if loser_player_ids is None:
        loser_player_ids = []

    # Clear existing bracket
    db.query(BracketMatch).filter(
        BracketMatch.tournament_id == tournament.id
    ).delete()
    db.flush()

    all_matches: List[BracketMatch] = []
    match_number = 1

    # ── Winner Bracket (single elimination) ──
    n_wb = len(player_ids)
    wb_size = _next_power_of_2(n_wb)
    num_wb_rounds = int(math.log2(wb_size))

    wb_rounds: Dict[int, List[BracketMatch]] = {}

    for rnd in range(1, num_wb_rounds + 1):
        matches_in_round = wb_size // (2 ** rnd)
        wb_rounds[rnd] = []
        for _ in range(matches_in_round):
            m = BracketMatch(
                tournament_id=tournament.id,
                bracket_type="winner",
                round_number=rnd,
                match_number=match_number,
            )
            db.add(m)
            db.flush()
            wb_rounds[rnd].append(m)
            all_matches.append(m)
            match_number += 1

    # Place WB players with pool separation (same-pool meet as late as possible)
    placed_wb = _place_players_for_bracket(player_ids, player_pool_map, wb_size)

    r1_matches = wb_rounds[1]
    for i, match in enumerate(r1_matches):
        match.player1_id = placed_wb[i * 2]
        match.player2_id = placed_wb[i * 2 + 1]

        # Handle byes
        if match.player1_id and not match.player2_id:
            match.winner_id = match.player1_id
            match.played = 1
        elif match.player2_id and not match.player1_id:
            match.winner_id = match.player2_id
            match.played = 1

    # Link WB rounds: winner advances
    for rnd in range(1, num_wb_rounds):
        current_matches = wb_rounds[rnd]
        next_matches = wb_rounds[rnd + 1]
        for i, cm in enumerate(current_matches):
            cm.next_winner_match_id = next_matches[i // 2].id

    # ── Loser Bracket (single elimination, pre-seeded only) ──
    lb_rounds: Dict[int, List[BracketMatch]] = {}
    num_lb_rounds = 0

    if loser_player_ids:
        n_lb = len(loser_player_ids)
        lb_size = _next_power_of_2(n_lb)
        num_lb_rounds = int(math.log2(lb_size))

        for rnd in range(1, num_lb_rounds + 1):
            matches_in_round = lb_size // (2 ** rnd)
            lb_rounds[rnd] = []
            for _ in range(matches_in_round):
                m = BracketMatch(
                    tournament_id=tournament.id,
                    bracket_type="loser",
                    round_number=rnd,
                    match_number=match_number,
                )
                db.add(m)
                db.flush()
                lb_rounds[rnd].append(m)
                all_matches.append(m)
                match_number += 1

        # Place LB players with pool separation
        placed_lb = _place_players_for_bracket(loser_player_ids, player_pool_map, lb_size)

        lb_r1 = lb_rounds[1]
        for i, lm in enumerate(lb_r1):
            lm.player1_id = placed_lb[i * 2]
            lm.player2_id = placed_lb[i * 2 + 1]

            if lm.player1_id and not lm.player2_id:
                lm.winner_id = lm.player1_id
                lm.played = 1
            elif lm.player2_id and not lm.player1_id:
                lm.winner_id = lm.player2_id
                lm.played = 1

        # Link LB rounds
        for rnd in range(1, num_lb_rounds):
            current = lb_rounds[rnd]
            next_rnd = lb_rounds[rnd + 1]
            for i, cm in enumerate(current):
                cm.next_winner_match_id = next_rnd[i // 2].id

    # Process WB byes
    for m in wb_rounds[1]:
        if m.winner_id and m.next_winner_match_id:
            _advance_winner(db, m)

    # Process LB byes
    if 1 in lb_rounds:
        for m in lb_rounds[1]:
            if m.winner_id and m.next_winner_match_id:
                _advance_winner(db, m)

    tournament.status = TournamentStatus.KNOCKOUT_STAGE
    db.commit()
    return all_matches


def _advance_winner(db: Session, match: BracketMatch):
    """Advance match winner to the next match slot."""
    if not match.winner_id or not match.next_winner_match_id:
        return
    next_match = db.query(BracketMatch).filter(
        BracketMatch.id == match.next_winner_match_id
    ).first()
    if next_match:
        if not next_match.player1_id:
            next_match.player1_id = match.winner_id
        elif not next_match.player2_id:
            next_match.player2_id = match.winner_id
        db.flush()

        # Auto-advance if next match has a bye
        if next_match.player1_id and not next_match.player2_id:
            feeders = db.query(BracketMatch).filter(
                BracketMatch.next_winner_match_id == next_match.id
            ).all()
            all_done = all(f.played == 1 for f in feeders)
            if all_done and len(feeders) == 2:
                pass  # Both feeders done but only 1 player placed – wait
            elif all_done and len(feeders) < 2:
                next_match.winner_id = next_match.player1_id
                next_match.played = 1
                _advance_winner(db, next_match)


def _cascade_reset(db: Session, match: BracketMatch, old_winner_id: int):
    """
    When a match result changes, remove the old winner from downstream
    matches and recursively reset any that were already played.
    """
    if not match.next_winner_match_id:
        return

    next_match = db.query(BracketMatch).filter(
        BracketMatch.id == match.next_winner_match_id
    ).first()
    if not next_match:
        return

    # If the next match was already played, recursively reset its downstream first
    if next_match.played == 1 and next_match.winner_id:
        _cascade_reset(db, next_match, next_match.winner_id)

    # Remove the old winner from the next match slot
    if next_match.player1_id == old_winner_id:
        next_match.player1_id = None
    elif next_match.player2_id == old_winner_id:
        next_match.player2_id = None

    # Reset the next match result
    next_match.player1_legs = 0
    next_match.player2_legs = 0
    next_match.winner_id = None
    next_match.loser_id = None
    next_match.played = 0
    db.flush()


def update_bracket_match_score(
    db: Session, match_id: int, player1_legs: int, player2_legs: int
) -> BracketMatch:
    """Update bracket match score and handle progression.
    
    If the winner changes from a previous result, cascade-reset all
    downstream matches that depended on the old winner, then advance
    the new winner.
    WB losers are eliminated — they do NOT move to the loser bracket.
    """
    match = db.query(BracketMatch).filter(BracketMatch.id == match_id).first()
    if not match:
        raise ValueError("Match not found")
    if player1_legs < 0 or player2_legs < 0:
        raise ValueError("Legs cannot be negative")
    if player1_legs == player2_legs:
        raise ValueError("Match must have a winner")
    if not match.player1_id or not match.player2_id:
        raise ValueError("Match is missing players – cannot score yet")

    new_winner_id = match.player1_id if player1_legs > player2_legs else match.player2_id
    old_winner_id = match.winner_id

    # If winner changed, cascade-reset downstream matches
    if old_winner_id and old_winner_id != new_winner_id:
        _cascade_reset(db, match, old_winner_id)

    match.player1_legs = player1_legs
    match.player2_legs = player2_legs
    match.played = 1
    match.winner_id = new_winner_id
    match.loser_id = match.player2_id if new_winner_id == match.player1_id else match.player1_id

    db.flush()

    # Advance winner to next match
    _advance_winner(db, match)

    # WB losers are OUT — no advancement to loser bracket

    # Check if all bracket matches are complete → tournament finished
    tournament = match.tournament
    all_bracket = db.query(BracketMatch).filter(
        BracketMatch.tournament_id == tournament.id,
    ).all()

    # A match needs to be played if it has both players assigned and hasn't been played
    unplayed = [
        m for m in all_bracket
        if m.played != 1 and m.player1_id is not None and m.player2_id is not None
    ]

    if len(unplayed) == 0:
        # All playable matches are done — check there are no pending progressions
        # (matches with only one player that still have feeder matches coming)
        has_pending = False
        for m in all_bracket:
            if m.played != 1 and (m.player1_id is not None or m.player2_id is not None):
                # This match has one player but not two — check if more feeders are expected
                feeders = [f for f in all_bracket if f.next_winner_match_id == m.id]
                unplayed_feeders = [f for f in feeders if f.played != 1]
                if unplayed_feeders:
                    has_pending = True
                    break

        if not has_pending:
            tournament.status = TournamentStatus.FINISHED

            # Auto-calculate ranking points if tournament is linked to a ranking
            if tournament.ranking_id:
                try:
                    recalculate_ranking_entries(db, tournament.ranking_id, tournament.id)
                except (ValueError, Exception):
                    pass  # Don't fail the match score update if ranking calc fails

    db.commit()
    db.refresh(match)
    return match
