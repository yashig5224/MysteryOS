from typing import Optional


def calculate_evidence_strength(
    base_magnitude: float,
    sample_size: int = 20,
    signal_count: int = 1,
    consistency: float = 1.0,
) -> int:
    """
    Calculate normalized Evidence Strength score from 0-100.
    Classified as:
    - 80-100: STRONG
    - 50-79: MODERATE
    - 0-49: WEAK
    """
    base_score = min(65.0, base_magnitude * 65.0)
    sample_boost = min(15.0, (sample_size / 50.0) * 15.0) if sample_size > 0 else 5.0
    signal_boost = min(20.0, signal_count * 5.0)

    raw_strength = (base_score + sample_boost + signal_boost) * min(1.0, consistency)
    return int(round(max(15, min(100, raw_strength))))


def calculate_hypothesis_confidence(
    evidence_strength: int,
    supporting_count: int,
    contradicting_count: int = 0,
    has_temporal_link: bool = False,
) -> int:
    """
    Calculate candidate hypothesis confidence score (0-100).
    Penalizes contradictions and rewards multi-signal corroboration.
    """
    base = evidence_strength * 0.65
    support_bonus = min(20.0, supporting_count * 5.0)
    temporal_bonus = 10.0 if has_temporal_link else 0.0

    # Contradiction penalty (15 pts per contradiction)
    contradiction_penalty = contradicting_count * 15.0

    raw_conf = base + support_bonus + temporal_bonus - contradiction_penalty
    return int(round(max(10, min(100, raw_conf))))


def calculate_thread_priority(
    highest_confidence: int,
    evidence_count: int,
    finding_count: int,
    has_high_severity: bool = False,
) -> int:
    """
    Calculate normalized Investigation Thread Priority (0-100).
    """
    base = highest_confidence * 0.60
    evidence_pts = min(15.0, evidence_count * 3.0)
    finding_pts = min(15.0, finding_count * 3.0)
    severity_pts = 10.0 if has_high_severity else 0.0

    total_priority = base + evidence_pts + finding_pts + severity_pts
    return int(round(max(20, min(100, total_priority))))
