from typing import Optional


def calculate_pattern_strength(
    base_magnitude: float,
    sample_size: int,
    supporting_count: int = 0,
    consistency: float = 1.0,
) -> int:
    """
    Calculate a normalized Pattern Strength score from 0-100.
    Factors in statistical magnitude, sample size, supporting findings, and consistency.
    """
    # Base component from statistical magnitude (e.g. correlation 0.0-1.0 or % diff)
    base_score = min(70.0, base_magnitude * 70.0)

    # Sample size confidence boost (up to 15 pts)
    sample_boost = min(15.0, (sample_size / 50.0) * 15.0) if sample_size > 0 else 0.0

    # Supporting findings corroboration boost (up to 15 pts)
    finding_boost = min(15.0, supporting_count * 5.0)

    raw_strength = (base_score + sample_boost + finding_boost) * min(1.0, consistency)
    return int(round(max(10, min(100, raw_strength))))


def calculate_event_importance(
    severity: str,
    base_score: int,
    supporting_findings_count: int = 0,
    has_pattern: bool = False,
) -> int:
    """
    Calculate normalized timeline event importance (0-100).
    """
    severity_weights = {"high": 35, "medium": 20, "low": 10}
    sev_points = severity_weights.get(severity.lower(), 15)

    score_points = (base_score / 100.0) * 45.0
    corroboration_points = min(15.0, supporting_findings_count * 5.0)
    pattern_points = 10.0 if has_pattern else 0.0

    total_importance = sev_points + score_points + corroboration_points + pattern_points
    return int(round(max(15, min(100, total_importance))))


def classify_significance(strength: int) -> str:
    """Classify 0-100 strength score into significance tier."""
    if strength >= 75:
        return "high"
    elif strength >= 45:
        return "medium"
    return "low"
