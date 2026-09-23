def rank_evidence(evidence):
    return sorted(evidence, key=lambda item: item.get("confidence", 0), reverse=True)
