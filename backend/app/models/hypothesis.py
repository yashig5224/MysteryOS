from dataclasses import dataclass

@dataclass
class HypothesisModel:
    id: str
    statement: str
    score: float
