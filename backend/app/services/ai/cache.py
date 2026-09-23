import hashlib
import json
from typing import Optional, Dict, Any
from app.api.schemas.investigation import InvestigationResponse


class InvestigationCache:
    """
    In-memory cache for LLM query responses to reduce redundant API calls and latency.
    """

    def __init__(self, max_entries: int = 200):
        self.cache: Dict[str, InvestigationResponse] = {}
        self.max_entries = max_entries

    def _generate_key(
        self,
        dataset_id: str,
        question: str,
        thread_id: Optional[str] = None,
        hypothesis_id: Optional[str] = None,
        mode: Optional[str] = None,
    ) -> str:
        raw_key = f"{dataset_id}:{question.strip().lower()}:{thread_id or ''}:{hypothesis_id or ''}:{mode or ''}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    def get(
        self,
        dataset_id: str,
        question: str,
        thread_id: Optional[str] = None,
        hypothesis_id: Optional[str] = None,
        mode: Optional[str] = None,
    ) -> Optional[InvestigationResponse]:
        key = self._generate_key(dataset_id, question, thread_id, hypothesis_id, mode)
        return self.cache.get(key)

    def set(
        self,
        dataset_id: str,
        question: str,
        response: InvestigationResponse,
        thread_id: Optional[str] = None,
        hypothesis_id: Optional[str] = None,
        mode: Optional[str] = None,
    ) -> None:
        if len(self.cache) >= self.max_entries:
            # Evict oldest entry
            first_key = next(iter(self.cache))
            del self.cache[first_key]

        key = self._generate_key(dataset_id, question, thread_id, hypothesis_id, mode)
        self.cache[key] = response

    def clear(self, dataset_id: Optional[str] = None) -> None:
        if dataset_id is None:
            self.cache.clear()
        else:
            # Clear entries matching dataset_id if needed
            self.cache = {k: v for k, v in self.cache.items() if v.dataset_id != dataset_id}


# Singleton
investigation_cache = InvestigationCache()
