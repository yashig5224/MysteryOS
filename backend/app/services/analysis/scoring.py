from typing import List, Dict, Any, Optional
import uuid
from app.api.schemas.analysis import AnalysisFinding, FindingSeverity, ExpectedRange


def classify_severity(score: int) -> str:
    """Classify 0-100 anomaly score into severity tier."""
    if score >= 80:
        return FindingSeverity.HIGH.value
    elif score >= 50:
        return FindingSeverity.MEDIUM.value
    return FindingSeverity.LOW.value


def normalize_score(raw_score: float, min_val: float = 0.0, max_val: float = 100.0) -> int:
    """Clamp and normalize score to 0 - 100 integer range."""
    clamped = max(min_val, min(max_val, raw_score))
    return int(round(clamped))


def deduplicate_and_merge_findings(findings: List[AnalysisFinding]) -> List[AnalysisFinding]:
    """
    Merge overlapping findings for the same column and row into a single unified finding.
    Combines detected_by list and boosts confidence and score appropriately.
    """
    merged: Dict[str, AnalysisFinding] = {}

    for f in findings:
        # Group key by dataset, column, row_reference, and type
        row_key = str(f.row_reference) if f.row_reference is not None else "no_row"
        col_key = str(f.column) if f.column is not None else "no_col"
        group_key = f"{f.dataset_id}:{f.type}:{col_key}:{row_key}"

        if group_key not in merged:
            # First occurrence
            if not f.detected_by:
                f.detected_by = [f.method]
            merged[group_key] = f
        else:
            existing = merged[group_key]
            # Merge detection methods
            for m in (f.detected_by or [f.method]):
                if m not in existing.detected_by:
                    existing.detected_by.append(m)

            # Boost score and confidence if confirmed by multiple independent methods
            method_count = len(existing.detected_by)
            new_score = min(100, max(existing.score, f.score) + (method_count - 1) * 8)
            existing.score = new_score
            existing.severity = classify_severity(new_score)
            existing.confidence = min(0.99, max(existing.confidence, f.confidence) + 0.05)

            # Update method label to show multi-detection
            existing.method = " + ".join(existing.detected_by)

            # Merge expected range if missing
            if not existing.expected_range and f.expected_range:
                existing.expected_range = f.expected_range

    # Sort merged findings by score descending, then high severity first
    result = list(merged.values())
    severity_order = {"high": 0, "medium": 1, "low": 2}
    result.sort(key=lambda x: (severity_order.get(x.severity, 3), -x.score))

    return result
