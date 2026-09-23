from dataclasses import dataclass

@dataclass
class EvidenceModel:
    id: str
    source: str
    claim: str
    confidence: float
