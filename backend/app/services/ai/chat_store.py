import json
from pathlib import Path
from typing import List, Optional
from app.api.schemas.investigation import InvestigationMessage, InvestigationHistoryResponse


class InvestigationChatStore:
    """
    Lightweight investigation conversation history store.
    Persists investigation messages in data/processed/investigation_chat_{dataset_id}.json.
    """

    def __init__(self, processed_dir: Optional[Path] = None):
        if processed_dir is None:
            self.processed_dir = Path(__file__).resolve().parent.parent.parent.parent / "data" / "processed"
        else:
            self.processed_dir = processed_dir
        self.processed_dir.mkdir(parents=True, exist_ok=True)

    def _get_chat_path(self, dataset_id: str) -> Path:
        return self.processed_dir / f"investigation_chat_{dataset_id}.json"

    def get_history(self, dataset_id: str) -> List[InvestigationMessage]:
        path = self._get_chat_path(dataset_id)
        if not path.exists():
            return []
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                messages = [InvestigationMessage(**m) for m in data.get("messages", [])]
                return messages
        except Exception:
            return []

    def append_message(self, dataset_id: str, message: InvestigationMessage) -> None:
        history = self.get_history(dataset_id)
        history.append(message)
        # Keep last 50 messages per dataset session
        history = history[-50:]

        path = self._get_chat_path(dataset_id)
        try:
            with open(path, "w", encoding="utf-8") as f:
                data = {
                    "dataset_id": dataset_id,
                    "total_messages": len(history),
                    "messages": [m.model_dump() for m in history],
                }
                json.dump(data, f, indent=2)
        except Exception:
            pass

    def reset_history(self, dataset_id: str) -> bool:
        path = self._get_chat_path(dataset_id)
        if path.exists():
            try:
                path.unlink()
                return True
            except Exception:
                return False
        return True


# Singleton
chat_store = InvestigationChatStore()
